import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { Player } from '../types/index'
import { supabase } from '../lib/supabase'
import {
  deleteAvatar, isDataUrl, isRemoteUrl, signAvatars, uploadAvatar,
} from '../api/avatarStorage'

// The old seed shipped 'brannon-default' with a fabricated 100 wins / 100 games.
// Those counters sync to Postgres on the first real game, so the fake baseline has to be
// subtracted out rather than left to compound — and subtracted, not zeroed, because any
// games actually played since are stacked on top of it. Runs once, then never again.
const SEED_MIGRATION_KEY = 'darts_seed_baseline_removed_v1'
const FABRICATED_BASELINE = 100

/**
 * Runs a Supabase write and reports the outcome.
 *
 * Supabase's query builder is LAZY: the HTTP request is only issued when the builder is
 * awaited or `.then()`-ed. Calling `supabase.from(...).upsert(...)` and discarding the
 * result — which is what this store used to do everywhere — never sends anything at all.
 * That is why cloud sync had accounts signed in but not a single stored row.
 *
 * Writes stay off the UI's critical path (nothing here is awaited by callers), but they
 * are now actually issued, and a failure is visible instead of invisible.
 */
function fireWrite(label: string, run: () => PromiseLike<{ error: unknown }>) {
  void (async () => {
    try {
      const { error } = await run()
      if (error) console.warn(`[players] ${label} failed:`, error)
    } catch (e) {
      console.warn(`[players] ${label} failed:`, e)
    }
  })()
}

export const usePlayersStore = defineStore('players', () => {
  const players = ref<Player[]>([])
  /** True once a save has had to drop photos to fit, so the UI can tell the user. */
  const storageDegraded = ref(false)

  function stripFabricatedBaseline() {
    if (localStorage.getItem(SEED_MIGRATION_KEY)) return
    const seeded = players.value.find(p => p.id === 'brannon-default')
    if (seeded) {
      seeded.wins = Math.max(0, (seeded.wins ?? 0) - FABRICATED_BASELINE)
      seeded.gamesPlayed = Math.max(0, (seeded.gamesPlayed ?? 0) - FABRICATED_BASELINE)
    }
    localStorage.setItem(SEED_MIGRATION_KEY, new Date().toISOString())
  }

  function loadFromStorage() {
    const raw = localStorage.getItem('darts_players')
    if (raw) {
      const loaded = JSON.parse(raw) as Player[]
      const PEEZY_BG = 'linear-gradient(160deg, #0c0c0e 0%, #242428 40%, #484850 70%, #a0a0b0 100%)'
      players.value = loaded.map(p => {
        if (p.id !== 'brannon-default') return {
          ...p,
          playerBackground: p.playerBackground ?? null,
          playerBackgroundSize: p.playerBackgroundSize ?? null,
          playerBackgroundPosition: p.playerBackgroundPosition ?? null,
          playerBackgroundFill: p.playerBackgroundFill ?? null,
          throwBackground: p.throwBackground ?? null,
          walkupBackground: p.walkupBackground ?? null,
          pinned: p.pinned ?? false,
          targetLabelColor: p.targetLabelColor ?? null,
          cricketTargetDisplay: p.cricketTargetDisplay ?? null,
          diceTheme: p.diceTheme ?? null,
        }
        return {
          ...p,
          name: p.name === 'Brannon' ? 'Peezy' : p.name,
          color: '#e00000',
          avatarUrl: p.avatarUrl === '☣️' || p.avatarUrl == null ? '🎯' : p.avatarUrl,
          playerBackground: p.playerBackground == null ? PEEZY_BG : p.playerBackground,
          playerBackgroundSize: p.playerBackgroundSize ?? null,
          playerBackgroundPosition: p.playerBackgroundPosition ?? null,
          playerBackgroundFill: p.playerBackgroundFill ?? null,
          throwBackground: p.throwBackground ?? null,
          walkupBackground: p.walkupBackground ?? null,
          cricketTargetDisplay: p.cricketTargetDisplay ?? null,
          pinned: p.pinned ?? true,
          targetLabelColor: p.targetLabelColor ?? null,
          diceTheme: p.diceTheme ?? null,
        }
      })
      stripFabricatedBaseline()
      persist()
    } else {
      // A fresh install starts with no players. Previously this seeded a fake player with
      // 100 wins / 100 games, which showed a fabricated 100% win rate, pinned itself to the
      // top of every "most played" sort, and made the leaderboard's empty state unreachable.
      players.value = []
      persist()
    }
  }

  /**
   * Unguarded, this threw QuotaExceededError straight out of addPlayer/updatePlayer once
   * enough inline photos accumulated — so the failure was not a lost photo but a lost
   * roster, with everything since the last good write gone on reload.
   *
   * The game stores simply give up at this point, but a roster is not a single game: the
   * fallback drops the inline images and keeps names, colours and records, which is the
   * least-bad outcome. `storageDegraded` is exposed so the UI can say so rather than
   * leaving the photo looking saved until the next reload.
   */
  function persist() {
    try {
      localStorage.setItem('darts_players', JSON.stringify(players.value))
      storageDegraded.value = false
    } catch {
      try {
        const withoutPhotos = players.value.map(p => ({
          ...p,
          avatarUrl: p.avatarUrl?.startsWith('data:') ? null : p.avatarUrl,
          playerBackground: p.playerBackground?.startsWith('data:') ? null : p.playerBackground,
        }))
        localStorage.setItem('darts_players', JSON.stringify(withoutPhotos))
        storageDegraded.value = true
        console.warn('[players] storage full — roster saved without photos')
      } catch {
        storageDegraded.value = true
        console.warn('[players] storage full — roster could not be saved')
      }
    }
  }

  function addPlayer(data: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'createdAt'>) {
    const player: Player = {
      ...data,
      playerBackground: data.playerBackground ?? null,
      playerBackgroundSize: data.playerBackgroundSize ?? null,
      playerBackgroundPosition: data.playerBackgroundPosition ?? null,
      playerBackgroundFill: data.playerBackgroundFill ?? null,
      throwBackground: data.throwBackground ?? null,
      walkupBackground: data.walkupBackground ?? null,
      targetLabelColor: data.targetLabelColor ?? null,
      cricketTargetDisplay: data.cricketTargetDisplay ?? null,
      pinned: data.pinned ?? false,
      id: uuid(),
      wins: 0,
      gamesPlayed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    players.value.push(player)
    persist()
    fireWrite('addPlayer', async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { error: null }
      // Upload before the row is written so avatar_path is set on the first insert rather
      // than needing a follow-up update.
      await offloadPhoto(player.id)
      const saved = players.value.find(p => p.id === player.id) ?? player
      return await supabase.from('players').upsert(playerToDb(saved, session.user.id))
    })
    return player
  }

  /**
   * Move a player's inline photo into Storage and swap the local copy for a signed URL.
   *
   * This is what takes the megabyte out of localStorage: once the image lives in the
   * bucket, the roster holds a short URL and a path instead of base64. Silently does
   * nothing when signed out or when there is no data URL to move, so an offline player
   * keeps their picture locally and gets it uploaded the next time they sign in.
   */
  async function offloadPhoto(id: string): Promise<void> {
    const player = players.value.find(p => p.id === id)
    if (!player || !isDataUrl(player.avatarUrl)) return

    const result = await uploadAvatar(player.id, player.avatarUrl!)
    if (!result) return

    const idx = players.value.findIndex(p => p.id === id)
    if (idx === -1) return
    players.value[idx] = {
      ...players.value[idx]!,
      avatarPath: result.path,
      // Only drop the data URL once a signed URL replaces it — otherwise a signing failure
      // would leave the player with no picture at all.
      avatarUrl: result.signedUrl ?? players.value[idx]!.avatarUrl,
    }
    persist()
  }

  /** Upload any photo still held inline. Runs after sign-in, when uploads become possible. */
  async function offloadPendingPhotos(): Promise<void> {
    const pending = players.value.filter(p => isDataUrl(p.avatarUrl)).map(p => p.id)
    for (const id of pending) await offloadPhoto(id)
  }

  function updatePlayer(id: string, data: Partial<Omit<Player, 'id' | 'createdAt'>>) {
    const idx = players.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      // Stamped on every local edit — this is what lets sync tell which side is newer.
      players.value[idx] = { ...players.value[idx]!, ...data, updatedAt: new Date().toISOString() }
      persist()
      fireWrite('updatePlayer', async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return { error: null }
        // A newly attached photo has to reach Storage before the row is written, or
        // avatar_path would stay null and the picture would never leave this device.
        await offloadPhoto(id)
        const updated = players.value.find(p => p.id === id)
        if (!updated) return { error: null }
        return await supabase.from('players').upsert(playerToDb(updated, session.user.id))
      })
    }
  }

  function recordWin(id: string) {
    updatePlayer(id, {
      wins: (players.value.find(p => p.id === id)?.wins ?? 0) + 1,
      gamesPlayed: (players.value.find(p => p.id === id)?.gamesPlayed ?? 0) + 1,
    })
  }

  function recordGame(id: string) {
    updatePlayer(id, {
      gamesPlayed: (players.value.find(p => p.id === id)?.gamesPlayed ?? 0) + 1,
    })
  }

  function deletePlayer(id: string) {
    const removed = players.value.find(p => p.id === id)
    players.value = players.value.filter(p => p.id !== id)
    persist()
    fireWrite('deletePlayer', async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { error: null }
      // Remove the image too, otherwise deleting a player leaves an orphaned object that
      // nothing will ever reference or clean up.
      if (removed?.avatarPath) await deleteAvatar(removed.avatarPath)
      return await supabase.from('players').delete().eq('id', id)
    })
  }

  function playerToDb(p: Player, userId: string) {
    return {
      id: p.id,
      user_id: userId,
      name: p.name,
      color: p.color,
      // A signed URL is short-lived, so never persist one — it would be dead by the time
      // another device read it. Only stable values go to the column.
      avatar_url: isRemoteUrl(p.avatarUrl) || isDataUrl(p.avatarUrl) ? null : p.avatarUrl,
      avatar_path: p.avatarPath ?? null,
      player_background: p.playerBackground,
      player_background_size: p.playerBackgroundSize,
      player_background_position: p.playerBackgroundPosition,
      player_background_fill: p.playerBackgroundFill,
      throw_background: p.throwBackground,
      walkup_background: p.walkupBackground,
      target_label_color: p.targetLabelColor,
      cricket_target_display: p.cricketTargetDisplay,
      dice_theme: p.diceTheme,
      pinned: p.pinned,
      wins: p.wins,
      games_played: p.gamesPlayed,
      created_at: p.createdAt,
      updated_at: new Date().toISOString(),
    }
  }

  function dbToPlayer(row: Record<string, unknown>): Player {
    return {
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      avatarPath: (row.avatar_path as string | null) ?? null,
      playerBackground: (row.player_background as string | null) ?? null,
      playerBackgroundSize: (row.player_background_size as 'cover' | 'contain' | null) ?? null,
      playerBackgroundPosition: (row.player_background_position as 'top' | 'center' | 'bottom' | null) ?? null,
      playerBackgroundFill: (row.player_background_fill as 'black' | 'blur' | null) ?? null,
      throwBackground: (row.throw_background as string | null) ?? null,
      walkupBackground: (row.walkup_background as string | null) ?? null,
      targetLabelColor: (row.target_label_color as string | null) ?? null,
      cricketTargetDisplay: (row.cricket_target_display as 'show' | 'hide' | null) ?? null,
      diceTheme: (row.dice_theme as import('../types/index').DiceTheme | null) ?? null,
      pinned: (row.pinned as boolean) ?? false,
      wins: (row.wins as number) ?? 0,
      gamesPlayed: (row.games_played as number) ?? 0,
      createdAt: row.created_at as string,
      updatedAt: (row.updated_at as string | null) ?? null,
    }
  }

  /** Epoch for anything unstamped, so a record with no history never beats one with. */
  const stamp = (p: Player) => (p.updatedAt ? Date.parse(p.updatedAt) : 0)

  async function syncFromCloud() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: true })

    if (error || !data) {
      console.warn('[players] syncFromCloud read failed:', error)
      return
    }

    const cloudPlayers = data.map(dbToPlayer)
    const cloudById = new Map(cloudPlayers.map(p => [p.id, p]))
    const localById = new Map(players.value.map(p => [p.id, p]))

    // Cloud used to win unconditionally for any player present on both sides. Play a night
    // on the tablet while signed in on a phone and whichever device wrote last silently
    // erased the other's games. Compare updated_at instead and keep the newer record; only
    // when the two are indistinguishable does cloud win, since it is the shared copy.
    const merged: Player[] = []
    const needPush: Player[] = []

    for (const [id, local] of localById) {
      const cloud = cloudById.get(id)
      if (!cloud) { merged.push(local); needPush.push(local); continue }
      if (stamp(local) > stamp(cloud)) { merged.push(local); needPush.push(local) }
      else merged.push(cloud)
    }
    // Players that exist only in the cloud (added on another device)
    for (const [id, cloud] of cloudById) if (!localById.has(id)) merged.push(cloud)

    merged.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    players.value = merged
    persist()

    // Turn stored paths into URLs an <img> can actually render. Signed URLs expire, so this
    // has to happen on every sync rather than relying on whatever was saved last time.
    // Batched into one request so a table of players is not one round trip each.
    const toSign = merged.filter(p => p.avatarPath).map(p => p.avatarPath!)
    if (toSign.length > 0) {
      const signed = await signAvatars(toSign)
      players.value = players.value.map(p =>
        p.avatarPath && signed[p.avatarPath] ? { ...p, avatarUrl: signed[p.avatarPath]! } : p
      )
      persist()
    }

    // Push anything where local was newer, plus players the cloud has never seen
    for (const p of needPush) {
      const { error: pushError } = await supabase.from('players').upsert(playerToDb(p, session.user.id))
      if (pushError) console.warn('[players] syncFromCloud push failed for', p.name, pushError)
    }

    // Anything still held inline is a photo taken while signed out — now that there is a
    // session, move it up so it survives this device.
    await offloadPendingPhotos()
  }

  loadFromStorage()

  return {
    players, storageDegraded, addPlayer, updatePlayer, deletePlayer, recordWin, recordGame,
    syncFromCloud, offloadPendingPhotos,
  }
})

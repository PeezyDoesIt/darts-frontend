import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { Player } from '../types/index'
import { supabase } from '../lib/supabase'

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
      return await supabase.from('players').upsert(playerToDb(player, session.user.id))
    })
    return player
  }

  function updatePlayer(id: string, data: Partial<Omit<Player, 'id' | 'createdAt'>>) {
    const idx = players.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      // Stamped on every local edit — this is what lets sync tell which side is newer.
      players.value[idx] = { ...players.value[idx]!, ...data, updatedAt: new Date().toISOString() }
      persist()
      const updated = players.value[idx]!
      fireWrite('updatePlayer', async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return { error: null }
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
    players.value = players.value.filter(p => p.id !== id)
    persist()
    fireWrite('deletePlayer', async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { error: null }
      return await supabase.from('players').delete().eq('id', id)
    })
  }

  function playerToDb(p: Player, userId: string) {
    return {
      id: p.id,
      user_id: userId,
      name: p.name,
      color: p.color,
      avatar_url: p.avatarUrl,
      player_background: p.playerBackground,
      player_background_size: p.playerBackgroundSize,
      player_background_position: p.playerBackgroundPosition,
      player_background_fill: p.playerBackgroundFill,
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
      playerBackground: (row.player_background as string | null) ?? null,
      playerBackgroundSize: (row.player_background_size as 'cover' | 'contain' | null) ?? null,
      playerBackgroundPosition: (row.player_background_position as 'top' | 'center' | 'bottom' | null) ?? null,
      playerBackgroundFill: (row.player_background_fill as 'black' | 'blur' | null) ?? null,
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

    // Push anything where local was newer, plus players the cloud has never seen
    for (const p of needPush) {
      const { error: pushError } = await supabase.from('players').upsert(playerToDb(p, session.user.id))
      if (pushError) console.warn('[players] syncFromCloud push failed for', p.name, pushError)
    }
  }

  loadFromStorage()

  return { players, storageDegraded, addPlayer, updatePlayer, deletePlayer, recordWin, recordGame, syncFromCloud }
})

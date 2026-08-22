import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import { normalizeDiceTheme } from '../types/index'
import type { Player } from '../types/index'
import { supabase } from '../lib/supabase'
import {
  deleteAvatar, isDataUrl, isRemoteUrl, signAvatars, uploadPlayerImage,
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
/** Whatever a Supabase error or a thrown value has to say for itself, as one line. */
function describe(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; details?: unknown }
    if (typeof o.message === 'string' && o.message) return o.message
    if (typeof o.details === 'string' && o.details) return o.details
  }
  return 'Unknown error'
}

export const usePlayersStore = defineStore('players', () => {
  const players = ref<Player[]>([])
  /** True once a save has had to drop photos to fit, so the UI can tell the user. */
  const storageDegraded = ref(false)

  /**
   * The last cloud write or read that failed, or null when everything is getting through.
   *
   * Every failure here used to go to `console.warn` and nowhere else, which is how the whole
   * roster silently stopped syncing for days: three columns were missing from the table, and
   * PostgREST rejects the entire row when one is — so name changes, colours and win counts
   * were all being dropped too. On screen it looked identical to working.
   *
   * Cleared by the next write that succeeds, so a one-off blip while offline disappears on
   * its own rather than needing to be dismissed.
   */
  const syncFailure = ref<{ what: string; message: string } | null>(null)

  /**
   * Ids this device has deleted, kept until the server confirms the row is gone.
   *
   * A delete is two halves: remove locally, then delete the cloud row. The cloud half opens
   * with `if (!session) return` — so deleting while signed out, or before a session has
   * restored on a cold load, or simply while offline, left the row sitting in Postgres with
   * nothing anywhere recording that it was meant to go. `syncFromCloud` then reads a cloud
   * row with no local match as "added on another device" and merges it back in. Every
   * sign-in resurrected everyone ever deleted offline, and each one arrived carrying its
   * inline photo, which is what pushed the roster past the localStorage quota and put the
   * "Photos dropped" banner on the home screen.
   *
   * A tombstone is the missing record. It suppresses the row on merge and re-issues the
   * delete, and is only dropped once the server agrees — so the retry survives a week
   * offline. It does NOT propagate a delete to a second device that still holds the player;
   * that needs a `deleted_at` column rather than a local list, and is a separate change.
   */
  const TOMBSTONE_KEY = 'darts_players_deleted_v1'
  type Tombstone = { id: string; at: string }

  function readTombstones(): Tombstone[] {
    try {
      const raw = localStorage.getItem(TOMBSTONE_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? (parsed as Tombstone[]).filter(t => t && typeof t.id === 'string') : []
    } catch {
      // A corrupt list costs one resurrection; throwing here would cost the whole roster.
      return []
    }
  }
  const tombstones = ref<Tombstone[]>(readTombstones())

  function writeTombstones() {
    try {
      localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(tombstones.value))
    } catch {
      // Quota again. The roster matters more than the tombstone list, and the cost of
      // losing one is a player coming back — not a player being lost.
      console.warn('[players] could not record the delete')
    }
  }
  function tombstone(id: string) {
    if (tombstones.value.some(t => t.id === id)) return
    tombstones.value.push({ id, at: new Date().toISOString() })
    writeTombstones()
  }
  function forgetTombstone(id: string) {
    const before = tombstones.value.length
    tombstones.value = tombstones.value.filter(t => t.id !== id)
    if (tombstones.value.length !== before) writeTombstones()
  }

  function noteSyncOk() { syncFailure.value = null }
  function noteSyncFailed(what: string, e: unknown) {
    syncFailure.value = { what, message: describe(e) }
  }

  function fireWrite(label: string, run: () => PromiseLike<{ error: unknown }>) {
    void (async () => {
      try {
        const { error } = await run()
        if (error) { console.warn(`[players] ${label} failed:`, error); noteSyncFailed(label, error) }
        else noteSyncOk()
      } catch (e) {
        console.warn(`[players] ${label} failed:`, e)
        noteSyncFailed(label, e)
      }
    })()
  }

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
          playerBackgroundZoom: p.playerBackgroundZoom ?? null,
          throwBackground: p.throwBackground ?? null,
          throwBackgroundPosition: p.throwBackgroundPosition ?? null,
          throwBackgroundZoom: p.throwBackgroundZoom ?? null,
          walkupBackground: p.walkupBackground ?? null,
          walkupBackgroundPosition: p.walkupBackgroundPosition ?? null,
          walkupBackgroundZoom: p.walkupBackgroundZoom ?? null,
          pinned: p.pinned ?? false,
          targetLabelColor: p.targetLabelColor ?? null,
          pipColor: p.pipColor ?? null,
          pipStyle: p.pipStyle ?? null,
          cricketTargetDisplay: p.cricketTargetDisplay ?? null,
          diceTheme: normalizeDiceTheme(p.diceTheme),
          yahtzeeCard: p.yahtzeeCard ?? null,
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
          playerBackgroundZoom: p.playerBackgroundZoom ?? null,
          throwBackground: p.throwBackground ?? null,
          throwBackgroundPosition: p.throwBackgroundPosition ?? null,
          throwBackgroundZoom: p.throwBackgroundZoom ?? null,
          walkupBackground: p.walkupBackground ?? null,
          walkupBackgroundPosition: p.walkupBackgroundPosition ?? null,
          walkupBackgroundZoom: p.walkupBackgroundZoom ?? null,
          cricketTargetDisplay: p.cricketTargetDisplay ?? null,
          pinned: p.pinned ?? true,
          targetLabelColor: p.targetLabelColor ?? null,
          pipColor: p.pipColor ?? null,
          pipStyle: p.pipStyle ?? null,
          diceTheme: normalizeDiceTheme(p.diceTheme),
          yahtzeeCard: p.yahtzeeCard ?? null,
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
      playerBackgroundZoom: data.playerBackgroundZoom ?? null,
      throwBackground: data.throwBackground ?? null,
      throwBackgroundPosition: data.throwBackgroundPosition ?? null,
      throwBackgroundZoom: data.throwBackgroundZoom ?? null,
      walkupBackground: data.walkupBackground ?? null,
      walkupBackgroundPosition: data.walkupBackgroundPosition ?? null,
      walkupBackgroundZoom: data.walkupBackgroundZoom ?? null,
      targetLabelColor: data.targetLabelColor ?? null,
      pipColor: data.pipColor ?? null,
      pipStyle: data.pipStyle ?? null,
      cricketTargetDisplay: data.cricketTargetDisplay ?? null,
      yahtzeeCard: data.yahtzeeCard ?? null,
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
  /**
   * The four images a player can have, as (what to show, where it lives) pairs.
   *
   * A table rather than four copies of the same twelve lines. The avatar had this logic and
   * the three backgrounds had none of it, which is the whole bug: backgrounds are the large
   * images — an avatar is a thumbnail, a background is full screen — and they were the ones
   * still being carried inline as base64, in localStorage and in Postgres at once.
   */
  const IMAGE_FIELDS = [
    { url: 'avatarUrl', path: 'avatarPath', kind: 'avatar' },
    { url: 'playerBackground', path: 'playerBackgroundPath', kind: 'playerBackground' },
    { url: 'throwBackground', path: 'throwBackgroundPath', kind: 'throwBackground' },
    { url: 'walkupBackground', path: 'walkupBackgroundPath', kind: 'walkupBackground' },
  ] as const

  /** Remove every stored image for a player. Best effort; an orphan beats a blocked delete. */
  async function deleteAllImages(p: Player): Promise<void> {
    for (const f of IMAGE_FIELDS) {
      const path = p[f.path] as string | null | undefined
      if (path) await deleteAvatar(path)
    }
  }

  async function offloadPhoto(id: string): Promise<void> {
    const player = players.value.find(p => p.id === id)
    if (!player) return

    for (const field of IMAGE_FIELDS) {
      const value = player[field.url] as string | null | undefined
      if (!isDataUrl(value)) continue

      const result = await uploadPlayerImage(player.id, value!, field.kind)
      if (!result) continue

      const idx = players.value.findIndex(p => p.id === id)
      if (idx === -1) return
      const patch = {
        [field.path]: result.path,
        // Only drop the data URL once a signed URL replaces it — otherwise a signing failure
        // would leave the player with no picture at all.
        [field.url]: result.signedUrl ?? (players.value[idx]![field.url] as string | null),
      } as Partial<Player>
      players.value[idx] = { ...players.value[idx]!, ...patch }
    }
    persist()
  }

  /** Upload any photo still held inline. Runs after sign-in, when uploads become possible. */
  async function offloadPendingPhotos(): Promise<void> {
    const pending = players.value
      .filter(p => IMAGE_FIELDS.some(f => isDataUrl(p[f.url] as string | null | undefined)))
      .map(p => p.id)
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
    // Recorded BEFORE the write is attempted, not after it succeeds: the case this exists
    // for is the write never happening at all.
    tombstone(id)
    persist()
    fireWrite('deletePlayer', async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // No session, so the row stays up there for now. The tombstone holds the intent and
      // syncFromCloud finishes the job on the next sign-in.
      if (!session) return { error: null }
      // Remove the image too, otherwise deleting a player leaves an orphaned object that
      // nothing will ever reference or clean up.
      // Every image, not just the avatar — a background left behind is an orphan nothing
      // will ever reference again, and it still counts against the bucket.
      if (removed) await deleteAllImages(removed)
      const result = await supabase.from('players').delete().eq('id', id)
      if (!result.error) forgetTombstone(id)
      return result
    })
  }

  /**
   * What belongs in an image column: a stable URL, or nothing.
   *
   * A signed URL expires and must never be written. A data URL is dropped once the image is
   * safely in Storage, and deliberately kept until then — so a failed upload leaves the only
   * copy where it was rather than clearing it on the assumption the upload worked.
   */
  function storedImage(value: string | null | undefined, path: string | null | undefined): string | null {
    if (!value) return null
    if (isRemoteUrl(value)) return null
    if (isDataUrl(value)) return path ? null : value
    return value
  }

  function playerToDb(p: Player, userId: string) {
    return {
      id: p.id,
      user_id: userId,
      name: p.name,
      color: p.color,
      /*
       * Was: null whenever this held a data URL, path or no path. That quietly traded a
       * working photo for an empty column whenever an upload had not happened yet — the
       * local copy survived, so it was recoverable, but the cloud row lost the only copy it
       * had. `storedImage` keeps it until the path proves the image is somewhere safer.
       */
      avatar_url: storedImage(p.avatarUrl, p.avatarPath),
      avatar_path: p.avatarPath ?? null,
      /*
       * The image columns carry a reference, never the image.
       *
       * A signed URL is short-lived, so persisting one would store something dead by the
       * time another device read it. A data URL is worse: base64 in a text column is the
       * original file at ~133% of its size, sent up and pulled back down on every sync.
       *
       * `storedImage` keeps the inline copy ONLY while there is no path yet. That is the
       * difference from `avatar_url` below, which nulls a data URL unconditionally: if the
       * upload has not happened, clearing this column would trade a working photo for an
       * empty one, and these are the images a player cannot regenerate.
       */
      player_background: storedImage(p.playerBackground, p.playerBackgroundPath),
      player_background_path: p.playerBackgroundPath ?? null,
      player_background_size: p.playerBackgroundSize,
      player_background_position: p.playerBackgroundPosition,
      player_background_fill: p.playerBackgroundFill,
      player_background_zoom: p.playerBackgroundZoom,
      throw_background: storedImage(p.throwBackground, p.throwBackgroundPath),
      throw_background_path: p.throwBackgroundPath ?? null,
      throw_background_position: p.throwBackgroundPosition ?? null,
      throw_background_zoom: p.throwBackgroundZoom ?? null,
      walkup_background: storedImage(p.walkupBackground, p.walkupBackgroundPath),
      walkup_background_path: p.walkupBackgroundPath ?? null,
      walkup_background_position: p.walkupBackgroundPosition ?? null,
      walkup_background_zoom: p.walkupBackgroundZoom ?? null,
      target_label_color: p.targetLabelColor,
      pip_color: p.pipColor,
      pip_style: p.pipStyle,
      cricket_target_display: p.cricketTargetDisplay,
      dice_theme: p.diceTheme,
      yahtzee_card: p.yahtzeeCard ?? null,
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
      playerBackgroundPosition: (row.player_background_position as string | null) ?? null,
      playerBackgroundFill: (row.player_background_fill as 'black' | 'blur' | null) ?? null,
      playerBackgroundZoom: (row.player_background_zoom as number | null) ?? null,
      throwBackground: (row.throw_background as string | null) ?? null,
      throwBackgroundPosition: (row.throw_background_position as string | null) ?? null,
      throwBackgroundZoom: (row.throw_background_zoom as number | null) ?? null,
      walkupBackground: (row.walkup_background as string | null) ?? null,
      walkupBackgroundPosition: (row.walkup_background_position as string | null) ?? null,
      walkupBackgroundZoom: (row.walkup_background_zoom as number | null) ?? null,
      playerBackgroundPath: (row.player_background_path as string | null) ?? null,
      throwBackgroundPath: (row.throw_background_path as string | null) ?? null,
      walkupBackgroundPath: (row.walkup_background_path as string | null) ?? null,
      targetLabelColor: (row.target_label_color as string | null) ?? null,
      pipColor: (row.pip_color as string | null) ?? null,
      pipStyle: (row.pip_style as Player['pipStyle']) ?? null,
      cricketTargetDisplay: (row.cricket_target_display as 'show' | 'hide' | null) ?? null,
      // A row written by a device that has not upgraded still carries a retired name.
      diceTheme: normalizeDiceTheme(row.dice_theme as string | null),
      yahtzeeCard: (row.yahtzee_card as import('../types/index').YahtzeeCardSkin | null) ?? null,
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
      noteSyncFailed('reading the roster', error ?? 'No data returned')
      return
    }

    const cloudPlayers = data.map(dbToPlayer)
    const cloudById = new Map(cloudPlayers.map(p => [p.id, p]))
    const localById = new Map(players.value.map(p => [p.id, p]))

    /*
     * Rows this device deleted while it could not reach the server. They are pulled out
     * before the merge runs, because the merge's last pass reads "in the cloud, not local"
     * as "added on another device" — which is indistinguishable from "deleted here" unless
     * the delete was written down. Deleting them is done after the merge, so a failed
     * delete cannot stop the roster loading.
     */
    const buried = tombstones.value.map(t => t.id)
    const toDelete = cloudPlayers.filter(p => buried.includes(p.id))
    for (const p of toDelete) cloudById.delete(p.id)

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
    const toSign = merged.flatMap(p =>
      IMAGE_FIELDS.map(f => p[f.path] as string | null | undefined).filter(Boolean) as string[]
    )
    if (toSign.length > 0) {
      const signed = await signAvatars(toSign)
      players.value = players.value.map(p => {
        let next = p
        for (const f of IMAGE_FIELDS) {
          const path = p[f.path] as string | null | undefined
          // A path that failed to sign is left showing whatever it had. One dead object must
          // not blank out the other three images this player does have.
          if (path && signed[path]) next = { ...next, ...({ [f.url]: signed[path]! } as Partial<Player>) }
        }
        return next
      })
      persist()
    }

    /*
     * Finish the deletes this device could not send at the time. Failures are reported and
     * the tombstone kept, so the next sync tries again rather than the row quietly coming
     * back the moment the list is cleared.
     */
    for (const p of toDelete) {
      await deleteAllImages(p)
      const { error: delError } = await supabase.from('players').delete().eq('id', p.id)
      if (delError) {
        console.warn('[players] syncFromCloud delete failed for', p.name, delError)
        noteSyncFailed(`removing ${p.name}`, delError)
      } else forgetTombstone(p.id)
    }
    /*
     * A tombstone whose row is not in the cloud at all has done its job — the delete landed,
     * or never needed to. Dropping it stops the list growing without bound on a device that
     * does a lot of roster tidying.
     */
    const cloudIds = new Set(cloudPlayers.map(p => p.id))
    for (const t of tombstones.value.filter(t => !cloudIds.has(t.id))) forgetTombstone(t.id)

    // Push anything where local was newer, plus players the cloud has never seen
    let pushed = 0
    for (const p of needPush) {
      const { error: pushError } = await supabase.from('players').upsert(playerToDb(p, session.user.id))
      if (pushError) {
        console.warn('[players] syncFromCloud push failed for', p.name, pushError)
        noteSyncFailed(`saving ${p.name}`, pushError)
      } else pushed++
    }
    // Only a clean run clears the flag: if some rows went up and others did not, the roster
    // is still out of step and saying "synced" would be a lie.
    if (pushed === needPush.length) noteSyncOk()

    // Anything still held inline is a photo taken while signed out — now that there is a
    // session, move it up so it survives this device.
    await offloadPendingPhotos()
  }

  loadFromStorage()

  return {
    players, storageDegraded, syncFailure, addPlayer, updatePlayer, deletePlayer, recordWin,
    recordGame, syncFromCloud, offloadPendingPhotos,
  }
})

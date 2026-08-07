import { useSettingsStore } from '../stores/settings'
import { speak } from './useSpeech'
import { linesFor, type LineContext, type NarratorEvent } from '../lib/narrator'

/**
 * Speaking a narrator event, with the settings already applied.
 *
 * Views should not be reading narratorPersonality, cleanMode and quietNarrator to assemble
 * lines themselves — doing that in four separate places is how GamePage ended up never
 * checking quietNarrator at all, so "Names only" silenced nothing once play started.
 */
export function useNarrator() {
  const settings = useSettingsStore()

  /** Avoids repeating the same alternative twice running for a given slot. */
  const lastPicked: Record<string, number> = {}
  function pick(key: string, options: string[]): string {
    if (options.length === 1) return options[0]!
    const last = lastPicked[key] ?? -1
    const candidates = options.map((_, i) => i).filter(i => i !== last)
    const idx = candidates[Math.floor(Math.random() * candidates.length)]!
    lastPicked[key] = idx
    return options[idx]!
  }

  function linesForEvent(event: NarratorEvent, ctx: LineContext): string[][] {
    return linesFor(
      event,
      settings.narratorPersonality,
      { cleanMode: settings.cleanMode, quietNarrator: settings.quietNarrator },
      { term: settings.narratorGender === 'male' ? 'brother' : 'baby', ...ctx },
    )
  }

  /** Speak the whole event in order, awaiting each utterance. */
  async function narrate(event: NarratorEvent, ctx: LineContext): Promise<void> {
    const utterances = linesForEvent(event, ctx)
    for (let i = 0; i < utterances.length; i++) {
      await speak(pick(`${event}:${settings.narratorPersonality}:${i}`, utterances[i]!))
    }
  }

  /** Fire-and-forget, for timer callbacks that must not be blocked by speech. */
  function narrateAsync(event: NarratorEvent, ctx: LineContext): void {
    void narrate(event, ctx)
  }

  return { narrate, narrateAsync, linesForEvent }
}

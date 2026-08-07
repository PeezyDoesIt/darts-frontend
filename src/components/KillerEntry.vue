<template>
  <div class="killer-entry">
    <!-- Your own number: the badge you have to earn before anything else counts -->
    <div class="own" :class="{ armed: isKiller }">
      <div class="own-left">
        <span class="own-label">{{ isKiller ? 'YOU ARE A KILLER' : 'YOUR NUMBER' }}</span>
        <span class="own-note">
          {{ isKiller
            ? 'Hits on other numbers take lives'
            : `Hit ${requireDouble ? 'the double of ' : ''}${ownNumber} to arm yourself` }}
        </span>
      </div>
      <button
        v-ripple
        class="num-btn own-btn"
        :class="{ hit: (hits[ownNumber] ?? 0) > 0 }"
        :aria-label="`Record a hit on your number, ${ownNumber}`"
        @click="tap(ownNumber)"
      >
        <span class="num">{{ ownNumber }}</span>
        <span v-if="(hits[ownNumber] ?? 0) > 0" class="count">×{{ hits[ownNumber] }}</span>
      </button>
    </div>

    <span class="section-label">
      {{ isKiller ? 'TAKE A LIFE' : 'LOCKED UNTIL YOU ARM' }}
    </span>

    <div class="targets">
      <button
        v-for="t in opponents"
        :key="t.playerId"
        v-ripple
        class="num-btn target"
        :class="{ hit: (hits[t.number] ?? 0) > 0, locked: !isKiller }"
        :style="{ borderColor: t.color }"
        :aria-label="`Record a hit on ${t.name}'s number, ${t.number}`"
        @click="tap(t.number)"
      >
        <span class="t-name">{{ t.name }}</span>
        <span class="num">{{ t.number }}</span>
        <span class="lives">
          <span v-for="i in t.lives" :key="i" class="life" :style="{ background: t.color }" />
        </span>
        <span v-if="(hits[t.number] ?? 0) > 0" class="count">×{{ hits[t.number] }}</span>
      </button>
    </div>

    <p class="hint">
      Tap once for every {{ requireDouble ? 'double that lands' : 'mark that lands' }}.
      <template v-if="!requireDouble">A triple is three taps.</template>
    </p>

    <div class="actions">
      <button v-ripple class="btn btn-surface" :disabled="totalTaps === 0" @click="reset">Clear</button>
      <button v-ripple class="btn btn-spray submit" @click="submit">
        {{ totalTaps === 0 ? 'No score' : `Submit ${totalTaps}` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * One tap per qualifying hit. Deliberately has no single/double/triple selector: what
 * qualifies differs between the two house rules, and a multiplier picker would have to
 * mean different things in each. Counting taps means the same component is correct under
 * both, and the player reads the board rather than the UI.
 */
const props = defineProps<{
  ownNumber: number
  isKiller: boolean
  requireDouble: boolean
  opponents: { playerId: string; name: string; number: number; lives: number; color: string }[]
}>()

const emit = defineEmits<{ submit: [hits: Record<string, number>] }>()

const hits = ref<Record<number, number>>({})
const totalTaps = computed(() => Object.values(hits.value).reduce((a, b) => a + b, 0))

function tap(n: number) {
  hits.value = { ...hits.value, [n]: (hits.value[n] ?? 0) + 1 }
}
function reset() { hits.value = {} }

function submit() {
  const payload: Record<string, number> = {}
  for (const [n, c] of Object.entries(hits.value)) if (c > 0) payload[n] = c
  emit('submit', payload)
  hits.value = {}
}

defineExpose({ reset })
</script>

<style scoped>
.killer-entry { display: flex; flex-direction: column; gap: 10px; width: 100%; }

.own {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
}
.own.armed { border-color: var(--gold); background: rgba(255,200,87,0.12); }
.own-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.own-label { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--text-muted); }
.own.armed .own-label { color: var(--gold); }
.own-note { font-size: 12px; color: var(--text-muted); }

.section-label { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--text-muted); }

.targets { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 8px; }

.num-btn {
  position: relative; min-height: 64px; min-width: 64px; border-radius: 12px;
  background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.14);
  color: var(--text); cursor: pointer; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 2px; padding: 8px 6px;
  font-family: var(--font-display);
}
.own-btn { min-width: 74px; }
.num { font-size: 24px; font-weight: 900; line-height: 1; }
.t-name {
  font-size: 10px; font-weight: 700; color: var(--text-muted); max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.num-btn.hit { background: rgba(255,200,87,0.2); border-color: var(--gold); }
/* Locked targets stay visible and tappable — the hit is still recorded, it just does
   nothing until the player arms. Hiding them would make the rule invisible. */
.num-btn.locked { opacity: 0.55; }

.lives { display: flex; gap: 3px; margin-top: 2px; min-height: 6px; }
.life { width: 6px; height: 6px; border-radius: 50%; }
.count {
  position: absolute; top: 4px; right: 6px; font-size: 11px; font-weight: 900;
  color: var(--gold);
}

.hint { font-size: 11.5px; color: var(--text-muted); margin: 0; line-height: 1.4; }

.actions { display: flex; gap: 8px; }
.actions .btn { flex: 1; min-height: 52px; }
.actions .submit { flex: 2; }
.actions .btn:disabled { opacity: 0.4; }
</style>

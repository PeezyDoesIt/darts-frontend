<template>
  <div class="simple-wrap" :class="{ 'simple-wrap-horse': gameType === 'horse' }">

    <!-- ══════════════════════════════════════════
         HORSE LAYOUT
    ══════════════════════════════════════════ -->
    <template v-if="gameType === 'horse'">

      <!-- Compact top strip: round + letters -->
      <div class="horse-strip">
        <span class="strip-round display">RD {{ round }}</span>
        <div class="strip-letters">
          <span
            v-for="(letter, i) in ['H','O','R','S','E']"
            :key="letter"
            class="strip-letter"
            :class="{ earned: i < (horseLetters ?? 0) }"
            :style="i < (horseLetters ?? 0) ? { color: '#ef4444', textShadow: '0 0 14px #ef4444, 0 0 4px #ef4444' } : {}"
          >{{ letter }}</span>
        </div>
      </div>

      <!-- Body: arcade focus + action (splits to two columns in landscape) -->
      <div class="horse-body">

        <!-- Arcade focus panel -->
        <div class="horse-arcade-focus">
          <template v-if="!isHorseSetter">
            <span class="arcade-label">TARGET TO BEAT</span>
            <span class="arcade-number" :style="{ filter: `drop-shadow(0 0 28px ${playerColor ?? 'var(--pink)'}) drop-shadow(0 0 8px ${playerColor ?? 'var(--pink)'})` }">
              {{ horseTarget ?? '—' }}
            </span>
          </template>
          <template v-else>
            <span class="arcade-label">SET THE TARGET</span>
            <div class="setter-display">
              <span class="arcade-number setter-number">{{ entered || '—' }}</span>
              <button v-ripple class="btn btn-sm btn-surface setter-clear" @click="clear">Clear</button>
            </div>
          </template>
        </div>

        <!-- Action column -->
        <div class="horse-action-col">

          <!-- Non-setter: MADE IT / MISSED -->
          <template v-if="!isHorseSetter">
            <div class="horse-choice-row">
              <button v-ripple class="horse-choice-btn horse-made" @click="emit('submit', horseTarget ?? 0)">
                MADE IT
              </button>
              <button v-ripple class="horse-choice-btn horse-missed" @click="emit('submit', 0)">
                MISSED
              </button>
            </div>
            <ThrowTimer
              class="horse-timer-row submit-row-horse"
              :timeLeft="throwTimeLeft" :duration="throwTimerDuration"
              :paused="throwPaused" :locked="showPauseLocked"
              @toggle="emit('toggleThrowPause')"
            />
          </template>

          <!-- Setter: numpad + NEXT -->
          <template v-else>
            <div class="numpad numpad-horse">
              <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" v-ripple class="key" @click="press(n)">{{ n }}</button>
              <button v-ripple class="key" @click="press(0)">0</button>
              <button v-ripple class="key double" @click="backspace">⌫</button>
            </div>
            <div class="numpad-footer numpad-footer-horse submit-row-horse">
              <button v-ripple class="btn btn-gold btn-xl submit-btn" :disabled="entered === ''" @click="submit">
                NEXT
              </button>
              <ThrowTimer
                :timeLeft="throwTimeLeft" :duration="throwTimerDuration"
                :paused="throwPaused" :locked="showPauseLocked"
                @toggle="emit('toggleThrowPause')"
              />
            </div>
          </template>

        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════
         ALL OTHER GAMES (unchanged)
    ══════════════════════════════════════════ -->
    <template v-else>
      <div class="round-info">
        <span class="round-label">{{ gameLabel }}</span>
        <span class="round-sub">Round {{ round }} — enter score for this round</span>
        <span v-if="hint" class="round-hint">{{ hint }}</span>
      </div>

      <div class="score-display">
        <span class="score-entered">{{ entered || '0' }}</span>
        <button v-ripple class="btn btn-sm btn-surface" @click="clear" style="margin-left:12px;position:relative;overflow:hidden">Clear</button>
      </div>

      <div class="numpad">
        <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" v-ripple class="key" @click="press(n)">{{ n }}</button>
        <button v-ripple class="key" @click="press(0)">0</button>
        <button v-ripple class="key double" @click="backspace">⌫</button>
      </div>

      <div class="numpad-footer">
        <button v-ripple class="btn btn-gold btn-xl submit-btn" :disabled="entered === ''" @click="submit">
          NEXT
        </button>
        <ThrowTimer
          :timeLeft="throwTimeLeft" :duration="throwTimerDuration"
          :paused="throwPaused" :locked="showPauseLocked"
          @toggle="emit('toggleThrowPause')"
        />
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { GAME_TYPE_LABELS, type GameType } from '../types/index'
import ThrowTimer from './ThrowTimer.vue'

const props = defineProps<{
  gameType: GameType
  round: number
  hint?: string | null
  horseLetters?: number
  isHorseSetter?: boolean
  horseTarget?: number
  playerColor?: string
  throwTimeLeft?: number
  throwTimerDuration?: number
  throwPaused?: boolean
  /** Set for a moment when the timer is tapped while pausing is locked. */
  showPauseLocked?: boolean
}>()
const emit = defineEmits<{ submit: [score: number]; toggleThrowPause: [] }>()

const entered = ref('')
const gameLabel = computed(() => GAME_TYPE_LABELS[props.gameType])

function press(n: number) { if (entered.value.length >= 4) return; entered.value += String(n) }
function backspace() { entered.value = entered.value.slice(0, -1) }
function clear() { entered.value = '' }
function submit() {
  if (!entered.value) return
  emit('submit', parseInt(entered.value))
  entered.value = ''
}
</script>

<style scoped>
/* ── Base wrap ── */
.simple-wrap {
  flex: 1; display: flex; flex-direction: column; align-items: stretch;
  padding: 24px; padding-bottom: calc(24px + env(safe-area-inset-bottom));
  gap: 20px; overflow: hidden; justify-content: center;
}

/* ── HORSE wrap: no padding (strip/body handle their own) ── */
.simple-wrap-horse { padding: 0; gap: 0; justify-content: flex-start; }

/* ── Compact strip ── */
.horse-strip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(0,0,0,0.5);
  border-bottom: 2px solid rgba(255,255,255,0.08);
  gap: 16px;
}
.strip-round {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.5);
}
.strip-letters { display: flex; gap: 10px; align-items: center; }
.strip-letter {
  font-size: 26px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
  color: rgba(255,255,255,0.1);
  transition: color 0.3s, text-shadow 0.3s;
  line-height: 1;
}
.strip-letter.earned { color: #ef4444; }

/* ── Horse body: arcade focus + action column ── */
.horse-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ── Arcade focus panel ── */
.horse-arcade-focus {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 20px 8px;
  gap: 6px;
  min-height: 0;
}
.arcade-label {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.25em;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
}
.arcade-number {
  font-size: clamp(72px, 22dvh, 160px);
  font-weight: 900;
  font-family: var(--font-display);
  color: #fff;
  line-height: 1;
  letter-spacing: -0.02em;
}
/* Setter: editable number in arcade style */
.setter-display {
  display: flex;
  align-items: center;
  gap: 14px;
}
.setter-number {
  font-size: clamp(64px, 18dvh, 130px);
  color: rgba(255,255,255,0.9);
  filter: none !important;
}
.setter-clear { flex-shrink: 0; }

/* ── Action column (buttons / numpad + footer) ── */
.horse-action-col {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* MADE IT / MISSED row */
.horse-choice-row {
  display: flex;
  flex-direction: row;
  gap: 12px;
  padding: 8px 16px;
}
.horse-choice-btn {
  flex: 1;
  height: clamp(60px, 10dvh, 110px);
  
  border: none;
  font-family: var(--font-display);
  font-size: clamp(22px, 4dvh, 42px);
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s, box-shadow 0.1s;
}
.horse-choice-btn:active { transform: scale(0.96); }
.horse-made {
  background: linear-gradient(160deg, #16a34a 0%, #15803d 100%);
  color: #fff;
  box-shadow: 4px 4px 0 #16a34a;
}

.horse-missed {
  background: linear-gradient(160deg, #dc2626 0%, #b91c1c 100%);
  color: #fff;
  box-shadow: 4px 4px 0 #dc2626;
}


/* Timer row for non-setter */
.horse-timer-row {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  height: clamp(44px, 5.5dvh, 60px);
  /* Sized to the row it sits in, or a 50px clock is clipped by a 44px band. */
  --throw-timer-size: clamp(22px, 3.8dvh, 34px);
  cursor: pointer;
}

/* HORSE submit row styling */
.submit-row-horse {
  border-top: 2px solid rgba(255,255,255,0.08);
  background: #141419;
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  gap: 12px;
}

/* Setter numpad */
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
.numpad-horse { max-width: 320px; align-self: center; padding: 0 16px; box-sizing: border-box; }
.key {
  height: clamp(72px, 10dvh, 110px);  border: 2px solid var(--border); background: var(--bg-card);
  color: var(--text); font-size: clamp(36px, 5.5dvh, 64px); font-weight: 700; cursor: pointer;
  transition: background 0.1s, transform 0.1s; display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent; position: relative; overflow: hidden;
}

.key:active { transform: scale(0.93); }
.key.double { grid-column: span 2; }

.numpad-footer {
  width: 100%; display: flex; align-items: stretch; gap: 10px;
  padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom));
}
.numpad-footer-horse { flex-direction: column; align-items: stretch; }
.numpad-footer-horse .submit-btn { flex: none; width: 100%; }
/*
 * The clock is laid on its own row here, so it is sized rather than left to fill: this
 * footer is a column, and a timer that grows to fill one is a red slab half the screen tall.
 */
.numpad-footer-horse .throw-timer { flex: none; height: clamp(34px, 5dvh, 48px); --throw-timer-size: clamp(20px, 3.4dvh, 30px); }

.submit-btn {
  flex: 1; width: 100%; position: relative; overflow: hidden;
  height: clamp(58px, 7.5dvh, 88px); font-size: clamp(42px, 6dvh, 72px);
  font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; font-family: var(--font-display);
}
.submit-row-horse .submit-btn { height: clamp(52px, 7dvh, 72px); font-size: clamp(38px, 5.5dvh, 60px); }


/* ── Non-HORSE: round info + standard numpad ── */
.round-info { text-align: center; flex-shrink: 0; }
.round-label { font-size: 20px; font-weight: 800; color: var(--gold); display: block; }
.round-sub { font-size: 14px; color: var(--text-muted); font-weight: 700; }
.round-hint { font-size: 18px; font-weight: 800; color: var(--pink); margin-top: 4px; display: block; }

.score-display { display: flex; align-items: center; }
.score-entered { font-size: 52px; font-weight: 900; min-width: 100px; text-align: center; font-family: var(--font-display); }

/* ── Mobile ── */
@media (max-width: 767px) {
  .simple-wrap { padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); gap: 14px; }
  .key { height: 72px; font-size: 36px; }
  .score-entered { font-size: 40px; }
}

/* ── Landscape / short screens: horse-body splits to two columns ── */
@media (max-height: 500px) {
  .horse-strip { padding: 6px 14px; }
  .strip-round { font-size: 14px; }
  .strip-letter { font-size: 20px; }
  .strip-letters { gap: 6px; }

  .horse-body { flex-direction: row; }

  .horse-arcade-focus {
    flex: 0 0 42%;
    padding: 8px 10px;
    border-right: 2px solid rgba(255,255,255,0.06);
  }
  .arcade-number { font-size: clamp(44px, 12dvh, 80px); }
  .arcade-label { font-size: 9px; }
  .setter-number { font-size: clamp(38px, 10dvh, 66px); }

  .horse-action-col { flex: 1; min-width: 0; }
  .horse-choice-row { padding: 6px 10px; gap: 8px; }
  .horse-choice-btn { height: clamp(44px, 8dvh, 68px); font-size: clamp(16px, 3dvh, 24px);  }
  .horse-timer-row { height: clamp(34px, 5dvh, 48px); }
  .submit-row-horse { padding: 6px 10px; padding-bottom: calc(6px + env(safe-area-inset-bottom)); }
  .numpad-horse { max-width: none; padding: 4px 8px; }
  .key { height: clamp(38px, 7dvh, 54px); font-size: clamp(18px, 3.5dvh, 28px); }
  .submit-row-horse .submit-btn { height: clamp(38px, 6dvh, 52px) !important; font-size: clamp(24px, 4dvh, 36px) !important; }
  .horse-timer-row, .numpad-footer-horse .throw-timer { --throw-timer-size: clamp(22px, 3.8dvh, 32px); }
  .numpad-footer-horse .throw-timer { height: clamp(32px, 4.5dvh, 42px); }
}

@media (hover: hover) and (pointer: fine) {
  .horse-made:hover { box-shadow: 6px 6px 0 #16a34a; }
  .horse-missed:hover { box-shadow: 6px 6px 0 #dc2626; }
  .key:hover { background: var(--bg-surface); }
}
</style>

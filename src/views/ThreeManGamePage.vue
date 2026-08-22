<template>
  <div v-if="game" class="tm-page">
    <div class="drip-bar" />

    <!-- ── Header ─────────────────────────────────────────────────────────────────────── -->
    <header class="tm-header">
      <button v-ripple class="tm-chrome-btn" @click="quit">QUIT</button>
      <h1 class="tm-title">THREE MAN</h1>
      <span class="tm-round">RD {{ game.rounds + 1 }}</span>

      <!--
        The Three Man is the one fact a table forgets between rolls, so it is stated here and
        again as tape on that player's card. Saying it twice is the point, not a duplication
        to be tidied away.
      -->
      <div class="tm-holder" :class="{ 'tm-holder-empty': !threeMan }">
        <span class="tm-holder-label">THREE MAN</span>
        <span class="tm-holder-name">{{ threeMan ? threeMan.name : '—' }}</span>
      </div>

      <button v-ripple class="tm-chrome-btn" @click="showRules = true">RULES</button>
    </header>

    <!-- ── Roster: the spotlight row ──────────────────────────────────────────────────── -->
    <div class="tm-roster" :class="{ 'tm-roster-wrap': game.players.length > 5 }">
      <div
        v-for="(p, i) in game.players"
        :key="p.id"
        class="tm-card"
        :class="{
          active: i === game.currentPlayerIndex,
          idle: i !== game.currentPlayerIndex,
          holder: p.id === game.threeManId && i !== game.currentPlayerIndex,
        }"
        :style="cardStyle(p, i)"
      >
        <span
          v-if="i === game.currentPlayerIndex"
          class="tm-tape tm-tape-turn"
          :style="{ background: p.color }"
        >▶ ROLLING NOW</span>
        <span v-else-if="p.id === game.threeManId" class="tm-tape tm-tape-holder">THREE MAN</span>

        <template v-if="i === game.currentPlayerIndex">
          <div
            class="tm-avatar"
            :style="{ borderColor: p.color, background: isPhoto(p.avatarUrl) ? 'transparent' : p.color }"
          >
            <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" class="tm-avatar-img" />
            <span v-else class="tm-avatar-glyph">{{ avatarGlyph(p) }}</span>
          </div>
          <div class="tm-active-text">
            <span class="tm-active-name" :style="{ color: p.color }">{{ p.name }}</span>
            <span class="tm-active-count">{{ p.sips }} {{ unitLabel }}</span>
          </div>
        </template>

        <template v-else>
          <!-- The other half of the fix: knowing when you are up, not only when you are on. -->
          <span v-if="i === nextIndex" class="tm-next">NEXT</span>
          <span class="tm-idle-name">{{ p.name }}</span>
          <span class="tm-idle-count" :style="{ color: p.color }">{{ p.sips }}</span>
        </template>
      </div>
    </div>

    <!-- ── Field ──────────────────────────────────────────────────────────────────────── -->
    <div class="tm-field">
      <div class="tm-dice">
        <template v-if="dice">
          <DiceFace :face="dice[0]" :roll="rollNonce" />
          <DiceFace :face="dice[1]" :roll="rollNonce" />
        </template>
        <template v-else>
          <div class="tm-die-empty" />
          <div class="tm-die-empty" />
        </template>
      </div>

      <template v-if="diceTotal !== null">
        <span class="tm-total-label">TOTAL</span>
        <span class="tm-total">{{ diceTotal }}</span>
      </template>

      <!--
        The reason text is what settles the argument at the table, so it is a sentence at a
        readable size rather than a caption, and it never shrinks below 15px at any band.
      -->
      <div v-if="scoredOutcomes.length || noteOutcomes.length" class="tm-outcomes">
        <div
          v-for="(o, i) in scoredOutcomes"
          :key="`s${i}`"
          class="tm-line tm-line-scored"
          :style="{ borderLeftColor: colorOf(o.playerId) }"
        >
          <span class="tm-line-name" :style="{ color: colorOf(o.playerId) }">{{ nameOf(o.playerId) }}</span>
          <span class="tm-line-amount">{{ o.amount }}</span>
          <span class="tm-line-reason">{{ o.reason }}</span>
        </div>
        <div v-for="(n, i) in noteOutcomes" :key="`n${i}`" class="tm-line tm-line-note">
          <span class="tm-line-headline">{{ n.reason }}</span>
        </div>
      </div>

      <p v-if="game.phase === 'seeking'" class="tm-seeking">
        Nobody is the Three Man yet. First 3 takes the job.
      </p>
    </div>

    <!-- ── Footer ─────────────────────────────────────────────────────────────────────── -->
    <footer class="tm-footer">
      <!--
        Doubles replace the two buttons in this band rather than opening a panel beneath them.
        The band is where your hands already are, and handing them out is the only thing to do.
      -->
      <template v-if="game.phase === 'assigning'">
        <span class="tm-turn-label">PICK WHO TAKES THEM · {{ game.pendingAssignment }}</span>
        <div class="tm-assign">
          <button
            v-for="p in game.players"
            :key="p.id"
            v-ripple
            class="tm-assign-btn"
            :style="{ borderColor: p.color }"
            @click="threeManStore.assignTo(p.id)"
          >
            <span class="tm-assign-name" :style="{ color: p.color }">{{ p.name }}</span>
            <span class="tm-assign-count">{{ p.sips }}</span>
          </button>
        </div>
      </template>

      <template v-else>
        <!-- Third statement of the turn, for anyone whose eyes are already on the buttons. -->
        <span class="tm-turn-label" :style="{ color: currentPlayer.color }">
          {{ currentPlayer.name.toUpperCase() }}'S ROLL
        </span>
        <div class="tm-actions">
          <button v-ripple class="tm-roll" :disabled="!canRoll" @click="rollWithSound">
            {{ canRoll ? 'ROLL' : 'ROLLED' }}
          </button>
          <button v-ripple class="tm-pass" :disabled="!dice" @click="threeManStore.pass()">PASS →</button>
        </div>
      </template>
    </footer>

    <!-- ── Overlays ───────────────────────────────────────────────────────────────────── -->
    <div v-if="game.phase === 'over'" class="tm-overlay">
      <div class="tm-panel">
        <span class="tm-panel-label">{{ unitLabel.toUpperCase() }} · {{ game.rounds }} ROUNDS</span>
        <ul class="tm-tally">
          <li v-for="p in tally" :key="p.id" class="tm-tally-row">
            <span class="tm-tally-name" :style="{ color: p.color }">{{ p.name }}</span>
            <span class="tm-tally-count">{{ p.sips }}</span>
          </li>
        </ul>
        <button v-ripple class="tm-roll tm-wide" @click="finish">DONE</button>
      </div>
    </div>

    <div v-if="showRules" class="tm-overlay" @click.self="showRules = false">
      <div class="tm-panel">
        <h2 class="tm-panel-title">THREE MAN</h2>
        <ul class="tm-rules"><li v-for="(r, i) in THREE_MAN_RULES" :key="i">{{ r }}</li></ul>
        <p class="tm-house">
          This table: 7 goes {{ game.house.sevenGoes }}, 11 the other way.
          <template v-if="game.house.nineIsSocial"> 9 is a social.</template>
          <template v-if="game.house.doublesRollAgain"> Doubles roll again.</template>
        </p>
        <button v-ripple class="tm-roll tm-wide" @click="showRules = false">GOT IT</button>
      </div>
    </div>
  </div>

  <div v-else class="tm-empty">
    <p>No game in progress.</p>
    <button v-ripple class="tm-roll" @click="router.replace('/dice/threeman/setup')">SET ONE UP</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import DiceFace from '../components/DiceFace.vue'
import { useThreeManStore, THREE_MAN_RULES } from '../stores/threeMan'
import type { ThreeManPlayer } from '../stores/threeMan'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import { playTurnResultSound, unlockAudio } from '../composables/useSounds'
import { goBack } from '../router/goBack'

const router = useRouter()
const threeManStore = useThreeManStore()
const game = computed(() => threeManStore.game)
const showRules = ref(false)

const currentPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)
const unitLabel = computed(() => (game.value?.unit === 'points' ? 'points' : 'sips'))
const threeMan = computed(() => game.value?.players.find(p => p.id === game.value?.threeManId) ?? null)

/** Who is up next. Seat order never changes; only which card is lit does. */
const nextIndex = computed(() => {
  const g = game.value
  if (!g || g.players.length < 2) return -1
  return (g.currentPlayerIndex + 1) % g.players.length
})

/*
 * Pulled out rather than read as `game.dice[0]` in the template. A v-if on a nested property
 * does not narrow it for vue-tsc the way it reads to a person, and several places would each
 * have to be trusted to narrow — a computed is checked once, here.
 */
const dice = computed(() => game.value?.dice ?? null)
const diceTotal = computed(() => (dice.value ? dice.value[0] + dice.value[1] : null))
const canRoll = computed(() => threeManStore.canRoll())

const scoredOutcomes = computed(() => game.value?.outcomes.filter(o => o.playerId && o.amount > 0) ?? [])
const noteOutcomes = computed(() => game.value?.outcomes.filter(o => !o.playerId) ?? [])

const tally = computed(() => [...(game.value?.players ?? [])].sort((a, b) => b.sips - a.sips))

function nameOf(id: string | null) { return game.value?.players.find(p => p.id === id)?.name ?? '' }
function colorOf(id: string | null) { return game.value?.players.find(p => p.id === id)?.color ?? '#fff' }

/**
 * The active card is `flex: 2.6`, everyone else `1`. Written here rather than as a class
 * because the fill and the border are the player's own colour, which CSS cannot know.
 */
function cardStyle(p: ThreeManPlayer, i: number) {
  if (i !== game.value?.currentPlayerIndex) return {}
  return {
    flex: '2.6',
    background: `color-mix(in srgb, ${p.color} 12%, #0d0d11)`,
    borderColor: p.color,
  }
}

/** Bumped on every roll so a die landing on the number it already showed still tumbles. */
const rollNonce = ref(0)

function rollWithSound() {
  unlockAudio()
  rollNonce.value++
  threeManStore.rollDice()
  const onMe = game.value?.outcomes.some(o => o.playerId === currentPlayer.value.id) ?? false
  playTurnResultSound(onMe)
}

/*
 * No history record. `recordGameResult` is built around a winner and this game does not have
 * one — writing a row with a fabricated winner would put nonsense in the leaderboard rather
 * than leave a gap in it. The tally on the end card is the result.
 */
function finish() { threeManStore.clearGame(); router.replace('/') }
function quit() { threeManStore.endGame(); goBack(router, '/') }
</script>

<style scoped>
/*
 * Street, not glass.
 *
 * What went: the gradient-clipped title, both backdrop-filter bars, every panel radius, the
 * emoji die, and every rgba(255,255,255,0.0X) fill — those became the solid stock the rest of
 * the app uses, because translucent white over a halftone reads as smeared rather than lit.
 */
.tm-page {
  display: flex; flex-direction: column;
  width: 100vw; height: 100dvh; overflow: hidden;
  background: #0d0d11;
  background-image: radial-gradient(rgba(255,255,255,0.11) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  font-family: var(--font-body, Inter, system-ui, sans-serif);
}

/* ── Header ───────────────────────────────────────────────────────────────────────────── */
.tm-header {
  flex-shrink: 0; display: flex; align-items: center; gap: 18px;
  min-height: 86px; padding: 0 26px;
  padding-top: env(safe-area-inset-top);
  background: #101014; border-bottom: 3px solid var(--pink, #ff2d78);
}
.tm-chrome-btn {
  background: transparent; border: 2px solid rgba(255,255,255,0.22); color: #fff;
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 19px; letter-spacing: 0.14em;
  padding: 10px 15px; cursor: pointer; flex-shrink: 0;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
/* Taped, like every other game title. */
.tm-title {
  margin: 0; flex-shrink: 0;
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 46px; line-height: 1;
  background: var(--pink, #ff2d78); color: #101014;
  padding: 5px 16px 3px; transform: rotate(-0.8deg);
  box-shadow: 4px 4px 0 rgba(0,0,0,0.55);
}
.tm-round {
  flex-shrink: 0; background: #fff; color: #101014;
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 26px; letter-spacing: 0.12em;
  padding: 3px 12px 1px; transform: rotate(-1.2deg); box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
}
.tm-holder {
  margin-left: auto; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end;
  border: 2px solid var(--gold, #ffd700); background: rgba(255,215,0,0.12); padding: 4px 14px 6px;
}
.tm-holder-label { font-size: 13px; font-weight: 900; letter-spacing: 0.16em; color: var(--gold, #ffd700); }
.tm-holder-name {
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 30px; line-height: 1;
  color: var(--gold, #ffd700);
}
.tm-holder-empty { opacity: 0.5; }

/* ── Roster ───────────────────────────────────────────────────────────────────────────── */
.tm-roster { flex-shrink: 0; display: flex; align-items: stretch; gap: 16px; padding: 22px 26px; }
/* Six or more: idle tiles drop below the active card rather than shrinking to slivers. */
.tm-roster-wrap { flex-wrap: wrap; }
.tm-roster-wrap .tm-card.active { flex: 1 0 100%; }

.tm-card {
  position: relative; flex: 1;
  display: flex; align-items: center; gap: 18px;
  padding: 18px 20px; min-width: 0;
  background: #141419; border: 2px solid #2a2a34;
}
.tm-card.idle { opacity: 0.62; flex-direction: column; justify-content: center; gap: 2px; }
/* Brighter than the rest of the idle row: the job is worth noticing from across a table. */
.tm-card.holder { opacity: 0.85; border-color: var(--gold, #ffd700); }
.tm-card.active { border-width: 3px; box-shadow: 7px 7px 0 rgba(0,0,0,0.6); }

.tm-tape {
  position: absolute; z-index: 2;
  font-family: var(--font-display, 'Bebas Neue', sans-serif); line-height: 1;
  padding: 3px 11px 2px; box-shadow: 3px 3px 0 rgba(0,0,0,0.5); color: #101014;
}
.tm-tape-turn { top: -15px; left: 20px; font-size: 24px; transform: rotate(-1.4deg); }
.tm-tape-holder {
  top: -14px; left: 12px; font-size: 19px; transform: rotate(-2deg);
  background: var(--gold, #ffd700);
}

.tm-avatar {
  width: 112px; height: 112px; flex-shrink: 0; border-radius: 50%; border: 4px solid;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.55);
}
.tm-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.tm-avatar-glyph { font-size: 52px; line-height: 1; }
.tm-active-text { display: flex; flex-direction: column; min-width: 0; }
.tm-active-name {
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 66px; line-height: 0.95;
  text-shadow: 3px 3px 0 rgba(0,0,0,0.6);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tm-active-count { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.6); letter-spacing: 0.06em; }

.tm-next { font-size: 13px; font-weight: 900; letter-spacing: 0.16em; color: rgba(255,255,255,0.42); }
.tm-idle-name {
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 30px; line-height: 1;
  color: rgba(255,255,255,0.85); max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tm-idle-count { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 40px; line-height: 1; }

/* ── Field ────────────────────────────────────────────────────────────────────────────── */
.tm-field {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 26px 16px;
}
.tm-dice { --die-size: 124px; display: flex; gap: 12px; align-items: center; }
/* A real hole where a die will land, rather than an emoji standing in for one. */
.tm-die-empty {
  width: var(--die-size); height: var(--die-size);
  border: 2px dashed rgba(255,255,255,0.14); background: rgba(0,0,0,0.25);
}
.tm-total-label { font-size: 13px; font-weight: 900; letter-spacing: 0.18em; color: rgba(255,255,255,0.42); }
.tm-total {
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 86px; line-height: 0.9;
  color: var(--gold, #ffd700); font-variant-numeric: tabular-nums;
}

.tm-outcomes { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; margin-top: 4px; }
.tm-line { display: flex; align-items: baseline; gap: 12px; padding: 10px 16px; background: #141419; border-left: 6px solid; }
.tm-line-name { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 30px; line-height: 1; }
.tm-line-amount { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 34px; line-height: 1; color: var(--gold, #ffd700); }
.tm-line-reason { font-size: 15px; color: rgba(255,255,255,0.72); }
.tm-line-note { background: rgba(170,255,0,0.1); border-left-color: var(--lime, #aaff00); }
.tm-line-headline { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 30px; line-height: 1; color: var(--lime, #aaff00); }
.tm-seeking { font-size: 15px; color: rgba(255,255,255,0.55); margin: 0; text-align: center; }

/* ── Footer ───────────────────────────────────────────────────────────────────────────── */
.tm-footer {
  flex-shrink: 0; display: flex; align-items: center; gap: 20px;
  min-height: 140px; padding: 0 26px;
  padding-bottom: env(safe-area-inset-bottom);
  background: #141419; border-top: 4px solid var(--pink, #ff2d78);
}
.tm-turn-label {
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 40px; line-height: 1;
  flex-shrink: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: rgba(255,255,255,0.75);
}
.tm-actions { margin-left: auto; display: flex; gap: 14px; align-items: center; flex-shrink: 0; }
.tm-roll {
  background: var(--lime, #aaff00); color: #101014; border: 3px solid #101014;
  box-shadow: 6px 6px 0 rgba(0,0,0,0.6);
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 46px; letter-spacing: 0.12em;
  min-height: 88px; padding: 0 50px; cursor: pointer; white-space: nowrap;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.tm-roll:disabled { opacity: 0.4; cursor: not-allowed; }
.tm-pass {
  background: transparent; color: #fff; border: 3px solid rgba(255,255,255,0.28);
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 36px; letter-spacing: 0.08em;
  min-height: 88px; padding: 0 30px; cursor: pointer; white-space: nowrap;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.tm-pass:disabled { opacity: 0.4; cursor: not-allowed; }

.tm-assign { margin-left: auto; display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.tm-assign-btn {
  background: #17171d; border: 2px solid; color: #fff; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  min-height: 88px; min-width: 110px; padding: 10px 16px;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.tm-assign-name { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 30px; line-height: 1; }
.tm-assign-count { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.6); }

/* ── Overlays ─────────────────────────────────────────────────────────────────────────── */
.tm-overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(0,0,0,0.86);
}
.tm-panel {
  width: 100%; max-width: 460px; max-height: 82dvh; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 26px 22px; background: #101014; border: 2px solid #2a2a34;
  box-shadow: 10px 10px 0 rgba(0,0,0,0.65); text-align: center;
}
.tm-panel-label { font-size: 13px; font-weight: 900; letter-spacing: 0.18em; color: rgba(255,255,255,0.42); }
.tm-panel-title {
  margin: 0; font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 34px;
  background: var(--pink, #ff2d78); color: #101014; padding: 4px 16px 2px;
  transform: rotate(-0.8deg); box-shadow: 4px 4px 0 rgba(0,0,0,0.55);
}
.tm-tally { list-style: none; margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; gap: 8px; }
.tm-tally-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 10px 14px; background: #16161c; }
.tm-tally-name { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 28px; line-height: 1; }
.tm-tally-count { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 32px; color: var(--gold, #ffd700); }
.tm-rules {
  margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 9px;
  color: #fff; font-size: 15px; line-height: 1.5; text-align: left;
}
.tm-house { font-size: 13px; color: rgba(255,255,255,0.55); margin: 0; line-height: 1.5; }
.tm-wide { width: 100%; font-size: 32px; min-height: 64px; padding: 0 20px; }

.tm-empty {
  height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; background: #0d0d11; color: rgba(255,255,255,0.6);
}

/* ── Breakpoints ──────────────────────────────────────────────────────────────────────── */
/*
 * iPad portrait. The roster's 2.6/1/1/1 needs more width than 834 gives it, so the active card
 * takes the full row and the idle tiles line up beneath — the spotlight survives, the single
 * row does not have to.
 */
@media (max-width: 1099px) {
  .tm-roster { flex-wrap: wrap; padding: 20px; gap: 12px; }
  .tm-card.active { flex: 1 0 100% !important; }
  .tm-active-name { font-size: 48px; }
  .tm-avatar { width: 92px; height: 92px; }
  .tm-avatar-glyph { font-size: 42px; }
  .tm-title { font-size: 38px; }
  .tm-dice { --die-size: 104px; }
  .tm-total { font-size: 68px; }
  .tm-footer { min-height: 120px; }
  .tm-roll { font-size: 38px; padding: 0 34px; min-height: 76px; }
  .tm-pass { font-size: 30px; min-height: 76px; }
  .tm-turn-label { font-size: 32px; }
}

@media (max-width: 767px) {
  .tm-header { min-height: 68px; gap: 10px; padding: 8px 14px; flex-wrap: wrap; }
  .tm-title { font-size: 28px; padding: 4px 11px 2px; }
  .tm-round { font-size: 19px; }
  .tm-holder-name { font-size: 22px; }
  .tm-chrome-btn { font-size: 15px; padding: 8px 11px; }
  .tm-roster { padding: 16px 14px; gap: 10px; }
  .tm-active-name { font-size: 34px; }
  .tm-avatar { width: 64px; height: 64px; border-width: 3px; }
  .tm-avatar-glyph { font-size: 30px; }
  .tm-idle-name { font-size: 21px; }
  .tm-idle-count { font-size: 27px; }
  .tm-tape-turn { font-size: 17px; top: -12px; left: 12px; }
  .tm-tape-holder { font-size: 14px; top: -11px; }
  .tm-dice { --die-size: 76px; gap: 10px; }
  .tm-total { font-size: 48px; }
  .tm-line { padding: 8px 12px; gap: 9px; }
  .tm-line-name, .tm-line-headline { font-size: 22px; }
  .tm-line-amount { font-size: 25px; }
  /* The reason text is the point of the screen, so it holds at 15px here too. */
  .tm-footer { min-height: 96px; gap: 10px; padding: 0 14px; flex-wrap: wrap; }
  .tm-turn-label { font-size: 22px; }
  .tm-roll { font-size: 28px; padding: 0 22px; min-height: 62px; border-width: 2px; box-shadow: 4px 4px 0 rgba(0,0,0,0.6); }
  .tm-pass { font-size: 22px; padding: 0 16px; min-height: 62px; border-width: 2px; }
  .tm-assign-btn { min-height: 62px; min-width: 88px; padding: 8px 10px; }
  .tm-assign-name { font-size: 21px; }
}
</style>

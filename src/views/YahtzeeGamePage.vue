<template>
  <!--
    The ink is declared on the page, not on the card.
    The card was the only thing that needed the tokens until the held-die ring did. The dice
    sit outside the card, so a token defined on `.sc-card` could not reach them — which is how
    the ring ended up carrying the player's colour instead of the ink's. Declaring the ink here
    lets everything on the screen speak the same one; `.ink-*` blocks are custom properties
    only, so nothing else changes by moving them up.
  -->
  <div class="game-page" :class="`ink-${cardSkin}`">
    <div class="drip-bar" />

    <!-- FINISHED OVERLAY -->
    <div v-if="game && game.status === 'finished'" class="finish-overlay" :style="winner ? { background: `radial-gradient(ellipse at center, ${winner.color}40 0%, #0a0a0a 80%)` } : {}">
      <div class="finish-scroll">
        <div class="finish-inner">
          <div class="trophy-wrap">
            <span class="trophy">🏆</span>
            <div class="trophy-glow" :style="{ background: winner?.color }" />
          </div>
          <div class="finish-over display">GAME OVER</div>
          <div class="winner-name display" :style="{ color: winner?.color, filter: `drop-shadow(0 0 20px ${winner?.color})` }">{{ winner?.name }}</div>
          <div class="winner-sub">wins with {{ winner ? grandTotal(winnerScorecard!) : 0 }} points</div>

          <div class="finish-rankings">
            <div
              v-for="(ps, rank) in rankedPlayers"
              :key="ps.player.id"
              class="rank-row"
              :class="{ 'rank-winner': ps.player.id === game.winnerId }"
              :style="ps.player.id === game.winnerId ? { borderColor: ps.player.color, background: `${ps.player.color}20` } : {}"
            >
              <span class="rank-place display" :style="rank === 0 ? { color: ps.player.color } : {}">{{ rank + 1 }}</span>
              <div class="rank-avatar" :style="{ background: ps.player.color }">
                <img v-if="isPhoto(ps.player.avatarUrl)" :src="ps.player.avatarUrl!" alt="" />
                <span v-else>{{ avatarGlyph(ps.player) }}</span>
              </div>
              <span class="rank-name">{{ ps.player.name }}</span>
              <span class="rank-score" :style="ps.player.id === game.winnerId ? { color: ps.player.color } : {}">
                {{ grandTotal(ps.scorecard) }}
              </span>
            </div>
          </div>

          <div class="finish-actions">
            <button v-ripple class="btn btn-spray btn-xl" @click="playAgain">Play Again</button>
            <button v-ripple class="btn btn-outline btn-lg" @click="goHome">Home</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PLAYING UI -->
    <template v-if="game && game.status === 'playing'">
      <!-- TURN HEADER: controls only -->
      <div class="turn-header" :style="{ borderBottomColor: currentPlayer?.color }">
        <!-- Every other game puts quit in the header. Yahtzee had it two taps deep inside the
             ⚙ panel — and on iPad portrait that ⚙ is itself hidden from this bar. -->
        <button v-ripple class="btn btn-outline btn-sm header-quit-btn" @click="quitGame">← Quit</button>
        <span class="turn-header-title display">YAHTZEE</span>
        <button v-ripple class="header-sc-btn header-bets-btn" :class="{ 'header-sc-btn-active': showSettings }" @click="showSettings = !showSettings" title="Bets & Settings">BETS</button>
        <button v-ripple class="header-sc-btn header-sc-btn-grey" :class="{ 'header-sc-btn-active': showSettings }" @click="showSettings = !showSettings" title="Settings">⚙</button>
      </div>

      <!-- PLAYER BANNER: avatar + name below the line -->
      <div
        class="player-banner"
        :style="{ background: `linear-gradient(180deg, ${currentPlayer?.color}22 0%, transparent 100%)`, borderBottomColor: currentPlayer?.color + '30' }"
        @click="router.push({ path: '/player-setup', query: { edit: currentPlayer?.id, from: 'yahtzee' } })"
      >
        <div
          class="banner-avatar"
          :style="{ background: currentPlayer?.color, boxShadow: `0 0 20px ${currentPlayer?.color}90` }"
        >
          <img v-if="isPhoto(currentPlayer?.avatarUrl)" :src="currentPlayer!.avatarUrl!" alt="" />
          <span v-else>{{ avatarGlyph(currentPlayer) }}</span>
        </div>
        <span class="banner-name display" :style="{ color: currentPlayer?.color, '--pcolor': currentPlayer?.color }">{{ currentPlayer?.name }}</span>
        <div class="banner-score">
          <span class="banner-total display" :style="{ color: currentPlayer?.color }">{{ grandTotal(game.playerStates[game.currentPlayerIndex]!.scorecard) }}</span>
          <span class="banner-pts">pts</span>
        </div>
      </div>

      <!-- PLAYER TABS -->
      <div v-show="showTabs" class="player-tabs">
        <button
          v-for="(ps, i) in game.playerStates"
          :key="ps.player.id"
          v-ripple
          class="player-tab"
          :class="{ 'tab-active': viewingIndex === i, 'tab-current': i === game.currentPlayerIndex }"
          :style="viewingIndex === i ? { borderBottomColor: ps.player.color, color: ps.player.color } : {}"
          @click="viewingIndex = i"
        >
          <div class="tab-avatar" :style="{ background: ps.player.color }">
            <img v-if="isPhoto(ps.player.avatarUrl)" :src="ps.player.avatarUrl!" alt="" />
            <span v-else style="font-size:10px">{{ avatarGlyph(ps.player) }}</span>
          </div>
          <span class="tab-name">{{ ps.player.name }}</span>
          <span class="tab-score">{{ grandTotal(ps.scorecard) }}</span>
        </button>
      </div>

      <!-- DICE AREA -->
      <div class="dice-area" v-if="isMyTurn" :style="{ background: `linear-gradient(180deg, ${currentPlayer?.color}0a 0%, transparent 100%)` }">

        <!-- YAHTZEE FLASH BANNER -->
        <Transition name="yahtzee-flash">
          <div v-if="yahtzeeFlash" class="yahtzee-flash-banner" :style="{ borderColor: currentPlayer?.color, boxShadow: `0 0 24px ${currentPlayer?.color}60` }">
            <span class="yf-emoji">🎲</span>
            <span class="yf-text display" :style="{ color: currentPlayer?.color }">YAHTZEE!</span>
            <span class="yf-emoji">🎲</span>
          </div>
        </Transition>

        <!-- DICE ROW + ROLL BUTTON (side by side) -->
        <div class="dice-and-ctrl">
          <div class="dice-row">
            <div
              v-for="(val, i) in game.dice"
              :key="i"
              class="die-wrap"
              :class="{ 'die-held': game.held[i], [`die-theme-${dieTheme}`]: true }"
              @click="onDieTap(i)"
            >
              <DiceFace
                class="die"
                :face="val"
                :face-bg="dieCubeFace(!!game.held[i])"
                :pip-color="diePipFill(!!game.held[i])"
                :edge-color="dieFaceStroke(!!game.held[i])"
                :rolling="diceRolling && !game.held[i]"
              />
              <span v-if="game.diceMode === 'physical'" class="die-tap-hint">tap to cycle</span>
              <!-- Same ink as the ring above it: the two are one signal, not two. -->
              <span v-if="game.held[i]" class="held-label">HELD</span>
            </div>
          </div>

          <!-- ELECTRONIC: roll button on the right -->
          <div v-if="game.diceMode === 'electronic'" class="roll-right">
            <div class="roll-indicator">
              <span
                v-for="n in 3" :key="n"
                class="roll-pip"
                :class="{ 'pip-done': n <= game.rollCount }"
                :style="n <= game.rollCount ? { background: currentPlayer?.color } : {}"
              />
            </div>
            <button
              v-ripple
              class="btn btn-spray roll-btn-side"
              :disabled="game.rollCount >= 3 && !diceRolling"
              @click="diceRolling ? stopRoll() : doRoll()"
            >
              {{ diceRolling ? 'STOP' : game.rollCount === 0 ? 'ROLL' : game.rollCount >= 3 ? 'DONE' : 'ROLL↺' }}
            </button>
          </div>
        </div>

        <!-- HINTS -->
        <p v-if="game.diceMode === 'electronic' && yahtzeeAutoScored" class="score-hint yf-hint">YAHTZEE scored! Roll again to continue</p>
        <p v-else-if="game.diceMode === 'electronic' && game.rollCount > 0 && game.rollCount < 3" class="score-hint">Tap dice to hold · press <strong>ROLL↺</strong> to reroll · or pick a category to score</p>
        <p v-else-if="game.diceMode === 'electronic' && game.rollCount >= 3" class="score-hint">3 rolls used — select a category to score</p>

        <!-- PHYSICAL MODE CONTROLS -->
        <div v-if="game.diceMode === 'physical'" class="roll-controls">
          <div class="physical-roll-steps">
            <button
              v-for="n in 3" :key="n"
              v-ripple
              class="physical-step-btn"
              :class="{ 'step-active': game.rollCount >= n }"
              :style="game.rollCount >= n ? { borderColor: currentPlayer?.color, color: currentPlayer?.color, background: (currentPlayer?.color ?? '') + '22' } : {}"
              @click="yahtzeeStore.setPhysicalRollCount(n)"
            >
              Roll {{ n }}
            </button>
          </div>
          <p v-if="game.rollCount > 0" class="score-hint">Set dice above, then select a category to score</p>
        </div>
      </div>

      <div v-else class="viewing-banner">
        <span>Viewing <strong>{{ viewedState?.player.name }}</strong>'s scorecard</span>
        <button v-ripple class="btn btn-sm btn-surface" @click="viewingIndex = game.currentPlayerIndex">Back to turn</button>
      </div>

      <!-- SCORESHEET TIMER BAR -->
      <div v-if="isMyTurn && scoresheetTimerEnabled && scoresheetTimeLeft > 0" class="sc-timer-bar" :class="{ 'sc-timer-alert': showScoresheetAlert }" @click="toggleScoresheetPause">
        <div class="sc-timer-fill"
          :class="{ urgent: showScoresheetAlert, paused: scoresheetPaused }"
          :style="{ width: `${(scoresheetTimeLeft / scoresheetTimerDuration) * 100}%`, transition: scoresheetPaused ? 'none' : 'width 1s linear' }" />
        <span class="sc-timer-text" :class="{ urgent: showScoresheetAlert }">
          {{ scoresheetPaused ? 'PAUSED' : scoresheetTimeLeft + 's' }}
        </span>
      </div>

      <!--
        SCORECARD

        Two panels rather than one continuous sheet, so iPad landscape can set them side by
        side and the whole card fits 1194 x 834 without scrolling. Below the tablet band they
        stack, which is the same markup in one column.

        Everything about the anatomy is shared; the three inks differ only in colour, type and
        shadow, so they are a token set on the root rather than three copies of the card.
      -->
      <div class="scorecard-scroll" :style="scorecardBgStyle">
        <div class="sc-card" :class="`ink-${cardSkin}`">

          <section class="sc-panel">
            <span class="sc-tape">UPPER SECTION</span>
            <div class="sc-headrow">
              <span class="sc-h-name">CATEGORY</span>
              <span class="sc-h-howto">
                HOW TO SCORE
                <span class="sc-ipad-btns">
                  <button v-ripple class="header-sc-btn header-sc-btn-grey" :class="{ 'header-sc-btn-active': showSettings }" @click.stop="showSettings = !showSettings" title="Settings">⚙</button>
                </span>
              </span>
              <span class="sc-h-pts">
                PTS
                <span class="sc-round-label">RD {{ currentRound }}/13</span>
              </span>
            </div>

            <div
              v-for="cat in upperCategories"
              :key="cat.key"
              class="sc-row"
              :class="{
                filled: viewedState?.scorecard[cat.key] !== null,
                takeable: isMyTurn && canScore && viewedState?.scorecard[cat.key] === null,
                live: isMyTurn && wouldScore(cat.key),
                pending: pendingCategory === cat.key,
              }"
              @click="tryScore(cat.key)"
            >
              <span class="sc-name">
                <svg class="sc-die-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1.5" y="1.5" width="21" height="21" class="sc-die-bg" />
                  <circle
                    v-for="(dot, di) in dotPositions[(cat.dieValue ?? 1) - 1]"
                    :key="di"
                    :cx="dot[0] * 0.667" :cy="dot[1] * 0.667" r="2"
                    class="sc-die-pip"
                  />
                </svg>
                <span class="sc-cat-label">{{ cat.label }}</span>
              </span>
              <span class="sc-howto">{{ cat.howTo }}</span>
              <span class="sc-pts">{{ scorecardDisplay(cat.key) }}</span>
            </div>

            <div class="sc-total">
              <span class="sc-name">TOTAL SCORE</span>
              <span class="sc-howto">Add Only Upper Section</span>
              <span class="sc-pts">{{ upperTotal(viewedState!.scorecard) }}</span>
            </div>
            <div class="sc-total">
              <span class="sc-name">BONUS</span>
              <span class="sc-howto">Score 35 if ≥ 63</span>
              <span class="sc-pts" :class="{ starred: upperBonus(viewedState!.scorecard) > 0 }">{{ upperBonusDisplay }}</span>
            </div>
            <div class="sc-total sc-total-key">
              <span class="sc-name">UPPER TOTAL</span>
              <span class="sc-howto"></span>
              <span class="sc-pts">{{ upperTotal(viewedState!.scorecard) + upperBonus(viewedState!.scorecard) }}</span>
            </div>
          </section>

          <section class="sc-panel">
            <span class="sc-tape">LOWER SECTION</span>
            <div class="sc-headrow">
              <span class="sc-h-name">CATEGORY</span>
              <span class="sc-h-howto">HOW TO SCORE</span>
              <span class="sc-h-pts">PTS</span>
            </div>

            <div
              v-for="cat in lowerCategories"
              :key="cat.key"
              class="sc-row"
              :class="{
                filled: viewedState?.scorecard[cat.key] !== null,
                takeable: isMyTurn && canScore && viewedState?.scorecard[cat.key] === null,
                live: isMyTurn && wouldScore(cat.key),
                pending: pendingCategory === cat.key,
              }"
              @click="tryScore(cat.key)"
            >
              <span class="sc-name">
                <span class="sc-cat-label" :class="{ starred: cat.key === 'yahtzee' }">{{ cat.label }}</span>
              </span>
              <span class="sc-howto">{{ cat.howTo }}</span>
              <span class="sc-pts">{{ scorecardDisplay(cat.key) }}</span>
            </div>

            <div class="sc-row filled">
              <span class="sc-name"><span class="sc-cat-label">YAHTZEE BONUS</span></span>
              <span class="sc-howto sc-bonus-checks">
                <span v-for="n in 3" :key="n" class="sc-bonus-check" :class="{ on: viewedState!.scorecard.yahtzeeBonusCount >= n }">✓</span>
              </span>
              <span class="sc-pts" :class="{ starred: viewedState!.scorecard.yahtzeeBonusCount > 0 }">
                {{ viewedState!.scorecard.yahtzeeBonusCount > 0 ? viewedState!.scorecard.yahtzeeBonusCount * 100 : '—' }}
              </span>
            </div>

            <div class="sc-total">
              <span class="sc-name">LOWER TOTAL</span>
              <span class="sc-howto"></span>
              <span class="sc-pts">{{ lowerTotal(viewedState!.scorecard) }}</span>
            </div>
            <div class="sc-total">
              <span class="sc-name">UPPER TOTAL</span>
              <span class="sc-howto"></span>
              <span class="sc-pts">{{ upperTotal(viewedState!.scorecard) + upperBonus(viewedState!.scorecard) }}</span>
            </div>
            <div class="sc-total sc-total-key sc-grand">
              <span class="sc-name">GRAND TOTAL</span>
              <span class="sc-howto"></span>
              <span class="sc-pts">{{ grandTotal(viewedState!.scorecard) }}</span>
            </div>
          </section>

        </div>
      </div>
    </template>

    <!-- SETTINGS OVERLAY -->
    <Transition name="dp-fade">
      <div v-if="showSettings" class="dice-picker-overlay" @click.self="showSettings = false">
        <div class="dice-picker-panel">
          <div class="dice-picker-header">
            <span class="dice-picker-title display">SETTINGS</span>
            <button class="dice-picker-close" @click="showSettings = false">✕</button>
          </div>
          <div class="sc-settings-list">
            <div class="sc-settings-row">
              <div class="sc-settings-info">
                <span class="sc-settings-label">Show Players</span>
                <span class="sc-settings-sub">Toggle the player tab bar</span>
              </div>
              <button class="sc-settings-toggle" :class="{ active: showTabs }" @click="showTabs = !showTabs">
                {{ showTabs ? 'ON' : 'OFF' }}
              </button>
            </div>
            <!--
              How the roll ends, and how much of the card is on screen.

              Rolling had an overlay of its own behind a second header button; two panels for
              four switches is one panel too many, so every mid-game setting lives here now.

              Light Theme used to sit here too and is gone for good — it was a second, worse way
              of choosing a card's colours. The ink picker on the player's profile is the first,
              and Paper Card is the light one.
            -->
            <div class="sc-settings-row">
              <div class="sc-settings-info">
                <span class="sc-settings-label">Rolling</span>
                <span class="sc-settings-sub">Whether the dice stop themselves</span>
              </div>
              <div class="sc-settings-seg">
                <button
                  v-for="opt in ROLL_STOP_MODES" :key="opt.value"
                  v-ripple
                  class="sc-settings-seg-btn"
                  :class="{ active: rollStop === opt.value }"
                  @click="rollStop = opt.value"
                >{{ opt.icon }} {{ opt.label }}</button>
              </div>
            </div>
            <div class="sc-settings-row">
              <div class="sc-settings-info">
                <span class="sc-settings-label">Show Scored</span>
                <span class="sc-settings-sub">Keep filled rows on your own card</span>
              </div>
              <button class="sc-settings-toggle" :class="{ active: showScored }" @click="showScored = !showScored">
                {{ showScored ? 'ON' : 'OFF' }}
              </button>
            </div>
            <!-- Score timer setting -->
            <div class="sc-settings-row">
              <div class="sc-settings-info">
                <span class="sc-settings-label">Score Timer</span>
                <span class="sc-settings-sub">Time limit to pick a category</span>
              </div>
              <button class="sc-settings-toggle" :class="{ active: scoresheetTimerEnabled }" @click="scoresheetTimerEnabled = !scoresheetTimerEnabled">
                {{ scoresheetTimerEnabled ? 'ON' : 'OFF' }}
              </button>
            </div>
            <div v-if="scoresheetTimerEnabled" class="sc-settings-timer-row">
              <span class="sc-settings-sub">Duration</span>
              <div class="sc-settings-timer-btns">
                <button v-for="t in [30, 60, 90, 120]" :key="t" v-ripple class="timer-ctrl-btn" :class="{ active: scoresheetTimerDuration === t }" @click="scoresheetTimerDuration = t">{{ t }}s</button>
              </div>
            </div>

            <!-- Bets -->
            <div class="sc-settings-divider">BETS</div>
            <div class="sc-settings-bet-section">
              <div class="sc-settings-bet-label">Round Bet</div>
              <div class="sc-settings-bet-row">
                <span class="bet-dollar">$</span>
                <input v-model="roundBetInput" class="bet-input" type="number" inputmode="decimal" placeholder="0.00" min="0" />
                <button v-ripple class="bet-set-btn" @click="setRoundBet">SET</button>
                <button v-if="roundBetActive !== null" v-ripple class="bet-clear-btn" @click="roundBetActive = null; roundBetInput = ''">✕</button>
              </div>
              <div v-if="roundBetActive !== null" class="bet-active-badge">Active: <strong>${{ roundBetActive }}</strong></div>
            </div>
            <div class="sc-settings-bet-section">
              <div class="sc-settings-bet-label">Game Bet</div>
              <div class="sc-settings-bet-row">
                <span class="bet-dollar">$</span>
                <input v-model="gameBetInput" class="bet-input" type="number" inputmode="decimal" placeholder="0.00" min="0" />
                <button v-ripple class="bet-set-btn" @click="setGameBet">SET</button>
                <button v-if="gameBetActive !== null" v-ripple class="bet-clear-btn" @click="gameBetActive = null; gameBetInput = ''">✕</button>
              </div>
              <div v-if="gameBetActive !== null" class="bet-active-badge">Active: <strong>${{ gameBetActive }}</strong></div>
            </div>

            <!--
              Leaving, as opposed to quitting.

              Quit Game ends it for the table. This takes one person out and lets the rest
              carry on, which is the thing that actually happens: somebody has to go, and the
              choice used to be play on for them or bin everyone's cards.
            -->
            <div v-if="canLeave" class="sc-settings-divider">LEAVE</div>
            <div v-if="canLeave" class="sc-leave-list">
              <p class="sc-leave-note">Their card goes with them. Everyone else keeps playing.</p>
              <button
                v-for="p in leavablePlayers" :key="p.id"
                v-ripple
                class="sc-leave-row"
                :class="{ confirming: leavingId === p.id }"
                @click="leavingId === p.id ? confirmLeave(p.id) : (leavingId = p.id)"
              >
                <div class="sc-add-avatar" :style="{ background: p.color }">
                  <img v-if="p.avatarUrl?.startsWith('data:') || p.avatarUrl?.startsWith('http')" :src="p.avatarUrl!" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
                  <span v-else style="font-size:14px">{{ avatarGlyph(p) }}</span>
                </div>
                <span class="sc-add-name">{{ p.name }}</span>
                <span class="sc-leave-action">{{ leavingId === p.id ? 'TAP TO CONFIRM' : 'LEAVE' }}</span>
              </button>
            </div>

            <div class="sc-settings-quit-row">
              <button v-ripple class="sc-settings-quit-btn" @click="quitGame">Quit Game</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import { chooseCategory, chooseKeeps } from '../lib/yahtzeeBot'
import { useYahtzeeStore, grandTotal, upperTotal, upperBonus, lowerTotal, calcScore, YAHTZEE_CATEGORIES } from '../stores/yahtzee'
import { usePlayersStore } from '../stores/players'
import type { YahtzeeCategory } from '../stores/yahtzee'
import { DIE_GRADIENTS, GRADIENT_DIE_THEMES, type DiceTheme, type YahtzeeCardSkin } from '../types/index'
import { useNarrator } from '../composables/useNarrator'
import { recordGameResult } from '../api/gameResults'
import DiceFace from '../components/DiceFace.vue'

const router = useRouter()
const { narrateAsync } = useNarrator()
const yahtzeeStore = useYahtzeeStore()
const playersStore = usePlayersStore()
const game = computed(() => yahtzeeStore.game)

const viewingIndex = ref(0)
/*
 * On by default. Thirteen rounds means the card is mostly spent lines by the end, and the
 * three or four still open are the whole decision — leaving the filled ones in view puts the
 * choice at the bottom of a list of things already done. The switch stays, so anyone who
 * wants the full card back has it.
 */
const showTabs = ref(false)
const yahtzeeFlash = ref(false)
const yahtzeeAutoScored = ref(false)
let yahtzeeFlashTimer: ReturnType<typeof setTimeout> | null = null

/*
 * Auto: one press and the dice roll and settle themselves. Manual: they keep going until the
 * player presses STOP, which is how a shaken cup feels — the table decides when the dice land.
 */
type RollStop = 'auto' | 'manual'
const ROLL_STOP_MODES: { value: RollStop; label: string; icon: string }[] = [
  { value: 'auto', label: 'Stops itself', icon: '🎲' },
  { value: 'manual', label: 'I press stop', icon: '✋' },
]
const rollStop = ref<RollStop>(localStorage.getItem('yahtzee_roll_stop') === 'manual' ? 'manual' : 'auto')
watch(rollStop, v => localStorage.setItem('yahtzee_roll_stop', v))

const diceRolling = ref(false)
let animTimer: ReturnType<typeof setTimeout> | null = null
const AUTO_ROLL_MS = 850


/*
 * THE TAP IS THE THROW. The dice are decided when the roll ENDS, not when it starts: pressing
 * the button starts the cubes tumbling, and the values are drawn at the moment they land —
 * whether that moment comes from the player pressing STOP or from the dice stopping themselves.
 * This is the behaviour already shipped, and the reason the cube spins before it has a value.
 *
 * A bot always stops itself: it has no thumb to press STOP with.
 */
function doRoll() {
  if (diceRolling.value) return
  if (animTimer) clearTimeout(animTimer)
  yahtzeeFlash.value = false
  yahtzeeAutoScored.value = false
  diceRolling.value = true
  if (rollStop.value === 'auto' || currentIsBot.value) {
    animTimer = setTimeout(stopRoll, AUTO_ROLL_MS)
  }
}

function stopRoll() {
  if (animTimer) { clearTimeout(animTimer); animTimer = null }
  if (!diceRolling.value) return
  // Rolled first, then landed, in that order and in one tick: the die is told its value before
  // it is told to stop, so it lands on the new number rather than settling on the old one and
  // flipping again.
  yahtzeeStore.rollDice()
  diceRolling.value = false
  nextTick(() => {
    if (!game.value) return
    const isYahtzee = new Set(game.value.dice).size === 1
    if (isYahtzee) {
      if (yahtzeeFlashTimer) clearTimeout(yahtzeeFlashTimer)
      yahtzeeFlash.value = true
      yahtzeeAutoScored.value = true
      yahtzeeStore.autoScoreYahtzee()
      yahtzeeFlashTimer = setTimeout(() => { yahtzeeFlash.value = false }, 4000)
    }
  })
}

/*
 * The player's photo behind the card. Each ink paints its own opaque page colour over it, so
 * this reads as a tint at the edges rather than as competition with the card itself.
 */
const scorecardBgStyle = computed(() => {
  const bg = viewedState.value?.player.playerBackground
  if (!bg) return {}
  if (bg.startsWith('data:') || bg.startsWith('http')) {
    return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }
  return { background: bg }
})

watch(() => game.value?.currentPlayerIndex, (idx) => {
  if (idx !== undefined) viewingIndex.value = idx
  // A held roll belongs to the seat that threw it: if the turn moves on, the dice come down.
  if (animTimer) { clearTimeout(animTimer); animTimer = null }
  diceRolling.value = false
})

onMounted(() => {
  if (!game.value) { router.push('/yahtzee/setup'); return }
  viewingIndex.value = game.value.currentPlayerIndex
  if (game.value.status === 'finished') {
    recordResults()
  }
})

let resultsRecorded = false
function recordResults() {
  if (resultsRecorded || !game.value) return
  resultsRecorded = true
  for (const ps of game.value.playerStates) {
    if (ps.player.id === game.value.winnerId) playersStore.recordWin(ps.player.id)
    else playersStore.recordGame(ps.player.id)
  }
  if (winner.value) {
    // Personality-aware now; this line was hard-coded identically here and in WinPage.
    narrateAsync('win', { name: winner.value.name })
  }
  // `resultsRecorded` above is a per-mount flag, so it cannot survive a refresh —
  // this game's stable id is what actually makes the server-side record idempotent.
  const g = game.value
  void recordGameResult({
    clientGameId: g.id,
    gameType: 'yahtzee',
    winnerId: g.winnerId ?? '',
    playerIds: g.playerStates.map(ps => ps.player.id),
    startedAt: g.startedAt ?? null,
    finishedAt: new Date().toISOString(),
    finalScores: Object.fromEntries(g.playerStates.map(ps => [ps.player.id, ps.scorecard])),
  })
}

watch(() => game.value?.status, (s) => {
  if (s === 'finished') recordResults()
})

const currentPlayer = computed(() => {
  const snap = game.value?.players[game.value.currentPlayerIndex]
  if (!snap) return null
  // Prefer live player from store so mid-game edits (diceTheme, color, etc.) reflect immediately
  return playersStore.players.find(p => p.id === snap.id) ?? snap
})
const viewedState = computed(() => game.value?.playerStates[viewingIndex.value])
const isMyTurn = computed(() => viewingIndex.value === game.value?.currentPlayerIndex)
const canScore = computed(() => (game.value?.rollCount ?? 0) >= 1)
const currentRound = computed(() => {
  const sc = game.value?.playerStates[game.value.currentPlayerIndex]?.scorecard
  if (!sc) return 1
  // Only the 13 scoring categories count as rounds. `yahtzeeBonusCount` also lives on the
  // scorecard and starts at 0, not null — counting raw non-null values opened the game on
  // "RD 2/13" and left the last round showing 13 a round early.
  return Math.min(YAHTZEE_CATEGORIES.filter(c => sc[c] !== null).length + 1, 13)
})

const winner = computed(() => {
  if (!game.value?.winnerId) return null
  return game.value.players.find(p => p.id === game.value!.winnerId) ?? null
})
const winnerScorecard = computed(() => {
  if (!game.value?.winnerId) return null
  return game.value.playerStates.find(ps => ps.player.id === game.value!.winnerId)?.scorecard ?? null
})
const rankedPlayers = computed(() => {
  if (!game.value) return []
  return [...game.value.playerStates].sort((a, b) => grandTotal(b.scorecard) - grandTotal(a.scorecard))
})

const dotPositions: [number, number][][] = [
  [[18, 18]],
  [[24, 10], [12, 26]],
  [[24, 10], [18, 18], [12, 26]],
  [[12, 10], [24, 10], [12, 26], [24, 26]],
  [[12, 10], [24, 10], [18, 18], [12, 26], [24, 26]],
  [[12, 10], [12, 18], [12, 26], [24, 10], [24, 18], [24, 26]],
]

const dieTheme = computed<DiceTheme>(() => currentPlayer.value?.diceTheme ?? 'casino')
const showSettings = ref(false)
/*
 * Two taps to leave, on the row itself rather than through a modal.
 *
 * Removing a player mid-game is not undoable — their card is gone — but a confirm dialog for
 * it would be the fourth overlay on this screen. Arming the row instead keeps the weight
 * without the furniture, and it reads as what it is: you are pointing at a person.
 */
/*
 * This panel lives outside the `v-if="game"` wrapper — it is an overlay, drawn over whatever
 * is behind it — so the template has no narrowing here and `game.players` is a null deref
 * waiting to happen. Reading it through computeds answers that once rather than at each of
 * the three places the list is touched.
 */
const canLeave = computed(() => (game.value?.players.length ?? 0) > 1)
const leavablePlayers = computed(() => game.value?.players ?? [])

const leavingId = ref<string | null>(null)
function confirmLeave(playerId: string) {
  leavingId.value = null
  stopScoresheetTimer()
  yahtzeeStore.leaveGame(playerId)
  // The turn may now belong to somebody else, so the clock starts again for them.
  if (game.value?.status === 'playing' && scoresheetTimerEnabled.value) startScoresheetTimer()
}
// An armed row that is left alone should not still be armed the next time the panel opens.
watch(() => showSettings.value, (open) => { if (!open) leavingId.value = null })

const roundBetInput = ref('')
const gameBetInput = ref('')
const roundBetActive = ref<number | null>(null)
const gameBetActive = ref<number | null>(null)

function setRoundBet() {
  const val = parseFloat(roundBetInput.value)
  if (!isNaN(val) && val > 0) { roundBetActive.value = val; roundBetInput.value = '' }
}
function setGameBet() {
  const val = parseFloat(gameBetInput.value)
  if (!isNaN(val) && val > 0) { gameBetActive.value = val; gameBetInput.value = '' }
}

function isGradient(theme: DiceTheme): boolean {
  return GRADIENT_DIE_THEMES.has(theme)
}

function dieFaceFill(held: boolean): string {
  if (isGradient(dieTheme.value)) return 'transparent'
  const p = currentPlayer.value?.color ?? '#ff2d78'
  switch (dieTheme.value) {
    case 'casino':   return held ? '#e4e4e4' : '#ffffff'
    case 'neon':     return held ? '#141414' : '#080808'
    case 'metallic': return held ? '#b0b0c0' : '#888898'
    case 'wooden':   return held ? '#8b5e2c' : '#a0742e'
    case 'vintage':  return held ? '#d8d0b8' : '#f0e8d0'
    default:         return held ? (p + '55') : (p + '18')
  }
}
function dieFaceStroke(held: boolean): string {
  if (isGradient(dieTheme.value)) return held ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'
  const p = currentPlayer.value?.color ?? '#ff2d78'
  switch (dieTheme.value) {
    case 'casino':   return '#222'
    case 'neon':     return held ? p : (p + '66')
    case 'metallic': return held ? '#aaa' : '#666'
    case 'wooden':   return '#5a2e08'
    case 'vintage':  return '#b0a070'
    default:         return 'transparent'
  }
}
/*
 * One background for the cube's faces, covering all thirty-four themes. The gradients pass
 * straight through; metallic's three-stop sheen and wooden's grain lines were SVG before and are
 * plain CSS backgrounds now, so nothing about the picker or the theme list had to change.
 * Corner radius is gone from here — the cube's pillow corner belongs to the die, not the theme.
 */
function dieCubeFace(held: boolean): string {
  if (isGradient(dieTheme.value)) {
    const grad = DIE_GRADIENTS[dieTheme.value]
    if (grad) return held ? grad.replace('135deg', '155deg') : grad
  }
  if (dieTheme.value === 'metallic') {
    return held
      ? 'linear-gradient(135deg, #dcdce8, #9090a4 50%, #404050)'
      : 'linear-gradient(135deg, #c8c8d8, #787890 50%, #383848)'
  }
  if (dieTheme.value === 'wooden') {
    const stock = held ? '#8b5e2c' : '#a0742e'
    return `repeating-linear-gradient(180deg, rgba(74,32,8,0.30) 0 1px, transparent 1px 17%), ${stock}`
  }
  if (dieTheme.value === 'vintage') {
    const stock = held ? '#d8d0b8' : '#f0e8d0'
    return `linear-gradient(0deg, rgba(192,168,112,0.55), rgba(192,168,112,0.55)) padding-box, ${stock}`
  }
  return dieFaceFill(held)
}
function diePipFill(held: boolean): string {
  if (isGradient(dieTheme.value)) return held ? '#ffffff' : 'rgba(255,255,255,0.85)'
  const p = currentPlayer.value?.color ?? '#ff2d78'
  switch (dieTheme.value) {
    case 'casino':   return '#111'
    case 'neon':     return p
    case 'metallic': return held ? '#111' : '#222'
    case 'wooden':   return held ? '#f0d888' : '#2e0e00'
    case 'vintage':  return '#6c4218'
    default:         return held ? p : '#ffffff'
  }
}

interface CatDef { key: YahtzeeCategory; label: string; dieValue?: number; howTo: string }
const ALL_UPPER_CATEGORIES: CatDef[] = [
  { key: 'aces',   label: 'Aces',   dieValue: 1, howTo: 'Count and Add Only Aces' },
  { key: 'twos',   label: 'Twos',   dieValue: 2, howTo: 'Count and Add Only Twos' },
  { key: 'threes', label: 'Threes', dieValue: 3, howTo: 'Count and Add Only Threes' },
  { key: 'fours',  label: 'Fours',  dieValue: 4, howTo: 'Count and Add Only Fours' },
  { key: 'fives',  label: 'Fives',  dieValue: 5, howTo: 'Count and Add Only Fives' },
  { key: 'sixes',  label: 'Sixes',  dieValue: 6, howTo: 'Count and Add Only Sixes' },
]
const ALL_LOWER_CATEGORIES: CatDef[] = [
  { key: 'threeOfAKind',  label: '3 of a Kind',    howTo: 'Add Total of All Dice' },
  { key: 'fourOfAKind',   label: '4 of a Kind',    howTo: 'Add Total of All Dice' },
  { key: 'fullHouse',     label: 'Full House',     howTo: 'Score 25' },
  { key: 'smallStraight', label: 'Sm. Straight',   howTo: 'Score 30' },
  { key: 'largeStraight', label: 'Lg. Straight',   howTo: 'Score 40' },
  { key: 'yahtzee',       label: 'YAHTZEE',        howTo: 'Score 50' },
  { key: 'chance',        label: 'Chance',         howTo: 'Score Total of All 5 Dice' },
]
/*
 * A scored category leaves the card.
 *
 * Only while the card is a MENU, though — your own card, in a game still being played. Then
 * the rows on screen are exactly the choices left, instead of three live ones at the bottom of
 * ten spent lines. Totals, the bonus and RD x/13 all still count the scored ones; nothing is
 * lost, it is just not in the way.
 *
 * The moment the card is a RECORD rather than a menu — another player's, or the game over —
 * all thirteen come back, because then the question is what happened, not what is left.
 *
 * This replaced a Hide Scored setting that defaulted off and applied everywhere, including to
 * cards nobody could score on.
 */
/*
 * Off by default, so a scored row leaves your own live card. On, every row stays — which is
 * what a player wants when they are working out what is left rather than picking from it.
 *
 * The spec deleted this switch outright. Keeping it is a deliberate departure: the ask was for
 * the hiding to be the DEFAULT with a way back, not for the choice to disappear.
 */
const showScored = ref(false)
const cardIsLive = computed(() =>
  !showScored.value && isMyTurn.value && game.value?.status === 'playing')
const upperCategories = computed(() =>
  cardIsLive.value && viewedState.value
    ? ALL_UPPER_CATEGORIES.filter(cat => viewedState.value!.scorecard[cat.key] === null)
    : ALL_UPPER_CATEGORIES
)
const lowerCategories = computed(() =>
  cardIsLive.value && viewedState.value
    ? ALL_LOWER_CATEGORIES.filter(cat => viewedState.value!.scorecard[cat.key] === null)
    : ALL_LOWER_CATEGORIES
)

/**
 * Which ink this card is printed in.
 *
 * Read live from the roster rather than the game's snapshot, so changing it on the profile
 * shows up in a game already running. Anything unrecognised — null, a value from a future
 * build, a hand-edited localStorage — resolves to Street rather than falling through to
 * nothing, because a card with no ink is a card with no colours at all.
 */
const cardSkin = computed<YahtzeeCardSkin>(() => {
  const id = viewedState.value?.player.id
  const live = id ? playersStore.players.find(p => p.id === id) : undefined
  const chosen = (live ?? viewedState.value?.player)?.yahtzeeCard
  return chosen === 'paper' || chosen === 'board' ? chosen : 'street'
})

const upperBonusDisplay = computed(() => {
  if (!viewedState.value) return '—'
  const sc = viewedState.value.scorecard
  const allFilled = sc.aces !== null && sc.twos !== null && sc.threes !== null &&
    sc.fours !== null && sc.fives !== null && sc.sixes !== null
  if (!allFilled) {
    const current = upperTotal(sc)
    return `${current}/63`
  }
  return upperBonus(sc) > 0 ? '+35' : '0'
})

/**
 * Would taking this category right now be worth anything?
 *
 * The live treatment used to light up every empty row, which is every row you are ALLOWED to
 * take — not the same question. Most are worth zero on any given roll, so the card lit up like
 * a menu with no prices and the two or three rows that actually pay were lost among them. A
 * zero row stays tappable, because sacrificing a category is a real move; it just is not a
 * possibility being offered.
 */
function wouldScore(key: YahtzeeCategory): boolean {
  if (!game.value || !canScore.value) return false
  if (viewedState.value?.scorecard[key] !== null) return false
  return calcScore(key, game.value.dice) > 0
}

function scorecardDisplay(key: YahtzeeCategory): string | number {
  if (!viewedState.value) return '—'
  const sc = viewedState.value.scorecard
  const locked = sc[key]
  if (locked !== null) return locked
  if (!isMyTurn.value || !canScore.value || !game.value) return '—'
  const potential = calcScore(key, game.value.dice)
  return potential
}

function onDieTap(i: number) {
  if (!game.value) return
  if (game.value.diceMode === 'physical') {
    const next = (game.value.dice[i]! % 6) + 1
    yahtzeeStore.setDie(i, next)
  } else {
    if (game.value.rollCount > 0) yahtzeeStore.toggleHold(i)
  }
}

// ── Scoresheet timer ────────────────────────────
const scoresheetTimerEnabled = ref(false)
const scoresheetTimerDuration = ref(60)
const scoresheetTimeLeft = ref(0)
const showScoresheetAlert = ref(false)
const scoresheetPaused = ref(false)
let scoresheetInterval: ReturnType<typeof setInterval> | null = null

function startScoresheetTimer() {
  if (scoresheetInterval) { clearInterval(scoresheetInterval); scoresheetInterval = null }
  if (!scoresheetTimerEnabled.value) return
  scoresheetTimeLeft.value = scoresheetTimerDuration.value
  showScoresheetAlert.value = false
  scoresheetPaused.value = false
  scoresheetInterval = setInterval(() => {
    if (scoresheetPaused.value) return
    scoresheetTimeLeft.value--
    if (scoresheetTimeLeft.value <= 10) showScoresheetAlert.value = true
    if (scoresheetTimeLeft.value <= 0) {
      if (scoresheetInterval) { clearInterval(scoresheetInterval); scoresheetInterval = null }
      autoScoreTimeout()
    }
  }, 1000)
}

function stopScoresheetTimer() {
  if (scoresheetInterval) { clearInterval(scoresheetInterval); scoresheetInterval = null }
  scoresheetTimeLeft.value = 0
  showScoresheetAlert.value = false
}

function toggleScoresheetPause() {
  scoresheetPaused.value = !scoresheetPaused.value
}

function autoScoreTimeout() {
  if (!game.value || !isMyTurn.value) return
  const sc = game.value.playerStates[game.value.currentPlayerIndex]?.scorecard
  if (!sc) return
  // Prefer 'chance', else first unfilled category
  const cats: YahtzeeCategory[] = [
    'chance', 'aces', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'threeOfAKind', 'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee',
  ]
  const cat = cats.find(c => sc[c] === null)
  if (cat) afterScore(cat)
}

function afterScore(category: YahtzeeCategory) {
  stopScoresheetTimer()
  pendingCategory.value = null
  yahtzeeFlash.value = false
  yahtzeeAutoScored.value = false
  if (yahtzeeFlashTimer) { clearTimeout(yahtzeeFlashTimer); yahtzeeFlashTimer = null }
  yahtzeeStore.scoreCategory(category)
  // Explicit fallback: ensure winner screen shows even if the status watch fires late
  if (game.value?.status === 'finished') recordResults()
}

/**
 * A computer turn, one visible step at a time.
 *
 * The decisions themselves are instant, so without a pause between them the dice would land
 * on a scored category with nothing to watch. Each step is one thing a person would do —
 * roll, pick up what you are keeping, roll again — so the turn can be followed and argued
 * with. Rolling goes through doRoll so the animation and the yahtzee flash still happen, and
 * scoring goes through afterScore so timers and the finished check behave as they do for a
 * person.
 */
const BOT_STEP_MS = 900

const currentIsBot = computed(() =>
  !!game.value?.playerStates[game.value.currentPlayerIndex]?.isBot)

let botTimer: ReturnType<typeof setTimeout> | null = null

function botStep() {
  const g = game.value
  if (!g || g.status !== 'playing') return
  // Never mid-throw: the bot waits for its own dice to land before deciding anything.
  if (diceRolling.value) return
  const sc = g.playerStates[g.currentPlayerIndex]?.scorecard
  if (!sc) return

  if (g.rollCount === 0) { doRoll(); return }
  if (g.rollCount >= 3) { afterScore(chooseCategory(g.dice, sc)); return }

  const want = chooseKeeps(g.dice, sc, 3 - g.rollCount)
  const alreadyHeld = want.every((w, i) => w === g.held[i])
  if (!alreadyHeld) { yahtzeeStore.setHolds(want); return }

  doRoll()
}

function scheduleBot() {
  if (botTimer !== null) { clearTimeout(botTimer); botTimer = null }
  if (!currentIsBot.value || game.value?.status !== 'playing') return

  botTimer = setTimeout(() => {
    botTimer = null
    botStep()
    scheduleBot()
  }, BOT_STEP_MS)
}

// Both of these change what the computer should do next: whose turn it is, and how many
// rolls are left.
watch(
  () => [game.value?.currentPlayerIndex, game.value?.rollCount] as const,
  () => scheduleBot(),
  { immediate: true },
)

onUnmounted(() => { if (botTimer !== null) clearTimeout(botTimer) })

/*
 * A turn change restarts the clock on picking a category.
 *
 * There was a walk-up overlay between turns here, carried over from darts, where the device
 * is handed to whoever is throwing. Yahtzee is played round one table with the card in front
 * of everyone — the screen announced a player to the people already watching them, and cost
 * a tap every turn to dismiss.
 */
watch(() => game.value?.currentPlayerIndex, () => {
  if (!game.value || game.value.status !== 'playing') return
  stopScoresheetTimer()
  if (scoresheetTimerEnabled.value) startScoresheetTimer()
})

const pendingCategory = ref<YahtzeeCategory | null>(null)

function tryScore(category: YahtzeeCategory) {
  if (!isMyTurn.value || !canScore.value) return
  if (yahtzeeAutoScored.value) return
  if (!viewedState.value || viewedState.value.scorecard[category] !== null) return

  // First tap: highlight the row
  if (pendingCategory.value !== category) {
    pendingCategory.value = category
    return
  }

  // Second tap on the same row: confirm and submit
  afterScore(category)
}

// Clear pending selection if the player rolls again
watch(() => game.value?.rollCount, () => { pendingCategory.value = null })


function playAgain() { stopScoresheetTimer(); yahtzeeStore.endGame(); router.push('/yahtzee/setup') }
function goHome() { stopScoresheetTimer(); yahtzeeStore.endGame(); router.push('/') }
function quitGame() { stopScoresheetTimer(); yahtzeeStore.endGame(); router.push('/') }
</script>

<style scoped>
.game-page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: #0a0a0a;
}

/* FINISHED */
.finish-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #0a0a0a;
}
.finish-scroll {
  width: 100%;
  height: 100dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.finish-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 40px 20px;
}
.trophy-wrap { position: relative; }
.trophy { font-size: 72px; position: relative; z-index: 1; }
.trophy-glow { position: absolute; inset: -20px; border-radius: 50%; opacity: 0.3; filter: blur(30px); }
.finish-over { font-size: 16px; letter-spacing: 0.3em; color: rgba(255,255,255,0.5); }
.winner-name { font-size: 60px; letter-spacing: 0.05em; }
.winner-sub { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }

.finish-rankings {
  display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 380px; margin: 8px 0;
}
.rank-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: rgba(255,255,255,0.05);
  border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
}
.rank-row.rank-winner { border-width: 2px; }
.rank-place { font-size: 22px; width: 28px; text-align: center; color: rgba(255,255,255,0.4); }
.rank-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; overflow: hidden; }
.rank-avatar img { width: 100%; height: 100%; object-fit: cover; }
.rank-name { flex: 1; font-size: 15px; font-weight: 700; }
.rank-score { font-size: 18px; font-weight: 900; font-family: var(--font-display); color: rgba(255,255,255,0.6); }

.finish-actions { display: flex; gap: 14px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }

/* TURN HEADER: slim controls bar */
.turn-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px;
  padding-top: calc(8px + env(safe-area-inset-top));
  border-bottom: 2px solid rgba(255,255,255,0.08);
}

/* PLAYER BANNER */
.player-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
  min-height: 72px;
}
.player-banner:active { opacity: 0.85; }
.banner-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; overflow: hidden; flex-shrink: 0;
}
.banner-avatar img { width: 100%; height: 100%; object-fit: cover; }
.banner-name {
  font-size: clamp(32px, 5dvh, 60px);
  line-height: 1; letter-spacing: 0.04em; font-weight: 900;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1; min-width: 0;
}
.banner-score { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.banner-total { font-size: 32px; line-height: 1; }
.banner-pts { font-size: 10px; color: rgba(255,255,255,0.35); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }

/* PLAYER TABS */
.player-tabs {
  display: flex;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  flex-shrink: 0;
  background: rgba(0,0,0,0.5);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  scrollbar-width: none;
}
.player-tabs::-webkit-scrollbar { display: none; }
.player-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 14px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  gap: 3px;
  position: relative;
  overflow: hidden;
  min-width: 64px;
}
.player-tab:hover { color: rgba(255,255,255,0.7); }
.tab-active { color: var(--pink); }
.tab-current::after {
  content: '▶';
  position: absolute;
  top: 3px;
  right: 3px;
  font-size: 6px;
  opacity: 0.5;
}
.tab-avatar { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.tab-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tab-name { font-size: 11px; font-weight: 800; font-family: var(--font-display); letter-spacing: 0.04em; white-space: nowrap; }
.tab-score { font-size: 13px; font-weight: 900; font-family: var(--font-display); }

/* DICE AREA */
.dice-area {
  flex-shrink: 0;
  padding: 24px 16px 20px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dice-and-ctrl {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dice-row {
  flex: 1;
  display: flex;
  justify-content: center;
  /* Thrown dice sit apart, the same spacing the other dice games use — a tight row reads as a
     strip of tiles rather than five cubes that landed. */
  gap: 22px;
  padding-left: 48px;
}
.roll-right {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-right: 2px;
}
.roll-btn-side {
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 900;
  min-width: 76px;
  letter-spacing: 0.06em;
}
.die-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s;
}
.die-wrap:active { transform: scale(0.92); }
/* The cube takes its size from here, so it can grow at every breakpoint below. */
.die-wrap .die { --die-size: 62px; }
/* Held is a light on the die, not a change to the theme's own face. */
/*
 * Held reads in the card's ink, not the player's colour.
 *
 * Holding a die is a fact about this card's language — the same green that lights a takeable
 * row is what says a die is being kept — and the player's colour is already carried by the
 * banner and the name. Hardcoding lime here would also have been wrong in Paper, whose live
 * is a dark green on cream and would have been shouted over by it.
 */
/*
 * No literal fallback on purpose. `--sc-live` is declared by the ink on the page root, so it
 * is always there — and a lime fallback is precisely the value that would be wrong in Paper,
 * whose live is a dark green on cream. If the token ever did go missing the filter is simply
 * invalid and the die loses its glow, which is a visible absence rather than a confident lie.
 */
.die-held .die { filter: drop-shadow(0 0 10px var(--sc-live)); }
.die-theme-neon.die-held .die { filter: drop-shadow(0 0 14px var(--sc-live)); }
.held-label {
  font-size: 9px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.08em;
  /* Reads the ink, like the ring. A player-coloured word under a live-coloured glow looked
     like one of the two had been missed. */
  color: var(--sc-live);
}
.die-tap-hint { font-size: 8px; color: rgba(255,255,255,0.3); letter-spacing: 0.05em; }

/* ===== DICE PICKER OVERLAY ===== */
.dice-picker-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  display: flex; align-items: flex-end; justify-content: center;
}
.dice-picker-panel {
  width: 100%; max-width: 680px; max-height: 80dvh;
  background: #111; border-top: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px 20px 0 0;
  display: flex; flex-direction: column; overflow: hidden;
}
.dice-picker-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.dice-picker-title { font-size: 20px; letter-spacing: 0.12em; color: #fff; }
.dice-picker-close {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.7); font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.dice-picker-scroll { flex: 1; overflow-y: auto; padding: 16px 20px 28px; -webkit-overflow-scrolling: touch; }
/* Animation style buttons */

.dp-fade-enter-active, .dp-fade-leave-active { transition: opacity 0.2s; }
.dp-fade-enter-from, .dp-fade-leave-to { opacity: 0; }
.dp-fade-enter-active .dice-picker-panel, .dp-fade-leave-active .dice-picker-panel { transition: transform 0.25s; }
.dp-fade-enter-from .dice-picker-panel, .dp-fade-leave-to .dice-picker-panel { transform: translateY(100%); }

/* YAHTZEE FLASH */
.yahtzee-flash-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 2px solid;
  background: rgba(0,0,0,0.5);
  animation: yf-pulse 0.6s ease-in-out infinite alternate;
}
.yf-emoji { font-size: 22px; }
.yf-text { font-size: 28px; letter-spacing: 0.12em; }
.yf-hint { color: rgba(255,255,255,0.7) !important; font-weight: 700; }
@keyframes yf-pulse {
  from { opacity: 0.85; transform: scale(1); }
  to   { opacity: 1;    transform: scale(1.02); }
}
.yahtzee-flash-enter-active { transition: opacity 0.25s, transform 0.25s; }
.yahtzee-flash-leave-active { transition: opacity 0.4s, transform 0.4s; }
.yahtzee-flash-enter-from { opacity: 0; transform: scale(0.8); }
.yahtzee-flash-leave-to   { opacity: 0; transform: scale(1.1); }

.roll-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.roll-indicator {
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  margin-right: 4px;
}
.roll-pip {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  transition: background 0.2s, box-shadow 0.2s;
}
.pip-done { box-shadow: 0 0 6px currentColor; }
.roll-btn { min-width: 180px; }
.score-hint { font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; letter-spacing: 0.06em; }

.physical-roll-steps {
  display: flex;
  gap: 8px;
}
.physical-step-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  font-weight: 800;
  font-family: var(--font-display);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}
.physical-step-btn.step-active { }

.viewing-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255,212,0,0.08);
  border-bottom: 1px solid rgba(255,212,0,0.2);
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  gap: 12px;
}
.viewing-banner strong { color: var(--gold); }

/* SCORECARD HEADER HOW-TO COLUMN */
.sc-howto-header { font-size: 10px; font-weight: 900; letter-spacing: 0.1em; display: flex; align-items: center; gap: 4px; }
.sc-ipad-btns { display: none; }
.bet-header-btn {
  margin-left: auto; flex-shrink: 0;
  padding: 2px 6px; border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.65); font-size: 8px; font-weight: 900;
  letter-spacing: 0.06em; cursor: pointer; transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.bet-header-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
.bet-header-active { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.12); }

/* BET PANEL */
.bet-section { padding: 4px 0 12px; }
.bet-section-label { font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
.bet-input-row { display: flex; align-items: center; gap: 8px; }
.bet-dollar { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.5); }
.bet-input {
  flex: 1; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px; padding: 10px 14px; color: #fff; font-size: 18px; font-weight: 700;
  outline: none; min-width: 0;
}
.bet-input:focus { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1); }
.bet-input::placeholder { color: rgba(255,255,255,0.2); }
.bet-set-btn {
  padding: 10px 18px; border-radius: 8px; border: none;
  background: #f59e0b; color: #000; font-size: 13px; font-weight: 900;
  letter-spacing: 0.08em; cursor: pointer; flex-shrink: 0; transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.bet-set-btn:hover { background: #fbbf24; }
.bet-clear-btn {
  padding: 10px 12px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.5); font-size: 14px; cursor: pointer; flex-shrink: 0;
  transition: all 0.15s; -webkit-tap-highlight-color: transparent;
}
.bet-clear-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
.bet-active-badge { margin-top: 8px; font-size: 13px; color: #f59e0b; font-weight: 600; }
.bet-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0 16px; }

/* SETTINGS PANEL */
.sc-settings-list {
  padding: 8px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.sc-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.sc-settings-row:last-child { border-bottom: none; }
.sc-settings-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.sc-settings-label {
  font-size: 15px;
  font-weight: 800;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  color: rgba(255,255,255,0.85);
}
.sc-settings-sub {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.03em;
}
.sc-settings-seg { display: flex; gap: 6px; flex-shrink: 0; }
.sc-settings-seg-btn {
  padding: 7px 12px;
  border: 2px solid rgba(255,255,255,0.2); background: transparent; color: rgba(255,255,255,0.7);
  font-family: var(--font-display); font-size: 13px; letter-spacing: 0.06em;
  cursor: pointer; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.sc-settings-seg-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.12); }

.sc-settings-toggle {
  flex-shrink: 0;
  padding: 7px 22px;
  border-radius: 20px;
  border: 2px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.35);
  font-size: 13px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.15s;
}
.sc-settings-toggle.active {
  border-color: var(--pink);
  background: rgba(255,45,120,0.18);
  color: var(--pink);
  box-shadow: 0 0 10px rgba(255,45,120,0.25);
}
/* Kept from the removed add-player list: the leave rows show the same person the same way. */
.sc-add-avatar {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.sc-add-name { flex: 1; font-size: 14px; font-weight: 700; color: #fff; }
.sc-settings-quit-row {
  padding: 20px 0 8px;
  display: flex;
  justify-content: center;
}
.sc-settings-quit-btn {
  padding: 11px 40px;
  border-radius: 8px;
  border: 2px solid rgba(255, 80, 80, 0.5);
  background: rgba(255, 60, 60, 0.12);
  color: #ff5555;
  font-size: 15px;
  font-weight: 800;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.15s;
}
.sc-settings-quit-btn:hover {
  background: rgba(255, 60, 60, 0.25);
  border-color: #ff5555;
}

/* SCORECARD */
.scorecard-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-bottom: env(safe-area-inset-bottom);
  background: #0a0a0a;
}

/* The header is justify-content: flex-end, so this pushes quit to the left edge where the
   other games keep it. Deliberately not a .header-sc-btn — those get hidden on iPad
   portrait, which is exactly where an unreachable quit would hurt most. */
.header-quit-btn { margin-right: auto; flex-shrink: 0; }

.header-sc-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.header-sc-btn:hover { background: rgba(255,255,255,0.15); }
.header-sc-btn-active { border-color: var(--pink) !important; background: rgba(255,45,120,0.15) !important; }
.header-sc-btn-grey { color: rgba(255,255,255,0.4); filter: grayscale(1); }
.header-sc-btn-grey.header-sc-btn-active { filter: none; }
.header-bets-btn { color: var(--gold); border-color: rgba(255,180,0,0.4); font-weight: 900; font-size: 11px; letter-spacing: 0.08em; padding: 3px 10px; }

/* YAHTZEE title — hidden on mobile/tablet, shown on laptop */
.turn-header-title { display: none; }

/* ── The card ────────────────────────────────────────────────────────────────
 *
 * One anatomy, three inks. Everything below is written against tokens; each ink sets the
 * tokens and nothing else, so a change to the row rhythm lands in all three at once and an
 * ink cannot quietly drift into being its own layout.
 *
 * `--sc-scale` is the only size knob. It is set once per breakpoint band at the bottom of
 * this file — individual pieces are never sized per band, which is how the old card ended up
 * with four media queries each re-tuning nine separate font sizes against each other.
 */
.sc-card {
  --sc-scale: 1;
  /* Row rhythm, scaled. Street sets its own larger type and pays for it in padding. */
  --sc-cat: calc(23px * var(--sc-scale));
  --sc-hint: calc(15px * var(--sc-scale));
  --sc-pts: calc(26px * var(--sc-scale));
  --sc-total-type: calc(24px * var(--sc-scale));
  --sc-key-type: calc(29px * var(--sc-scale));
  --sc-row-pad: calc(6px * var(--sc-scale)) calc(10px * var(--sc-scale));
  --sc-total-pad: calc(5px * var(--sc-scale)) calc(10px * var(--sc-scale));
  --sc-howto-w: calc(210px * var(--sc-scale));
  --sc-pts-w: calc(76px * var(--sc-scale));
  --sc-pts-h: calc(44px * var(--sc-scale));

  display: flex;
  gap: calc(14px * var(--sc-scale));
  align-items: flex-start;
  /*
   * Capped and centred. The category column is `1fr`, so without a ceiling it takes every
   * spare pixel and pushes HOW TO SCORE and PTS out to the right edge, leaving a row that
   * reads as three unrelated things rather than one line.
   */
  max-width: calc(1500px * var(--sc-scale));
  /*
   * `width: 100%` is load-bearing, not belt-and-braces.
   *
   * On iPad landscape `.scorecard-scroll` becomes a column flex container (see the band at the
   * bottom of this file), which makes this card a flex item. `margin: 0 auto` on a flex item's
   * cross axis overrides `align-items: stretch` — the item drops to its content width and the
   * auto margins eat the rest. Measured at 1080 wide that left 467px of bare page showing on
   * each side of a card that should have filled the screen, with the two panels shrunk to
   * match. Pinning the width leaves the auto margins nothing to absorb, so they only do
   * anything once max-width actually bites on a wide desktop, which is what they were for.
   */
  width: 100%;
  margin: 0 auto;
  padding: calc(14px * var(--sc-scale));
  background: var(--sc-page);
  font-family: var(--font-body, Inter, system-ui, sans-serif);
}
/* Side by side from the desktop band, which is where iPad landscape lands. */
.sc-card { flex-direction: column; }
.sc-panel {
  width: 100%;
  background-color: var(--sc-stock);
  background-image: var(--sc-texture);
  background-size: var(--sc-texture-size);
  border: 2px solid var(--sc-rule-hard);
  box-shadow: var(--sc-panel-shadow);
  padding: calc(10px * var(--sc-scale));
  display: flex; flex-direction: column;
}

/* A taped label, or a printed block — the difference is the ink's, not the anatomy's. */
.sc-tape {
  align-self: flex-start;
  margin-bottom: calc(8px * var(--sc-scale));
  padding: calc(3px * var(--sc-scale)) calc(12px * var(--sc-scale)) calc(2px * var(--sc-scale));
  background: var(--sc-label-bg);
  color: var(--sc-label-ink);
  font-family: var(--sc-display);
  /*
   * Sized by the typeface, not by which ink it is.
   *
   * 19px was Bebas's number. A condensed display face, a serif and a monospace do not set the
   * same words to the same width at the same size, so a single figure meant the label fitted
   * in one ink and crowded its panel in another. `--sc-label-size` is declared beside
   * `--sc-display` in each block so the two travel together: change the typeface and the size
   * that suits it comes with it, rather than being re-tuned here by ink name.
   */
  font-size: calc(var(--sc-label-size, 19px) * var(--sc-scale));
  letter-spacing: 0.08em;
  transform: rotate(var(--sc-label-tilt));
  box-shadow: var(--sc-label-shadow);
}

/* Three columns, everywhere: name (flex) · how to score · PTS box. */
.sc-headrow, .sc-row, .sc-total {
  display: grid;
  grid-template-columns: 1fr var(--sc-howto-w) var(--sc-pts-w);
  align-items: center;
}
.sc-headrow {
  padding: 0 calc(10px * var(--sc-scale)) calc(4px * var(--sc-scale));
  border-bottom: 2.5px solid var(--sc-accent);
  font-size: calc(11px * var(--sc-scale));
  font-weight: 900; letter-spacing: 0.12em;
  color: var(--sc-faint);
}
.sc-h-howto { display: flex; align-items: center; gap: calc(6px * var(--sc-scale)); }
.sc-h-pts { display: flex; flex-direction: column; align-items: center; line-height: 1.1; }
.sc-round-label { font-size: calc(9px * var(--sc-scale)); opacity: 0.75; }

/* Allowed to take, but worth nothing — still a move, just not an offer. */
.sc-row.takeable { cursor: pointer; }
.sc-row {
  padding: var(--sc-row-pad);
  border-bottom: 1.5px solid var(--sc-rule);
  color: var(--sc-ink);
  cursor: default;
}
.sc-name { display: flex; align-items: center; gap: calc(8px * var(--sc-scale)); min-width: 0; }
.sc-cat-label {
  font-family: var(--sc-display);
  font-size: var(--sc-cat);
  font-weight: var(--sc-cat-weight);
  letter-spacing: var(--sc-cat-tracking);
  line-height: 1.05;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sc-howto { font-size: var(--sc-hint); color: var(--sc-faint); line-height: 1.25; }
.sc-pts {
  justify-self: end;
  width: var(--sc-pts-w); height: var(--sc-pts-h);
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--sc-rule-hard);
  font-family: var(--sc-display);
  font-size: var(--sc-pts);
  line-height: 1;
}
/* The star colour is for the two things a scorer looks for: a YAHTZEE, and a bonus. */
.starred { color: var(--sc-star); }

.sc-die-icon { width: calc(26px * var(--sc-scale)); height: calc(26px * var(--sc-scale)); flex-shrink: 0; }
.sc-die-bg { fill: var(--sc-die-face); stroke: var(--sc-die-edge); stroke-width: 1.5; }
.sc-die-pip { fill: var(--sc-die-pip); }

.sc-bonus-checks { display: flex; gap: calc(9px * var(--sc-scale)); }
.sc-bonus-check { font-size: calc(17px * var(--sc-scale)); color: var(--sc-rule); }
.sc-bonus-check.on { color: var(--sc-star); }

/*
 * A row this throw can actually take. Border, tint and a solid PTS box — three signals rather
 * than one, because on the Paper ink a tint alone is nearly invisible in a lit room, and on
 * Board Flip a border alone gets lost among the hairlines.
 */
.sc-row.live {
  border: 2px solid var(--sc-live);
  background: var(--sc-live-tint);
  box-shadow: var(--sc-live-shadow);
}
.sc-row.live .sc-pts {
  background: var(--sc-live);
  border-color: var(--sc-live);
  color: var(--sc-live-ink);
}
.sc-row.filled { color: var(--sc-faint); }
.sc-row.filled .sc-pts { color: var(--sc-ink); }
.sc-row.pending { outline: 2px dashed var(--sc-accent); outline-offset: -2px; }

.sc-total {
  padding: var(--sc-total-pad);
  color: var(--sc-faint);
  font-size: calc(13px * var(--sc-scale));
  border-bottom: 1.5px solid var(--sc-rule);
}
.sc-total .sc-name { font-family: var(--sc-display); font-size: var(--sc-total-type); color: var(--sc-ink); letter-spacing: 0.04em; }
.sc-total .sc-pts { font-size: var(--sc-total-type); }
/* The two that define a section, rather than feed it. */
.sc-total-key { background: var(--sc-accent-tint); border-bottom: none; }
.sc-total-key .sc-name, .sc-total-key .sc-pts { color: var(--sc-accent); font-size: var(--sc-key-type); }
.sc-grand .sc-pts { border-color: var(--sc-accent); }

/* ── 2a · Street Print — the default ─────────────────────────────────────── */
.ink-street {
  --sc-display: var(--font-display, 'Bebas Neue', system-ui);
  /* Bebas is condensed: it takes the space and stays inside the panel. */
  --sc-label-size: 19px;
  --sc-cat-weight: 400;
  --sc-cat-tracking: 0.02em;
  --sc-stock: #101014;
  --sc-page: #0b0b0e;
  --sc-texture: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  --sc-texture-size: 5px 5px;
  --sc-ink: #ffffff;
  --sc-faint: rgba(255,255,255,0.45);
  --sc-rule: rgba(255,255,255,0.12);
  --sc-rule-hard: #2a2a34;
  --sc-accent: #ff2d78;
  --sc-accent-tint: rgba(255,45,120,0.12);
  --sc-live: #aaff00;
  --sc-live-tint: rgba(170,255,0,0.10);
  --sc-live-ink: #101014;
  --sc-star: #ffd700;
  --sc-panel-shadow: 8px 8px 0 rgba(0,0,0,0.6);
  --sc-live-shadow: 4px 4px 0 rgba(0,0,0,0.5);
  --sc-label-bg: var(--pink, #ff2d78);
  --sc-label-ink: #2b0010;
  --sc-label-tilt: -0.8deg;
  --sc-label-shadow: 3px 3px 0 rgba(0,0,0,0.5);
  --sc-die-face: #ffffff;
  --sc-die-edge: #222222;
  --sc-die-pip: #101014;
  /* Street sets its type larger than the other two, so its rows give the height back in
     padding — without this the GRAND TOTAL row runs past the panel and gets sliced. */
  --sc-cat: calc(25px * var(--sc-scale));
  --sc-hint: calc(17px * var(--sc-scale));
  --sc-row-pad: calc(4px * var(--sc-scale)) calc(10px * var(--sc-scale));
  --sc-total-pad: calc(3px * var(--sc-scale)) calc(10px * var(--sc-scale));
}

/* ── 2b · Paper Card ─────────────────────────────────────────────────────── */
/* The only bright one, and the one worth checking on the stand in a dim room. */
.ink-paper {
  --sc-display: Georgia, 'Times New Roman', serif;
  /* A serif sets wider than Bebas at the same size, so the label comes down to fit. */
  --sc-label-size: 16px;
  --sc-cat-weight: 700;
  --sc-cat-tracking: 0;
  --sc-stock: #f2e8d0;
  --sc-page: #2a231a;
  --sc-texture: repeating-linear-gradient(92deg, rgba(120,90,40,0.05) 0 2px, transparent 2px 5px);
  --sc-texture-size: auto;
  --sc-ink: #20180e;
  --sc-faint: rgba(40,28,14,0.6);
  --sc-rule: rgba(40,28,14,0.28);
  --sc-rule-hard: rgba(40,28,14,0.5);
  --sc-accent: #b4232a;
  --sc-accent-tint: rgba(180,35,42,0.10);
  --sc-live: #1c6b3a;
  --sc-live-tint: rgba(28,107,58,0.12);
  --sc-live-ink: #f2e8d0;
  --sc-star: #b4232a;
  --sc-panel-shadow: 0 10px 26px rgba(0,0,0,0.55);
  --sc-live-shadow: none;
  --sc-label-bg: #b4232a;
  --sc-label-ink: #f6efdd;
  --sc-label-tilt: 0deg;
  --sc-label-shadow: none;
  --sc-die-face: #fffdf6;
  --sc-die-edge: #6b5a3a;
  --sc-die-pip: #20180e;
  /* The serif sets wider, so it runs a size below Street. */
  --sc-cat: calc(23px * var(--sc-scale));
  --sc-row-pad: calc(7px * var(--sc-scale)) calc(10px * var(--sc-scale));
}

/* ── 2d · Board Flip ─────────────────────────────────────────────────────── */
/* A stadium scoreboard, not a sheet: one monospaced face and cyan hairlines. */
.ink-board {
  --sc-display: 'Share Tech Mono', ui-monospace, monospace;
  /* Mono sets every glyph to one width and the label already carries 0.08em, so it comes
     down furthest of the three to keep the block from running the width of the panel. */
  --sc-label-size: 15px;
  --sc-cat-weight: 400;
  --sc-cat-tracking: 0.04em;
  --sc-stock: #0a0d10;
  --sc-page: #05070a;
  --sc-texture: repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px);
  --sc-texture-size: auto;
  --sc-ink: #e8f4ff;
  --sc-faint: rgba(180,210,235,0.5);
  --sc-rule: rgba(0,212,255,0.22);
  --sc-rule-hard: rgba(0,212,255,0.35);
  --sc-accent: #00d4ff;
  --sc-accent-tint: rgba(0,212,255,0.10);
  --sc-live: #aaff00;
  --sc-live-tint: rgba(170,255,0,0.10);
  --sc-live-ink: #05070a;
  --sc-star: #ffb400;
  --sc-panel-shadow: 0 0 0 1px rgba(0,212,255,0.25), 0 12px 30px rgba(0,0,0,0.7);
  --sc-live-shadow: none;
  --sc-label-bg: #00d4ff;
  --sc-label-ink: #04141b;
  --sc-label-tilt: 0deg;
  --sc-label-shadow: none;
  --sc-die-face: linear-gradient(135deg, #142c60 0%, #1a56cc 45%, #4b8bff 75%, #9ac8ff 100%);
  --sc-die-edge: rgba(255,255,255,0.25);
  --sc-die-pip: #e8f4ff;
}
/* An SVG rect cannot take a gradient through `fill`, so the blue face is painted on the
   element behind it and the rect is left clear. */
.ink-board .sc-die-bg { fill: #1a56cc; }

@media (hover: hover) and (pointer: fine) {
  .sc-row.live:hover { filter: brightness(1.08); }
}


/* Phones: the dice row + side ROLL overflow their container (570px of content in a
   358px box on a 390px screen), pushing ROLL entirely off-screen. Stack instead:
   dice flex to fit any width, ROLL goes full-width beneath them and into the thumb zone.
   Tablet/desktop keep the side-by-side layout above. */
@media (max-width: 767px) {
  .dice-and-ctrl { flex-wrap: wrap; gap: 10px; }
  .dice-row {
    flex: 1 1 100%;
    padding-left: 0;          /* was a 48px hack to offset the side button */
    min-width: 0;
    gap: clamp(7px, 3vw, 16px);
  }
  .die-wrap { flex: 1 1 0; min-width: 0; max-width: 62px; }
  .die-wrap .die { --die-size: min(62px, 15vw); }
  .roll-right { flex: 1 1 100%; justify-content: center; padding-right: 0; }
  .roll-btn-side { flex: 1; min-height: 52px; font-size: 16px; }
}

/*
 * The one size knob, set once per band.
 *
 * The old card re-tuned nine font sizes and three column widths in each of four media
 * queries, so every band was a separate negotiation and changing a row meant changing it in
 * four places that had already drifted apart. Everything is expressed against --sc-scale now;
 * these three declarations are the whole responsive story.
 */
@media (max-width: 767px) {
  .sc-card { --sc-scale: 0.62; }
}
@media (min-width: 768px) and (max-width: 1099px) {
  .sc-card { --sc-scale: 0.78; }
}
@media (min-width: 1100px) {
  .sc-card { --sc-scale: 1; }
}

/*
 * Side by side, which is the whole reason the sections are separate panels.
 *
 * Driven by ORIENTATION, not by a width threshold. The spec described the target as
 * "1194 x 834" and this was written as `min-width: 1100px` — but that is one iPad's landscape
 * width, not the shape being described. A 10.2in iPad is 810 x 1080, so its landscape is
 * 1080 wide, missed the rule by 20px, and stacked the panels on the exact screen the layout
 * exists for. Landscape plus a floor wide enough for two readable columns says what was meant;
 * a phone on its side is 844 at most and stays stacked.
 */
@media (orientation: landscape) and (min-width: 900px) {
  .sc-card { flex-direction: row; }
  .sc-panel { width: 50%; }
  .scorecard-scroll { overflow: hidden; }
}

@media (max-width: 380px) {
  .die-wrap .die { --die-size: 48px; }
  .dice-row { gap: 10px; }
}

/* Tablet/iPad: compact everything to maximise scorecard space */
@media (min-width: 768px) and (max-width: 1100px) {
  .turn-header { padding: 5px 16px; padding-top: calc(5px + env(safe-area-inset-top)); }
  .header-sc-btn { font-size: 15px; padding: 4px 8px; }
  .player-banner { padding: 8px 16px; min-height: 52px; gap: 12px; }
  .banner-avatar { width: 38px; height: 38px; font-size: 19px; }
  .banner-name { font-size: clamp(22px, 3.5dvh, 36px); }
  .banner-total { font-size: 24px; }
  .banner-pts { font-size: 8px; }
  /* Dice area as compact as possible */
  .dice-area { padding: 18px 16px 6px; gap: 2px; }
  .die-wrap .die { --die-size: 50px; }
  .dice-row { gap: 12px; }
  .roll-btn-side { padding: 10px 12px; font-size: 13px; min-width: 68px; }
  .roll-pip { width: 15px; height: 15px; }
  /* Hide hint text — saves a full line of height */
  .score-hint { display: none; }
  /* Scorecard rows as tight as possible */
}
/* Tablet portrait: scorecard scrolls freely */
@media (min-width: 768px) and (max-width: 1100px) and (orientation: portrait) {
  .scorecard-scroll { overflow-y: auto; }
  /* Bigger dice on portrait tablet — scrolling means space isn't an issue */
  .die-wrap .die { --die-size: 96px; }
  /*
   * ...but the ROW still has to fit beside ROLL, and it stopped fitting when the dice grew:
   * five 96px cubes at 30px apart is 600px, and the 48px left padding — an offset that only
   * ever existed to centre the dice against the side button — pushed the total past the
   * width, so ROLL was sliced off the right edge. The dice keep their size; the space
   * between them and the offset pay for it.
   */
  .dice-row { gap: 22px; padding-left: 0; min-width: 0; }
  .roll-pip { width: 20px; height: 20px; }
  .roll-btn-side { padding: 14px 18px; font-size: 16px; min-width: 90px; }
  /* Move dice/settings buttons into scorecard header, hide from turn-header */
  .sc-ipad-btns { display: flex; gap: 6px; flex-shrink: 0; }
  .bet-header-btn { margin-left: auto; }
  .turn-header .header-sc-btn { display: none; }
  /* Larger avatar and player name using the freed space */
  .player-banner { padding: 14px 20px; min-height: 80px; gap: 16px; }
  .banner-avatar { width: 64px; height: 64px; font-size: 32px; }
  .banner-name { font-size: clamp(32px, 5dvh, 58px); }
  .banner-total { font-size: 30px; }
}
/* Tablet landscape: scorecard fills page and scrolls if needed */
@media (min-width: 768px) and (max-width: 1100px) and (orientation: landscape) {
  .scorecard-scroll { display: flex; flex-direction: column; overflow-y: auto; }
}

/* Laptop / large desktop: scorecard fills the page without scrolling, larger text */
@media (min-width: 1101px) {
  /* Compact header + dice area to give scorecard maximum vertical space */
  .turn-header { padding: 5px 16px; padding-top: calc(5px + env(safe-area-inset-top)); position: relative; }
  .header-sc-btn { font-size: 14px; padding: 4px 8px; }
  /* YAHTZEE title in header bar */
  .turn-header-title {
    display: block;
    flex: 1;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.18em;
    color: rgba(255,255,255,0.55);
    text-transform: uppercase;
  }
  /* Taller player banner on laptop */
  .player-banner { padding: 16px 24px; min-height: 90px; gap: 20px; }
  .banner-avatar { width: 130px; height: 82px; border-radius: 14px; font-size: 42px; }
  .banner-name { font-size: clamp(36px, 5dvh, 64px); }
  .banner-total { font-size: 36px; }
  .banner-pts { font-size: 10px; }
  .dice-area { padding: 8px 16px 4px; gap: 4px; }
  .die-wrap .die { --die-size: 86px; }
  /* Five 86px dice and ROLL leave hundreds of pixels spare on a laptop, so the row was
     spending none of it: at 22px the cubes read as a strip of tiles rather than five dice
     that landed apart. */
  .dice-row { gap: 44px; }
  /* The pips are a turn counter read from across a room, not a footnote. */
  .roll-pip { width: 24px; height: 24px; }
  /* ROLL is the only control on this screen, so it gets the width to look like one. */
  .roll-btn-side { padding: 16px 34px; font-size: 18px; min-width: 150px; }
  .score-hint { display: none; }

  /* Scorecard fills remaining height with no scroll */
  .scorecard-scroll { overflow: hidden; }
}

/*
 * The eight roll animations are gone with the flat die. They were eight ways of moving a
 * square around: tumble, bounce, spin, shake, wobble, pop, glitch, slot. A cube tumbles on
 * its own axes and there is only one way a thrown die behaves, so the choice that replaced
 * them is about the throw itself — whether the dice stop themselves or the player stops them.
 */

/* Held dice sit out of the throw: down on the table while the live ones are up. */
.die-wrap.die-held .die { transform: scale(0.9); transition: transform 0.25s ease; }

/* Animation toggle + style picker in dice picker */

/* SCORESHEET TIMER BAR */
.sc-timer-bar {
  flex-shrink: 0;
  position: relative;
  height: 28px;
  background: rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-timer-bar.sc-timer-alert { background: rgba(239,68,68,0.12); }
.sc-timer-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: rgba(255,255,255,0.15);
  transition: width 1s linear;
}
.sc-timer-fill.urgent { background: rgba(239,68,68,0.35); }
.sc-timer-fill.paused { background: rgba(255,200,0,0.2); }
.sc-timer-text {
  position: relative;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.5);
  font-family: var(--font-display);
  z-index: 1;
}
.sc-timer-text.urgent { color: #ef4444; }

/* SETTINGS TIMER ROW */
.sc-settings-timer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px 10px;
  gap: 8px;
}
.sc-settings-timer-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.timer-ctrl-btn {
  padding: 5px 12px;
  border-radius: 16px;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.4);
  font-size: 12px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.15s;
}
.timer-ctrl-btn.active {
  border-color: var(--pink);
  background: rgba(255,45,120,0.18);
  color: var(--pink);
}

/* WALK-UP OVERLAY */
/* SETTINGS BET SECTION */
.sc-leave-list { display: flex; flex-direction: column; gap: 6px; padding: 4px 0 2px; }
.sc-leave-note { margin: 0 0 4px; font-size: 12px; color: var(--text-muted); }
.sc-leave-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; width: 100%;
  border: 2px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04);
  cursor: pointer; text-align: left;
  -webkit-tap-highlight-color: transparent;
}
/* Armed. Red only at this point, so the list itself does not read as a danger zone. */
.sc-leave-row.confirming { border-color: #ef4444; background: rgba(239,68,68,0.14); }
.sc-leave-action {
  margin-left: auto; flex-shrink: 0;
  font-family: var(--font-display); font-size: 12px; letter-spacing: 0.08em;
  color: var(--text-muted);
}
.sc-leave-row.confirming .sc-leave-action { color: #ef4444; }

.sc-settings-divider {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.18em;
  color: rgba(255,255,255,0.3);
  padding: 10px 16px 4px;
  text-transform: uppercase;
  border-top: 1px solid rgba(255,255,255,0.08);
  margin-top: 4px;
}
.sc-settings-bet-section {
  padding: 6px 16px 10px;
}
.sc-settings-bet-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.5);
  margin-bottom: 6px;
  text-transform: uppercase;
}
.sc-settings-bet-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Walk-up transition */
</style>

<template>
  <div class="game-page">
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
        <button v-ripple class="header-sc-btn" :class="{ 'header-sc-btn-active': showDicePicker }" @click="showDicePicker = !showDicePicker" title="Dice style">🎲</button>
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
              :style="{ '--held-color': currentPlayer?.color ?? 'var(--pink)' }"
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
              <span v-if="game.held[i]" class="held-label" :style="{ color: currentPlayer?.color }">HELD</span>
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

      <!-- SCORECARD -->
      <div class="scorecard-scroll" :style="scorecardBgStyle">
        <div class="sc-paper" :class="scorecardTheme === 'light' ? 'sc-light' : 'sc-dark'">
          <!-- UPPER HEADER -->
          <div class="sc-header-row">
            <div class="sc-col-name sc-section-title">UPPER SECTION</div>
            <div class="sc-col-howto sc-howto-header">
              HOW TO SCORE
              <div class="sc-ipad-btns">
                <button v-ripple class="header-sc-btn" :class="{ 'header-sc-btn-active': showDicePicker }" @click="showDicePicker = !showDicePicker" title="Dice style">🎲</button>
                <button v-ripple class="header-sc-btn header-sc-btn-grey" :class="{ 'header-sc-btn-active': showSettings }" @click="showSettings = !showSettings" title="Settings">⚙</button>
              </div>
            </div>
            <div class="sc-col-box sc-col-box-hdr">
              <span>PTS</span>
              <span class="sc-round-label">RD {{ currentRound }}/13</span>
            </div>
          </div>

          <!-- UPPER CATEGORIES -->
          <div
            v-for="cat in upperCategories"
            :key="cat.key"
            class="sc-row"
            :class="{
              'sc-row-filled': viewedState?.scorecard[cat.key] !== null,
              'sc-row-scoreable': isMyTurn && canScore && viewedState?.scorecard[cat.key] === null,
              'sc-row-pending': pendingCategory === cat.key
            }"
            :style="pendingCategory === cat.key ? { '--pending-color': currentPlayer?.color } : {}"
            @click="tryScore(cat.key)"
          >
            <div class="sc-col-name sc-name-inner">
              <svg class="sc-die-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="1.5" y="1.5" width="21" height="21" rx="4" class="sc-die-bg" />
                <circle
                  v-for="(dot, di) in dotPositions[(cat.dieValue ?? 1) - 1]"
                  :key="di"
                  :cx="dot[0] * 0.667"
                  :cy="dot[1] * 0.667"
                  r="2"
                  class="sc-die-pip"
                />
              </svg>
              <span class="sc-cat-label">{{ cat.label }}</span>
            </div>
            <div class="sc-col-howto sc-howto-text">{{ cat.howTo }}</div>
            <div
              class="sc-col-box sc-score-val"
              :class="{ 'sc-val-locked': viewedState?.scorecard[cat.key] !== null }"
              :style="isMyTurn && canScore && viewedState?.scorecard[cat.key] === null ? { color: currentPlayer?.color } : {}"
            >{{ scorecardDisplay(cat.key) }}</div>
          </div>

          <!-- UPPER TOTALS -->
          <div class="sc-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> TOTAL SCORE</div>
            <div class="sc-col-howto sc-total-sub">Add Only Upper Section</div>
            <div class="sc-col-box sc-score-val sc-val-locked">{{ upperTotal(viewedState!.scorecard) }}</div>
          </div>
          <div class="sc-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> BONUS</div>
            <div class="sc-col-howto sc-total-sub">Score 35 if ≥ 63</div>
            <div class="sc-col-box sc-score-val sc-val-locked" :class="{ 'sc-val-bonus': upperBonus(viewedState!.scorecard) > 0 }">{{ upperBonusDisplay }}</div>
          </div>
          <div class="sc-total-row sc-section-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> UPPER TOTAL</div>
            <div class="sc-col-howto sc-total-sub"></div>
            <div class="sc-col-box sc-score-val sc-val-locked">{{ upperTotal(viewedState!.scorecard) + upperBonus(viewedState!.scorecard) }}</div>
          </div>

          <!-- LOWER SECTION HEADER -->
          <div class="sc-lower-header">══ LOWER SECTION ══</div>

          <!-- LOWER CATEGORIES -->
          <div
            v-for="cat in lowerCategories"
            :key="cat.key"
            class="sc-row"
            :class="{
              'sc-row-filled': viewedState?.scorecard[cat.key] !== null,
              'sc-row-scoreable': isMyTurn && canScore && viewedState?.scorecard[cat.key] === null,
              'sc-row-pending': pendingCategory === cat.key
            }"
            :style="pendingCategory === cat.key ? { '--pending-color': currentPlayer?.color } : {}"
            @click="tryScore(cat.key)"
          >
            <div class="sc-col-name sc-name-inner sc-lower-name">
              <span class="sc-cat-label" :class="{ 'sc-yahtzee-lbl': cat.key === 'yahtzee' }">{{ cat.label }}</span>
            </div>
            <div class="sc-col-howto sc-howto-text">{{ cat.howTo }}</div>
            <div
              class="sc-col-box sc-score-val"
              :class="{ 'sc-val-locked': viewedState?.scorecard[cat.key] !== null }"
              :style="isMyTurn && canScore && viewedState?.scorecard[cat.key] === null ? { color: currentPlayer?.color } : {}"
            >{{ scorecardDisplay(cat.key) }}</div>
          </div>

          <!-- YAHTZEE BONUS -->
          <div class="sc-row sc-row-filled">
            <div class="sc-col-name sc-name-inner sc-lower-name">
              <span class="sc-cat-label">YAHTZEE BONUS</span>
            </div>
            <div class="sc-col-howto sc-bonus-checks">
              <span v-for="n in 3" :key="n" class="sc-bonus-check" :class="{ 'sc-check-on': viewedState!.scorecard.yahtzeeBonusCount >= n }">✓</span>
            </div>
            <div class="sc-col-box sc-score-val sc-val-locked" :class="{ 'sc-val-bonus': viewedState!.scorecard.yahtzeeBonusCount > 0 }">
              {{ viewedState!.scorecard.yahtzeeBonusCount > 0 ? viewedState!.scorecard.yahtzeeBonusCount * 100 : '—' }}
            </div>
          </div>

          <!-- LOWER TOTALS -->
          <div class="sc-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> LOWER TOTAL</div>
            <div class="sc-col-howto sc-total-sub"></div>
            <div class="sc-col-box sc-score-val sc-val-locked">{{ lowerTotal(viewedState!.scorecard) }}</div>
          </div>
          <div class="sc-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> UPPER TOTAL</div>
            <div class="sc-col-howto sc-total-sub"></div>
            <div class="sc-col-box sc-score-val sc-val-locked">{{ upperTotal(viewedState!.scorecard) + upperBonus(viewedState!.scorecard) }}</div>
          </div>
          <div class="sc-total-row sc-grand-row">
            <div class="sc-col-name sc-total-name sc-grand-label"><span class="sc-arrows">▶▶</span> GRAND TOTAL</div>
            <div class="sc-col-howto sc-total-sub"></div>
            <div class="sc-col-box sc-score-val sc-grand-val" :style="{ color: viewedState?.player.color }">{{ grandTotal(viewedState!.scorecard) }}</div>
          </div>
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
            <div class="sc-settings-row">
              <div class="sc-settings-info">
                <span class="sc-settings-label">Hide Scored</span>
                <span class="sc-settings-sub">Collapse filled rows</span>
              </div>
              <button class="sc-settings-toggle" :class="{ active: hideCompleted }" @click="hideCompleted = !hideCompleted">
                {{ hideCompleted ? 'ON' : 'OFF' }}
              </button>
            </div>
            <div class="sc-settings-row">
              <div class="sc-settings-info">
                <span class="sc-settings-label">Light Theme</span>
                <span class="sc-settings-sub">Scorecard appearance</span>
              </div>
              <button class="sc-settings-toggle" :class="{ active: scorecardTheme === 'light' }" @click="scorecardTheme = scorecardTheme === 'dark' ? 'light' : 'dark'">
                {{ scorecardTheme === 'light' ? 'ON' : 'OFF' }}
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
            <div v-if="game.players.length > 1" class="sc-settings-divider">LEAVE</div>
            <div v-if="game.players.length > 1" class="sc-leave-list">
              <p class="sc-leave-note">Their card goes with them. Everyone else keeps playing.</p>
              <button
                v-for="p in game.players" :key="p.id"
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

    <!-- DICE PICKER OVERLAY -->
    <Transition name="dp-fade">
      <div v-if="showDicePicker" class="dice-picker-overlay" @click.self="showDicePicker = false">
        <div class="dice-picker-panel">
          <div class="dice-picker-header">
            <span class="dice-picker-title display">DICE STYLE</span>
            <button class="dice-picker-close" @click="showDicePicker = false">✕</button>
          </div>
          <div class="dice-picker-scroll">
            <!--
              How the roll ends. The eight animation styles are gone: they were ways of moving a
              flat square around, and the dice are real cubes now — there is one way a thrown die
              behaves. What is left is the only choice that changes play: do the dice stop
              themselves, or does the player stop them.
            -->
            <div class="dp-anim-row">
              <span class="dp-anim-label">Rolling</span>
              <div class="dp-group-grid">
                <button
                  v-for="opt in ROLL_STOP_MODES" :key="opt.value"
                  class="dp-btn"
                  :class="{ active: rollStop === opt.value }"
                  @click="rollStop = opt.value"
                >
                  <span class="dp-btn-icon">{{ opt.icon }}</span>
                  <span class="dp-btn-label">{{ opt.label }}</span>
                </button>
              </div>
            </div>
            <!--
              The dice colour picker used to sit here — thirty-four swatches, mid-game, on the
              screen you are throwing on. It belongs to the player, not to the throw: it is set
              on the player screen and it is read from there, so having it here only meant a
              panel of choices between you and the board.
            -->
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
import { DIE_GRADIENTS, GRADIENT_DIE_THEMES, type DiceTheme } from '../types/index'
import { useNarrator } from '../composables/useNarrator'
import { recordGameResult } from '../api/gameResults'
import DiceFace from '../components/DiceFace.vue'

const router = useRouter()
const { narrateAsync } = useNarrator()
const yahtzeeStore = useYahtzeeStore()
const playersStore = usePlayersStore()
const game = computed(() => yahtzeeStore.game)

const viewingIndex = ref(0)
const scorecardTheme = ref<'dark' | 'light'>('dark')
/*
 * On by default. Thirteen rounds means the card is mostly spent lines by the end, and the
 * three or four still open are the whole decision — leaving the filled ones in view puts the
 * choice at the bottom of a list of things already done. The switch stays, so anyone who
 * wants the full card back has it.
 */
const hideCompleted = ref(true)
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

const scorecardBgStyle = computed(() => {
  const bg = viewedState.value?.player.playerBackground
  if (!bg || scorecardTheme.value === 'light') return {}
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
const showDicePicker = ref(false)
const showSettings = ref(false)
/*
 * Two taps to leave, on the row itself rather than through a modal.
 *
 * Removing a player mid-game is not undoable — their card is gone — but a confirm dialog for
 * it would be the fourth overlay on this screen. Arming the row instead keeps the weight
 * without the furniture, and it reads as what it is: you are pointing at a person.
 */
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
const upperCategories = computed(() =>
  hideCompleted.value && viewedState.value
    ? ALL_UPPER_CATEGORIES.filter(cat => viewedState.value!.scorecard[cat.key] === null)
    : ALL_UPPER_CATEGORIES
)
const lowerCategories = computed(() =>
  hideCompleted.value && viewedState.value
    ? ALL_LOWER_CATEGORIES.filter(cat => viewedState.value!.scorecard[cat.key] === null)
    : ALL_LOWER_CATEGORIES
)

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
.die-held .die { filter: drop-shadow(0 0 10px var(--held-color, var(--pink))); }
.die-theme-neon.die-held .die { filter: drop-shadow(0 0 14px var(--held-color, var(--pink))); }
.held-label { font-size: 9px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.08em; }
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
.dp-group { margin-bottom: 20px; }
.dp-group-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(255,255,255,0.4); margin-bottom: 10px;
}
/* Animation style buttons */
.dp-group-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.dp-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 14px; min-width: 80px;
  border-radius: 10px; border: 2px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.dp-btn:hover { border-color: rgba(255,255,255,0.3); transform: scale(1.04); }
.dp-btn.active { border-color: #fff; box-shadow: 0 0 12px rgba(255,255,255,0.3); transform: scale(1.06); }
.dp-btn-icon { font-size: 20px; line-height: 1; }
.dp-btn-label { font-size: 13px; font-weight: 800; font-family: system-ui, sans-serif; letter-spacing: 0.01em; color: #fff; white-space: nowrap; text-shadow: 0 1px 6px rgba(0,0,0,0.9); }

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

/* PAPER */
.sc-paper { width: 100%; flex-shrink: 0; display: flex; flex-direction: column; }

/* GRID */
.sc-header-row,
.sc-row,
.sc-total-row {
  display: grid;
  grid-template-columns: 108px 1fr 74px;
}
.sc-total-row .sc-score-val { font-size: 14px; }
/* Flex fill: header/total rows stay fixed, unfilled score rows expand to fill space */
.sc-header-row,
.sc-total-row { flex: none; }
.sc-lower-header { flex: none; }
.sc-row { flex: none; transition: background 0.12s; }
.sc-row-filled { flex: none; }
.sc-col-name {
  padding: 7px 8px;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.sc-col-howto {
  padding: 7px 6px;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.sc-col-box {
  padding: 7px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
  border-left: 2px solid rgba(255,255,255,0.12);
}
.sc-col-box-hdr { flex-direction: column; gap: 1px; }
.sc-round-label { font-size: 7px; font-weight: 900; letter-spacing: 0.08em; opacity: 0.65; line-height: 1; }

/* NAME CELL */
.sc-name-inner { gap: 7px; }
.sc-die-icon { width: 28px; height: 28px; flex-shrink: 0; }
.sc-cat-label {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex: 1;
  min-width: 0;
}
.sc-cat-eq { font-size: 10px; font-weight: 600; flex-shrink: 0; white-space: nowrap; }
.sc-lower-name { padding-left: 12px; }
.sc-yahtzee-lbl { font-weight: 900 !important; letter-spacing: 0.05em; }

/* HOW-TO */
.sc-howto-text { font-size: 11px; font-weight: 700; line-height: 1.3; }

/* SCORE VALUE */
.sc-score-val { font-size: 17px; font-weight: 900; font-family: var(--font-display); }

/* TOTAL ROWS */
.sc-total-name {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  gap: 4px;
}
.sc-arrows { font-size: 7px; letter-spacing: -2px; flex-shrink: 0; }
.sc-total-sub { font-size: 9px; line-height: 1.3; }

/* GRAND TOTAL */
.sc-grand-label { font-size: 11px !important; }
.sc-grand-val { font-size: 20px !important; filter: drop-shadow(0 0 3px currentColor); }

/* LOWER SECTION HEADER */
.sc-lower-header {
  padding: 10px 0;
  font-size: 12px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.18em;
  text-align: center;
  text-transform: uppercase;
}

/* PENDING SELECTION */
@keyframes sc-pending-flash {
  0%   { opacity: 1;   box-shadow: inset 0 0 0 3px var(--pending-color, var(--pink)), 0 0 32px var(--pending-color, var(--pink)), 0 0 8px var(--pending-color, var(--pink)); }
  50%  { opacity: 0.2; box-shadow: inset 0 0 0 1px var(--pending-color, var(--pink)), 0 0 4px var(--pending-color, var(--pink)); }
  100% { opacity: 1;   box-shadow: inset 0 0 0 3px var(--pending-color, var(--pink)), 0 0 32px var(--pending-color, var(--pink)), 0 0 8px var(--pending-color, var(--pink)); }
}

/* BONUS CHECKS */
.sc-bonus-checks { gap: 10px; }
.sc-bonus-check { font-size: 20px; font-weight: 900; transition: color 0.2s; }

/* DARK THEME */
.sc-dark { background: rgba(12,12,12,0.88); color: #f0f0f0; }
.sc-dark .sc-header-row { background: #1c1c1c; border-bottom: 2px solid #3a3a3a; }
.sc-dark .sc-header-row .sc-col-name,
.sc-dark .sc-header-row .sc-col-howto,
.sc-dark .sc-header-row .sc-col-box { font-size: 9px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.55); justify-content: center; }
.sc-dark .sc-header-row .sc-col-name { justify-content: flex-start; }
.sc-dark .sc-header-row .sc-col-howto { justify-content: flex-start; padding-left: 2px; }
.sc-dark .sc-section-title { font-size: 14px; color: rgba(255,255,255,0.85); letter-spacing: 0.08em; }
.sc-dark .sc-col-name { border-right: 1px solid rgba(255,255,255,0.09); }
.sc-dark .sc-col-howto { border-right: 1px solid rgba(255,255,255,0.09); }
.sc-dark .sc-col-box { border-left: 2px solid rgba(255,255,255,0.14); }
.sc-dark .sc-row { border-bottom: 1px solid rgba(255,255,255,0.07); transition: background 0.12s; cursor: default; }
.sc-dark .sc-row:nth-child(even) { background: rgba(255,255,255,0.02); }
.sc-dark .sc-row-scoreable { cursor: pointer; }
.sc-dark .sc-row-scoreable:hover { background: rgba(255,255,255,0.05) !important; }
.sc-dark .sc-row-pending {
  background: color-mix(in srgb, var(--pending-color, var(--pink)) 32%, transparent) !important;
  border-left: 3px solid var(--pending-color, var(--pink)) !important;
  transition: none !important;
  animation: sc-pending-flash 0.45s ease-in-out infinite;
}
.sc-dark .sc-row-filled { opacity: 0.72; }
.sc-dark .sc-total-row { background: rgba(255,255,255,0.04); border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.06); }
.sc-dark .sc-section-total-row { border-bottom: 2px solid rgba(255,255,255,0.15); }
.sc-dark .sc-grand-row { background: rgba(255,255,255,0.07); border-top: 2px solid rgba(255,255,255,0.2); }
.sc-dark .sc-lower-header { background: #1c1c1c; border-top: 2px solid rgba(255,255,255,0.15); border-bottom: 2px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.65); }
.sc-dark .sc-die-bg { fill: rgba(255,255,255,0.08); stroke: rgba(255,255,255,0.35); stroke-width: 1; }
.sc-dark .sc-die-pip { fill: #fff; }
.sc-dark .sc-cat-label { color: #f0f0f0; }
.sc-dark .sc-cat-eq { color: rgba(255,255,255,0.45); }
.sc-dark .sc-howto-text { color: rgba(255,255,255,0.45); }
.sc-dark .sc-total-name { color: rgba(255,255,255,0.75); }
.sc-dark .sc-total-sub { color: rgba(255,255,255,0.4); }
.sc-dark .sc-arrows { color: rgba(255,255,255,0.25); }
.sc-dark .sc-val-locked { color: rgba(255,255,255,0.5); }
.sc-dark .sc-val-bonus { color: #ffd400 !important; }
.sc-dark .sc-yahtzee-lbl { color: #ffd400; }
.sc-dark .sc-bonus-check { color: rgba(255,255,255,0.15); }
.sc-dark .sc-check-on { color: #ffd400; }

/* LIGHT THEME */
.sc-light { background: rgba(245,240,232,0.95); color: #111; }
.sc-light .sc-header-row { background: #e0d8c8; border-bottom: 2px solid #999; }
.sc-light .sc-header-row .sc-col-name,
.sc-light .sc-header-row .sc-col-howto,
.sc-light .sc-header-row .sc-col-box { font-size: 9px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #444; justify-content: center; }
.sc-light .sc-header-row .sc-col-name { justify-content: flex-start; }
.sc-light .sc-header-row .sc-col-howto { justify-content: flex-start; padding-left: 2px; }
.sc-light .sc-section-title { font-size: 14px; color: #222; letter-spacing: 0.08em; }
.sc-light .sc-col-name { border-right: 1px solid #bbb; }
.sc-light .sc-col-howto { border-right: 1px solid #bbb; }
.sc-light .sc-row { border-bottom: 1px solid #ccc; transition: background 0.12s; cursor: default; }
.sc-light .sc-row:nth-child(even) { background: rgba(0,0,0,0.02); }
.sc-light .sc-row-scoreable { cursor: pointer; }
.sc-light .sc-row-scoreable:hover { background: rgba(0,0,0,0.05) !important; }
.sc-light .sc-row-pending {
  background: color-mix(in srgb, var(--pending-color, var(--pink)) 28%, transparent) !important;
  border-left: 3px solid var(--pending-color, var(--pink)) !important;
  transition: none !important;
  animation: sc-pending-flash 0.45s ease-in-out infinite;
}
.sc-light .sc-row-filled { opacity: 0.72; }
.sc-light .sc-total-row { background: #ece6d8; border-top: 1px solid #aaa; border-bottom: 1px solid #bbb; }
.sc-light .sc-section-total-row { border-bottom: 2px solid #999; }
.sc-light .sc-grand-row { background: #e0d8c8; border-top: 2px solid #888; }
.sc-light .sc-lower-header { background: #e0d8c8; border-top: 2px solid #aaa; border-bottom: 2px solid #aaa; color: #333; }
.sc-light .sc-die-bg { fill: #fff; stroke: #333; stroke-width: 1.5; }
.sc-light .sc-die-pip { fill: #111; }
.sc-light .sc-cat-label { color: #111; }
.sc-light .sc-cat-eq { color: #555; }
.sc-light .sc-howto-text { color: #555; }
.sc-light .sc-total-name { color: #222; }
.sc-light .sc-total-sub { color: #666; }
.sc-light .sc-arrows { color: #999; }
.sc-light .sc-val-locked { color: #333; }
.sc-light .sc-val-bonus { color: #b8860b !important; font-weight: 900; }
.sc-light .sc-yahtzee-lbl { color: #b8860b; }
.sc-light .sc-bonus-check { color: #ccc; }
.sc-light .sc-check-on { color: #b8860b; }


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

@media (max-width: 380px) {
  .die-wrap .die { --die-size: 48px; }
  .dice-row { gap: 10px; }
  .sc-header-row,
  .sc-row,
  .sc-total-row { grid-template-columns: 96px 1fr 60px; }
  .sc-cat-label { font-size: 11px; }
  .sc-howto-text { font-size: 9.5px; }
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
  .sc-col-name,
  .sc-col-howto,
  .sc-col-box { padding-top: 2px; padding-bottom: 2px; }
  .sc-lower-header { padding: 4px 0; }
  .sc-cat-label { font-size: 10px; }
  .sc-howto-text { font-size: 9px; font-weight: 700; }
  .sc-score-val { font-size: 13px; }
  .sc-total-name { font-size: 9px; }
  .sc-grand-label { font-size: 10px !important; }
  .sc-grand-val { font-size: 17px !important; }
  .sc-bonus-check { font-size: 15px; }
}
/* Tablet portrait: scorecard scrolls freely */
@media (min-width: 768px) and (max-width: 1100px) and (orientation: portrait) {
  .scorecard-scroll { overflow-y: auto; }
  .sc-lower-header { display: flex; align-items: center; justify-content: center; }
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
  /* Wider columns — PTS column widened ~half inch to the left */
  .sc-header-row,
  .sc-row,
  .sc-total-row { grid-template-columns: 200px 1fr 146px; }
  /* Scale fonts to fill the stretched rows — caps kept conservative to prevent overflow */
  .sc-cat-label { font-size: clamp(13px, 1.7dvh, 18px); }
  .sc-howto-text { font-size: clamp(10px, 1.3dvh, 14px); font-weight: 700; }
  /* Larger PTS numbers — reduce vertical padding to keep box height unchanged */
  .sc-col-box { padding-top: 2px; padding-bottom: 2px; }
  .sc-score-val { font-size: clamp(24px, 3.4dvh, 38px); }
  .sc-total-row .sc-score-val { font-size: clamp(20px, 2.8dvh, 30px); }
  .sc-grand-val { font-size: clamp(26px, 3.8dvh, 44px) !important; }
  .sc-total-name { font-size: clamp(11px, 1.5dvh, 16px); }
  .sc-total-sub { font-size: clamp(8px, 1.1dvh, 12px); }
  .sc-grand-label { font-size: clamp(13px, 1.7dvh, 18px) !important; }
  .sc-lower-header { font-size: clamp(12px, 1.7dvh, 18px); padding: 0; }
  .sc-bonus-check { font-size: clamp(14px, 2.1dvh, 22px); }
  .sc-cat-eq { font-size: clamp(9px, 1.2dvh, 13px); }
  .sc-arrows { font-size: clamp(6px, 0.8dvh, 9px); }
  /* Move dice/settings buttons into scorecard header, hide from turn-header */
  .sc-ipad-btns { display: flex; gap: 6px; flex-shrink: 0; }
  .bet-header-btn { margin-left: auto; }
  .sc-header-row { position: sticky; top: 0; z-index: 2; }
  .sc-dark .sc-header-row { background: #0a0a0a; }
  .sc-light .sc-header-row { background: #e0d8c8; }
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
  .sc-paper { flex: 1; }
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
  .sc-paper { height: 100%; display: flex; flex-direction: column; }
  .sc-header-row,
  .sc-row,
  .sc-row-filled,
  .sc-total-row,
  .sc-lower-header { flex: 1; min-height: 0; }
  /* Vertically center the lower-section header text */
  .sc-lower-header { display: flex; align-items: center; justify-content: center; }
  /* Widen PTS column and name column for readability and easier tapping */
  .sc-header-row,
  .sc-row,
  .sc-total-row { grid-template-columns: 190px 1fr 90px; }
  /* Zero out the iPad padding overrides */
  .sc-col-name,
  .sc-col-howto,
  .sc-col-box { padding-top: 4px; padding-bottom: 4px; }
  /* Larger, more readable fonts */
  .sc-cat-label { font-size: clamp(16px, 2dvh, 24px); }
  .sc-howto-text { font-size: clamp(12px, 1.6dvh, 19px); font-weight: 700; line-height: 1.3; }
  .sc-score-val { font-size: clamp(20px, 3dvh, 34px); }
  .sc-total-name { font-size: clamp(13px, 1.8dvh, 22px); }
  .sc-total-sub { font-size: clamp(10px, 1.3dvh, 16px); }
  .sc-grand-label { font-size: clamp(15px, 2dvh, 24px) !important; }
  .sc-grand-val { font-size: clamp(26px, 3.8dvh, 44px) !important; }
  .sc-lower-header { font-size: clamp(14px, 2dvh, 24px); padding: 0; }
  .sc-bonus-check { font-size: clamp(20px, 2.8dvh, 32px); }
  .sc-cat-eq { font-size: clamp(10px, 1.4dvh, 16px); }
  /* Header row labels */
  .sc-dark .sc-header-row .sc-col-box,
  .sc-light .sc-header-row .sc-col-box,
  .sc-dark .sc-header-row .sc-col-name,
  .sc-light .sc-header-row .sc-col-name,
  .sc-dark .sc-header-row .sc-col-howto,
  .sc-light .sc-header-row .sc-col-howto { font-size: 11px; }
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
.dp-anim-styles {
  padding: 12px 4px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 14px;
}
.dp-anim-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 14px;
}
.dp-anim-label {
  font-size: 13px;
  font-weight: 800;
  font-family: var(--font-display);
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.7);
}
.dp-anim-btn {
  padding: 6px 20px;
  border-radius: 20px;
  border: 2px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.15s;
}
.dp-anim-btn.active {
  border-color: var(--pink);
  background: rgba(255,45,120,0.18);
  color: var(--pink);
  box-shadow: 0 0 12px rgba(255,45,120,0.3);
}

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

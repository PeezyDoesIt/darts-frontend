<template>
  <div class="game" v-if="game">
    <div class="game-body">

      <!-- Entry panel -->
      <div class="entry-panel" :style="entryPanelStyle">
        <div v-if="showBlurBg" class="entry-bg-blur" :style="entryBlurBgStyle" />
        <div v-if="entryPhotoStyle" class="entry-bg-photo" :style="entryPhotoStyle" />
        <div class="turn-header" :class="{ 'turn-header-3btns': game.gameType === 'aroundTheClock' || isCricketGame(game.gameType) }" :style="{ '--player-color': currentPlayer.color }">
          <!-- Left: round pill centered in left space -->
          <div class="turn-left">
            <button class="header-avatar-btn" @click="router.push({ path: '/player-setup', query: { edit: currentPlayer.id } })" title="Edit player">
              <div class="header-avatar" :style="{ background: currentPlayer.color, boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }">
                <img v-if="isPhoto(currentPlayer.avatarUrl)" :src="currentPlayer.avatarUrl!" alt="" />
                <span v-else>{{ avatarGlyph(currentPlayer) }}</span>
              </div>
            </button>
            <span class="turn-round-pill display">ROUND {{ game.round }}<template v-if="game.cricketRoundLimit !== null"> / {{ game.cricketRoundLimit }}</template></span>
          </div>

          <!-- Center: player name (absolutely centered) -->
          <div class="turn-name-wrap">
            <span class="turn-name display"
              :class="{ 'turn-name-no-glow': isCricketGame(game.gameType) || game.gameType === 'horse' || game.gameType === 'aroundTheClock' }"
              :style="{ color: currentPlayerNameColor, filter: (isCricketGame(game.gameType) || game.gameType === 'horse' || game.gameType === 'aroundTheClock') ? undefined : `drop-shadow(0 0 6px ${currentPlayer.color}60)` }">{{ currentPlayer.name }}</span>
          </div>

          <!-- Right: action buttons -->
          <div class="turn-right">
            <span v-if="game.gameDuration !== null" class="game-clock-badge" :class="{ 'game-clock-low': gameTimeLeft !== null && gameTimeLeft <= 300 }">{{ gameTimeLeftDisplay }}</span>
            <button v-ripple class="btn btn-sm header-quit-btn" @click="confirmQuit = true" title="Quit game">✕</button>
            <template v-if="isCricketGame(game.gameType)">
              <button v-ripple class="btn btn-sm btn-surface marks-layout-btn" @click="toggleMarksLayout" :title="marksLayout === 'top' ? 'Move marks to right column' : 'Move marks to top strip'">
                {{ marksLayout === 'top' ? '▶' : '▼' }}
              </button>
              <button v-ripple class="btn btn-sm btn-surface marks-visibility-btn" :class="{ 'marks-hidden': !marksVisible }" @click="toggleMarksVisible" :title="marksVisible ? 'Hide scores' : 'Show scores'">
                {{ marksVisible ? '👁' : '👁‍🗨' }}
              </button>
            </template>
            <template v-if="game.gameType === 'aroundTheClock'">
              <button v-ripple class="btn btn-sm btn-surface marks-visibility-btn" :class="{ 'marks-hidden': !atcListVisible }" @click="atcListVisible = !atcListVisible" title="Toggle number list">
                LIST
              </button>
              <button v-ripple class="btn btn-sm btn-surface marks-layout-btn" :class="{ 'marks-hidden': !atcAnyOrder }" @click="atcAnyOrder = !atcAnyOrder" title="Toggle any-order mode">
                ANY
              </button>
            </template>
            <button v-ripple class="btn btn-sm btn-surface scores-btn" :class="{ 'scores-btn-cricket': isCricketGame(game.gameType) }" @click="showAllScores = !showAllScores">SCORES</button>
          </div>

          <!-- Arrow indicator shown only when marks panel is open -->
          <div v-if="(isCricketGame(game.gameType)) && marksVisible && marksLayout === 'top'" class="marks-open-arrow" />
        </div>

        <!-- Cricket marks grid: top strip (default) -->
        <template v-if="(isCricketGame(game.gameType)) && marksLayout === 'top' && marksVisible">

          <!-- 1-3 players: players as rows, targets as columns -->
          <div v-if="game.players.length < 4" class="cricket-strip">
            <div class="cs-header">
              <div class="cs-name-col"></div>
              <div v-for="t in CRICKET_TARGETS" :key="t" class="cs-target-head" :style="{ color: currentPlayerNameColor }">{{ t === 'bull' ? 'B' : t }}</div>
            </div>
            <div
              v-for="p in game.players" :key="p.id"
              class="cs-row"
              :class="{ 'cs-active': p.id === currentPlayer.id }"
              :style="p.id === currentPlayer.id ? { borderLeftColor: p.color } : {}"
            >
              <div class="cs-name" :style="p.id === currentPlayer.id ? { color: p.color } : {}">{{ p.name }}</div>
              <div v-for="t in CRICKET_TARGETS" :key="t" class="cs-cell"
                :class="{ 'cs-closed': (getCricketMarks(p.id)?.[t] ?? 0) >= (game.gameType === 'speedCricket' ? 1 : 3) }">
                <span v-for="n in (game.gameType === 'speedCricket' ? 1 : 3)" :key="n" class="cs-pip"
                  :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }"
                  :style="(getCricketMarks(p.id)?.[t] ?? 0) >= n ? { background: p.color, boxShadow: `0 0 4px ${p.color}` } : {}"
                />
              </div>
            </div>
          </div>

          <!-- 4+ players: transposed — targets as rows, players as columns -->
          <div v-else class="cricket-strip cricket-strip-transposed">
            <div class="cst-header">
              <div class="cst-target-col"></div>
              <div v-for="p in game.players" :key="p.id" class="cst-player-head"
                :style="{ color: p.color }">
                {{ p.name }}
              </div>
            </div>
            <div v-for="t in CRICKET_TARGETS" :key="t" class="cst-row">
              <div class="cst-target-label" :style="{ color: currentPlayerNameColor }">{{ t === 'bull' ? 'B' : t }}</div>
              <div v-for="p in game.players" :key="p.id" class="cst-cell"
                :class="{ 'cs-closed': (getCricketMarks(p.id)?.[t] ?? 0) >= (game.gameType === 'speedCricket' ? 1 : 3) }"
                :style="p.id === currentPlayer.id ? { background: p.color + '10' } : {}">
                <span v-for="n in (game.gameType === 'speedCricket' ? 1 : 3)" :key="n" class="cs-pip"
                  :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }"
                  :style="(getCricketMarks(p.id)?.[t] ?? 0) >= n ? { background: p.color, boxShadow: `0 0 4px ${p.color}` } : {}"
                />
              </div>
            </div>
          </div>

        </template>

        <div class="entry-body">
          <CricketEntry
            v-if="isCricketGame(game.gameType)"
            ref="cricketEntryRef"
            :key="currentPlayer.id + '-' + game.round + '-' + (game.turnSeq ?? 0)"
            :playerId="currentPlayer.id"
            :scores="game.scores"
            :marksToClose="game.gameType === 'speedCricket' ? 1 : 3"
            :round="game.round"
            :closedTargetDisplay="effectiveClosedTargetDisplay"
            :avatarUrl="currentPlayer.avatarUrl"
            :playerColor="currentPlayer.color"
            :playerBackground="currentPlayer.playerBackground"
            :targetLabelColor="currentPlayer.targetLabelColor"
            :pipColor="currentPlayer.pipColor"
            :pipStyle="currentPlayer.pipStyle"
            :throwTimeLeft="throwTimeLeft"
            :throwTimerDuration="throwTimerDuration"
            :throwPaused="throwPaused"
            :showPauseLocked="showPauseLocked"
            :wildTargets="game.wildEnabled ? game.wildTargets : undefined"
            :wildPlayerMarks="game.wildEnabled ? wildPlayerMarks : undefined"
            @submit="handleCricketSubmit"
            @toggleThrowPause="toggleThrowPause"
          />
          <KillerEntry
            v-else-if="game.gameType === 'killer' && killerOwn"
            :key="currentPlayer.id + '-' + game.round + '-' + (game.turnSeq ?? 0)"
            :ownNumber="killerOwn.number"
            :isKiller="killerOwn.isKiller"
            :requireDouble="game.killerRequireDouble"
            :opponents="killerOpponents"
            @submit="handleKillerSubmit"
          />
          <NumpadEntry
            v-else-if="['301','501','701','1001'].includes(game.gameType)"
            :key="currentPlayer.id"
            :remaining="(game.scores[currentPlayer.id] as OhOneScore).data.remaining"
            :throwTimeLeft="throwTimeLeft"
            :throwTimerDuration="throwTimerDuration"
            :throwPaused="throwPaused"
            :showPauseLocked="showPauseLocked"
            @submit="handleNumpadSubmit"
            @toggleThrowPause="toggleThrowPause"
          />
          <AroundTheClockEntry
            v-else-if="game.gameType === 'aroundTheClock'"
            :key="currentPlayer.id"
            :completedCount="atcCompletedCount"
            :playerColor="currentPlayer.color"
            :anyOrder="atcAnyOrder"
            :completedNums="atcCompletedNums"
            :showNumList="atcListVisible"
            :throwTimeLeft="throwTimeLeft"
            :throwTimerDuration="throwTimerDuration"
            :throwPaused="throwPaused"
            :showPauseLocked="showPauseLocked"
            @submit="handleAtcSubmit"
            @toggleThrowPause="toggleThrowPause"
          />
          <SimpleEntry
            v-else
            :key="currentPlayer.id"
            :gameType="game.gameType"
            :round="game.round"
            :hint="horseHint"
            :horseLetters="horseLetters"
            :isHorseSetter="isHorseSetter"
            :horseTarget="horseTarget"
            :playerColor="currentPlayer.color"
            :throwTimeLeft="throwTimeLeft"
            :throwTimerDuration="throwTimerDuration"
            :throwPaused="throwPaused"
            :showPauseLocked="showPauseLocked"
            @submit="handleNumpadSubmit"
            @toggleThrowPause="toggleThrowPause"
          />
        </div>


      </div>

      <!-- ═══════════════════════════════════════════════════════════════
           WIDESCREEN SIDEBAR — only visible at min-width: 1100px
           To remove: delete this entire comment block + the CSS section
           marked "WIDESCREEN SIDEBAR" at the bottom of the style block
           ═══════════════════════════════════════════════════════════════ -->
      <div class="ws-sidebar" :class="{ 'ws-sidebar-collapsed': sidebarCollapsed }">
        <button class="ws-collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? 'Show scores' : 'Hide scores'">{{ sidebarCollapsed ? '◀' : '▶' }}</button>
        <div class="ws-sidebar-inner" v-show="!sidebarCollapsed">
        <div class="ws-game-info">
          <span class="ws-game-type">{{ GAME_TYPE_LABELS[game.gameType] }}</span>
          <span class="ws-round">Round {{ game.round }}<template v-if="game.cricketRoundLimit !== null"> / {{ game.cricketRoundLimit }}</template></span>
        </div>
        <div class="ws-players">
          <div
            v-for="p in game.players"
            :key="p.id"
            class="ws-player-row"
            :class="{ 'ws-active': p.id === currentPlayer.id }"
            :style="p.id === currentPlayer.id ? { '--ws-color': p.color, background: p.color + '14', borderLeftColor: p.color } : { borderLeftColor: 'transparent' }"
          >
            <div class="ws-avatar" :style="{ background: p.color }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ avatarGlyph(p) }}</span>
            </div>
            <div class="ws-player-info">
              <span class="ws-player-name" :style="p.id === currentPlayer.id ? { color: '#fff' } : {}">
                {{ p.name }}
                <span v-if="p.id === currentPlayer.id" class="ws-throwing-tag">▶</span>
              </span>
              <!-- Cricket marks -->
              <div v-if="isCricketGame(game.gameType)" class="ws-cricket-marks">
                <div v-for="t in CRICKET_TARGETS" :key="t" class="ws-mark-cell"
                  :class="{ 'ws-mark-closed': (getCricketMarks(p.id)?.[t] ?? 0) >= (game.gameType === 'speedCricket' ? 1 : 3) }">
                  <span class="ws-mark-label">{{ t === 'bull' ? 'B' : t }}</span>
                  <div class="ws-mark-pips">
                    <span v-for="n in (game.gameType === 'speedCricket' ? 1 : 3)" :key="n"
                      class="ws-pip"
                      :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }"
                      :style="(getCricketMarks(p.id)?.[t] ?? 0) >= n ? { background: p.color } : {}"
                    />
                  </div>
                </div>
              </div>
              <!-- Non-cricket score -->
              <span v-else class="ws-score">{{ displayScore(p.id) }}</span>
            </div>
          </div>
        </div>
        <div class="ws-footer">
          <div v-if="game.gameType === 'cricket' || game.gameType === 'speedCricket'" class="ws-wild-row">
            <span class="ws-wild-label">Wild</span>
            <div class="ws-wild-btns">
              <button v-ripple class="timer-ctrl-btn" :class="{ active: !game.wildEnabled }" @click="gameStore.setWildEnabled(false)">Off</button>
              <button v-ripple class="timer-ctrl-btn" :class="{ active: game.wildEnabled }" @click="gameStore.setWildEnabled(true)">On</button>
            </div>
          </div>
          <button v-ripple class="btn btn-sm btn-danger ws-quit-btn" @click="confirmQuit = true">Quit</button>
        </div>
        </div><!-- /ws-sidebar-inner -->
      </div>
      <!-- ═══════════════════ END WIDESCREEN SIDEBAR ═══════════════════ -->

      <!-- Cricket marks grid: right column (optional layout) -->
      <div v-if="(isCricketGame(game.gameType)) && marksLayout === 'right' && marksVisible" class="cricket-col">

        <!-- 3 players: first two on top, third stacked below -->
        <template v-if="game.players.length === 3">
          <div class="cc-header">
            <div class="cc-target-label" style="min-width:0"></div>
            <div v-for="p in game.players.slice(0, 2)" :key="p.id" class="cc-player-head" :style="{ color: p.color }">{{ p.name }}</div>
          </div>
          <div v-for="t in CRICKET_TARGETS" :key="'a'+t" class="cc-target-row">
            <div class="cc-target-label" :style="{ color: currentPlayerNameColor }">{{ t === 'bull' ? 'B' : t }}</div>
            <div v-for="p in game.players.slice(0, 2)" :key="p.id" class="cc-cell" :class="{ 'cc-closed': (getCricketMarks(p.id)?.[t] ?? 0) >= (game.gameType === 'speedCricket' ? 1 : 3) }">
              <span v-for="n in (game.gameType === 'speedCricket' ? 1 : 3)" :key="n" class="cc-pip"
                :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }"
                :style="(getCricketMarks(p.id)?.[t] ?? 0) >= n ? { background: p.color, boxShadow: `0 0 14px ${p.color}, 0 0 5px ${p.color}` } : {}" />
            </div>
          </div>
          <div class="cc-group-divider"></div>
          <div class="cc-header">
            <div class="cc-target-label" style="min-width:0"></div>
            <div class="cc-player-head" :style="{ color: game.players[2]!.color }">{{ game.players[2]!.name }}</div>
          </div>
          <div v-for="t in CRICKET_TARGETS" :key="'b'+t" class="cc-target-row">
            <div class="cc-target-label" :style="{ color: currentPlayerNameColor }">{{ t === 'bull' ? 'B' : t }}</div>
            <div class="cc-cell" :class="{ 'cc-closed': (getCricketMarks(game.players[2]!.id)?.[t] ?? 0) >= (game.gameType === 'speedCricket' ? 1 : 3) }">
              <span v-for="n in (game.gameType === 'speedCricket' ? 1 : 3)" :key="n" class="cc-pip"
                :class="{ filled: (getCricketMarks(game.players[2]!.id)?.[t] ?? 0) >= n }"
                :style="(getCricketMarks(game.players[2]!.id)?.[t] ?? 0) >= n ? { background: game.players[2]!.color, boxShadow: `0 0 14px ${game.players[2]!.color}, 0 0 5px ${game.players[2]!.color}` } : {}" />
            </div>
          </div>
        </template>

        <!-- 2 or 4+ players: all as columns -->
        <template v-else>
          <div class="cc-header">
            <div class="cc-target-label" style="min-width:0"></div>
            <div v-for="p in game.players" :key="p.id" class="cc-player-head" :style="{ color: p.color }">{{ p.name }}</div>
          </div>
          <div v-for="t in CRICKET_TARGETS" :key="t" class="cc-target-row">
            <div class="cc-target-label" :style="{ color: currentPlayerNameColor }">{{ t === 'bull' ? 'B' : t }}</div>
            <div v-for="p in game.players" :key="p.id" class="cc-cell" :class="{ 'cc-closed': (getCricketMarks(p.id)?.[t] ?? 0) >= (game.gameType === 'speedCricket' ? 1 : 3) }">
              <span v-for="n in (game.gameType === 'speedCricket' ? 1 : 3)" :key="n" class="cc-pip"
                :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }"
                :style="(getCricketMarks(p.id)?.[t] ?? 0) >= n ? { background: p.color, boxShadow: `0 0 14px ${p.color}, 0 0 5px ${p.color}` } : {}" />
            </div>
          </div>
        </template>

      </div>

      <!-- Score reveal overlay — oh-one games -->
      <Transition name="score-reveal">
        <div v-if="showScoreReveal && revealData" class="score-reveal-overlay" :class="{ 'bust-overlay': revealData.isBust }">
          <template v-if="revealData.isBust">
            <div class="reveal-label" style="background:#7f1d1d">BUST</div>
            <template v-if="game.bustEliminates">
              <div class="reveal-eliminated" :style="{ color: revealData.playerColor, filter: `drop-shadow(0 0 40px ${revealData.playerColor}80)` }">ELIMINATED</div>
              <div class="reveal-bust-msg">Better luck next time</div>
            </template>
            <template v-else>
              <div class="reveal-number" :style="{ color: revealData.playerColor, filter: `drop-shadow(0 0 40px ${revealData.playerColor}80)` }">{{ revealData.remaining }}</div>
              <div class="reveal-bust-msg">No change — next player</div>
            </template>
          </template>
          <template v-else>
            <div class="reveal-label">REMAINING</div>
            <div class="reveal-number" :style="{ color: revealData.playerColor, filter: `drop-shadow(0 0 40px ${revealData.playerColor}80)` }">
              {{ revealData.remaining }}
            </div>
          </template>
        </div>
      </Transition>
    </div>

    <!--
      On hold.

      Covers the board rather than sitting beside it, for two reasons: the game is stopped, so
      nothing behind it should be tappable — a stray tap while nobody is playing would enter
      darts for whoever is up — and Resume needs to be one press rather than a trip back
      through the scores panel.
    -->
    <Transition name="fade">
      <div v-if="isHeld" class="hold-overlay">
        <div class="hold-panel">
          <div class="hold-icon">⏸</div>
          <div class="hold-title display">ON HOLD</div>
          <p class="hold-sub">Every timer is stopped. Nobody loses their turn.</p>
          <button v-ripple class="btn btn-spray btn-xl hold-resume" @click="gameStore.setHeld(false)">Resume</button>
        </div>
      </div>
    </Transition>

    <!-- Game timer announcement overlay -->
    <Transition name="timer-announce">
      <div v-if="showGameTimerAnnounce" class="game-timer-announce-overlay">
        <div class="gta-content">
          <div class="gta-icon">⏱</div>
          <div class="gta-text">{{ gameTimerAnnounceText }}</div>
        </div>
      </div>
    </Transition>

    <!-- Fullscreen scores overlay -->
    <div v-if="showAllScores" class="scores-overlay">
      <div class="lb-header">
        <div>
          <div class="game-type-badge">{{ GAME_TYPE_LABELS[game.gameType] }}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <div v-if="isCricketGame(game.gameType)" class="ct-display-row">
            <button v-for="opt in ctDisplayOptions" :key="opt.value" v-ripple
              class="ct-display-btn" :class="{ active: effectiveClosedTargetDisplay === opt.value }"
              @click="setClosedTargetDisplay(opt.value); showAllScores = false">{{ opt.label }}</button>
          </div>
          <button v-ripple class="btn btn-sm btn-surface" @click="showAddPlayer = !showAddPlayer">+ Add</button>
          <button v-ripple class="btn btn-sm btn-surface close-scores-btn" @click="showAllScores = false">✕</button>
        </div>
      </div>

      <!-- Timer controls -->
      <div class="timer-controls-row">
        <div v-if="game.gameType === 'cricket' || game.gameType === 'speedCricket'" class="timer-control-group">
          <span class="timer-control-label">Wild Mode</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: !game.wildEnabled }" @click="gameStore.setWildEnabled(false); showAllScores = false">Off</button>
            <button v-ripple class="timer-ctrl-btn" :class="{ active: game.wildEnabled }" @click="gameStore.setWildEnabled(true); showAllScores = false">On</button>
          </div>
        </div>
        <div class="timer-control-group">
          <span class="timer-control-label">Walk-up</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: game.timerDuration === 0 }" @click="gameStore.setTimerDuration(0)">Off</button>
            <button v-for="t in TIMER_OPTIONS" :key="t" v-ripple class="timer-ctrl-btn" :class="{ active: game.timerDuration === t }" @click="gameStore.setTimerDuration(t)">{{ t }}s</button>
          </div>
        </div>
        <div class="timer-control-group">
          <span class="timer-control-label">Throw</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: game.throwTimerDuration === 0 }" @click="gameStore.setThrowTimerDuration(0)">Off</button>
            <button v-for="t in TIMER_OPTIONS" :key="t" v-ripple class="timer-ctrl-btn" :class="{ active: game.throwTimerDuration === t }" @click="gameStore.setThrowTimerDuration(t)">{{ t }}s</button>
          </div>
        </div>
        <!--
          The hot seat: who the narrator picks on.

          Mid-game only and stored on the game, because it is a bit aimed at whoever is
          winning tonight — it should not follow anybody into next week. Nobody is the
          default and is always first, so switching it off is one press from anywhere.
        -->
        <div class="timer-control-group">
          <span class="timer-control-label">Hot Seat</span>
          <div class="timer-control-btns">
            <button
              v-ripple class="timer-ctrl-btn"
              :class="{ active: !game.heckleTargetId }"
              @click="gameStore.setHeckleTarget(null)"
            >Nobody</button>
            <button
              v-for="p in game.players" :key="p.id"
              v-ripple class="timer-ctrl-btn"
              :class="{ active: game.heckleTargetId === p.id }"
              :style="game.heckleTargetId === p.id ? { borderColor: p.color, color: p.color } : {}"
              @click="gameStore.setHeckleTarget(p.id)"
            >{{ p.name }}</button>
          </div>
          <!-- Says so rather than pretending: the heckle rides on commentary, which is off. -->
          <span v-if="game.heckleTargetId && settingsStore.narratorMode !== 'full'" class="hot-seat-note">
            Needs Commentary on to be heard.
          </span>
        </div>

        <!--
          Stops the game itself, as opposed to the control below which governs whether players
          may pause a timer for their own turn. The two are easy to confuse, so they sit next
          to each other and say plainly which is which.
        -->
        <div class="timer-control-group">
          <span class="timer-control-label">Game Hold</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: !isHeld }" @click="gameStore.setHeld(false)">Running</button>
            <button v-ripple class="timer-ctrl-btn" :class="{ active: isHeld }" @click="gameStore.setHeld(true); showAllScores = false">Hold</button>
          </div>
        </div>

        <!--
          "Pause / Allow / Lock" read like it stopped the clock. It governs whether tapping a
          timer pauses it, which is the opposite thing, so it is named for what it controls.
        -->
        <div class="timer-control-group">
          <span class="timer-control-label">Timer Pause</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: !settingsStore.disableTimerPause }" @click="settingsStore.setDisableTimerPause(false)">Allowed</button>
            <button v-ripple class="timer-ctrl-btn" :class="{ active: settingsStore.disableTimerPause }" @click="settingsStore.setDisableTimerPause(true)">Locked</button>
          </div>
        </div>
        <div v-if="isCricketGame(game.gameType)" class="timer-control-group">
          <span class="timer-control-label">Round Limit</span>
          <div class="round-limit-control">
            <button v-ripple class="round-limit-btn" :disabled="game.cricketRoundLimit === null || game.cricketRoundLimit <= 1" @click="gameStore.setRoundLimit(Math.max(1, (game.cricketRoundLimit ?? 7) - 1))">−</button>
            <span class="round-limit-val" @click="gameStore.setRoundLimit(game.cricketRoundLimit === null ? 7 : null)">{{ game.cricketRoundLimit ?? 'OFF' }}</span>
            <button v-ripple class="round-limit-btn" @click="gameStore.setRoundLimit((game.cricketRoundLimit ?? 0) + 1)">+</button>
          </div>
        </div>
        <div class="timer-control-group">
          <span class="timer-control-label">Game Timer</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: game.gameDuration === null }" @click="gameStore.setGameDuration(null)">Off</button>
            <button v-for="t in [30,45,60,90]" :key="t" v-ripple class="timer-ctrl-btn" :class="{ active: game.gameDuration === t }" @click="gameStore.setGameDuration(t)">{{ t }}m</button>
          </div>
        </div>
        <div class="timer-control-group">
          <span class="timer-control-label">Walk-up Screen</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: !game.skipWalkup }" @click="gameStore.setSkipWalkup(false)">Show</button>
            <button v-ripple class="timer-ctrl-btn" :class="{ active: game.skipWalkup }" @click="gameStore.setSkipWalkup(true)">Skip</button>
          </div>
        </div>
        <!--
          The mode is read at speak time rather than captured when the game starts, so
          flipping it here takes effect on the very next line. It lives with the other
          in-game controls rather than in the header: the header is what you tap mid-throw.
        -->
        <div class="timer-control-group">
          <span class="timer-control-label">Narrator</span>
          <div class="timer-control-btns">
            <button
              v-for="m in NARRATOR_MODES" :key="m.value"
              v-ripple class="timer-ctrl-btn"
              :class="{ active: settingsStore.narratorMode === m.value }"
              @click="settingsStore.setNarratorMode(m.value)"
            >{{ m.label }}</button>
          </div>
        </div>
        <div class="timer-control-group">
          <button v-ripple class="btn btn-sm btn-danger" @click="confirmQuit = true; showAllScores = false">Quit Game</button>
        </div>
      </div>

      <!-- Add player picker -->
      <div v-if="showAddPlayer" class="add-player-panel">
        <button v-ripple class="add-player-row add-player-create" @click="router.push('/player-setup?addToGame=true'); showAddPlayer = false; showAllScores = false">
          <span class="add-player-name" style="color: var(--pink)">+ Create New Player</span>
        </button>
        <div v-if="availablePlayers.length === 0" class="add-player-empty">All saved players are already in this game.</div>
        <button
          v-for="p in availablePlayers" :key="p.id"
          v-ripple
          class="add-player-row"
          @click="gameStore.addPlayerToGame(p); showAddPlayer = false"
        >
          <div class="add-player-avatar" :style="{ background: p.color }">
            <img v-if="p.avatarUrl?.startsWith('data:') || p.avatarUrl?.startsWith('http')" :src="p.avatarUrl" alt="" />
            <span v-else>{{ avatarGlyph(p) }}</span>
          </div>
          <span class="add-player-name">{{ p.name }}</span>
          <span class="add-player-cta">Add →</span>
        </button>
      </div>

      <div class="lb-players-scroll" ref="lbScrollRef">
        <div class="lb-players">
          <div
            v-for="p in game.players" :key="p.id"
            class="lb-player-row"
            :class="{
              active: p.id === currentPlayer.id,
              'ptc-finished': game.playToCompletion && game.finishOrder.includes(p.id)
            }"
            :style="p.id === currentPlayer.id ? { '--active-color': p.color, background: p.color + '12', boxShadow: `0 0 20px ${p.color}20` } : {}"
          >
            <div class="active-dot" :style="{ background: p.color, opacity: p.id === currentPlayer.id ? 1 : 0 }" />
            <div class="lb-avatar" :style="{ background: p.color, boxShadow: p.id === currentPlayer.id ? '3px 3px 0 rgba(0,0,0,0.55)' : 'none' }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ avatarGlyph(p) }}</span>
            </div>
            <div class="lb-player-info">
              <span class="lb-player-name" :style="p.id === currentPlayer.id ? { color: '#fff' } : {}">
                {{ p.name }}
                <span v-if="p.id === currentPlayer.id" class="throwing-tag">throwing</span>
                <span v-else-if="game.playToCompletion && game.finishOrder.includes(p.id)" class="finished-tag">finished</span>
              </span>
              <div v-if="isCricketGame(game.gameType)" class="cricket-mini">
                <div v-for="t in CRICKET_TARGETS" :key="t" class="mini-target">
                  <span class="mini-label">{{ t === 'bull' ? 'B' : t }}</span>
                  <div class="mini-marks">
                    <span v-for="n in (game.gameType === 'speedCricket' ? 1 : 3)" :key="n" class="mini-pip" :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }" />
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!isCricketGame(game.gameType)" class="lb-score">
              <span class="lb-score-val" :style="p.id === currentPlayer.id ? { color: '#fff' } : {}">{{ displayScore(p.id) }}</span>
              <span class="lb-score-label">{{ scoreLabel }}</span>
            </div>
            <button v-if="game.players.length > 2 && !(game.playToCompletion && game.finishOrder.includes(p.id))" v-ripple class="remove-player-btn" @click.stop="confirmRemoveId = p.id" title="Remove from game">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quit confirm dialog -->
    <q-dialog v-model="confirmQuit">
      <q-card dark class="confirm-card">
        <q-card-section>
          <div class="text-h6">Quit this game?</div>
          <div class="text-body2 text-grey-5 q-mt-sm">Progress will be lost.</div>
        </q-card-section>
        <q-card-actions align="right">
          <button v-ripple class="btn btn-surface btn-sm" @click="confirmQuit = false">Cancel</button>
          <button v-ripple class="btn btn-danger btn-sm" @click="quitGame">Quit</button>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Remove player confirm dialog -->
    <q-dialog :model-value="confirmRemoveId !== null" @update:model-value="confirmRemoveId = null">
      <q-card dark class="confirm-card">
        <q-card-section>
          <div class="text-h6">Remove {{ confirmRemovePlayer?.name ?? 'player' }}?</div>
          <div class="text-body2 text-grey-5 q-mt-sm">They will be taken out of the game.</div>
        </q-card-section>
        <q-card-actions align="right">
          <button v-ripple class="btn btn-surface btn-sm" @click="confirmRemoveId = null">Cancel</button>
          <button v-ripple class="btn btn-danger btn-sm" @click="doRemovePlayer">Remove</button>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- COIN FLIP OVERLAY -->
    <Transition name="coin-fade">
      <div v-if="showCoinFlip" class="coin-overlay" @click.self="showCoinFlip = false">
        <div class="coin-modal">
          <div class="coin-modal-header">
            <span class="coin-modal-title display">COIN FLIP</span>
            <button class="coin-close-btn" @click="showCoinFlip = false">✕</button>
          </div>

          <div class="coin-body">
            <!-- Left column (landscape) / top (portrait): the coin itself -->
            <div class="coin-left">
              <div class="coin-arena" @click="flipCoin">
                <div class="coin-perspective">
                  <div :key="coinAnimKey" class="coin" :class="coinAnimClass">
                    <div class="coin-face coin-face-heads">
                      <img v-if="settingsStore.coinHeadsImage" :src="settingsStore.coinHeadsImage" class="coin-img" />
                      <span v-else class="coin-letter">H</span>
                    </div>
                    <div class="coin-face coin-face-tails">
                      <img v-if="settingsStore.coinTailsImage" :src="settingsStore.coinTailsImage" class="coin-img" />
                      <span v-else class="coin-letter">T</span>
                    </div>
                  </div>
                </div>
                <span class="coin-tap-hint">{{ coinFlipping ? '' : seriesWinner ? 'Series complete!' : coinResult ? 'Tap to flip again' : 'Tap coin to flip' }}</span>
              </div>

              <Transition name="result-slide">
                <div v-if="coinResult && !coinFlipping" class="coin-result">
                  <span v-if="seriesWinner" class="coin-series-winner display">{{ seriesWinner === 'heads' ? 'HEADS WINS!' : 'TAILS WINS!' }}</span>
                  <span v-else class="coin-result-text display" :class="coinResult">{{ coinResult === 'heads' ? 'HEADS' : 'TAILS' }}</span>
                </div>
              </Transition>
            </div>

            <!-- Right column (landscape) / bottom (portrait): all controls -->
            <div class="coin-right">
              <!-- Series mode selector -->
              <div class="coin-series-modes">
                <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'single' }" @click="seriesMode = 'single'">Single</button>
                <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'bo3' }" @click="seriesMode = 'bo3'">Best of 3</button>
                <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'bo5' }" @click="seriesMode = 'bo5'">Best of 5</button>
              </div>

              <!-- Question / purpose -->
              <div class="coin-question-section">
                <div v-if="coinQuestion" class="coin-question-display">
                  <span class="coin-question-text">{{ coinQuestion }}</span>
                  <button class="coin-question-clear" @click.stop="coinQuestion = ''; showQuestionInput = false">✕</button>
                </div>
                <div v-else-if="showQuestionInput" class="coin-question-input-row" @click.stop>
                  <input
                    v-model="coinQuestionDraft"
                    class="coin-question-input"
                    placeholder="What are we flipping for?"
                    maxlength="80"
                    @keydown.enter="setCoinQuestion"
                    @keydown.esc="showQuestionInput = false; coinQuestionDraft = ''"
                  />
                  <button class="coin-q-confirm" @click.stop="setCoinQuestion">✓</button>
                  <button class="coin-q-cancel" @click.stop="showQuestionInput = false; coinQuestionDraft = ''">✕</button>
                </div>
                <button v-else class="coin-question-toggle" @click.stop="showQuestionInput = true">✏️ What's the flip for?</button>
              </div>

              <!-- Series scoreboard -->
              <div v-if="seriesMode !== 'single'" class="coin-series-board">
                <div class="series-side" :class="{ 'series-winner-side': seriesWinner === 'heads' }">
                  <span class="series-label">HEADS</span>
                  <span class="series-count">{{ seriesHeads }}</span>
                  <div class="series-pips">
                    <span v-for="n in seriesTarget" :key="n" class="series-pip" :class="{ 'pip-filled': seriesHeads >= n }" />
                  </div>
                </div>
                <div class="series-divider">vs</div>
                <div class="series-side" :class="{ 'series-winner-side': seriesWinner === 'tails' }">
                  <span class="series-label">TAILS</span>
                  <span class="series-count">{{ seriesTails }}</span>
                  <div class="series-pips">
                    <span v-for="n in seriesTarget" :key="n" class="series-pip" :class="{ 'pip-filled': seriesTails >= n }" />
                  </div>
                </div>
              </div>

              <button v-if="seriesMode !== 'single' && seriesTotal > 0" v-ripple class="coin-reset-btn" @click="resetSeries()">↺ Reset Series</button>

              <div class="coin-customize">
                <div class="coin-cust-side">
                  <span class="coin-cust-label">HEADS</span>
                  <button class="coin-cust-btn" @click.stop="pickCoinImage('heads')">
                    <img v-if="settingsStore.coinHeadsImage" :src="settingsStore.coinHeadsImage" class="cust-preview" />
                    <span v-else class="cust-placeholder">+ Photo</span>
                  </button>
                  <button v-if="settingsStore.coinHeadsImage" class="coin-cust-clear" @click.stop="settingsStore.setCoinHeadsImage(null)">✕</button>
                </div>
                <div class="coin-cust-divider" />
                <div class="coin-cust-side">
                  <span class="coin-cust-label">TAILS</span>
                  <button class="coin-cust-btn" @click.stop="pickCoinImage('tails')">
                    <img v-if="settingsStore.coinTailsImage" :src="settingsStore.coinTailsImage" class="cust-preview" />
                    <span v-else class="cust-placeholder">+ Photo</span>
                  </button>
                  <button v-if="settingsStore.coinTailsImage" class="coin-cust-clear" @click.stop="settingsStore.setCoinTailsImage(null)">✕</button>
                </div>
              </div>
            </div>
          </div>

          <input ref="headsFileInput" type="file" accept="image/*" style="display:none" @change="onCoinImagePicked('heads', $event)" />
          <input ref="tailsFileInput" type="file" accept="image/*" style="display:none" @change="onCoinImagePicked('tails', $event)" />
        </div>
      </div>
    </Transition>
  </div>

  <div v-else class="no-game">
    <p>No active game.</p>
    <button v-ripple class="btn btn-gold btn-lg" @click="router.push('/')">Go Home</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import { useGameStore } from '../stores/game'
import { usePlayersStore } from '../stores/players'
import { useSettingsStore } from '../stores/settings'
import { GAME_TYPE_LABELS, CRICKET_TARGETS, NARRATOR_MODES, isCricketGame, type PlayerScore, type CricketTarget } from '../types/index'
import { resolveTargetColor } from '../lib/targetColor'
import { useNarrator } from '../composables/useNarrator'
import type { LineContext, NarratorEvent } from '../lib/narrator'
import { playBombBeep, playGameShowBuzzer, playTurnStartTone, playTurnResultSound, unlockAudio } from '../composables/useSounds'

import CricketEntry from '../components/CricketEntry.vue'
import KillerEntry from '../components/KillerEntry.vue'
import NumpadEntry from '../components/NumpadEntry.vue'
import SimpleEntry from '../components/SimpleEntry.vue'
import AroundTheClockEntry from '../components/AroundTheClockEntry.vue'
type OhOneScore = Extract<PlayerScore, { kind: 'ohOne' }>
type SimpleScore = Extract<PlayerScore, { kind: 'simple' }>
type CricketHits = Record<string | number, number>


const router = useRouter()
const gameStore = useGameStore()
const playersStore = usePlayersStore()
const settingsStore = useSettingsStore()
const { narrateAsync } = useNarrator()


/**
 * Speak one narrator event. The view no longer decides what a personality sounds like or
 * whether an event survives "Names only" — that lives in the line module, which is what
 * this page previously bypassed entirely.
 */
function narrate(event: NarratorEvent, extra: Partial<LineContext> = {}) {
  // Set here rather than at each call site: every line this screen speaks is about whoever is
  // currently up, so the hot seat applies to all of them or none.
  const heckled = !!game.value?.heckleTargetId && game.value.heckleTargetId === currentPlayer.value?.id
  narrateAsync(event, { name: currentPlayer.value?.name ?? '', heckled, ...extra })
}

const game = computed(() => gameStore.game)
const confirmQuit = ref(false)
const intentionalQuit = ref(false)
const confirmRemoveId = ref<string | null>(null)
const confirmRemovePlayer = computed(() => game.value?.players.find(p => p.id === confirmRemoveId.value))
function doRemovePlayer() {
  if (confirmRemoveId.value) gameStore.removePlayerFromGame(confirmRemoveId.value)
  confirmRemoveId.value = null
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (game.value?.status === 'playing' || game.value?.status === 'between_turns') {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave((to, _from, next) => {
  // Allow navigation that is part of the normal game flow
  const gameFlowRoutes = ['/between', '/win', '/game']
  const isAddPlayer = to.path === '/player-setup' && to.query.addToGame
  const isEditPlayer = to.path === '/player-setup' && to.query.edit
  if (intentionalQuit.value || !game.value || game.value.status === 'finished' || gameFlowRoutes.includes(to.path) || isAddPlayer || isEditPlayer) {
    next()
    return
  }
  // Block and show the existing confirm dialog
  confirmQuit.value = true
  next(false)
})
const showAllScores = ref(false)
const showAddPlayer = ref(false)
const sidebarCollapsed = ref(false)

// Coin flip
const showCoinFlip = ref(false)
const coinAnimKey = ref(0)
const coinAnimClass = ref<'flip-to-heads' | 'flip-to-tails' | null>(null)
const coinFlipping = ref(false)
const coinResult = ref<'heads' | 'tails' | null>(null)
const headsFileInput = ref<HTMLInputElement | null>(null)
const tailsFileInput = ref<HTMLInputElement | null>(null)

// Series tracking
const seriesMode = ref<'single' | 'bo3' | 'bo5'>('single')
const seriesHeads = ref(0)
const seriesTails = ref(0)

// Coin question
const coinQuestion = ref('')
const coinQuestionDraft = ref('')
const showQuestionInput = ref(false)

function setCoinQuestion() {
  coinQuestion.value = coinQuestionDraft.value.trim()
  coinQuestionDraft.value = ''
  showQuestionInput.value = false
}

const seriesTarget = computed(() => seriesMode.value === 'bo3' ? 2 : seriesMode.value === 'bo5' ? 3 : 0)
const seriesWinner = computed(() => {
  if (seriesTarget.value === 0) return null
  if (seriesHeads.value >= seriesTarget.value) return 'heads'
  if (seriesTails.value >= seriesTarget.value) return 'tails'
  return null
})
const seriesTotal = computed(() => seriesHeads.value + seriesTails.value)

function flipCoin() {
  if (coinFlipping.value || seriesWinner.value !== null) return
  coinResult.value = null
  coinFlipping.value = true
  const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails'
  coinAnimKey.value++
  coinAnimClass.value = result === 'heads' ? 'flip-to-heads' : 'flip-to-tails'
  setTimeout(() => {
    coinFlipping.value = false
    coinResult.value = result
    if (seriesTarget.value > 0 && seriesWinner.value === null) {
      if (result === 'heads') seriesHeads.value++
      else seriesTails.value++
    }
  }, 2200)
}

function resetSeries() {
  seriesHeads.value = 0
  seriesTails.value = 0
  coinResult.value = null
}

watch(showCoinFlip, (v) => { if (!v) { resetSeries(); coinQuestion.value = ''; coinQuestionDraft.value = ''; showQuestionInput.value = false } })
function pickCoinImage(side: 'heads' | 'tails') {
  if (side === 'heads') headsFileInput.value?.click()
  else tailsFileInput.value?.click()
}
function onCoinImagePicked(side: 'heads' | 'tails', e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const data = ev.target?.result as string
    if (side === 'heads') settingsStore.setCoinHeadsImage(data)
    else settingsStore.setCoinTailsImage(data)
    ;(e.target as HTMLInputElement).value = ''
  }
  reader.readAsDataURL(file)
}
const marksLayout = ref<'top' | 'right'>(
  (localStorage.getItem('cricketMarksLayout') as 'top' | 'right') ?? 'top'
)
function toggleMarksLayout() {
  marksLayout.value = marksLayout.value === 'top' ? 'right' : 'top'
  localStorage.setItem('cricketMarksLayout', marksLayout.value)
}
const marksVisible = ref(localStorage.getItem('cricketMarksVisible') !== 'false')
function toggleMarksVisible() {
  marksVisible.value = !marksVisible.value
  localStorage.setItem('cricketMarksVisible', String(marksVisible.value))
}
const cricketEntryRef = ref<InstanceType<typeof CricketEntry> | null>(null)

const TIMER_OPTIONS = [30, 60, 90, 120]

const ctDisplayOptions = [
  { value: 'show'   as const, label: 'Normal' },
  { value: 'hide'   as const, label: 'Hide' },
]

const availablePlayers = computed(() =>
  playersStore.players.filter(p => !game.value?.players.some(gp => gp.id === p.id))
)
const lbScrollRef = ref<HTMLElement | null>(null)

const currentPlayer = computed(() => {
  const snap = game.value!.players[game.value!.currentPlayerIndex]!
  return playersStore.players.find(p => p.id === snap.id) ?? snap
})

/** Per-player cricket target display wins over the game setting; null = follow the game.
 *  The player field was saved and synced but never read, so a per-player Hide did nothing. */
const effectiveClosedTargetDisplay = computed<'show' | 'hide'>(
  () => currentPlayer.value.cricketTargetDisplay ?? game.value!.closedTargetDisplay
)

/** The in-game Normal/Hide control has to beat an override, or it silently does nothing
 *  for whoever is throwing — so it clears that player's override as it sets the game value. */
function setClosedTargetDisplay(val: 'show' | 'hide') {
  gameStore.setClosedTargetDisplay(val)
  if (currentPlayer.value.cricketTargetDisplay !== null) {
    playersStore.updatePlayer(currentPlayer.value.id, { cricketTargetDisplay: null })
  }
}


const scoreLabel = computed(() => {
  const gt = game.value?.gameType
  if (!gt) return ''
  // Places, whatever the game — the column shows finishing position once the option is on.
  if (game.value?.playToCompletion) return 'place'
  if (isCricketGame(gt)) return 'closed'
  if (['301','501','701','1001'].includes(gt)) return 'left'
  if (gt === 'horse') return 'letters'
  return 'total'
})

const atcCompletedCount = computed((): number => {
  if (!game.value) return 0
  const s = game.value.scores[currentPlayer.value.id] as SimpleScore | undefined
  return s?.data.total ?? 0
})
const atcCompletedNums = computed((): number[] => {
  if (!game.value) return []
  const s = game.value.scores[currentPlayer.value.id] as SimpleScore | undefined
  return s?.data.completedNums ?? []
})
const atcListVisible = ref(false)
const atcAnyOrder = ref(false)

const horseLetters = computed((): number => {
  if (game.value?.gameType !== 'horse') return 0
  const s = game.value.scores[currentPlayer.value.id]
  return s?.kind === 'horse' ? s.data.letters : 0
})

const isHorseSetter = computed((): boolean => {
  if (!game.value || game.value.gameType !== 'horse') return false
  return game.value.currentPlayerIndex === game.value.horseSetterIndex
})

const horseTarget = computed((): number | undefined => {
  if (!game.value || game.value.gameType !== 'horse') return undefined
  const setter = game.value.players[game.value.horseSetterIndex]
  if (!setter) return undefined
  const s = game.value.scores[setter.id]
  return s?.kind === 'horse' ? s.data.history.at(-1) : undefined
})

const horseHint = computed((): string | null => {
  if (!game.value || game.value.gameType !== 'horse') return null
  if (isHorseSetter.value) return 'You set the target'
  const target = horseTarget.value
  return target !== undefined ? `Target to beat: ${target}` : null
})

function getCricketMarks(playerId: string) {
  const s = game.value?.scores[playerId]
  return s?.kind === 'cricket' ? s.data.marks : null
}
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!)
}
function displayScore(playerId: string): string {
  const s = game.value?.scores[playerId]
  if (!s) return '—'
  if (s.kind === 'cricket' && game.value?.playToCompletion) {
    const pos = game.value.finishOrder.indexOf(playerId)
    return pos >= 0 ? ordinal(pos + 1) : '—'
  }
  if (s.kind === 'ohOne') return String(s.data.remaining)
  if (s.kind === 'cricket') {
    const marksToClose = game.value?.gameType === 'speedCricket' ? 1 : 3
    return String(CRICKET_TARGETS.filter(t => (s.data.marks[t] ?? 0) >= marksToClose).length) + '/7'
  }
  if (s.kind === 'simple') return String(s.data.total)
  if (s.kind === 'horse') return s.data.letters === 0 ? '—' : 'HORSE'.slice(0, s.data.letters)
  // Number first, then lives — the number is what opponents aim at, so it is the thing
  // people read off the board mid-turn.
  if (s.kind === 'killer') return `${s.data.number}${s.data.isKiller ? '★' : ''} · ${'♥'.repeat(s.data.lives)}`
  if (s.kind === 'suddenDeath') return String(s.data.total)
  if (s.kind === 'bobs27') return s.data.busted ? 'BUST' : String(s.data.score)
  return '—'
}
const wildPlayerMarks = computed(() => {
  if (!game.value?.wildEnabled) return undefined
  const s = game.value.scores[currentPlayer.value.id]
  return s?.kind === 'cricket' ? (s.data.wildMarks ?? {}) : undefined
})
/** The seated player's own killer row, or null outside a killer game. */
const killerOwn = computed(() => {
  if (game.value?.gameType !== 'killer') return null
  const s = game.value.scores[currentPlayer.value.id]
  return s?.kind === 'killer' ? s.data : null
})

/** Every other living player, with the number that takes their lives. */
const killerOpponents = computed(() => {
  if (game.value?.gameType !== 'killer') return []
  return game.value.players
    .filter(p => p.id !== currentPlayer.value.id)
    .map(p => {
      const s = game.value!.scores[p.id]
      if (s?.kind !== 'killer') return null
      return { playerId: p.id, name: p.name, number: s.data.number, lives: s.data.lives, color: p.color }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.lives > 0)
})

function handleKillerSubmit(hits: Record<string, number>) {
  unlockAudio()
  gameStore.submitScore(currentPlayer.value.id, hits)
  playTurnResultSound(gameStore.lastTurnWasZero)
}

function handleCricketSubmit(marks: CricketHits) {
  unlockAudio()
  // Submit first, then sound off the store's own verdict. Playing before the submit meant
  // the sound could not know whether the turn scored, so every turn — good or bad — got
  // the downbeat thud. Audio is fire-and-forget, so this still lands before the walk-up
  // navigation and therefore before any commentary.
  gameStore.submitScore(currentPlayer.value.id, marks)
  playTurnResultSound(gameStore.lastTurnWasZero)
}
function handleAtcSubmit(delta: number, completedNums?: number[]) {
  unlockAudio()
  gameStore.submitScore(currentPlayer.value.id, delta)
  if (completedNums !== undefined) {
    gameStore.setAtcCompletedNums(currentPlayer.value.id, completedNums)
  }
}

// Score reveal (oh-one games)
const showScoreReveal = ref(false)
const revealData = ref<{ remaining: number; playerColor: string; isBust: boolean } | null>(null)
let pendingRevealNavigation = false
let revealTimeout: ReturnType<typeof setTimeout> | null = null

function handleNumpadSubmit(score: number) {
  unlockAudio()
  const isOhOne = ['301','501','701','1001'].includes(game.value?.gameType ?? '')
  if (!isOhOne) { gameStore.submitScore(currentPlayer.value.id, score); return }

  // Capture state before submission changes the active player
  const player = currentPlayer.value
  const currentScore = game.value?.scores[player.id]
  const currentRemaining = currentScore?.kind === 'ohOne' ? currentScore.data.remaining : 0
  const newRemaining = currentRemaining - score
  const isBust = newRemaining < 0

  pendingRevealNavigation = true
  gameStore.submitScore(player.id, score)

  // Checkout — go straight to win screen
  if (game.value?.status === 'finished') {
    pendingRevealNavigation = false
    router.push('/win')
    return
  }

  revealData.value = { remaining: isBust ? currentRemaining : Math.max(0, newRemaining), playerColor: player.color, isBust }
  showScoreReveal.value = true

  if (revealTimeout) clearTimeout(revealTimeout)
  revealTimeout = setTimeout(() => {
    showScoreReveal.value = false
    pendingRevealNavigation = false
    // On bust the store already advanced the turn; if game finished (last player busted out) go to win
    if (isBust && game.value?.status === 'finished') { router.push('/win'); return }
    navigateToBetween()
  }, isBust ? 3000 : 4000)
}

function quitGame() {
  intentionalQuit.value = true
  gameStore.endGame()
  router.push('/')
}

function navigateToBetween() {
  if (game.value?.skipWalkup) {
    gameStore.startNextTurn()
  } else {
    router.push('/between')
  }
}

// Game timer
const gameTimeLeft = ref<number | null>(null)
const showGameTimerAnnounce = ref(false)
const gameTimerAnnounceText = ref('')
let gameTimerInterval: ReturnType<typeof setInterval> | null = null
let gameTenMinAnnounced = false
let gameFiveMinAnnounced = false

const gameTimeLeftDisplay = computed(() => {
  if (gameTimeLeft.value === null) return ''
  const s = Math.max(0, gameTimeLeft.value)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
})

function showGameAnnounce(text: string) {
  gameTimerAnnounceText.value = text
  showGameTimerAnnounce.value = true
  setTimeout(() => { showGameTimerAnnounce.value = false }, 4000)
}

function startGameTimer() {
  if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null }
  const g = game.value
  if (!g || g.gameDuration === null || g.gameStartedAt === null) { gameTimeLeft.value = null; return }
  gameTenMinAnnounced = false
  gameFiveMinAnnounced = false
  gameTimerInterval = setInterval(() => {
    const gv = game.value
    // Held: leave the reading exactly where it is. The anchor is moved forward when the hold
    // is released, so the clock resumes from here rather than jumping.
    if (gv?.heldSince !== null && gv?.heldSince !== undefined) return
    if (!gv || gv.status === 'finished' || gv.gameDuration === null || gv.gameStartedAt === null) {
      if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null }
      gameTimeLeft.value = null
      return
    }
    const elapsedSec = Math.floor((Date.now() - gv.gameStartedAt) / 1000)
    const totalSec = gv.gameDuration * 60
    const left = totalSec - elapsedSec
    gameTimeLeft.value = left

    if (left <= 600 && left > 598 && !gameTenMinAnnounced) {
      gameTenMinAnnounced = true
      showGameAnnounce('10 minutes remaining!')
      narrate('gameTimeWarning', { count: 10 })
    }
    if (left <= 300 && left > 298 && !gameFiveMinAnnounced) {
      gameFiveMinAnnounced = true
      showGameAnnounce('5 minutes remaining!')
      narrate('gameTimeWarning', { count: 5 })
    }
    if (left <= 0) {
      if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null }
      gameTimeLeft.value = 0
      showGameAnnounce("Time's up! Game over!")
      narrate('gameOver')
      setTimeout(() => { gameStore.forceEndByTime() }, 1500)
    }
  }, 1000)
}

watch(
  () => game.value?.gameDuration,
  () => startGameTimer(),
  { immediate: true }
)

onUnmounted(() => {
  if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null }
  if (pauseLockedTimeout) { clearTimeout(pauseLockedTimeout); pauseLockedTimeout = null }
})

// Throw timer
const throwTimerDuration = computed(() => settingsStore.disableThrowTimer ? 0 : (game.value?.throwTimerDuration ?? 0))
const throwTimeLeft = ref(0)
const throwPaused = ref(false)
let throwInterval: ReturnType<typeof setInterval> | null = null
let throwHurryUpSaid = false

function clearThrowTimer() { if (throwInterval) { clearInterval(throwInterval); throwInterval = null } }

/*
 * Tapping a locked timer used to do nothing at all, silently, which reads as a broken
 * control rather than a deliberate one — and left nobody any way to discover that the lock
 * exists. It now says so on the timer for a moment and carries on counting.
 */
/** The whole game is stopped — every timer, across turns — until somebody resumes it. */
const isHeld = computed(() => game.value?.heldSince != null)

const showPauseLocked = ref(false)
let pauseLockedTimeout: ReturnType<typeof setTimeout> | null = null
function flashPauseLocked() {
  showPauseLocked.value = true
  if (pauseLockedTimeout) clearTimeout(pauseLockedTimeout)
  pauseLockedTimeout = setTimeout(() => { showPauseLocked.value = false }, 1400)
}
function toggleThrowPause() {
  if (settingsStore.disableTimerPause) { flashPauseLocked(); return }
  throwPaused.value = !throwPaused.value
}
function startThrowTimer() {
  clearThrowTimer()
  throwPaused.value = false
  throwHurryUpSaid = false
  if (!throwTimerDuration.value) return
  throwTimeLeft.value = throwTimerDuration.value
  throwInterval = setInterval(() => {
    if (throwPaused.value || isHeld.value) return
    throwTimeLeft.value--
    if (throwTimeLeft.value > 0 && throwTimeLeft.value <= 5) playBombBeep()
    const half = Math.floor(throwTimerDuration.value / 2)
    // These three all used to be gated on cleanMode alone and never consulted
    // quietNarrator, which is why "Names only" silenced nothing once play started.
    if (throwTimeLeft.value === half && half > 30) narrate('throwNudge')
    if (throwTimeLeft.value === 20 && settingsStore.announceThrowAt20) narrate('twentySecondThrow')
    if (throwTimeLeft.value <= 30 && !throwHurryUpSaid) {
      throwHurryUpSaid = true
      const hurryCount = gameStore.playerHurryUpCounts[currentPlayer.value.id] ?? 0
      gameStore.recordHurryUp(currentPlayer.value.id)
      narrate('hurryUp', { count: hurryCount })
    }
    if (throwTimeLeft.value <= 0) {
      clearThrowTimer()
      playGameShowBuzzer()
      gameStore.recordTimeout(currentPlayer.value.id)
      const gt = game.value?.gameType
      if (isCricketGame(gt)) handleCricketSubmit({} as Record<CricketTarget, number>)
      else handleNumpadSubmit(0)
    }
  }, 1000)
}

/**
 * What the throw screen shows behind the entry panel.
 *
 * The player's throw-screen pick wins, then their default background, then the game's theme.
 * Resolved once rather than repeating the chain in each of the three computeds below, which
 * is how the previous two-step version drifted into being spelled slightly differently in
 * each of them.
 */
const throwBg = computed(() =>
  currentPlayer.value.throwBackground ?? currentPlayer.value.playerBackground ?? game.value?.gameTheme ?? null)

/** True when the background came from the player rather than the game, which frames it differently. */
const throwBgIsPlayers = computed(() =>
  !!(currentPlayer.value.throwBackground ?? currentPlayer.value.playerBackground))

const entryPanelStyle = computed(() => {
  const isPlayerBg = throwBgIsPlayers.value
  const bg = throwBg.value
  if (!bg) return {}
  if (bg.startsWith('data:') || bg.startsWith('http')) {
    /*
     * A player's photo is drawn on its own layer below (`entryPhotoStyle`), because zoom has
     * to scale it and a panel background cannot be scaled — `transform` moves the whole
     * element, furniture and all. The panel keeps only the colour behind it.
     *
     * A game theme still paints straight onto the panel. It has no zoom, so it needs no layer.
     */
    if (isPlayerBg) {
      const fill = currentPlayer.value.playerBackgroundFill
      const size = currentPlayer.value.playerBackgroundSize
      return { backgroundColor: (fill === 'blur' && size === 'contain') ? 'transparent' : '#000' }
    }
    const size = game.value?.gameThemeSize ?? 'cover'
    const position = game.value?.gameThemePosition ?? 'center'
    const fill = game.value?.gameThemeFill
    const bgColor = (fill === 'blur' && size === 'contain') ? 'transparent' : '#000'
    return { backgroundImage: `url(${bg})`, backgroundSize: size, backgroundPosition: position, backgroundRepeat: 'no-repeat', backgroundColor: bgColor }
  }
  return { background: bg }
})

/*
 * The player's photo, framed the way they left it on the player screen: their dragged spot as
 * background-position, their zoom as a scale.
 *
 * Before the placer existed this screen hardcoded cover / centre and ignored every saved
 * value, so nothing a player chose was ever visible here — which is the whole reason the
 * three-stop control read as doing nothing.
 *
 * Zoom is ignored when the photo is set to contain: contain exists to show the whole image,
 * and scaling it up is the one thing that undoes that.
 */
const entryPhotoStyle = computed(() => {
  const bg = throwBg.value
  if (!bg || !throwBgIsPlayers.value) return null
  if (!(bg.startsWith('data:') || bg.startsWith('http'))) return null
  const p = currentPlayer.value
  const contained = p.playerBackgroundSize === 'contain'
  const zoom = contained ? 100 : Math.min(210, Math.max(100, p.playerBackgroundZoom ?? 100))
  return {
    backgroundImage: `url(${bg})`,
    backgroundSize: contained ? 'contain' : 'cover',
    backgroundPosition: p.playerBackgroundPosition ?? 'center',
    transform: zoom === 100 ? undefined : `scale(${zoom / 100})`,
  }
})

const showBlurBg = computed(() => {
  const isPlayerBg = throwBgIsPlayers.value
  const fill = isPlayerBg ? currentPlayer.value.playerBackgroundFill : game.value?.gameThemeFill
  const size = isPlayerBg ? currentPlayer.value.playerBackgroundSize : game.value?.gameThemeSize
  return fill === 'blur' && size === 'contain'
})

const entryBlurBgStyle = computed(() => {
  const bg = throwBg.value
  if (!bg) return {}
  return { backgroundImage: `url(${bg})` }
})

/*
 * The same rule as the cricket board's target numbers, and now literally the same code.
 *
 * This screen, CricketEntry and the setup screen's new Auto swatch all have to answer "what
 * colour is this player's text when they have not chosen one" — and two of them carried their
 * own copy of the resolution plus its 30-line complementaryColor. Adding a picker for
 * targetLabelColor was the moment a third copy would have been written.
 */
const currentPlayerNameColor = computed(() => {
  const p = currentPlayer.value
  return resolveTargetColor(p.targetLabelColor, p.color, p.playerBackground)
})

function scrollActivePlayerIntoView() {
  nextTick(() => {
    const active = lbScrollRef.value?.querySelector?.('.lb-player-row.active')
    active?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  })
}

onMounted(() => {
  if (game.value?.status === 'playing') startThrowTimer()
  scrollActivePlayerIntoView()
  window.addEventListener('beforeunload', handleBeforeUnload)

  // Play turn-start tone every time the game screen loads (first turn and after BetweenTurns)
  playTurnStartTone()

  // Announce the first player — BetweenTurnsPage handles turns 2+ but never runs for turn 1
  if (game.value && game.value.round === 1 && game.value.currentPlayerIndex === 0) {
    const name = game.value.players[0]?.name ?? ''
    setTimeout(() => narrate('walkUp', { name }), 300)
  }
})
onUnmounted(() => {
  clearThrowTimer()
  if (revealTimeout) clearTimeout(revealTimeout)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

watch(() => game.value?.round, () => {
  // Single-player: advanceTurn() keeps status='playing' so the status watcher never re-fires.
  // Restart the throw timer whenever a new round begins while already in playing state.
  if (game.value?.status === 'playing') startThrowTimer()
})
watch(() => game.value?.status, (status) => {
  if (status === 'between_turns') { clearThrowTimer(); if (!pendingRevealNavigation) navigateToBetween() }
  if (status === 'finished') { clearThrowTimer(); if (!pendingRevealNavigation) router.push('/win') }
  if (status === 'playing') startThrowTimer()
})
watch(() => game.value?.currentPlayerIndex, () => {
  if (game.value?.status === 'playing') startThrowTimer()
  scrollActivePlayerIntoView()
})
</script>

<style scoped>
.game { display: flex; flex-direction: column; width: 100%; height: 100dvh; overflow: hidden; position: relative; }
.game-body { flex: 1; display: flex; flex-direction: row; overflow: hidden; min-height: 0; }

/* Entry panel */
.entry-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.turn-header {
  display: flex; align-items: stretch; gap: 0;
  padding-top: env(safe-area-inset-top);
  flex-shrink: 0; background: rgba(0,0,0,0.85);
  border-bottom: 2px solid rgba(255,255,255,0.10); position: relative; z-index: 1; min-height: 90px; overflow: hidden;
}
.turn-header::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--player-color, var(--pink)); z-index: 1; }

/* Header left / center / right layout */
.turn-left { flex: 1; display: flex; align-items: center; justify-content: flex-start; z-index: 1; }
.turn-header-3btns .turn-left { align-items: flex-end; padding-bottom: 8px; }
.header-avatar-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; margin-left: 16px; margin-right: 6px; -webkit-tap-highlight-color: transparent; flex-shrink: 0; position: relative; z-index: 2; }
.header-avatar { width: 38px; height: 38px;  display: flex; align-items: center; justify-content: center; font-size: 20px; overflow: hidden; border: 2px solid rgba(255,255,255,0.28); }
.header-avatar img { width: 100%; height: 100%; object-fit: cover; }
.turn-name-wrap { position: absolute; left: 0; right: 0; top: env(safe-area-inset-top); bottom: 0; display: flex; justify-content: center; align-items: stretch; pointer-events: none; z-index: 0; padding: 0 8px; }
.turn-round-pill { font-size: clamp(50px, 6.8dvh, 74px); font-weight: 900; line-height: 1; letter-spacing: 0.08em; background: rgba(0,0,0,0.90);  padding: 0 24px; color: rgba(255,255,255,0.8); white-space: nowrap; display: flex; align-items: center; margin-left: 12px; }
.turn-name { font-size: clamp(62px, 9dvh, 100px); line-height: 1; letter-spacing: 0.04em; font-weight: 900; background: rgba(0,0,0,0.90);  padding: 0 14px; white-space: nowrap; max-width: 70vw; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px var(--player-color, var(--pink)), 0 0 3px var(--player-color, var(--pink)); text-shadow: 0 0 8px currentColor; }
.turn-name.turn-name-no-glow { box-shadow: none; text-shadow: none; }

.turn-right { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding-right: 8px; z-index: 1; position: relative; }

/* Downward arrow at bottom of header — visible only when marks panel is open */
.marks-open-arrow {
  position: absolute;
  bottom: -9px;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 9px solid rgba(0,0,0,0.85);
  z-index: 10;
  pointer-events: none;
}
.header-quit-btn { width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: rgba(255,80,80,0.8); border: 2px solid rgba(255,80,80,0.35);  background: rgba(255,40,40,0.08); flex-shrink: 0; margin-left: 2px; }

.game-clock-badge { font-size: 13px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.08em; color: rgba(255,255,255,0.6); background: #1e1e25;  padding: 3px 8px; }
.game-clock-badge.game-clock-low { color: #ff4444; background: rgba(255,68,68,0.12); animation: clock-pulse 1s ease-in-out infinite; }
@keyframes clock-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.game-timer-announce-overlay { position: fixed; inset: 0; z-index: 9998; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); pointer-events: none; }
.gta-content { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.gta-icon { font-size: 64px; }
.gta-text { font-size: clamp(28px, 5vw, 48px); font-weight: 900; font-family: var(--font-display); letter-spacing: 0.1em; color: #fff; text-shadow: 0 0 40px rgba(255,100,0,0.8), 0 0 12px rgba(255,100,0,0.5); text-align: center; padding: 0 32px; }
.timer-announce-enter-active, .timer-announce-leave-active { transition: opacity 0.4s, transform 0.4s; }
.timer-announce-enter-from, .timer-announce-leave-to { opacity: 0; transform: scale(0.9); }


.submit-float-btn {
  position: absolute;
  bottom: calc(24px + env(safe-area-inset-bottom));
  right: 24px;
  z-index: 10;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.12em;
  padding: 16px 36px;
  
  box-shadow: 4px 4px 0 rgba(0,0,0,0.55);
}
.submit-float-btn:disabled { opacity: 0.4; }
.scores-btn { flex-shrink: 0; align-self: center; margin: 0 16px; height: 64px; padding: 0 40px; font-size: clamp(52px, 7.8dvh, 76px); font-weight: 900; font-family: var(--font-display); letter-spacing: 0.04em;  }
.entry-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; position: relative; z-index: 1; }

/* The player's photo, on its own layer so zoom can scale it without taking the score
   furniture with it. Sits above the blur fill and below everything that is read. */
.entry-bg-photo {
  position: absolute; inset: 0; z-index: 0;
  background-repeat: no-repeat;
}

.entry-bg-blur {
  position: absolute; inset: 0; z-index: 0;
  background-size: cover; background-position: center; background-repeat: no-repeat;
  filter: blur(24px);
  transform: scale(1.12);
}

/* Cricket marks grid strip */
.cricket-strip {
  flex-shrink: 0; overflow-y: auto;
  background: rgba(0,0,0,0.4); border-bottom: 2px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column;
  scrollbar-width: none; max-height: 45dvh;
  /* Touch scrolling, and kept to itself: without overscroll-behavior a drag inside
     this panel chains through to whatever is behind it, so the panel stays put and
     the page moves instead — which is what the coin modal was doing on an iPad. */
  -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
}
.cricket-strip::-webkit-scrollbar { display: none; }
.cs-header {
  display: flex; align-items: center;
  padding: 4px 8px 2px;
  background: #141419; border-bottom: 2px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 1;
}
.cs-name-col { width: 72px; flex-shrink: 0; }
.cs-target-head {
  flex: 1; text-align: center;
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
  color: rgba(255,255,255,0.45); font-family: var(--font-display);
}
.cs-row {
  display: flex; align-items: center;
  padding: 3px 8px; border-left: 3px solid transparent;
  border-bottom: 2px solid rgba(255,255,255,0.05);
  transition: border-color 0.2s;
}
.cs-active { background: #16161c; }
.cs-name {
  width: 72px; flex-shrink: 0;
  font-size: 12px; font-weight: 800; letter-spacing: 0.03em;
  color: rgba(255,255,255,0.5); white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; font-family: var(--font-display);
  text-align: center;
}
.cs-cell {
  flex: 1; display: flex; justify-content: center; align-items: center; gap: 2px;
  padding: 1px 0;
}
.cs-closed { opacity: 0.35; }
.cs-pip {
  width: 7px; height: 7px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.75);
  background: transparent; transition: background 0.1s;
}
.cs-pip.filled { border-color: transparent; }

/* Transposed top strip (4+ players): targets as rows, players as columns */
.cricket-strip-transposed { max-height: none; }
.cst-header {
  display: flex; align-items: center; padding: 3px 8px 2px;
  background: #141419; border-bottom: 2px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 1;
}
.cst-target-col { width: 28px; flex-shrink: 0; }
.cst-player-head {
  flex: 1; text-align: center; font-size: 10px; font-weight: 900;
  letter-spacing: 0.04em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: var(--font-display);
}
.cst-row {
  display: flex; align-items: center; padding: 3px 8px;
  border-bottom: 2px solid rgba(255,255,255,0.05);
}
.cst-target-label {
  width: 28px; flex-shrink: 0; font-size: 11px; font-weight: 900;
  letter-spacing: 0.06em; color: #ffffff; font-family: var(--font-display);
}
.cst-cell {
  flex: 1; display: flex; justify-content: center; align-items: center; gap: 2px; padding: 1px 0;
}

/* Layout toggle button */
.marks-layout-btn { flex-shrink: 0; align-self: center; margin: 0 4px; padding: 14px 16px; font-size: 14px; }
.marks-visibility-btn { flex-shrink: 0; align-self: center; margin: 0 4px 0 0; padding: 14px 16px; font-size: 16px; }
.marks-visibility-btn.marks-hidden { opacity: 0.35; }

/* 3-button header: compact buttons */
.turn-header-3btns .scores-btn { height: 46px; padding: 0 16px; font-size: 16px; margin: 0 4px 0 0; font-weight: 900; border: 2px solid rgba(255,255,255,0.3); letter-spacing: 0.1em; }
.turn-header-3btns .marks-layout-btn { padding: 8px 10px; margin: 0 2px; font-size: 13px; }
.turn-header-3btns .marks-visibility-btn { padding: 8px 10px; margin: 0 2px 0 0; font-size: 13px; }

/* Cricket marks right column */
.cricket-col {
  width: 130px; flex-shrink: 0; display: flex; flex-direction: column;
  border-left: 2px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.4); overflow-y: auto; scrollbar-width: none;
  /* Touch scrolling, and kept to itself: without overscroll-behavior a drag inside
     this panel chains through to whatever is behind it, so the panel stays put and
     the page moves instead — which is what the coin modal was doing on an iPad. */
  -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
}
.cricket-col::-webkit-scrollbar { display: none; }
.cc-header {
  display: flex; flex-direction: row; align-items: center;
  padding: 6px 6px 4px;
  border-bottom: 2px solid rgba(255,255,255,0.06);
  background: #141419;
  position: sticky; top: 0; z-index: 1; flex-shrink: 0;
}
.cc-player-head {
  flex: 1; text-align: center;
  font-size: 10px; font-weight: 900; letter-spacing: 0.04em;
  white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; font-family: var(--font-display);
}
.cc-target-row {
  display: flex; flex-direction: row; align-items: center;
  padding: 5px 6px; border-bottom: 2px solid rgba(255,255,255,0.05); flex-shrink: 0;
}
.cc-target-label {
  width: 22px; flex-shrink: 0; text-align: center;
  font-size: 12px; font-weight: 900; letter-spacing: 0.06em;
  color: #ffffff; font-family: var(--font-display);
}
.cc-cell {
  flex: 1; display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 2px; flex-wrap: nowrap; min-width: 0;
}
.cc-closed { opacity: 0.3; }
.cc-pip {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,1.0);
  background: #222229; flex-shrink: 0; transition: background 0.1s;
}
.cc-pip.filled { border-color: transparent; }
.cc-group-divider {
  height: 1px; background: rgba(255,255,255,0.18); margin: 2px 0; flex-shrink: 0;
}

/* Fullscreen scores overlay */
.scores-overlay {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column;
  background: #0a0a0a;
}

/* Above the scores panel: holding from in there closes it and leaves this in front. */
.hold-overlay {
  position: absolute; inset: 0; z-index: 20;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background: rgba(0,0,0,0.88);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.hold-panel {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  text-align: center; max-width: 420px; width: 100%;
}
.hold-icon { font-size: clamp(48px, 12vmin, 88px); line-height: 1; }
.hold-title {
  font-size: clamp(40px, 11vmin, 84px); letter-spacing: 0.12em; line-height: 1;
  color: var(--gold, #f59e0b);
  text-shadow: 0 0 28px rgba(245,158,11,0.45);
}
.hold-sub { margin: 0; font-size: clamp(13px, 3.4vmin, 17px); color: rgba(255,255,255,0.65); line-height: 1.5; }
.hold-resume { width: 100%; max-width: 320px; margin-top: 8px; }
.lb-header {
  display: flex; align-items: center; justify-content: space-between; padding: 10px 16px;
  padding-top: calc(10px + env(safe-area-inset-top));
  border-bottom: 2px solid rgba(255,255,255,0.06);
  background: #141419; flex-shrink: 0;
}
.lb-header .btn { padding: 6px 16px; font-size: 13px; }
.game-type-badge { font-size: 22px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pink); font-family: var(--font-display); line-height: 1; }
.round-label { font-size: 11px; color: #fff; margin-top: 2px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 900; }
.lb-players-scroll { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.lb-players { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 0; padding: 0; }
.lb-player-row {
  flex: 1; min-height: 0; overflow: hidden;
  display: flex; align-items: center; gap: 10px; padding: 6px 16px;
  background: transparent; border: none; border-left: 6px solid transparent;
  border-bottom: 2px solid rgba(255,255,255,0.06);
  transition: border-color 0.2s, background 0.2s; position: relative;
}
.lb-player-row.active { border-left-color: var(--active-color, var(--pink)); }
.active-dot { display: none; }
.lb-avatar { width: 40px; height: 40px; align-self: center;  display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; overflow: hidden; border: 2px solid rgba(255,255,255,0.12); }
.lb-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-player-info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.lb-player-name { font-size: 16px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; color: #fff; }
.throwing-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: #26262e;  padding: 2px 5px; font-family: var(--font-body); }
.finished-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: #1e1e25; color: rgba(255,255,255,0.5);  padding: 2px 5px; font-family: var(--font-body); }
.lb-player-row.ptc-finished { opacity: 0.45; }
.cricket-mini { display: flex; flex-wrap: nowrap; gap: 4px; }
.mini-target { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; min-width: 0; background: #17171d; border: 2px solid rgba(255,255,255,0.12);  padding: 4px 2px; }
.mini-label { font-size: 20px; font-weight: 800; color: rgba(255,255,255,0.9); letter-spacing: 0.02em; font-family: var(--font-display); }
.mini-marks { display: flex; gap: 2px; }
.mini-pip { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.65); background: rgba(255,255,255,0.18); transition: background 0.1s; flex-shrink: 0; }
.mini-pip.filled { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 6px rgba(255,45,120,1), 0 0 12px rgba(255,45,120,0.5); }
.lb-score { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.lb-score-val { font-size: clamp(28px, 4.5dvh, 72px); font-weight: 900; font-family: var(--font-display); line-height: 1; color: #fff; }
.lb-score-label { font-size: 13px; color: rgba(255,255,255,0.45); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-align: right; }
.remove-player-btn { background: none; border: 2px solid rgba(255,255,255,0.1);  color: rgba(255,255,255,0.3); cursor: pointer; font-size: 12px; padding: 4px 7px; flex-shrink: 0; transition: all 0.15s; align-self: flex-start; position: relative; overflow: hidden; }


/* Add player panel */
.add-player-panel {
  flex-shrink: 0; border-bottom: 2px solid rgba(255,255,255,0.08);
  background: #141419; display: flex; flex-direction: column;
}
.add-player-empty { padding: 16px 24px; font-size: 13px; color: var(--text-muted); }
.add-player-row {
  display: flex; align-items: center; gap: 14px; padding: 12px 24px;
  background: none; border: none; border-bottom: 2px solid rgba(255,255,255,0.05);
  cursor: pointer; text-align: left; width: 100%; transition: background 0.15s;
  -webkit-tap-highlight-color: transparent; position: relative; overflow: hidden;
}
.add-player-row:last-child { border-bottom: none; }
.add-player-row:active { background: #1a1a20; }
.add-player-avatar {
  width: 40px; height: 40px;  display: flex; align-items: center;
  justify-content: center; font-size: 20px; flex-shrink: 0; overflow: hidden;
}
.add-player-avatar img { width: 100%; height: 100%; object-fit: cover; }
.add-player-name { flex: 1; font-size: 18px; font-weight: 800; font-family: var(--font-display); color: #fff; letter-spacing: 0.03em; }
.add-player-cta { font-size: 13px; font-weight: 700; color: var(--pink); letter-spacing: 0.08em; flex-shrink: 0; }

/* Closed-target display selector in scores overlay */
.ct-display-row { display: flex; gap: 4px; }
.ct-display-btn {
  padding: 7px 14px;  border: 2px solid rgba(255,255,255,0.1);
  background: #17171d; color: rgba(255,255,255,0.6);
  font-size: 13px; font-weight: 700; letter-spacing: 0.03em; cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden; white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.ct-display-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.12); }
.close-scores-btn { font-size: 22px; font-weight: 900; line-height: 1; }

/* In-game timer controls */
.timer-controls-row {
  display: flex; gap: 16px; flex-wrap: wrap;
  padding: 10px 20px; border-bottom: 2px solid rgba(255,255,255,0.07);
  background: #131318; flex-shrink: 0;
}
.timer-control-group { display: flex; align-items: center; gap: 8px; }
.timer-control-label { font-size: 14px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.55); white-space: nowrap; min-width: 52px; }
.hot-seat-note { font-size: 12px; color: var(--gold, #f59e0b); letter-spacing: 0.02em; }
.timer-control-btns { display: flex; gap: 4px; }
.timer-ctrl-btn {
  padding: 5px 10px;  border: 2px solid rgba(255,255,255,0.1);
  background: #17171d; color: rgba(255,255,255,0.6);
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden; white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.timer-ctrl-btn.active { border-color: var(--blue); color: var(--blue); background: rgba(0,212,255,0.1); }

.round-limit-control { display: flex; align-items: center; gap: 6px; }
.round-limit-btn { width: 30px; height: 30px;  border: 2px solid rgba(255,255,255,0.2); background: #1a1a20; color: var(--text); font-size: 18px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; position: relative; overflow: hidden; }

.round-limit-btn:disabled { opacity: 0.3; cursor: default; }
.round-limit-val { min-width: 44px; text-align: center; font-size: 16px; font-weight: 900; font-family: var(--font-display); color: var(--gold); cursor: pointer; letter-spacing: 0.05em; }

/* Score reveal overlay */
.score-reveal-overlay {
  position: absolute; inset: 0; z-index: 20;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: rgba(0,0,0,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.reveal-label {
  font-size: 13px; font-weight: 800; letter-spacing: 0.35em; text-transform: uppercase;
  color: #fff; font-family: var(--font-display);
  background: #000;  padding: 4px 12px;
}
.reveal-number {
  font-size: clamp(100px, 22dvh, 200px); font-family: var(--font-display);
  font-weight: 900; line-height: 1; letter-spacing: 0.02em;
}
.bust-overlay { background: rgba(60,0,0,0.92) !important; }
.reveal-eliminated {
  font-size: clamp(72px, 16dvh, 140px); font-family: var(--font-display);
  font-weight: 900; line-height: 1; letter-spacing: 0.04em;
}
.reveal-bust-msg {
  font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.6);
  letter-spacing: 0.08em;
}
.reveal-bust-tag {
  font-size: 22px; font-weight: 900; letter-spacing: 0.2em; color: #ef4444;
  background: rgba(239,68,68,0.15); border: 2px solid rgba(239,68,68,0.4);
   padding: 6px 18px; font-family: var(--font-display);
}
.score-reveal-enter-active, .score-reveal-leave-active { transition: opacity 0.25s; }
.score-reveal-enter-from, .score-reveal-leave-to { opacity: 0; }

/* Misc */
.no-game { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; width: 100%; height: 100dvh; }
.confirm-card { background: #1a1a1a; min-width: 300px; border: 2px solid rgba(255,255,255,0.1);  }
.confirm-card .q-card-actions { padding: 12px 16px 16px; gap: 10px; }

/* Coin flip button */
.coin-flip-btn { flex-shrink: 0; align-self: center; margin: 0 4px; padding: 14px 16px; font-size: 20px; }

/* Coin flip overlay */
.coin-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,0.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; padding-top: max(24px, env(safe-area-inset-top)); padding-bottom: max(24px, env(safe-area-inset-bottom));
}
.coin-modal {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; width: 100%; max-width: 340px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto; overflow-x: hidden;
  scrollbar-width: none;
  /* Touch scrolling, and kept to itself: without overscroll-behavior a drag inside
     this panel chains through to whatever is behind it, so the panel stays put and
     the page moves instead — which is what the coin modal was doing on an iPad. */
  -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
}
.coin-modal::-webkit-scrollbar { display: none; }
.coin-body {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; width: 100%;
}
.coin-left {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.coin-right {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; width: 100%;
}
.coin-modal-header {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
}
.coin-modal-title { font-size: 38px; letter-spacing: 0.2em; color: #ffd700; font-weight: 900; }
.coin-close-btn {
  background: none; border: none; color: rgba(255,255,255,0.45); font-size: 22px;
  cursor: pointer; padding: 4px 8px; line-height: 1;
}


.coin-arena {
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.coin-perspective { perspective: 700px; }
.coin {
  width: 160px; height: 160px; position: relative;
  transform-style: preserve-3d;
}
.coin.flip-to-heads { animation: flip-to-heads 2.2s cubic-bezier(0.12, 0.5, 0.22, 1) forwards; }
.coin.flip-to-tails { animation: flip-to-tails 2.2s cubic-bezier(0.12, 0.5, 0.22, 1) forwards; }
@keyframes flip-to-heads {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(1440deg); }
}
@keyframes flip-to-tails {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(1260deg); }
}
.coin-face {
  position: absolute; inset: 0; border-radius: 50%;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  background: radial-gradient(circle at 35% 30%, #ffe566, #e8a800 58%, #a07000);
  border: 4px solid #c89600;
  box-shadow: inset 0 3px 12px rgba(255,255,200,0.5), inset 0 -3px 8px rgba(0,0,0,0.35), 0 6px 28px rgba(0,0,0,0.7);
}
.coin-face-tails { transform: rotateY(180deg); }
.coin-img { width: 100%; height: 100%; object-fit: cover; }
.coin-letter {
  font-family: var(--font-display); font-size: 44px; font-weight: 900;
  color: #7a4800; text-shadow: 0 1px 3px rgba(255,220,80,0.7); letter-spacing: 0.04em;
}
.coin-tap-hint {
  font-size: 12px; color: rgba(255,255,255,0.38); letter-spacing: 0.1em;
  text-transform: uppercase; font-weight: 600; min-height: 18px;
}

.coin-result { display: flex; align-items: center; justify-content: center; }
.coin-result-text { font-size: 52px; letter-spacing: 0.12em; font-weight: 900; }
.coin-result-text.heads { color: #ffd700; filter: drop-shadow(0 0 20px rgba(255,215,0,0.7)); }
.coin-result-text.tails { color: #c8d4e8; filter: drop-shadow(0 0 20px rgba(180,200,240,0.6)); }

.coin-customize {
  display: flex; align-items: center; gap: 20px;
  padding: 14px 20px;
  background: #16161c; border: 2px solid rgba(255,255,255,0.08);
   width: 100%;
}
.coin-cust-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.coin-cust-label {
  font-size: 10px; font-weight: 800; letter-spacing: 0.15em;
  color: rgba(255,255,255,0.38); text-transform: uppercase;
}
.coin-cust-btn {
  width: 64px; height: 64px; border-radius: 50%;
  border: 2px dashed rgba(255,255,255,0.2); background: #17171d;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  overflow: hidden; transition: border-color 0.15s, background 0.15s;
  position: relative;
}

.cust-preview { width: 100%; height: 100%; object-fit: cover; }
.cust-placeholder { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 700; }
.coin-cust-clear {
  background: none; border: none; color: rgba(255,80,80,0.65);
  font-size: 13px; cursor: pointer; padding: 2px 6px; line-height: 1;
}

.coin-cust-divider { width: 1px; height: 60px; background: #1e1e25; flex-shrink: 0; }

.coin-fade-enter-active, .coin-fade-leave-active { transition: opacity 0.22s; }
.coin-fade-enter-from, .coin-fade-leave-to { opacity: 0; }
.result-slide-enter-active { transition: opacity 0.3s, transform 0.3s; }
.result-slide-enter-from { opacity: 0; transform: translateY(14px) scale(0.75); }

/* Series */
.coin-series-modes { display: flex; gap: 8px; justify-content: center; width: 100%; }
.coin-mode-btn {
  flex: 1; padding: 7px 0; 
  border: 2px solid rgba(255,255,255,0.2);
  background: #17171d;
  color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden;
}

.coin-mode-btn.active { border-color: #ffd700; color: #ffd700; background: rgba(255,215,0,0.1); }

.coin-series-board {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; width: 100%; padding: 10px 0;
}
.series-side {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  flex: 1; padding: 10px; 
  border: 2px solid rgba(255,255,255,0.1);
  background: #16161c;
  transition: all 0.3s;
}
.series-winner-side {
  border-color: #ffd700;
  background: rgba(255,215,0,0.12);
  box-shadow: 6px 6px 0 rgba(0,0,0,0.55);
}
.series-label { font-size: 10px; font-weight: 900; letter-spacing: 0.12em; color: rgba(255,255,255,0.5); }
.series-winner-side .series-label { color: #ffd700; }
.series-count { font-size: 36px; font-weight: 900; font-family: var(--font-display); color: #fff; line-height: 1; }
.series-winner-side .series-count { color: #ffd700; }
.series-pips { display: flex; gap: 5px; margin-top: 2px; }
.series-pip {
  width: 10px; height: 10px; border-radius: 50%;
  background: #2c2c34;
  transition: background 0.2s;
}
.series-pip.pip-filled { background: #ffd700; box-shadow: 0 0 6px rgba(255,215,0,0.6); }
.series-divider { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.3); }

.coin-series-winner { font-size: 28px; letter-spacing: 0.1em; color: #ffd700; filter: drop-shadow(0 0 12px rgba(255,215,0,0.6)); }

.coin-reset-btn {
  width: 100%; padding: 10px; 
  border: 2px solid rgba(255,255,255,0.2);
  background: #1a1a20;
  color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden;
}


/* Question feature */
.coin-question-section { width: 100%; display: flex; flex-direction: column; align-items: center; }
.coin-question-toggle {
  background: none; border: 2px dashed rgba(255,255,255,0.24); 
  color: rgba(255,255,255,0.35); font-size: 12px; font-weight: 700; letter-spacing: 0.05em;
  padding: 7px 16px; cursor: pointer; width: 100%; transition: all 0.15s;
}

.coin-question-display {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: rgba(255,215,0,0.07); border: 2px solid rgba(255,215,0,0.25);
   padding: 10px 14px;
}
.coin-question-text {
  flex: 1; font-size: 15px; font-weight: 800; font-family: var(--font-display);
  letter-spacing: 0.04em; color: #ffd700; text-align: center;
  filter: drop-shadow(0 0 8px rgba(255,215,0,0.4));
}
.coin-question-clear {
  background: none; border: none; color: rgba(255,215,0,0.5); font-size: 14px;
  cursor: pointer; padding: 2px 4px; flex-shrink: 0; line-height: 1;
}

.coin-question-input-row {
  display: flex; align-items: center; gap: 6px; width: 100%;
}
.coin-question-input {
  flex: 1; background: #1a1a20; border: 2px solid rgba(255,215,0,0.3);
   color: #fff; font-size: 14px; font-weight: 600;
  padding: 9px 12px; outline: none; font-family: inherit;
}
.coin-question-input::placeholder { color: rgba(255,255,255,0.3); }
.coin-question-input:focus { border-color: rgba(255,215,0,0.6); }
.coin-q-confirm, .coin-q-cancel {
  flex-shrink: 0; width: 34px; height: 34px;  border: none;
  font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s;
}
.coin-q-confirm { background: rgba(255,215,0,0.15); color: #ffd700; }

.coin-q-cancel { background: #1a1a20; color: rgba(255,255,255,0.45); }


@media (orientation: landscape) and (max-height: 900px) {
  .turn-header { min-height: 64px; }
  .turn-round-pill { font-size: clamp(28px, 3.5dvh, 38px); padding: 5px 14px; }
  .turn-name { font-size: clamp(32px, 4.5dvh, 48px); }
  .scores-btn { height: 48px; padding: 0 20px; font-size: 26px; margin: 0 10px; }
  .submit-float-btn { bottom: calc(16px + env(safe-area-inset-bottom)); right: 16px; padding: 12px 24px; font-size: 13px; }

  /* Coin flip: two-column layout so everything fits without scrolling */
  .coin-overlay { padding: 12px 16px; }
  .coin-modal { max-width: 767px; gap: 10px; }
  .coin-modal-title { font-size: 26px; }
  .coin-body { flex-direction: row; align-items: flex-start; gap: 20px; }
  .coin-left { flex-shrink: 0; gap: 6px; }
  .coin-right { flex: 1; gap: 8px; min-width: 0; }
  .coin { width: 110px; height: 110px; }
  .coin-letter { font-size: 32px; }
  .coin-arena { gap: 8px; }
  .coin-tap-hint { font-size: 10px; }
  .coin-result-text { font-size: 36px; }
  .coin-series-winner { font-size: 20px; }
  .coin-customize { padding: 8px 12px; }
  .coin-cust-btn { width: 44px; height: 44px; }
  .coin-cust-divider { height: 44px; }
  .coin-series-board { padding: 4px 0; }
  .series-count { font-size: 28px; }
  .coin-reset-btn { padding: 6px; font-size: 12px; }
  .coin-mode-btn { padding: 5px 0; font-size: 11px; }
  .coin-question-toggle { padding: 5px 12px; font-size: 11px; }
  .coin-question-display { padding: 6px 10px; }
  .coin-question-text { font-size: 12px; }
}

@media (min-width: 768px) and (max-width: 1099px) {
  /* iPad: right-column marks — widen col and shrink pips so they don't overflow */
  .cricket-col { width: 160px; }
  .cc-pip { width: 9px; height: 9px; }
  .cc-cell { gap: 1px; }
  /* iPad: scores overlay marks — slightly larger than global since iPad has more space */
  .mini-pip { width: 20px; height: 20px; }
  .mini-label { font-size: 24px; }

  /*
   * The name takes its own row on an iPad too — the same fault as the phone, one band up.
   *
   * `.turn-name-wrap` is absolutely positioned across the whole header and centred at
   * z-index 0, underneath the round pill and the buttons, which both paint opaque
   * backgrounds. An 810px iPad portrait looks like it has room and does not: the pill alone
   * is a clamp(50px, 6.8dvh, 74px) wordmark, so avatar plus pill runs past 300px, and a name
   * centred across the full width starts around 105px — under it. "PEEZY F BABY" came out
   * with "ROUND 1" stamped through the middle of it.
   *
   * The band previously capped the name at 48vw instead. That bounds how far the name
   * reaches, which answers the right-hand collision and does nothing about the pill coming
   * from the left, because the pill is drawn ON TOP rather than beside.
   *
   * Landscape is included deliberately: a 1024 x 768 iPad has more width but scales both the
   * pill and the name off viewport height, so the clearance barely moves.
   */
  .turn-header { min-height: 0; flex-wrap: wrap; row-gap: 2px; padding-bottom: 6px; }
  .turn-left { flex: 0 0 auto; order: 1; align-items: center; }
  .turn-header-3btns .turn-left { align-items: center; padding-bottom: 0; }
  .turn-right { flex: 1 1 auto; order: 2; justify-content: flex-end; padding-right: 8px; }
  .turn-name-wrap {
    position: static; order: 3;
    flex: 0 0 100%; width: 100%;
    align-items: center; justify-content: center; padding: 0 10px;
  }
  .turn-name {
    display: block; max-width: 100%;
    font-size: clamp(40px, 6.5vw, 68px); padding: 0 12px;
    overflow: hidden; text-overflow: ellipsis;
  }
  .turn-round-pill { font-size: clamp(26px, 3.4dvh, 38px); padding: 4px 14px; margin-left: 10px; }
}

@media (min-width: 768px) and (max-width: 1099px) and (orientation: portrait) {
  /* Cricket: keep SCORES button sized at mid widths */
  .scores-btn.scores-btn-cricket { height: 48px; padding: 0 18px; font-size: 18px; margin: 0 4px 0 0; }
}

@media (max-width: 767px) {
  .game { position: fixed; inset: 0; }
  .entry-panel { flex: 1; min-height: 0; }
  .cricket-col { width: 100px; }
  .cc-player-head { font-size: 9px; }
  .cc-target-label { font-size: 10px; width: 18px; }
  .cc-pip { width: 10px; height: 10px; }
  .cc-cell { gap: 1px; }
  /*
   * The header shares the row on a phone instead of stacking on top of itself.
   *
   * `.turn-name-wrap` is absolutely positioned across the full header and centred, sitting at
   * z-index 0 beneath the round pill and the buttons — which both have opaque backgrounds. On
   * a wide screen there is room and it looks centred; on a 393px phone the avatar, pill and
   * buttons already came to 413px, so the name was painted over from both sides at once and
   * "Peezy F Baby" showed up as a single letter between the pill and the ✕.
   *
   * Here the name is in flow and takes what is left, so it can never be covered — and the
   * pieces beside it are trimmed to leave it something worth having.
   */
  /*
   * The name gets its own row on a phone, the way the setup screen's title does.
   *
   * `.turn-name-wrap` is absolutely positioned across the whole header and centred, at
   * z-index 0 — underneath the round pill and the buttons, which both paint opaque
   * backgrounds. Given room that looks centred; on a 375px phone the avatar, pill and
   * cricket's four buttons come to 364px on their own, so the name was covered from both
   * sides at once and "Peezy F Baby" rendered as one letter between the pill and the ✕.
   *
   * There is no trim that fixes it: the pieces beside the name genuinely need that row. So
   * the header wraps and the name takes the second row, which costs far less height than it
   * sounds — the single row was being held open to 74px for 44px of buttons, so the whole
   * two-row header ends up only a little taller than the old one.
   */
  .turn-header { min-height: 0; flex-wrap: wrap; row-gap: 2px; padding-bottom: 5px; }
  .turn-left { flex: 0 0 auto; order: 1; align-items: center; }
  .turn-header-3btns .turn-left { align-items: center; padding-bottom: 0; }
  .turn-right { flex: 1 1 auto; order: 2; justify-content: flex-end; padding-right: 6px; }
  .turn-name-wrap {
    position: static; order: 3;
    flex: 0 0 100%; width: 100%;
    align-items: center; justify-content: center; padding: 0 8px;
  }
  .turn-name {
    display: block; max-width: 100%;
    font-size: clamp(26px, 7.5vw, 48px); padding: 0 10px;
    overflow: hidden; text-overflow: ellipsis;
  }
  .turn-round-pill { font-size: clamp(20px, 2.8dvh, 30px); padding: 3px 10px; margin-left: 8px; }
  .scores-btn { height: 40px; padding: 0 14px; font-size: 18px; margin: 0 4px; }
  .submit-float-btn { bottom: calc(14px + env(safe-area-inset-bottom)); right: 14px; padding: 12px 22px; font-size: 13px; }
  .submit-row { padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
  .submit-btn { height: 46px; font-size: 16px; }
  .lb-player-row { padding: 5px 12px; }
  .lb-avatar { width: 32px; height: 32px; font-size: 16px; }
  .lb-player-name { font-size: 13px; }
  .lb-score-val { font-size: clamp(22px, 3.5dvh, 48px); }
  .mini-label { font-size: 14px; }
  .mini-pip { width: 12px; height: 12px; }
}

/* ═══════════════════════════════════════════════════════════════════════
   WIDESCREEN SIDEBAR — safe to delete entirely (template block + this CSS)
   ═══════════════════════════════════════════════════════════════════════ */
.ws-sidebar {
  display: none;
}
@media (min-width: 1100px) {
  .ws-sidebar {
    display: flex;
    flex-direction: row;
    width: 300px;
    flex-shrink: 0;
    background: rgba(0,0,0,0.6);
    border-left: 2px solid rgba(255,255,255,0.07);
    overflow: hidden;
    transition: width 0.2s ease;
  }
  .ws-sidebar-collapsed {
    width: 28px;
  }
  .ws-collapse-btn {
    width: 28px;
    min-width: 28px;
    height: 100%;
    background: transparent;
    border: none;
    border-right: 2px solid rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.35);
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
  }
  @media (hover: hover) and (pointer: fine) {
  .ws-collapse-btn:hover {
    color: rgba(255,255,255,0.7);
    background: #17171d;
  }
  }

  .ws-sidebar-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .ws-game-info {
    display: flex;
    flex-direction: column;
    padding: 20px 16px 12px;
    border-bottom: 2px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }
  .ws-game-type {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--gold);
    line-height: 1;
  }
  .ws-round {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
    margin-top: 4px;
  }
  .ws-players {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
  .ws-players::-webkit-scrollbar { width: 3px; }
  .ws-players::-webkit-scrollbar-thumb { background: #333;  }
  .ws-player-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    border-left: 3px solid transparent;
    transition: background 0.15s, border-color 0.15s;
  }
  .ws-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    overflow: hidden;
  }
  .ws-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .ws-player-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ws-player-name {
    font-size: 14px;
    font-weight: 700;
    color: rgba(255,255,255,0.55);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ws-throwing-tag {
    font-size: 10px;
    color: var(--ws-color, var(--pink));
  }
  .ws-score {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 900;
    color: rgba(255,255,255,0.7);
    line-height: 1;
  }
  .ws-cricket-marks {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    margin-top: 2px;
  }
  .ws-mark-cell {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .ws-mark-cell.ws-mark-closed .ws-mark-label { color: rgba(255,255,255,0.2); }
  .ws-mark-cell.ws-mark-closed .ws-pip { opacity: 0.2; }
  .ws-mark-label {
    font-size: 10px;
    font-weight: 700;
    color: rgba(255,255,255,0.45);
    min-width: 12px;
  }
  .ws-mark-pips { display: flex; gap: 2px; }
  .ws-pip {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #2c2c34;
    transition: background 0.15s;
  }
  .ws-pip.filled { background: rgba(255,255,255,0.5); }
  .ws-footer {
    padding: 12px 14px;
    border-top: 2px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }
  .ws-wild-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .ws-wild-label { font-size: 12px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
  .ws-wild-btns { display: flex; gap: 6px; }
  .ws-quit-btn { width: 100%; }
}
/* ═══════════════════ END WIDESCREEN SIDEBAR ═══════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════
   STREET TREATMENT — identical block in every view. Flat printed panels
   instead of glass: no blur, square corners, 2px rules, hard offset
   shadows, halftone grain. Adds only what the sweep cannot infer.
   Lift this into src/style.css once the look is settled.
   ══════════════════════════════════════════════════════════════════════ */
.display { text-shadow: 2px 2px 0 rgba(0,0,0,0.55); }
.glass-panel::before, .panel::before, .card::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(rgba(255,255,255,0.13) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  opacity: 0.5;
}
.glass-panel > *, .panel > *, .card > * { position: relative; z-index: 1; }
.toggle-thumb { border-radius: 0; box-shadow: 1px 1px 0 rgba(0,0,0,0.5); }

@media (hover: hover) and (pointer: fine) {
  .header-quit-btn:hover { background: rgba(255,40,40,0.2); color: #ff5050; border-color: rgba(255,80,80,0.6); }
  .remove-player-btn:hover { border-color: #ef4444; color: #ef4444; }
  .ct-display-btn:hover { background: #222229; color: #fff; }
  .timer-ctrl-btn:hover { background: #222229; color: #fff; }
  .round-limit-btn:hover:not(:disabled) { background: #26262e; }
  .coin-close-btn:hover { color: #fff; }
  .coin-cust-btn:hover { border-color: rgba(255,255,255,0.4); background: #222229; }
  .coin-cust-clear:hover { color: #ff4444; }
  .coin-mode-btn:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
  .coin-reset-btn:hover { border-color: #ffd700; color: #ffd700; background: rgba(255,215,0,0.1); }
  .coin-question-toggle:hover { border-color: rgba(255,215,0,0.4); color: rgba(255,215,0,0.6); }
  .coin-question-clear:hover { color: #ff5555; }
  .coin-q-confirm:hover { background: rgba(255,215,0,0.3); }
  .coin-q-cancel:hover { color: #ff5555; }
}
</style>

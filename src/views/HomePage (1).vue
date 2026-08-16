<template>
  <div class="home">
    <div class="drip-bar" />

    <!-- ambient colour blooms, sit above the dartboard photo so the glass has something to refract -->
    <div class="home-scrim" />
    <div class="bloom bloom-pink" />
    <div class="bloom bloom-blue" />
    <div class="bloom bloom-purple" />

    <div class="home-inner">
      <!--
        Here as well as on the setup screen, because saving a player navigates straight back
        here — a warning that only lived over there would appear for no time at all, at
        exactly the moment it has something to say.
      -->
      <SyncWarning class="home-sync-warn" />

      <!-- ── Hero + resume / counters ─────────────────────── -->
      <section class="hero-row">
        <div class="glass-panel hero">
          <div class="hero-glow" />

          <!--
            These live in the hero because the top bar that used to hold them is gone: it
            carried no tap target of its own, only a wordmark that had already moved into
            this panel and a sync chip that duplicated this button's state.
            They carry visible text as well: `title` is a tooltip, and a tooltip does not
            exist on a touch screen, so these read as unlabelled glyphs on a tablet.
          -->
          <div class="hero-actions">
            <button v-ripple class="hero-action" title="Cloud sync" @click="openSyncModal">
              <span class="sync-dot" :class="{ 'sync-dot-off': !authStore.user, 'sync-dot-bad': !!playersStore.syncFailure }" />
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 15.5a3.5 3.5 0 0 0-2.6-5.8A5.5 5.5 0 0 0 6.8 10 3.6 3.6 0 0 0 7 17h11" />
                <path d="M12 20v-6M9.5 16.5 12 14l2.5 2.5" />
              </svg>
              <span>Sync</span>
            </button>
            <button v-ripple class="hero-action" title="Narrator settings" @click="openSettings">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
                <circle cx="9" cy="7" r="2.2" fill="rgba(10,10,12,0.9)" />
                <circle cx="15" cy="12" r="2.2" fill="rgba(10,10,12,0.9)" />
                <circle cx="7.5" cy="17" r="2.2" fill="rgba(10,10,12,0.9)" />
              </svg>
              <span>Narrator</span>
            </button>
          </div>

          <span class="hero-eyebrow">EST. TONIGHT</span>
          <h1 class="hero-wordmark">
            <span class="wm-line">PEEZY</span>
            <span class="wm-line">DOES IT</span>
          </h1>
          <div class="hero-strap">
            <span class="strap-rule" />
            <span class="strap-text">Darts · Yahtzee · Left Right Center</span>
          </div>
          <p class="hero-sub">Who's up. Who's down. Who's next.</p>
        </div>

      </section>

      <!-- ── Resume ───────────────────────────────────────── -->
      <section v-if="resumable.length" class="resume-row">
        <div v-for="g in resumable" :key="g.key" class="glass-panel resume-card">
          <div class="resume-info">
            <div class="resume-head">
              <span class="live-dot live-dot-pink" />
              <span class="resume-label display">{{ g.title.toUpperCase() }}</span>
            </div>
            <span class="resume-sub">{{ g.detail }}</span>
            <span v-if="g.key === 'darts_active_game' && currentPlayerName" class="resume-meta">
              {{ currentPlayerName }} is up
            </span>
          </div>
          <button v-ripple class="resume-btn display" @click="router.push(g.route)">RESUME →</button>
        </div>
      </section>

      <div class="pick-rule">
        <span class="pick-label display">PICK A CATEGORY</span>
        <span class="pick-line" />
      </div>

      <!--
        Categories rather than nine flat tiles — but the door lists its own games, so the
        grouping is visible without costing a tap. Two independent columns, not a two-column
        grid: a grid row stretches its shorter panel to the taller one's height, which left a
        hole under a two-game category.
      -->
      <section class="door-cols">
        <div class="door-col">
          <div class="glass-panel door door-blue">
            <div class="mode-glow" />
            <div class="door-head">
              <div class="mode-icon">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round">
                  <path d="M5.5 6.5h13M5.5 12h13M5.5 17.5h13" />
                  <path d="M8 4.2 11 8.8M16 4.2 13 8.8M8 9.7l3 4.6M16 9.7l-3 4.6M8 15.2l3 4.6M16 15.2l-3 4.6" />
                </svg>
              </div>
              <div class="door-copy">
                <span class="door-name mode-title display">DARTS</span>
                <span class="door-count">{{ dartsCount }} games</span>
              </div>
            </div>
            <div class="chip-list">
              <!-- The three the group actually plays; ?type= lands on the game rather than a picker. -->
              <button
                v-for="d in DARTS_QUICK" :key="d.type"
                v-ripple class="mode chip chip-blue" @click="goGame('/new-game?type=' + d.type)"
              >
                <span class="mode-title chip-name display">{{ GAME_TYPE_LABELS[d.type] }}</span>
                <span class="chip-sub">{{ d.sub }}</span>
              </button>
              <button v-ripple class="mode chip chip-ghost" @click="goGame('/new-game')">
                <span class="chip-name chip-name-sm display">All {{ dartsCount }} darts games →</span>
                <span class="chip-sub">Speed Cricket · Around the Clock · 301 · 701 and more</span>
              </button>
            </div>
          </div>

          <div class="glass-panel door door-purple">
            <div class="mode-glow" />
            <div class="door-head">
              <div class="mode-icon">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#bf5fff" stroke-width="1.8" stroke-linejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="4" />
                  <circle cx="9" cy="9" r="1.4" fill="#bf5fff" stroke="none" />
                  <circle cx="15" cy="15" r="1.4" fill="#bf5fff" stroke="none" />
                  <circle cx="12" cy="12" r="1.4" fill="#bf5fff" stroke="none" />
                </svg>
              </div>
              <div class="door-copy">
                <span class="door-name display">DICE</span>
                <span class="door-count">5 games</span>
              </div>
            </div>
            <div class="chip-grid">
              <button v-ripple class="mode chip chip-purple" @click="goGame('/yahtzee/setup')">
                <span class="mode-title chip-name display">YAHTZEE</span>
                <span class="chip-sub">2–8 players</span>
              </button>
              <button v-ripple class="mode chip chip-green" @click="goGame('/lrc/setup')">
                <span class="mode-title chip-name display">LEFT RIGHT CENTER</span>
                <span class="chip-sub">Pure luck</span>
              </button>
              <button v-ripple class="mode chip chip-gold" @click="goGame('/dice/farkle/setup')">
                <span class="mode-title chip-name display">FARKLE</span>
                <span class="chip-sub">Race to 10,000</span>
              </button>
              <button v-ripple class="mode chip chip-cyan" @click="goGame('/dice/scc/setup')">
                <span class="mode-title chip-name display">SHIP CAPTAIN CREW</span>
                <span class="chip-sub">6, 5, 4 in order</span>
              </button>
              <button v-ripple class="mode chip chip-pink chip-wide" @click="goGame('/dice/pig/setup')">
                <span class="mode-title chip-name display">PIG</span>
                <span class="chip-sub">Roll a 1, lose it all</span>
              </button>
            </div>
          </div>

          <div class="glass-panel roster">
            <span class="panel-label">Roster</span>
            <div v-if="playersStore.players.length" class="roster-stack">
              <PlayerAvatar
                v-for="(p, i) in rosterShown" :key="p.id"
                :player="p" :size="38" stacked
                :style="{ marginLeft: i === 0 ? '0' : '-12px' }"
              />
              <div v-if="rosterOverflow > 0" class="roster-more">+{{ rosterOverflow }}</div>
            </div>
            <p v-else class="roster-empty">No players yet.</p>
            <button v-ripple class="ghost-btn" @click="router.push('/player-setup')">+ Add player</button>
          </div>
        </div>

        <div class="door-col">
          <div class="glass-panel door door-indigo">
            <div class="mode-glow" />
            <div class="door-head">
              <div class="mode-icon">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#8f7bff" stroke-width="1.7" stroke-linejoin="round">
                  <path d="M12 3.5c-2.4 3-6 5.3-6 8.4a3.4 3.4 0 0 0 5.2 2.9L10.5 20h3l-.7-5.2A3.4 3.4 0 0 0 18 11.9c0-3.1-3.6-5.4-6-8.4z" />
                </svg>
              </div>
              <div class="door-copy">
                <span class="door-name display">CARDS &amp; COINS</span>
                <span class="door-count">3 games</span>
              </div>
            </div>
            <div class="chip-grid">
              <button v-ripple class="mode chip chip-indigo" @click="goGame('/spades/setup')">
                <span class="mode-title chip-name display">SPADES</span>
                <span class="chip-sub">Classic or Wild Style</span>
              </button>
              <button v-ripple class="mode chip chip-indigo" @click="goGame('/blackjack/setup')">
                <span class="mode-title chip-name display">BLACKJACK</span>
                <span class="chip-sub">21 · chips and betting</span>
              </button>
              <!-- Not a game, but it is what you reach for before one starts. -->
              <button v-ripple class="mode chip chip-silver chip-wide" @click="showCoinFlip = true">
                <span class="mode-title chip-name display">COIN FLIP</span>
                <span class="chip-sub">Who throws first · best of 3 or 5</span>
              </button>
            </div>
          </div>

          <div class="glass-panel narrator" @click="openSettings">
            <div class="narrator-glow" />
            <div class="narrator-head">
              <span class="panel-label">Narrator</span>
              <span class="panel-hint">Click to change</span>
            </div>
            <div class="narrator-main">
              <div class="narrator-id">
                <span class="narrator-name display">{{ voiceLabel }}</span>
                <span class="narrator-scope">{{ scopeLabel }}</span>
              </div>
              <!--
                Three states now, so a two-position switch cannot express it. The toggle
                showed "on" for both Names only and Off, which is how a narrator that had been
                turned off still looked switched on.
              -->
              <div
                class="toggle-track narrator-toggle"
                :class="{ active: settingsStore.narratorMode !== 'off' }"
                @click.stop="settingsStore.setNarratorMode(settingsStore.narratorMode === 'off' ? 'full' : 'off')"
              >
                <div class="toggle-thumb" />
              </div>
            </div>
            <div class="narrator-stats">
              <div class="nstat">
                <span class="nstat-label">Speed</span>
                <span class="nstat-value nstat-blue display">{{ settingsStore.voiceRate.toFixed(2) }}x</span>
              </div>
              <div class="nstat">
                <span class="nstat-label">Pitch</span>
                <span class="nstat-value nstat-purple display">{{ settingsStore.voicePitch.toFixed(2) }}</span>
              </div>
              <div class="nstat">
                <span class="nstat-label">Clean</span>
                <span class="nstat-value display" :class="settingsStore.cleanMode ? 'nstat-lime' : 'nstat-dim'">
                  {{ settingsStore.cleanMode ? 'ON' : 'OFF' }}
                </span>
              </div>
            </div>
          </div>

          <div class="glass-panel door door-gold">
            <div class="mode-glow" />
            <div class="door-head">
              <div class="mode-icon">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="1.9" stroke-linecap="round">
                  <path d="M6 20v-7M12 20V5M18 20v-10" />
                </svg>
              </div>
              <div class="door-copy">
                <span class="door-name display">STATS</span>
                <span class="door-count">Leaderboard · counters</span>
              </div>
            </div>

            <!-- Both counters live here now. On their own above the tiles they were two big
                 numbers competing with the games for the top of the page. -->
            <div class="stat-pair">
              <div class="stat-cell">
                <span class="counter-label">Games logged</span>
                <span class="stat-value display">{{ totalGames }}</span>
                <span class="counter-foot">Across {{ playersStore.players.length }} players</span>
              </div>
              <div class="stat-cell stat-cell-gold">
                <span class="counter-label">Best win rate</span>
                <span class="stat-value stat-value-gold display">{{ bestRate ? bestRate.pct + '%' : '—' }}</span>
                <span class="counter-foot">{{ bestRate ? bestRate.name : 'Needs 3+ games' }}</span>
              </div>
            </div>

            <div v-if="ranked.length === 0" class="board-empty">
              No games logged yet. Add a player and the table fills itself in.
            </div>
            <div v-else class="mini-board">
              <div
                v-for="(p, i) in topThree" :key="p.id"
                class="mini-row" :class="{ 'board-row-lead': i === 0 }"
                :style="{ borderLeftColor: p.color || 'rgba(255,255,255,0.2)' }"
              >
                <span class="rank display" :class="{ 'rank-gold': i === 0 }">{{ i + 1 }}</span>
                <div class="board-player">
                  <PlayerAvatar :player="p" :size="28" />
                  <span class="board-name">{{ p.name }}</span>
                  <span v-if="isPlaying(p.id)" class="tag tag-pink">PLAYING</span>
                </div>
                <span class="num" :class="i === 0 ? 'num-gold' : 'num-bright'">{{ winPct(p) }}%</span>
              </div>
            </div>

            <div class="door-links">
              <button class="board-link" @click="router.push('/history')">History →</button>
              <button class="board-link" @click="router.push('/leaderboard')">Full table →</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ── Narrator settings modal ───────────────────────── -->
    <transition name="fade">
      <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
        <div class="settings-panel">
          <div class="settings-header">
            <span class="settings-title display">NARRATOR SETTINGS</span>
            <button class="settings-close" @click="showSettings = false">✕</button>
          </div>

          <!-- How much it says, before which voice says it. -->
          <div class="settings-section">
            <div class="settings-label">Scope</div>
            <div class="scope-seg">
              <button
                v-for="m in NARRATOR_MODES" :key="m.value"
                v-ripple class="scope-btn" :class="{ active: settingsStore.narratorMode === m.value }"
                @click="settingsStore.setNarratorMode(m.value)"
              >{{ m.label }}</button>
            </div>
            <div class="settings-muted">
              {{ scopeHint }}
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-label">Voice</div>
            <div v-if="availableVoices.length === 0" class="settings-muted">No voices loaded yet. Try again in a moment.</div>
            <div v-else class="voice-list">
              <button
                v-for="v in availableVoices"
                :key="v.value"
                :class="['voice-btn', { active: settingsStore.voiceName === v.value }]"
                @click="settingsStore.setVoiceName(v.value)"
              >
                <span class="voice-btn-label">{{ v.label }}</span>
                <span v-if="v.sublabel" class="voice-btn-sub">{{ v.sublabel }}</span>
              </button>
            </div>
            <!--
              The one thing the app cannot do for you.

              A browser can only offer the voices the system already has, and iOS ships very
              few until they are downloaded — so a short list here is the device's doing, not
              a missing feature, and the fix lives in Settings rather than in this panel.
            -->
            <p v-if="showVoiceHint" class="settings-muted voice-hint">
              Only {{ availableVoices.length - 1 }} to choose from? iOS downloads voices on
              demand. <strong>Settings › Accessibility › Spoken Content › Voices › English</strong>
              — the Novelty ones are the fun ones. They show up here once downloaded.
            </p>
          </div>

          <div class="settings-section">
            <div class="settings-label">Speed &amp; Pitch</div>
            <div class="slider-row">
              <span class="slider-label">Speed</span>
              <input type="range" class="voice-slider" min="0.1" max="1.2" step="0.05"
                :value="settingsStore.voiceRate"
                @input="settingsStore.setVoiceRate(+($event.target as HTMLInputElement).value)"
              />
              <span class="slider-val">{{ settingsStore.voiceRate.toFixed(2) }}x</span>
            </div>
            <div class="slider-row">
              <span class="slider-label">Pitch</span>
              <input type="range" class="voice-slider" min="0.1" max="3.0" step="0.05"
                :value="settingsStore.voicePitch"
                @input="settingsStore.setVoicePitch(+($event.target as HTMLInputElement).value)"
              />
              <span class="slider-val">{{ settingsStore.voicePitch.toFixed(2) }}</span>
            </div>
          </div>

          <button v-ripple class="btn btn-outline test-btn" @click="testVoice">Test Voice</button>

          <div class="settings-section">
            <div class="settings-label">Narrator Style</div>
            <div class="toggle-row" @click="settingsStore.setCleanMode(!settingsStore.cleanMode)">
              <div class="toggle-track" :class="{ active: settingsStore.cleanMode }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Clean Mode</span>
                <span class="toggle-sub">Removes profanity from all narrator lines</span>
              </div>
            </div>

          </div>

          <div class="settings-section">
            <div class="settings-label">Timers</div>
            <div class="toggle-row" @click="settingsStore.setDisableWalkUpTimer(!settingsStore.disableWalkUpTimer)">
              <div class="toggle-track" :class="{ active: settingsStore.disableWalkUpTimer }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Disable Walk-up Timer</span>
                <span class="toggle-sub">Turns off the between-turns countdown for all games</span>
              </div>
            </div>
            <div class="toggle-row" @click="settingsStore.setDisableThrowTimer(!settingsStore.disableThrowTimer)">
              <div class="toggle-track" :class="{ active: settingsStore.disableThrowTimer }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Disable Throw Timer</span>
                <span class="toggle-sub">Turns off the per-throw countdown for all games</span>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-label">Bullseye Sound (Cricket)</div>
            <div class="voice-list">
              <button
                v-for="opt in bullseyeSoundOptions" :key="opt.value"
                :class="['voice-btn', { active: settingsStore.bullseyeSound === opt.value }]"
                @click="previewBullseyeSound(opt.value)"
              >
                <span class="voice-btn-label">{{ opt.label }}</span>
                <span class="voice-btn-sub">{{ opt.sub }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Coin flip overlay ─────────────────────────────── -->
    <Transition name="coin-fade">
      <div v-if="showCoinFlip" class="coin-overlay" @click.self="showCoinFlip = false">
        <div class="coin-modal">
          <div class="coin-modal-header">
            <span class="coin-modal-title display">COIN FLIP</span>
            <button class="coin-close-btn" @click="showCoinFlip = false">✕</button>
          </div>

          <div class="coin-series-modes">
            <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'single' }" @click="seriesMode = 'single'">Single</button>
            <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'bo3' }" @click="seriesMode = 'bo3'">Best of 3</button>
            <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'bo5' }" @click="seriesMode = 'bo5'">Best of 5</button>
          </div>

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
            <button v-else class="coin-question-toggle" @click.stop="showQuestionInput = true">What's the flip for?</button>
          </div>

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

          <Transition name="result-slide">
            <div v-if="coinResult && !coinFlipping" class="coin-result">
              <span v-if="seriesWinner" class="coin-series-winner display">{{ seriesWinner === 'heads' ? 'HEADS WINS!' : 'TAILS WINS!' }}</span>
              <span v-else class="coin-result-text display" :class="coinResult">{{ coinResult === 'heads' ? 'HEADS' : 'TAILS' }}</span>
            </div>
          </Transition>
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

          <input ref="headsFileInput" type="file" accept="image/*" style="display:none" @change="onCoinImagePicked('heads', $event)" />
          <input ref="tailsFileInput" type="file" accept="image/*" style="display:none" @change="onCoinImagePicked('tails', $event)" />
        </div>
      </div>
    </Transition>

    <!-- ── Cloud sync modal ──────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showSyncModal" class="settings-overlay" @click.self="showSyncModal = false">
        <div class="settings-panel sync-panel">
          <div class="settings-header">
            <span class="settings-title display">CLOUD SYNC</span>
            <button class="settings-close" @click="showSyncModal = false">✕</button>
          </div>

          <div v-if="authStore.user" class="sync-signed-in">
            <div class="sync-status-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 15.5a3.5 3.5 0 0 0-2.6-5.8A5.5 5.5 0 0 0 6.8 10 3.6 3.6 0 0 0 7 17h11" />
                <path d="M9.5 19.5 12 22l5-6" />
              </svg>
            </div>
            <div class="sync-email">{{ authStore.user.email }}</div>
            <div class="sync-desc">Player profiles are syncing across your devices.</div>
            <button v-ripple class="btn btn-outline btn-lg" @click="authStore.signOut(); showSyncModal = false">Sign Out</button>
          </div>

          <div v-else class="sync-sign-in">
            <div v-if="!syncSent">
              <div class="sync-desc">Enter your email to sync player profiles across all your devices. We'll send you a magic link — no password needed.</div>
              <input
                v-model="syncEmail"
                class="sync-email-input"
                type="email"
                placeholder="your@email.com"
                @keydown.enter="sendMagicLink"
              />
              <div v-if="syncError" class="sync-error">{{ syncError }}</div>
              <button v-ripple class="btn btn-spray btn-lg w-full" :disabled="syncLoading" @click="sendMagicLink">
                {{ syncLoading ? 'Sending...' : 'Send Magic Link' }}
              </button>
            </div>
            <div v-else class="sync-sent">
              <div class="sync-status-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="5.5" width="18" height="13" rx="3" />
                  <path d="m3.8 7.5 7.2 5.4a1.7 1.7 0 0 0 2 0l7.2-5.4" />
                </svg>
              </div>
              <div class="sync-desc">Check your email! Click the link to sign in and start syncing.</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resumableGames } from '../lib/resumable'
import { useSettingsStore } from '../stores/settings'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { usePlayersStore } from '../stores/players'
import { GAME_TYPE_LABELS, GAME_TYPE_ORDER, type GameType, type Player } from '../types/index'
import { speak, speakOhBaby, getAvailableVoices, type VoiceOption } from '../composables/useSpeech'
import { playShotgun, playBuzzer, playStartChime, unlockAudio } from '../composables/useSounds'
import PlayerAvatar from '../components/PlayerAvatar.vue'
import SyncWarning from '../components/SyncWarning.vue'
import { NARRATOR_MODES, type NarratorMode } from '../types/index'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const playersStore = usePlayersStore()

/* ── Dashboard data — all of it derived from what the app actually stores ── */
const hasActiveGame = computed(() => {
  const g = gameStore.game
  return g !== null && (g.status === 'playing' || g.status === 'between_turns')
})

/**
 * Every unfinished game, read straight from storage rather than by mounting seven stores.
 * Recomputed when the route changes, which is when it can have changed — quitting a game and
 * returning to the menu is a navigation.
 */
const resumeTick = ref(0)
const resumable = computed(() => {
  void resumeTick.value
  return resumableGames(k => localStorage.getItem(k))
})
watch(() => route.fullPath, () => { resumeTick.value++ })
const currentPlayerName = computed(() => {
  const g = gameStore.game
  return g ? (g.players[g.currentPlayerIndex]?.name ?? '') : ''
})
const activeIds = computed(() => new Set(gameStore.game?.players.map(p => p.id) ?? []))
function isPlaying(id: string) { return hasActiveGame.value && activeIds.value.has(id) }

/**
 * The three the group plays get a chip of their own inside the Darts door; the rest stay one
 * tap away behind the all-games chip, which is this same setup page with nothing preselected.
 * The count is derived rather than written down, so adding a game keeps the door honest.
 */
const DARTS_QUICK: { type: GameType; sub: string }[] = [
  { type: 'cricket', sub: '20s down · 2–6 players' },
  { type: '501',     sub: 'Double out' },
  { type: 'killer',  sub: 'Claim a number, take theirs' },
]
const dartsCount = GAME_TYPE_ORDER.length

function winPct(p: Player) {
  return p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0
}
const ranked = computed(() =>
  [...playersStore.players]
    .sort((a, b) => b.wins - a.wins || b.gamesPlayed - a.gamesPlayed || a.name.localeCompare(b.name))
    .slice(0, 5)
)
const topThree = computed(() => ranked.value.slice(0, 3))
const totalGames = computed(() => playersStore.players.reduce((n, p) => n + p.gamesPlayed, 0))
/** needs a real sample size, otherwise one lucky win reads as 100% */
const bestRate = computed(() => {
  const eligible = playersStore.players.filter(p => p.gamesPlayed >= 3)
  if (!eligible.length) return null
  const top = eligible.reduce((best, p) => (winPct(p) > winPct(best) ? p : best), eligible[0]!)
  return { name: top.name, pct: winPct(top) }
})

const ROSTER_MAX = 5
const rosterShown = computed(() => playersStore.players.slice(0, ROSTER_MAX))
const rosterOverflow = computed(() => Math.max(0, playersStore.players.length - ROSTER_MAX))

/**
 * The narrator panel names the voice now, because the voice is the only thing to choose.
 *
 * It used to name the writing style, of which there were eleven. They were removed: a style
 * changed which words were picked and nothing about how they sounded, since the narrator
 * never passed a rate or a pitch to the speech engine. Eleven identical-sounding narrators
 * reading slightly different sentences is not a choice worth presenting.
 */
const voiceLabel = computed(() => {
  const chosen = availableVoices.value.find(v => v.value === settingsStore.voiceName)
  return chosen?.label ?? 'Default'
})

const scopeLabel = computed(() =>
  NARRATOR_MODES.find(m => m.value === settingsStore.narratorMode)?.label ?? 'Commentary')

const SCOPE_HINTS: Record<NarratorMode, string> = {
  full: 'Full play-by-play — every nudge, roast and result.',
  names: 'Whose turn it is, a hurry-up at thirty seconds, and who won. Nothing else.',
  off: 'The narrator says nothing. Sound effects still play.',
}
const scopeHint = computed(() => SCOPE_HINTS[settingsStore.narratorMode])

/** Any door chip: the chime is the same start-of-game cue the old CTA played. */
function goGame(path: string) {
  unlockAudio()
  playStartChime()
  router.push(path)
}

/* ── Cloud sync modal ── */
const showSyncModal = ref(false)
const syncEmail = ref('')
const syncSent = ref(false)
const syncError = ref('')
const syncLoading = ref(false)

async function sendMagicLink() {
  if (!syncEmail.value.trim()) return
  syncLoading.value = true
  syncError.value = ''
  const { error } = await authStore.sendMagicLink(syncEmail.value.trim())
  syncLoading.value = false
  if (error) { syncError.value = error } else { syncSent.value = true }
}
function openSyncModal() {
  syncSent.value = false
  syncError.value = ''
  syncEmail.value = ''
  showSyncModal.value = true
}

/* ── Coin flip ── */
const showCoinFlip = ref(false)
const coinAnimKey = ref(0)
const coinAnimClass = ref<'flip-to-heads' | 'flip-to-tails' | null>(null)
const coinFlipping = ref(false)
const coinResult = ref<'heads' | 'tails' | null>(null)
const headsFileInput = ref<HTMLInputElement | null>(null)
const tailsFileInput = ref<HTMLInputElement | null>(null)

const seriesMode = ref<'single' | 'bo3' | 'bo5'>('single')
const seriesHeads = ref(0)
const seriesTails = ref(0)

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
watch(seriesMode, () => resetSeries())

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

/* ── Narrator settings ── */
const showSettings = ref(false)
const availableVoices = ref<VoiceOption[]>([])

/**
 * Shown on Apple devices with a thin list.
 *
 * Not shown everywhere: on a machine that already offers a dozen voices the advice is noise,
 * and the Settings path it names is Apple's. The threshold counts real voices, so Default
 * does not make a device with none look like a device with one.
 */
const showVoiceHint = computed(() => {
  const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isApple && availableVoices.value.length > 0 && availableVoices.value.length - 1 < 6
})

const bullseyeSoundOptions = [
  { value: 'shotgun',      label: 'Shotgun',                      sub: 'Current — loud blast' },
  { value: 'buzzer',       label: 'Buzzer',                       sub: 'Game-show style alert' },
  { value: 'tts-bullseye', label: '"Bullseye!"',                  sub: 'Narrator says Bullseye' },
  { value: 'tts-oh-baby',  label: '"Oh babyyy"',                  sub: 'Narrator draws it out' },
  { value: 'tts-oh-yeah',  label: '"Oh yeah, right in the bull"', sub: 'Full phrase' },
]

function openSettings() {
  availableVoices.value = getAvailableVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    availableVoices.value = getAvailableVoices()
  }
  if (availableVoices.value.length === 0) {
    const poll = setInterval(() => {
      const v = getAvailableVoices()
      if (v.length > 0) { availableVoices.value = v; clearInterval(poll) }
    }, 200)
    setTimeout(() => clearInterval(poll), 5000)
  }
  showSettings.value = true
}

function testVoice() {
  speak('Testing. 1, 2, 3.')
}

function previewBullseyeSound(value: string) {
  settingsStore.setBullseyeSound(value)
  if (value === 'shotgun') playShotgun()
  else if (value === 'buzzer') playBuzzer()
  else if (value === 'tts-bullseye') speak('Bullseye!')
  else if (value === 'tts-oh-baby') speakOhBaby()
  else if (value === 'tts-oh-yeah') speak(settingsStore.cleanMode ? 'Oh yeah, right in the bull' : 'Oh yeah, right in the bull motherfucker')
}
</script>

<style scoped>
/* ── Shell ── */
.home {
  position: relative;
  width: 100%;
  /* MUST be a fixed height, not min-height. The app shell clips (overflow:hidden),
     so an auto-height .home just grows past the shell and gets cut off — its own
     overflow-y never engages because nothing constrains it. That's why the mode row
     (Yahtzee / LRC) was unreachable on a phone. */
  height: 100dvh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: none;
  background: #08080a url('/Dartbg.avif') center / cover no-repeat;
}
.home::-webkit-scrollbar { display: none; }

/* one screen, no scroll, on anything desktop-sized and tall enough for it */
@media (min-width: 1100px) and (min-height: 660px) {
  .home { overflow: hidden; }
  .home-inner { height: 100%; }
  .door-cols { flex: 1; min-height: 0; }
  /* Each column scrolls on its own, so a tall category cannot push the other off screen. */
  .door-col { max-height: 100%; overflow-y: auto; scrollbar-width: none; }
  .door-col::-webkit-scrollbar { display: none; }
}

.home-scrim {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(120% 90% at 50% 0%, rgba(8,8,12,0.42) 0%, rgba(8,8,12,0.78) 55%, rgba(6,6,9,0.94) 100%);
}
.bloom { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(90px); }
.bloom-pink   { width: 680px; height: 680px; top: -260px; left: -160px; background: rgba(255,45,120,0.24); animation: driftA 26s ease-in-out infinite; }
.bloom-blue   { width: 560px; height: 560px; bottom: -200px; right: -140px; background: rgba(0,212,255,0.18); animation: driftB 32s ease-in-out infinite; }
.bloom-purple { width: 460px; height: 460px; top: 52%; left: 48%; background: rgba(191,95,255,0.16); filter: blur(100px); animation: driftC 38s ease-in-out infinite; }

@keyframes driftA { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(60px,40px,0) scale(1.12); } }
@keyframes driftB { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-70px,-50px,0) scale(1.08); } }
@keyframes driftC { 0%,100% { transform: translate3d(-50%,-50%,0) scale(1); } 50% { transform: translate3d(-42%,-58%,0) scale(1.16); } }
@keyframes livePulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.82); } }

@media (prefers-reduced-motion: reduce) {
  .bloom { animation: none; }
  .live-dot, .sync-dot { animation: none; }
}

.drip-bar { position: absolute; top: 0; left: 0; right: 0; z-index: 3; }

/*
 * First on screen, and never squeezed.
 *
 * Being first in the template is not enough: the sections below carry negative `order`
 * values, so with the default `order: 0` this sorted last and landed 2189px down a 727px
 * screen — visible in the CSS sense, and completely useless. Lower than the lowest of them.
 */
.home-sync-warn { order: -3; flex-shrink: 0; }

.home-inner {
  position: relative;
  z-index: 2;
  max-width: 1220px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  /* everything breathes with the viewport height so the page fits one screen */
  gap: clamp(10px, 1.7dvh, 24px);
  padding: clamp(16px, 2.6dvh, 40px) 32px clamp(18px, 3dvh, 46px);
  padding-top: calc(clamp(16px, 2.6dvh, 40px) + env(safe-area-inset-top));
  padding-bottom: calc(clamp(18px, 3dvh, 46px) + env(safe-area-inset-bottom));
}

/* ── Glass surface ── */
.glass-panel {
  position: relative;
  overflow: hidden;
  /* Street: an opaque printed panel, not a pane of glass. Nothing to blur means nothing
     repaints behind it — the page costs nothing to leave on a stand all evening. */
  background: #101014;
  border: 2px solid rgba(255,255,255,0.16);
  box-shadow: 8px 8px 0 rgba(0,0,0,0.6);
}
/* halftone grain — what makes a flat dark panel read as printed stock rather than a hole */
.glass-panel::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(rgba(255,255,255,0.13) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  opacity: 0.5;
}
.glass-panel > * { position: relative; z-index: 1; }

/* Sync state rides the Sync button now — the bar that used to carry it held no tap
   target of its own, so it read as a dead row across the page. */
.sync-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--lime); box-shadow: 0 0 10px var(--lime); animation: livePulse 1.8s ease-in-out infinite; }
.sync-dot-off { background: rgba(255,255,255,0.4); box-shadow: none; animation: none; }
/* Signed in is not the same as syncing. The dot means "connected", and it stayed green while
   the roster was failing to save — the one thing on screen that looked like sync status,
   contradicting the warning above it. */
.sync-dot-bad { background: var(--gold, #f59e0b); box-shadow: 0 0 10px var(--gold, #f59e0b); }

.icon-btn {
  width: 44px; height: 44px;  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  background: rgba(255,255,255,0.07); border: 2px solid rgba(255,255,255,0.14);
  color: #fff; transition: background .18s, border-color .18s, transform .18s;
  position: relative; overflow: hidden;
}


/* ── Hero ── */
.hero-row { display: grid; grid-template-columns: 1fr; gap: clamp(12px, 1.6dvh, 24px); align-items: stretch; flex-shrink: 0; }
.hero {
  display: flex; flex-direction: column; justify-content: center;
  gap: clamp(8px, 1.1dvh, 16px);
  padding: clamp(20px, 3dvh, 40px) clamp(22px, 2.4vw, 36px); 
}
/* Pinned to the hero's top-right corner: in flow they sat above the wordmark and pushed the
   whole title block down. Lifted above .hero-glow so the bloom cannot wash them out. */
.hero-actions {
  position: absolute; z-index: 2;
  top: clamp(16px, 2.2dvh, 28px); right: clamp(18px, 2vw, 30px);
  display: flex; flex-wrap: nowrap; gap: 8px;
}
.hero-action {
  display: flex; align-items: center; gap: 7px;
  min-height: 44px; padding: 0 14px;  cursor: pointer; flex-shrink: 0;
  background: rgba(255,255,255,0.07); border: 2px solid rgba(255,255,255,0.16);
  color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 0.06em;
  transition: background .18s, border-color .18s, transform .18s;
  position: relative; overflow: hidden;
}

.hero-action:active { transform: scale(0.97); }

/* Tightened so all three hold one row on a phone. Wrapping to a second row pushed the game
   tiles down by the height of that row and cost two of them their place above the fold. */
@media (max-width: 767px) {
  .hero-actions { position: relative; top: auto; right: auto; flex-wrap: wrap; margin-bottom: 2px; gap: 6px; }
  .hero-action { padding: 0 10px; gap: 6px; font-size: 11px; letter-spacing: 0.02em; }
}

.hero-glow {
  position: absolute; top: -120px; right: -80px; width: 320px; height: 320px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,45,120,0.32), transparent 68%); pointer-events: none;
}
.hero-eyebrow {
  position: relative;
  font-size: 10px; font-weight: 800; letter-spacing: 0.28em; text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}
/* the app's name, at the size a name deserves — stacked so it can go big
   without running out of column */
.hero-wordmark {
  position: relative; margin: 0; display: flex; flex-direction: column;
  font-family: var(--font-display);
  font-size: clamp(46px, 7.4dvh, 104px);
  line-height: 0.82; letter-spacing: 0.02em;
  background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 44%, var(--blue) 88%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 44px rgba(255,45,120,0.35));
}
.wm-line { display: block; }
.wm-line:last-child { letter-spacing: 0.055em; }
.hero-strap { position: relative; display: flex; align-items: center; gap: 12px; }
.strap-rule { width: 34px; height: 2px; flex-shrink: 0; background: linear-gradient(90deg, var(--pink), var(--blue));  }
.strap-text {
  font-size: 11.5px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.8);
}
.hero-sub {
  position: relative; margin: 0;
  font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}
.cta {
  position: relative; margin-top: clamp(2px, 0.8dvh, 10px); width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: clamp(15px, 2.1dvh, 24px) 26px;  cursor: pointer; text-align: left;
  background: linear-gradient(120deg, rgba(255,45,120,0.9), rgba(191,95,255,0.82) 52%, rgba(0,212,255,0.85));
  border: 2px solid rgba(255,255,255,0.28);
  box-shadow: 8px 8px 0 rgba(0,0,0,0.6);
  transition: transform .16s, box-shadow .16s;
  overflow: hidden;
}

.cta-copy { display: flex; flex-direction: column; gap: 3px; }
.cta-title { font-size: 30px; letter-spacing: 0.09em; color: #fff; line-height: 1; }
.cta-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: rgba(255,255,255,0.78); text-transform: uppercase; }
.cta-arrow { font-size: 26px; color: #fff; flex-shrink: 0; }

.hero-side { display: flex; flex-direction: column; gap: clamp(10px, 1.3dvh, 16px); }

/* ── Resume ── */
.resume-card {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 20px 22px; 
  background: linear-gradient(150deg, rgba(255,45,120,0.2), rgba(255,45,120,0.06));
  border-color: rgba(255,45,120,0.45);
  box-shadow: 8px 8px 0 rgba(0,0,0,0.6);
}
.resume-info { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.resume-head { display: flex; align-items: center; gap: 8px; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; animation: livePulse 1.6s ease-in-out infinite; }
.live-dot-pink { background: var(--pink); box-shadow: 0 0 10px var(--pink); }
.resume-label { font-size: 16px; letter-spacing: 0.14em; color: var(--pink); }
.resume-sub { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.72); }
.resume-meta { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.resume-btn {
  flex-shrink: 0; padding: 14px 22px;  border: 2px solid rgba(255,255,255,0.28);
  cursor: pointer; font-size: 19px; letter-spacing: 0.1em; color: #fff;
  background: linear-gradient(135deg, var(--pink), var(--purple));
  box-shadow: 8px 8px 0 rgba(0,0,0,0.6);
  transition: transform .16s, box-shadow .16s;
  position: relative; overflow: hidden;
}


/* ── Counters ── */
.counter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; flex: 1; }
.counter {
  display: flex; flex-direction: column; justify-content: space-between; gap: clamp(6px, 1.1dvh, 14px);
  padding: clamp(14px, 1.9dvh, 22px);  min-height: 0;
}
.counter-glow {
  position: absolute; bottom: -70px; left: -40px; width: 180px; height: 180px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,215,0,0.28), transparent 68%); pointer-events: none;
}
.counter-label, .panel-label {
  position: relative;
  font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(255,255,255,0.42);
}
.counter-value { position: relative; font-size: clamp(34px, 5dvh, 52px); line-height: 0.8; color: #fff; }
.counter-value-gold { color: var(--gold); }
.counter-foot { position: relative; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: rgba(255,255,255,0.55); }

/* ── Mode tiles ── */
.mode-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; flex-shrink: 0; }
.mode {
  display: flex; align-items: center; gap: 16px;
  padding: clamp(13px, 1.9dvh, 22px) 22px;  cursor: pointer; text-align: left;
  transition: transform .16s, box-shadow .16s, border-color .16s;
}

.mode-glow { position: absolute; top: -60px; right: -40px; width: 180px; height: 180px; border-radius: 50%; pointer-events: none; }
.mode-icon {
  width: 48px; height: 48px; flex-shrink: 0; 
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.28);
}
.mode-copy { position: relative; display: flex; flex-direction: column; gap: 3px; }
.mode-title { font-size: 22px; letter-spacing: 0.1em; color: #fff; line-height: 1; }
.mode-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); text-transform: uppercase; }

.mode-blue { background: linear-gradient(150deg, rgba(0,212,255,0.16), rgba(255,255,255,0.03)); border-color: rgba(0,212,255,0.3); }
.mode-blue .mode-glow { background: radial-gradient(circle, rgba(0,212,255,0.3), transparent 68%); }
.mode-blue .mode-icon { background: rgba(0,212,255,0.16); border: 2px solid rgba(0,212,255,0.34); }


.mode-purple { background: linear-gradient(150deg, rgba(153,0,255,0.2), rgba(255,255,255,0.03)); border-color: rgba(191,95,255,0.32); }
.mode-purple .mode-glow { background: radial-gradient(circle, rgba(153,0,255,0.34), transparent 68%); }
.mode-purple .mode-icon { background: rgba(153,0,255,0.2); border: 2px solid rgba(191,95,255,0.36); }


.mode-green { background: linear-gradient(150deg, rgba(51,170,51,0.2), rgba(255,255,255,0.03)); border-color: rgba(85,204,102,0.32); }
.mode-green .mode-glow { background: radial-gradient(circle, rgba(51,170,51,0.32), transparent 68%); }
.mode-green .mode-icon { background: rgba(51,170,51,0.2); border: 2px solid rgba(85,204,102,0.36); }


.mode-gold { background: linear-gradient(150deg, rgba(255,200,87,0.18), rgba(255,255,255,0.03)); border-color: rgba(255,200,87,0.32); }
.mode-gold .mode-glow { background: radial-gradient(circle, rgba(255,200,87,0.3), transparent 68%); }
.mode-gold .mode-icon { background: rgba(255,200,87,0.18); border: 2px solid rgba(255,200,87,0.36); }


.mode-cyan { background: linear-gradient(150deg, rgba(95,208,255,0.18), rgba(255,255,255,0.03)); border-color: rgba(95,208,255,0.32); }
.mode-cyan .mode-glow { background: radial-gradient(circle, rgba(95,208,255,0.3), transparent 68%); }
.mode-cyan .mode-icon { background: rgba(95,208,255,0.18); border: 2px solid rgba(95,208,255,0.36); }


.mode-pink { background: linear-gradient(150deg, rgba(255,95,162,0.18), rgba(255,255,255,0.03)); border-color: rgba(255,95,162,0.32); }
.mode-pink .mode-glow { background: radial-gradient(circle, rgba(255,95,162,0.3), transparent 68%); }
.mode-pink .mode-icon { background: rgba(255,95,162,0.18); border: 2px solid rgba(255,95,162,0.36); }


.mode-indigo { background: linear-gradient(150deg, rgba(143,123,255,0.2), rgba(255,255,255,0.03)); border-color: rgba(143,123,255,0.32); }
.mode-indigo .mode-glow { background: radial-gradient(circle, rgba(143,123,255,0.32), transparent 68%); }
.mode-indigo .mode-icon { background: rgba(143,123,255,0.2); border: 2px solid rgba(143,123,255,0.36); }


/* Silver rather than a sixth colour — it reads as the odd one out, which it is. */
.mode-silver { background: linear-gradient(150deg, rgba(216,221,230,0.16), rgba(255,255,255,0.03)); border-color: rgba(216,221,230,0.3); }
.mode-silver .mode-glow { background: radial-gradient(circle, rgba(216,221,230,0.26), transparent 68%); }
.mode-silver .mode-icon { background: rgba(216,221,230,0.16); border: 2px solid rgba(216,221,230,0.34); }


/* ── Category doors ──
   Two independent columns rather than a two-column grid: a grid row stretches its shorter
   panel to the taller one's height, which left a visible hole under a two-game category. */
.door-cols { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(12px, 1.6dvh, 16px); align-items: start; }
.door-col { display: flex; flex-direction: column; gap: clamp(12px, 1.6dvh, 16px); min-width: 0; }
/*
 * Panels keep their own height instead of being squeezed by the column.
 *
 * Without this the one-screen rule below caps the column, flex shrinks the panels to fit,
 * and `.glass-panel { overflow: hidden }` quietly slices the chips inside them — on a
 * landscape iPad that cut SPADES and BLACKJACK through the middle of the word. Worse, the
 * clipping happened *inside* each panel, so the column's scrollHeight never grew and the
 * `overflow-y: auto` meant to rescue it never engaged: the games were unreachable, not
 * merely below the fold.
 */
.door-col > * { flex-shrink: 0; }
.door { display: flex; flex-direction: column; gap: clamp(11px, 1.4dvh, 15px); padding: clamp(16px, 2.1dvh, 22px);  }
.door-head { position: relative; display: flex; align-items: center; gap: 14px; }
.door-head .mode-icon { width: 44px; height: 44px;  }
.door-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.door-name { font-size: 25px; letter-spacing: 0.1em; line-height: 1; color: #fff; }
.door-count { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.door-blue { background: linear-gradient(150deg, rgba(0,212,255,0.15), rgba(255,255,255,0.03)); border-color: rgba(0,212,255,0.3); }
.door-blue .door-name { color: var(--blue); }
.door-blue .mode-glow { background: radial-gradient(circle, rgba(0,212,255,0.28), transparent 68%); }
.door-blue .mode-icon { background: rgba(0,212,255,0.16); border: 2px solid rgba(0,212,255,0.34); }
.door-purple { background: linear-gradient(150deg, rgba(153,0,255,0.18), rgba(255,255,255,0.03)); border-color: rgba(191,95,255,0.32); }
.door-purple .door-name { color: var(--purple); }
.door-purple .mode-glow { background: radial-gradient(circle, rgba(153,0,255,0.32), transparent 68%); }
.door-purple .mode-icon { background: rgba(153,0,255,0.2); border: 2px solid rgba(191,95,255,0.36); }
.door-indigo { background: linear-gradient(150deg, rgba(143,123,255,0.16), rgba(255,255,255,0.03)); border-color: rgba(143,123,255,0.32); }
.door-indigo .door-name { color: #8f7bff; }
.door-indigo .mode-glow { background: radial-gradient(circle, rgba(143,123,255,0.3), transparent 68%); }
.door-indigo .mode-icon { background: rgba(143,123,255,0.2); border: 2px solid rgba(143,123,255,0.36); }
.door-gold { background: linear-gradient(150deg, rgba(255,215,0,0.13), rgba(255,255,255,0.03)); border-color: rgba(255,215,0,0.3); }
.door-gold .door-name { color: var(--gold); }
.door-gold .mode-glow { background: radial-gradient(circle, rgba(255,215,0,0.26), transparent 68%); }
.door-gold .mode-icon { background: rgba(255,215,0,0.16); border: 2px solid rgba(255,215,0,0.34); }

/* A chip is still a .mode — same tap target contract as the tiles it replaces, and the
   smoke suite locates the coin flip that way — but compact enough to list inside a door. */
.chip-list { position: relative; display: flex; flex-direction: column; gap: 6px; }
.chip-grid { position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 6px; }
.chip {
  flex-direction: column; align-items: flex-start; gap: 4px;
  min-height: 56px; padding: 13px 15px; 
}

.chip-name { font-size: 19px; letter-spacing: 0.08em; color: #fff; line-height: 1.05; text-transform: uppercase; }
.chip-name-sm { font-size: 15px; letter-spacing: 0.1em; color: rgba(255,255,255,0.78); }
.chip-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.48); text-transform: uppercase; }
.chip-wide { grid-column: 1 / -1; }
.chip-blue { background: rgba(0,212,255,0.13); border: 2px solid rgba(0,212,255,0.26); }

.chip-purple { background: rgba(153,0,255,0.18); border: 2px solid rgba(191,95,255,0.3); }

.chip-green { background: rgba(51,170,51,0.18); border: 2px solid rgba(85,204,102,0.3); }

.chip-gold { background: rgba(255,200,87,0.16); border: 2px solid rgba(255,200,87,0.3); }

.chip-cyan { background: rgba(95,208,255,0.16); border: 2px solid rgba(95,208,255,0.3); }

.chip-pink { background: rgba(255,95,162,0.16); border: 2px solid rgba(255,95,162,0.3); }

.chip-indigo { background: rgba(143,123,255,0.18); border: 2px solid rgba(143,123,255,0.3); }

.chip-silver { background: rgba(216,221,230,0.14); border: 2px solid rgba(216,221,230,0.28); }

.chip-ghost { background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.12); }


/* ── Pick-a-category rule ── */
.pick-rule { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.pick-label { font-size: 17px; letter-spacing: 0.24em; color: rgba(255,255,255,0.48); }
.pick-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.18), transparent); }

/* ── Resume row ── */
.resume-row { display: flex; flex-direction: column; gap: clamp(10px, 1.3dvh, 16px); flex-shrink: 0; }

/* ── Stats door ── */
.stat-pair { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat-cell {
  display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; 
  background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.12);
}
.stat-cell-gold { border-color: rgba(255,215,0,0.22); }
.stat-value { font-size: clamp(26px, 3.6dvh, 34px); line-height: 0.9; color: #fff; }
.stat-value-gold { color: var(--gold); }
.mini-board { position: relative; display: flex; flex-direction: column; gap: 6px; }
.mini-row {
  display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 11px;
  padding: 9px 12px;  font-size: 13px; font-weight: 700;
  background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-left: 3px solid;
}
.door-links { position: relative; display: flex; align-items: center; justify-content: flex-end; gap: 14px; }

/* ── Leaderboard ── */
.board-row { display: grid; grid-template-columns: 1.6fr 1fr; gap: clamp(12px, 1.6dvh, 24px); align-items: start; }
.board { display: flex; flex-direction: column; gap: clamp(10px, 1.3dvh, 16px); padding: clamp(16px, 2.2dvh, 26px) 26px clamp(14px, 1.8dvh, 22px);  }
.board-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.board-links { display: flex; align-items: baseline; gap: 14px; flex-shrink: 0; }
.board-title {
  font-size: 24px; letter-spacing: 0.14em;
  background: linear-gradient(135deg, var(--gold), var(--orange));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.board-link {
  background: none; border: none; cursor: pointer;
  font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(255,255,255,0.5); transition: color .15s;
}

.board-empty { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.55); padding: 18px 2px 6px; }

.board-cols {
  display: grid; grid-template-columns: 36px 1fr 66px 66px 74px; padding: 0 14px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(255,255,255,0.35);
}
.board-rows { display: flex; flex-direction: column; gap: 8px; }
.board-row-item {
  display: grid; grid-template-columns: 36px 1fr 66px 66px 74px; align-items: center;
  padding: 13px 14px; 
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1); border-left: 3px solid rgba(255,255,255,0.2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
  font-size: 14px; font-weight: 700;
  transition: background .15s;
}

.board-row-lead {
  background: linear-gradient(100deg, rgba(255,215,0,0.14), rgba(255,255,255,0.04));
  border-color: rgba(255,215,0,0.3);
  border-left-color: var(--gold) !important;
}
.rank { font-size: 22px; color: rgba(255,255,255,0.45); }
.rank-gold { color: var(--gold); }
.board-player { display: flex; align-items: center; gap: 12px; min-width: 0; }
.board-name { color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.num { color: rgba(255,255,255,0.72); }
.num-bright { color: #fff; }
.num-gold { color: var(--gold); font-weight: 800; }
.tag {
  font-size: 9px; font-weight: 900; letter-spacing: 0.12em; padding: 3px 7px;  flex-shrink: 0;
}
.tag-pink { color: var(--pink); background: rgba(255,45,120,0.14); border: 2px solid rgba(255,45,120,0.35); }

/* ── Roster / narrator ── */
.board-side { display: flex; flex-direction: column; gap: clamp(10px, 1.3dvh, 16px); }
.roster { display: flex; flex-direction: column; gap: 12px; padding: clamp(15px, 2dvh, 24px);  }
.roster-stack { display: flex; align-items: center; }
.roster-more {
  width: 38px; height: 38px; margin-left: -12px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.2); outline: 2px solid rgba(10,10,12,0.92); outline-offset: -1px;
}
.roster-empty { margin: 0; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); }
.ghost-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; min-height: 48px; padding: 13px 18px;  cursor: pointer;
  font-size: 14px; font-weight: 800; letter-spacing: 0.06em; color: #fff;
  background: rgba(255,255,255,0.07); border: 2px solid rgba(255,255,255,0.2);
  transition: background .16s, border-color .16s, transform .16s;
  position: relative; overflow: hidden;
}


.narrator {
  display: flex; flex-direction: column; gap: clamp(9px, 1.2dvh, 14px); padding: clamp(15px, 2dvh, 24px);  cursor: pointer;
  transition: border-color .18s, transform .18s;
}

.narrator-glow {
  position: absolute; bottom: -90px; right: -60px; width: 220px; height: 220px; border-radius: 50%;
  background: radial-gradient(circle, rgba(0,212,255,0.24), transparent 68%); pointer-events: none;
}
.narrator-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.panel-hint { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: rgba(255,255,255,0.34); text-transform: uppercase; }
.narrator-main { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.narrator-id { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.narrator-name { font-size: 26px; letter-spacing: 0.08em; color: #fff; line-height: 1; }
.narrator-scope { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); }
.narrator-toggle { flex-shrink: 0; }

.narrator-stats { position: relative; display: flex; gap: 8px; }
.nstat {
  flex: 1; display: flex; flex-direction: column; gap: 2px;
  padding: 10px 12px; 
  background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1);
}
.nstat-label { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.nstat-value { font-size: 19px; }
.nstat-blue { color: var(--blue); }
.nstat-purple { color: var(--purple); }
.nstat-lime { color: var(--lime); }
.nstat-dim { color: rgba(255,255,255,0.45); }

/* ── Responsive ── */
@media (max-width: 1099px) {
  /* the page scrolls here, so space by fixed px rather than viewport height */
  .home-inner { gap: 18px; padding: 28px 24px 44px; }
  .home-inner { padding-top: calc(28px + env(safe-area-inset-top)); }
  .home-inner { padding-bottom: calc(44px + env(safe-area-inset-bottom)); }
  .hero-row { grid-template-columns: 1fr; }
  .hero-wordmark { font-size: clamp(52px, 11vw, 92px); }

  /* The wordmark leads the page, then the categories immediately after. The tiles used to
     sit above the branding entirely, because stacked under the hero the first one started at
     y=775 on an 812px phone. The doors are compact enough to stay second: the fold now costs
     part of a category rather than burying every game under a resume card. */
  .hero-row { order: -2; }
  .pick-rule { order: -1; }
  .door-cols { order: -1; grid-template-columns: 1fr; gap: 12px; }
  .resume-row { order: 1; }
}
@media (max-width: 767px) {
  .home-inner { padding: 20px 16px 40px; gap: 14px; }
  .home-inner { padding-top: calc(20px + env(safe-area-inset-top)); }
  .home-inner { padding-bottom: calc(40px + env(safe-area-inset-bottom)); }
  .hero { padding: 26px 22px;  }
  .hero-wordmark { font-size: clamp(46px, 15vw, 76px); }
  .strap-text { font-size: 10px; letter-spacing: 0.14em; }
  .stat-pair { grid-template-columns: 1fr; }
  .resume-card { flex-direction: column; align-items: stretch; }
  .resume-btn { width: 100%; }
  .board { padding: 20px 18px; }
  .board-cols, .board-row-item { grid-template-columns: 28px 1fr 50px 44px 56px; font-size: 13px; }
  .board-cols { font-size: 9px; letter-spacing: 0.1em; }

  /* Two to a row leaves roughly 165px per tile, so the icon-beside-text layout has about
     55px for a title like SHIP CAPTAIN CREW. Stack it instead, which is also what lets the
     list keep growing as games are added. */
  .mode { flex-direction: column; align-items: flex-start; gap: 8px; padding: 14px 13px;  }
  .mode-icon { width: 36px; height: 36px;  }
  .mode-icon svg { width: 20px; height: 20px; }
  .mode-title { font-size: 15px; letter-spacing: 0.04em; line-height: 1.05; }
  .mode-sub { font-size: 9px; letter-spacing: 0.04em; line-height: 1.35; text-transform: none; }
  .mode-glow { top: -70px; right: -50px; width: 140px; height: 140px; }
}

/* ── Narrator scope segmented control ── */
.scope-seg { display: flex; gap: 8px; }
.scope-btn {
  flex: 1; padding: 11px 0;  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 700;
  transition: all .15s; position: relative; overflow: hidden;
}

.scope-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.12); }
.scope-hint { color: rgba(255,255,255,0.5); font-size: 13px; }

/* ── Settings modal (unchanged from the shipped panel) ── */
.settings-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(6,6,10,0.68); backdrop-filter: blur(14px) saturate(120%); -webkit-backdrop-filter: blur(14px) saturate(120%);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.settings-panel {
  background: linear-gradient(155deg, rgba(28,28,34,0.92), rgba(16,16,20,0.94));
  border: 2px solid rgba(255,255,255,0.16); 
  padding: 28px; width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 24px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
  box-shadow: 8px 8px 0 rgba(0,0,0,0.6);
}
.settings-header { display: flex; align-items: center; justify-content: space-between; }
.settings-title { font-size: 20px; letter-spacing: 0.15em; color: var(--pink); }
.settings-close { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 20px; cursor: pointer; padding: 4px 8px; }


.settings-section { display: flex; flex-direction: column; gap: 10px; }
.settings-label { font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #fff; }
.settings-muted { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5; }

.voice-list { display: flex; flex-direction: column; gap: 6px; }
.voice-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px;  font-size: 16px; font-weight: 700; cursor: pointer; text-align: left;
  background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.9);
  transition: all 0.15s; width: 100%;
}
.voice-btn.active { background: rgba(255,45,120,0.2); border-color: var(--pink); color: #fff; box-shadow: 0 0 12px rgba(255,45,120,0.25); }

.voice-btn-label { font-weight: 700; }
.voice-btn-sub { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); flex-shrink: 0; }
.voice-hint { margin: 10px 0 0; font-size: 13px; line-height: 1.55; }
.voice-hint strong { color: var(--blue); font-weight: 700; }

.test-btn { align-self: flex-end; }

.slider-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 14px; 
  background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.1);
}
.slider-label { font-size: 15px; font-weight: 700; color: #fff; width: 42px; flex-shrink: 0; }
.slider-val { font-size: 15px; font-weight: 700; color: var(--pink); width: 50px; text-align: right; flex-shrink: 0; font-family: var(--font-display); }
.voice-slider {
  flex: 1; -webkit-appearance: none; appearance: none;
  height: 4px;  outline: none; cursor: pointer;
  background: linear-gradient(to right, var(--pink), rgba(255,255,255,0.16));
}
.voice-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; border: 2px solid var(--pink);
  box-shadow: 0 0 8px rgba(255,45,120,0.5); cursor: pointer;
}
.voice-slider::-moz-range-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; border: 2px solid var(--pink);
  box-shadow: 0 0 8px rgba(255,45,120,0.5); cursor: pointer;
}

.toggle-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px;  cursor: pointer;
  background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.1);
  transition: background 0.15s; user-select: none;
}

.toggle-track {
  width: 44px; height: 24px;  flex-shrink: 0;
  background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.2);
  position: relative; transition: background 0.2s;
}
.toggle-track.active { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 14px rgba(255,45,120,0.5); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform 0.2s; box-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}
.toggle-track.active .toggle-thumb { transform: translateX(20px); }
.toggle-info { display: flex; flex-direction: column; gap: 2px; }
.toggle-title { font-size: 16px; font-weight: 700; color: #fff; }
.toggle-sub { font-size: 13px; color: rgba(255,255,255,0.65); line-height: 1.4; }


.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Coin flip (unchanged) ── */
.coin-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; padding-top: max(24px, env(safe-area-inset-top)); padding-bottom: max(24px, env(safe-area-inset-bottom));
}
.coin-modal {
  display: flex; flex-direction: column; align-items: center;
  gap: 28px; width: 100%; max-width: 340px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto; overflow-x: hidden; scrollbar-width: none;
  /* Touch scrolling, and kept to itself: without overscroll-behavior a drag inside this panel chains straight through to the page behind it, so on an iPad the modal stayed put and the page moved instead. */
  -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
}
.coin-modal::-webkit-scrollbar { display: none; }
.coin-modal-header { display: flex; align-items: center; justify-content: center; width: 100%; position: relative; }
.coin-modal-title { font-size: 38px; letter-spacing: 0.2em; color: var(--gold); font-weight: 900; }
.coin-close-btn {
  position: absolute; right: 0; background: none; border: none;
  color: rgba(255,255,255,0.45); font-size: 22px; cursor: pointer; padding: 4px 8px; line-height: 1;
}

.coin-arena { display: flex; flex-direction: column; align-items: center; gap: 18px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.coin-perspective { perspective: 700px; }
.coin { width: 160px; height: 160px; position: relative; transform-style: preserve-3d; }
.coin.flip-to-heads { animation: coin-flip-heads 2.2s cubic-bezier(0.12, 0.5, 0.22, 1) forwards; }
.coin.flip-to-tails { animation: coin-flip-tails 2.2s cubic-bezier(0.12, 0.5, 0.22, 1) forwards; }
@keyframes coin-flip-heads { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(1440deg); } }
@keyframes coin-flip-tails { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(1260deg); } }
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
.coin-letter { font-family: var(--font-display); font-size: 44px; font-weight: 900; color: #7a4800; text-shadow: 0 1px 3px rgba(255,220,80,0.7); letter-spacing: 0.04em; }
.coin-tap-hint { font-size: 12px; color: rgba(255,255,255,0.38); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; min-height: 18px; }
.coin-result { display: flex; align-items: center; justify-content: center; }
.coin-result-text { font-size: 52px; letter-spacing: 0.12em; font-weight: 900; }
.coin-result-text.heads { color: var(--gold); filter: drop-shadow(0 0 20px rgba(255,215,0,0.7)); }
.coin-result-text.tails { color: #c8d4e8; filter: drop-shadow(0 0 20px rgba(180,200,240,0.6)); }
.coin-customize {
  display: flex; align-items: center; gap: 20px; padding: 14px 20px;
  background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08);
   width: 100%;
}
.coin-cust-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.coin-cust-label { font-size: 10px; font-weight: 800; letter-spacing: 0.15em; color: rgba(255,255,255,0.38); text-transform: uppercase; }
.coin-cust-btn {
  width: 64px; height: 64px; border-radius: 50%;
  border: 2px dashed rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  overflow: hidden; transition: border-color 0.15s, background 0.15s;
}

.cust-preview { width: 100%; height: 100%; object-fit: cover; }
.cust-placeholder { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 700; }
.coin-cust-clear { background: none; border: none; color: rgba(255,80,80,0.65); font-size: 13px; cursor: pointer; padding: 2px 6px; }

.coin-cust-divider { width: 1px; height: 60px; background: rgba(255,255,255,0.08); flex-shrink: 0; }
.coin-fade-enter-active, .coin-fade-leave-active { transition: opacity 0.22s; }
.coin-fade-enter-from, .coin-fade-leave-to { opacity: 0; }
.result-slide-enter-active { transition: opacity 0.3s, transform 0.3s; }
.result-slide-enter-from { opacity: 0; transform: translateY(14px) scale(0.75); }

.coin-series-modes { display: flex; gap: 8px; justify-content: center; width: 100%; }
.coin-mode-btn {
  flex: 1; padding: 7px 0; 
  border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
}

.coin-mode-btn.active { border-color: var(--gold); color: var(--gold); background: rgba(255,215,0,0.1); }

.coin-series-board { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; padding: 10px 0; }
.series-side {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  flex: 1; padding: 10px; 
  border: 2px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  transition: all 0.3s;
}
.series-winner-side { border-color: var(--gold); background: rgba(255,215,0,0.12); box-shadow: 0 0 16px rgba(255,215,0,0.25); }
.series-label { font-size: 10px; font-weight: 900; letter-spacing: 0.12em; color: rgba(255,255,255,0.5); }
.series-winner-side .series-label { color: var(--gold); }
.series-count { font-size: 36px; font-weight: 900; font-family: var(--font-display); color: #fff; line-height: 1; }
.series-winner-side .series-count { color: var(--gold); }
.series-pips { display: flex; gap: 5px; margin-top: 2px; }
.series-pip { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: background 0.2s; }
.series-pip.pip-filled { background: var(--gold); box-shadow: 0 0 6px rgba(255,215,0,0.6); }
.series-divider { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.3); }
.coin-series-winner { font-size: 28px; letter-spacing: 0.1em; color: var(--gold); filter: drop-shadow(0 0 12px rgba(255,215,0,0.6)); }
/*
 * Nothing in the modal gets squeezed; it scrolls instead.
 *
 * The reset button was rendering 30px tall for 52px of content, with its own overflow
 * clipping the second line — so "↺ Reset Series" arrived cut in half. It is a flex item in a
 * column whose contents are taller than it, and the automatic minimum size that normally
 * stops a flex item shrinking below its content only applies while `overflow` is `visible`.
 * This button sets `overflow: hidden` for the ripple, which opts it out of that protection —
 * which is why it alone was affected and every sibling was fine.
 */
.coin-modal > * { flex-shrink: 0; }

.coin-reset-btn {
  width: 100%; padding: 10px; 
  border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
}


.coin-question-section { width: 100%; display: flex; flex-direction: column; align-items: center; }
.coin-question-toggle {
  background: none; border: 1px dashed rgba(255,255,255,0.2); 
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
  letter-spacing: 0.04em; color: var(--gold); text-align: center;
  filter: drop-shadow(0 0 8px rgba(255,215,0,0.4));
}
.coin-question-clear { background: none; border: none; color: rgba(255,215,0,0.5); font-size: 14px; cursor: pointer; padding: 2px 4px; flex-shrink: 0; line-height: 1; }

.coin-question-input-row { display: flex; align-items: center; gap: 6px; width: 100%; }
.coin-question-input {
  flex: 1; background: rgba(255,255,255,0.06); border: 2px solid rgba(255,215,0,0.3);
   color: #fff; font-size: 14px; font-weight: 600;
  padding: 9px 12px; outline: none; font-family: inherit;
}
.coin-question-input::placeholder { color: rgba(255,255,255,0.3); }
.coin-question-input:focus { border-color: rgba(255,215,0,0.6); }
.coin-q-confirm, .coin-q-cancel {
  flex-shrink: 0; width: 34px; height: 34px;  border: none;
  font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s;
}
.coin-q-confirm { background: rgba(255,215,0,0.15); color: var(--gold); }

.coin-q-cancel { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.45); }


/* ── Cloud sync ── */
.sync-panel { max-width: 420px; }
.sync-signed-in,
.sync-sign-in { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0 8px; text-align: center; }
.sync-status-icon { display: flex; align-items: center; justify-content: center; }
.sync-email { font-size: 14px; font-weight: 700; color: var(--pink); }
.sync-desc { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.6; max-width: 320px; }
.sync-email-input {
  width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.18);
   color: #fff; font-size: 15px; outline: none; text-align: center;
}
.sync-email-input:focus { border-color: var(--pink); }
.sync-error { font-size: 12px; color: #ff5555; }
.sync-sent { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; padding: 8px 0; }
.w-full { width: 100%; }

@media (min-width: 768px) and (max-width: 1099px) {
  .coin-modal { max-width: 480px; }
  .coin-modal-title { font-size: clamp(36px, 5vw, 56px); letter-spacing: 0.25em; }
  .coin-close-btn { font-size: 28px; padding: 6px 12px; }
  .coin-series-modes { gap: 12px; }
  .coin-mode-btn { font-size: 17px; padding: 11px 0;  }
  .coin-arena { gap: 22px; }
  .coin-perspective { perspective: 1000px; }
  .coin { width: 220px; height: 220px; }
  .coin-letter { font-size: 68px; }
  .coin-tap-hint { font-size: 15px; min-height: 22px; }
  .coin-result-text { font-size: 72px; }
  .coin-series-winner { font-size: 42px; }
  .coin-series-board { gap: 20px; }
  .series-side { padding: 14px 20px;  }
  .series-count { font-size: 52px; }
  .series-pip { width: 13px; height: 13px; }
  .coin-reset-btn { font-size: 17px; padding: 13px; }
  .coin-customize { padding: 16px 24px; }
  .coin-cust-btn { width: 80px; height: 80px; }
}

/* ══════════════════════════════════════════════════════════════════════
   STREET TREATMENT
   Flat printed panels instead of glass. The rules above were swept —
   blur removed, corners squared, hairlines doubled, glow shadows swapped
   for hard offsets. This section adds the things a sweep cannot infer:
   inked display type, taped labels, and the poster-block buttons.
   ══════════════════════════════════════════════════════════════════════ */

/* Bebas carries the whole look, so it gets the printed drop */
.display { text-shadow: 2px 2px 0 rgba(0,0,0,0.55); }
.chip-name, .chip-sub { text-shadow: 1px 1px 0 rgba(0,0,0,0.5); }
.door-name { font-size: 29px; letter-spacing: 0.09em; }

/* PICK A CATEGORY becomes a strip of tape over a dashed rule */
.pick-label {
  transform: rotate(-1.2deg);
  padding: 4px 12px 3px;
  background: #fff;
  color: #101014;
  font-size: 19px;
  letter-spacing: 0.16em;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
  text-shadow: none;
}
.pick-line {
  height: 3px;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0 8px, transparent 8px 14px);
}

/* Hero actions as solid blocks. They are the two things you reach for before a
   game, so they stop being translucent chrome and start being buttons. */
.hero-action {
  min-height: 48px;
  color: #101014;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 2px solid transparent;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
  transition: transform .16s, box-shadow .16s;
}
.hero-actions .hero-action:first-child { background: #00d4ff; }
.hero-actions .hero-action:last-child { background: #ff2d78; }

/* the dot sits on a bright field now, so it needs its own contrast */
.hero-action .sync-dot { box-shadow: 0 0 0 2px rgba(16,16,20,0.5); }

/* RESUME is the loudest control on the page when a game is live */
.resume-btn {
  background: #ff2d78;
  border: 2px solid #ff2d78;
  color: #fff;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.55);
}


/* Add player: lime outline block, filling on hover */
.ghost-btn {
  color: #aaff00;
  background: rgba(170,255,0,0.1);
  border: 2px solid rgba(170,255,0,0.5);
  box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
  font-family: var(--font-display);
  font-size: 17px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}


/* Category icon tiles: square colour blocks, not rounded glass */
.mode-icon { border: 2px solid rgba(255,255,255,0.22); }

/* Leaderboard rows hand-stacked rather than aligned to a grid, with the
   percentage big enough to read from the throw line */
.mini-row {
  grid-template-columns: 30px 1fr auto;
  gap: 12px;
  padding: 11px 13px;
  border: 2px solid #2a2a34;
  border-left-width: 2px;
}
.mini-row:nth-child(1) { transform: rotate(-0.5deg); }
.mini-row:nth-child(2) { transform: rotate(0.4deg); }
.mini-row:nth-child(3) { transform: rotate(-0.3deg); }
.board-row-lead { background: rgba(255,215,0,0.1); border-color: #ffd700; }
.rank { font-family: var(--font-display); font-size: 30px; line-height: 1; }
.board-name { font-family: var(--font-display); font-size: 22px; letter-spacing: 0.05em; }
.num {
  font-family: var(--font-display);
  font-size: 31px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.stat-value { font-variant-numeric: tabular-nums; }

/* Square switch to match the square everything else */
.toggle-thumb { border-radius: 0; box-shadow: 1px 1px 0 rgba(0,0,0,0.5); }

/* Modals are the same printed stock as the panels */
.settings-panel, .coin-modal {
  background: #101014;
  border: 2px solid rgba(255,255,255,0.2);
  box-shadow: 8px 8px 0 rgba(0,0,0,0.6);
}
/* No tape on modal titles. These headers are fixed-size and a taped strip — padding or
   letter-spacing — overflows them on the narrow and mobile layouts, which the coin-flip
   "nothing is squeezed" test correctly rejects. The titles keep the inked Bebas from
   .display, which costs no box space at all. */


@media (hover: hover) and (pointer: fine) {
  .icon-btn:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.3); transform: translateY(-1px); }
  .hero-action:hover { background: rgba(255,255,255,0.13); border-color: rgba(255,255,255,0.3); }
  .cta:hover { transform: translateY(-2px); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .resume-btn:hover { transform: translateY(-2px); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .mode:hover { transform: translateY(-3px); }
  .mode-blue:hover { border-color: rgba(0,212,255,0.6); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .mode-purple:hover { border-color: rgba(191,95,255,0.62); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .mode-green:hover { border-color: rgba(85,204,102,0.62); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .mode-gold:hover { border-color: rgba(255,200,87,0.62); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .mode-cyan:hover { border-color: rgba(95,208,255,0.62); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .mode-pink:hover { border-color: rgba(255,95,162,0.62); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .mode-indigo:hover { border-color: rgba(143,123,255,0.62); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .mode-silver:hover { border-color: rgba(216,221,230,0.6); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .chip:hover { transform: translateY(-2px); box-shadow: 8px 8px 0 rgba(0,0,0,0.6); }
  .chip-blue:hover { border-color: rgba(0,212,255,0.62); }
  .chip-purple:hover { border-color: rgba(191,95,255,0.62); }
  .chip-green:hover { border-color: rgba(85,204,102,0.62); }
  .chip-gold:hover { border-color: rgba(255,200,87,0.62); }
  .chip-cyan:hover { border-color: rgba(95,208,255,0.62); }
  .chip-pink:hover { border-color: rgba(255,95,162,0.62); }
  .chip-indigo:hover { border-color: rgba(143,123,255,0.62); }
  .chip-silver:hover { border-color: rgba(216,221,230,0.6); }
  .chip-ghost:hover { border-color: rgba(255,255,255,0.34); }
  .board-link:hover { color: var(--blue); }
  .board-row-item:hover { background: rgba(255,255,255,0.09); }
  .ghost-btn:hover { background: rgba(255,45,120,0.16); border-color: rgba(255,45,120,0.55); transform: translateY(-1px); }
  .narrator:hover { border-color: rgba(0,212,255,0.5); transform: translateY(-2px); }
  .scope-btn:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
  .settings-close:hover { color: #fff; }
  .voice-btn:hover:not(.active) { background: rgba(255,255,255,0.1); color: #fff; }
  .toggle-row:hover { background: rgba(255,255,255,0.08); }
  .coin-close-btn:hover { color: #fff; }
  .coin-cust-btn:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1); }
  .coin-cust-clear:hover { color: #ff4444; }
  .coin-mode-btn:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
  .coin-reset-btn:hover { border-color: var(--gold); color: var(--gold); background: rgba(255,215,0,0.1); }
  .coin-question-toggle:hover { border-color: rgba(255,215,0,0.4); color: rgba(255,215,0,0.6); }
  .coin-question-clear:hover { color: #ff5555; }
  .coin-q-confirm:hover { background: rgba(255,215,0,0.3); }
  .coin-q-cancel:hover { color: #ff5555; }
  .hero-action:hover { transform: translateY(-2px); box-shadow: 5px 5px 0 rgba(0,0,0,0.55); border-color: #fff; }
  .resume-btn:hover { background: #fff; border-color: #fff; color: #101014; }
  .ghost-btn:hover { color: #101014; background: #aaff00; border-color: #aaff00; transform: translateY(-2px); }
}
</style>

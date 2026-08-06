<template>
  <div class="home">
    <div class="drip-bar" />

    <!-- ambient colour blooms, sit above the dartboard photo so the glass has something to refract -->
    <div class="home-scrim" />
    <div class="bloom bloom-pink" />
    <div class="bloom bloom-blue" />
    <div class="bloom bloom-purple" />

    <div class="home-inner">
      <!-- ── Top bar ─────────────────────────────────────── -->
      <header class="glass-panel topbar">
        <div class="topbar-brand">
          <div class="topbar-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="4.6" />
              <circle cx="12" cy="12" r="1.2" fill="#fff" stroke="none" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            </svg>
          </div>
          <div class="topbar-names">
            <span class="topbar-title display">PEEZY DOES IT</span>
            <span class="topbar-kicker">EST. TONIGHT</span>
          </div>
        </div>

        <div class="topbar-actions">
          <div class="sync-chip" :class="{ 'sync-chip-off': !authStore.user }">
            <span class="sync-dot" />
            <span>{{ authStore.user ? 'Synced' : 'Local only' }}</span>
          </div>
          <button v-ripple class="icon-btn" aria-label="Flip a coin" title="Flip a coin" @click="showCoinFlip = true">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <ellipse cx="12" cy="12" rx="6" ry="9" /><path d="M12 3v18" /><path d="M18 12h3M3 12h3" />
            </svg>
          </button>
          <button v-ripple class="icon-btn" aria-label="Cloud sync" title="Cloud sync" @click="openSyncModal">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 15.5a3.5 3.5 0 0 0-2.6-5.8A5.5 5.5 0 0 0 6.8 10 3.6 3.6 0 0 0 7 17h11" />
              <path d="M12 20v-6M9.5 16.5 12 14l2.5 2.5" />
            </svg>
          </button>
          <button v-ripple class="icon-btn" aria-label="Narrator settings" title="Narrator settings" @click="openSettings">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
              <circle cx="9" cy="7" r="2.2" fill="rgba(10,10,12,0.9)" />
              <circle cx="15" cy="12" r="2.2" fill="rgba(10,10,12,0.9)" />
              <circle cx="7.5" cy="17" r="2.2" fill="rgba(10,10,12,0.9)" />
            </svg>
          </button>
        </div>
      </header>

      <!-- ── Hero + resume / counters ─────────────────────── -->
      <section class="hero-row">
        <div class="glass-panel hero">
          <div class="hero-glow" />
          <h1 class="hero-title">DARTS</h1>
          <p class="hero-sub">Who's up. Who's down. Who's next.</p>
          <button v-ripple class="cta" @click="startNewGame">
            <span class="cta-copy">
              <span class="cta-title display">START NEW GAME</span>
              <span class="cta-sub">{{ modeSummary }}</span>
            </span>
            <span class="cta-arrow">→</span>
          </button>
        </div>

        <div class="hero-side">
          <div v-if="hasActiveGame" class="glass-panel resume-card">
            <div class="resume-info">
              <div class="resume-head">
                <span class="live-dot live-dot-pink" />
                <span class="resume-label display">GAME IN PROGRESS</span>
              </div>
              <span class="resume-sub">
                {{ GAME_TYPE_LABELS[gameStore.game!.gameType] }} ·
                {{ gameStore.game!.players.length }} players ·
                Round {{ gameStore.game!.round }}
              </span>
              <span v-if="currentPlayerName" class="resume-meta">{{ currentPlayerName }} is up</span>
            </div>
            <button v-ripple class="resume-btn display" @click="router.push('/game')">RESUME →</button>
          </div>

          <div class="counter-row">
            <div class="glass-panel counter">
              <span class="counter-label">Games logged</span>
              <span class="counter-value display">{{ totalGames }}</span>
              <span class="counter-foot">Across {{ playersStore.players.length }} players</span>
            </div>
            <div class="glass-panel counter">
              <div class="counter-glow" />
              <span class="counter-label">Best win rate</span>
              <span class="counter-value counter-value-gold display">
                {{ bestRate ? bestRate.pct + '%' : '—' }}
              </span>
              <span class="counter-foot">{{ bestRate ? bestRate.name : 'Needs 3+ games' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Game modes ───────────────────────────────────── -->
      <section class="mode-row">
        <button v-ripple class="glass-panel mode mode-blue" @click="router.push('/new-game')">
          <div class="mode-glow" />
          <div class="mode-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round">
              <path d="M5.5 6.5h13M5.5 12h13M5.5 17.5h13" />
              <path d="M8 4.2 11 8.8M16 4.2 13 8.8M8 9.7l3 4.6M16 9.7l-3 4.6M8 15.2l3 4.6M16 15.2l-3 4.6" />
            </svg>
          </div>
          <div class="mode-copy">
            <span class="mode-title display">DARTS</span>
            <span class="mode-sub">Cricket · 501 · Killer · 9 more</span>
          </div>
        </button>

        <button v-ripple class="glass-panel mode mode-purple" @click="router.push('/yahtzee/setup')">
          <div class="mode-glow" />
          <div class="mode-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#bf5fff" stroke-width="1.8" stroke-linejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="4" />
              <circle cx="9" cy="9" r="1.4" fill="#bf5fff" stroke="none" />
              <circle cx="15" cy="15" r="1.4" fill="#bf5fff" stroke="none" />
              <circle cx="12" cy="12" r="1.4" fill="#bf5fff" stroke="none" />
            </svg>
          </div>
          <div class="mode-copy">
            <span class="mode-title display">YAHTZEE</span>
            <span class="mode-sub">Dice night · 2–8 players</span>
          </div>
        </button>

        <button v-ripple class="glass-panel mode mode-green" @click="router.push('/lrc/setup')">
          <div class="mode-glow" />
          <div class="mode-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7ee68a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 8 5.5 12 9 16" /><path d="M15 8l3.5 4L15 16" />
              <circle cx="12" cy="12" r="2" fill="#7ee68a" stroke="none" />
            </svg>
          </div>
          <div class="mode-copy">
            <span class="mode-title display">LEFT RIGHT CENTER</span>
            <span class="mode-sub">Fast · pure luck</span>
          </div>
        </button>
      </section>

      <!-- ── Leaderboard + roster / narrator ──────────────── -->
      <section class="board-row">
        <div class="glass-panel board">
          <div class="board-head">
            <span class="board-title display">LEADERBOARD</span>
            <button class="board-link" @click="router.push('/leaderboard')">Full table →</button>
          </div>

          <div v-if="ranked.length === 0" class="board-empty">
            No games logged yet. Add a player and the table fills itself in.
          </div>

          <template v-else>
            <div class="board-cols">
              <span>#</span><span>Player</span><span>Games</span><span>Wins</span><span>Win %</span>
            </div>
            <div class="board-rows">
              <div
                v-for="(p, i) in ranked" :key="p.id"
                class="board-row-item"
                :class="{ 'board-row-lead': i === 0 }"
                :style="{ borderLeftColor: p.color || 'rgba(255,255,255,0.2)' }"
              >
                <span class="rank display" :class="{ 'rank-gold': i === 0 }">{{ i + 1 }}</span>
                <div class="board-player">
                  <PlayerAvatar :player="p" :size="34" />
                  <span class="board-name">{{ p.name }}</span>
                  <span v-if="isPlaying(p.id)" class="tag tag-pink">PLAYING</span>
                </div>
                <span class="num">{{ p.gamesPlayed }}</span>
                <span class="num num-bright">{{ p.wins }}</span>
                <span class="num" :class="i === 0 ? 'num-gold' : 'num-bright'">{{ winPct(p) }}%</span>
              </div>
            </div>
          </template>
        </div>

        <div class="board-side">
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

          <div class="glass-panel narrator" @click="openSettings">
            <div class="narrator-glow" />
            <div class="narrator-head">
              <span class="panel-label">Narrator</span>
              <span class="panel-hint">Click to change</span>
            </div>
            <div class="narrator-main">
              <div class="narrator-id">
                <span class="narrator-name display">{{ personalityLabel }}</span>
                <span class="narrator-scope">{{ settingsStore.quietNarrator ? 'Names only' : 'Full commentary' }}</span>
              </div>
              <div
                class="toggle-track narrator-toggle"
                :class="{ active: !settingsStore.quietNarrator }"
                @click.stop="settingsStore.setQuietNarrator(!settingsStore.quietNarrator)"
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
        </div>
      </section>
    </div>

    <!-- ── Narrator settings modal ───────────────────────── -->
    <transition name="fade">
      <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
        <div class="settings-panel">
          <div class="settings-header">
            <span class="settings-title display">NARRATOR SETTINGS</span>
            <button class="settings-close" aria-label="Close settings" @click="showSettings = false">✕</button>
          </div>

          <!-- scope gates whether personality matters, so it comes first -->
          <div class="settings-section">
            <div class="settings-label">Scope</div>
            <div class="scope-seg">
              <button
                v-ripple class="scope-btn" :class="{ active: !settingsStore.quietNarrator }"
                @click="settingsStore.setQuietNarrator(false)"
              >Full commentary</button>
              <button
                v-ripple class="scope-btn" :class="{ active: settingsStore.quietNarrator }"
                @click="settingsStore.setQuietNarrator(true)"
              >Names only</button>
            </div>
            <div class="settings-muted">
              {{ settingsStore.quietNarrator
                ? 'Only turn announcements play — no scores, no trash talk, no checkout calls.'
                : 'Full play-by-play in the chosen personality.' }}
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
          </div>

          <div class="settings-section">
            <div class="settings-label">Speed &amp; Pitch</div>
            <div class="slider-row">
              <span class="slider-label">Speed</span>
              <input type="range" class="voice-slider" min="0.1" max="1.2" step="0.05"
                aria-label="Narrator speed"
                :style="{ '--val': speedFill }"
                :value="settingsStore.voiceRate"
                @input="settingsStore.setVoiceRate(+($event.target as HTMLInputElement).value)"
              />
              <span class="slider-val">{{ settingsStore.voiceRate.toFixed(2) }}x</span>
            </div>
            <div class="slider-row">
              <span class="slider-label">Pitch</span>
              <input type="range" class="voice-slider" min="0.1" max="3.0" step="0.05"
                aria-label="Narrator pitch"
                :style="{ '--val': pitchFill }"
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

            <div v-if="settingsStore.quietNarrator" class="settings-muted scope-hint">
              Personality only shapes commentary — it has no effect while “Names only” is on.
            </div>
            <!-- Not gated on cleanMode. cleanMode defaults on, so `v-if="!cleanMode"` hid all
                 six personalities on every fresh install, and the toggle's copy ("Removes
                 profanity from all narrator lines") gave no hint that it also removed the
                 picker. Personality genuinely applies in clean mode — BetweenTurnsPage has
                 clean variants per personality and the round-one walk-up line is not gated
                 at all. Dimming for "Names only" above is different: there, personality
                 really does have no effect, and the hint says so. -->
            <div class="personality-label">Personality</div>
            <div class="personality-grid" :class="{ 'grid-dim': settingsStore.quietNarrator }">
              <button
                v-for="per in PERSONALITIES" :key="per.value"
                class="personality-btn"
                :class="{ active: settingsStore.narratorPersonality === per.value }"
                @click="settingsStore.setNarratorPersonality(per.value as any)"
              >
                <span class="per-label">{{ per.label }}</span>
                <span class="per-sub">{{ per.sub }}</span>
              </button>
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
            <button class="coin-close-btn" aria-label="Close coin flip" @click="showCoinFlip = false">✕</button>
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
            <button class="settings-close" aria-label="Close cloud sync" @click="showSyncModal = false">✕</button>
          </div>

          <div v-if="authStore.user" class="sync-signed-in">
            <div class="sync-status-icon">☁✓</div>
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
              <div class="sync-status-icon">📧</div>
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
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { usePlayersStore } from '../stores/players'
import { GAME_TYPE_LABELS, GAME_TYPE_ORDER, type Player } from '../types/index'
import { speak, speakOhBaby, getAvailableVoices, type VoiceOption } from '../composables/useSpeech'
import { playShotgun, playBuzzer, playStartChime, unlockAudio } from '../composables/useSounds'
import PlayerAvatar from '../components/PlayerAvatar.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const playersStore = usePlayersStore()

/* ── Dashboard data — all of it derived from what the app actually stores ── */
const hasActiveGame = computed(() => {
  const g = gameStore.game
  return g !== null && (g.status === 'playing' || g.status === 'between_turns')
})
const currentPlayerName = computed(() => {
  const g = gameStore.game
  return g ? (g.players[g.currentPlayerIndex]?.name ?? '') : ''
})
const activeIds = computed(() => new Set(gameStore.game?.players.map(p => p.id) ?? []))
function isPlaying(id: string) { return hasActiveGame.value && activeIds.value.has(id) }

const modeSummary = computed(() => {
  const named = GAME_TYPE_ORDER.slice(0, 3).map(t => GAME_TYPE_LABELS[t]).join(' · ')
  const rest = GAME_TYPE_ORDER.length - 3
  return rest > 0 ? `${named} · ${rest} more` : named
})

function winPct(p: Player) {
  return p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0
}
const ranked = computed(() =>
  [...playersStore.players]
    .sort((a, b) => b.wins - a.wins || b.gamesPlayed - a.gamesPlayed || a.name.localeCompare(b.name))
    .slice(0, 5)
)
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

const PERSONALITIES = [
  { value: 'default',   label: 'Default',    sub: 'No-nonsense commentary' },
  { value: 'hype',      label: 'Hype',       sub: 'High energy, gets excited' },
  { value: 'savage',    label: 'Savage',     sub: 'Cold, cutting, zero sympathy' },
  { value: 'announcer', label: 'Anchor',     sub: 'Formal sports broadcast' },
  { value: 'sarcastic', label: 'Sarcastic',  sub: 'Deadpan, dry, unimpressed' },
  { value: 'smooth',    label: 'Smooth',     sub: 'Low-key, cool, laid back' },
]
const personalityLabel = computed(() =>
  PERSONALITIES.find(p => p.value === settingsStore.narratorPersonality)?.label ?? 'Default'
)

function startNewGame() {
  unlockAudio()
  playStartChime()
  router.push('/new-game')
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
// Drives the filled portion of each slider track. Without this the fill is a decorative
// gradient that never moves, so the control gives no feedback about its own value.
const SPEED_MIN = 0.1, SPEED_MAX = 1.2
const PITCH_MIN = 0.1, PITCH_MAX = 3.0
const pct = (v: number, min: number, max: number) =>
  `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`
const speedFill = computed(() => pct(settingsStore.voiceRate, SPEED_MIN, SPEED_MAX))
const pitchFill = computed(() => pct(settingsStore.voicePitch, PITCH_MIN, PITCH_MAX))

const showSettings = ref(false)
const availableVoices = ref<VoiceOption[]>([])

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
  width: 100vw;
  min-height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: none;
  background: #08080a url('/Dartbg.avif') center / cover no-repeat;
}
.home::-webkit-scrollbar { display: none; }

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

.home-inner {
  position: relative;
  z-index: 2;
  max-width: 1220px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 40px 32px 56px;
  padding-top: calc(40px + env(safe-area-inset-top));
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}

/* ── Glass surface ── */
.glass-panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(155deg, rgba(255,255,255,0.135), rgba(255,255,255,0.03));
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 24px 56px -26px rgba(0,0,0,0.82);
}

/* ── Top bar ── */
.topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 14px 16px 14px 22px; border-radius: 20px;
}
.topbar-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
.topbar-mark {
  width: 42px; height: 42px; flex-shrink: 0; border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(150deg, rgba(255,45,120,0.4), rgba(191,95,255,0.22));
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 0 22px rgba(255,45,120,0.35);
}
.topbar-names { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.topbar-title { font-size: 19px; letter-spacing: 0.18em; line-height: 1; color: #fff; }
.topbar-kicker { font-size: 10px; font-weight: 800; letter-spacing: 0.22em; color: rgba(255,255,255,0.45); text-transform: uppercase; }

.topbar-actions { display: flex; align-items: center; gap: 10px; }
.sync-chip {
  display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 16px; border-radius: 14px;
  background: rgba(170,255,0,0.1); border: 1px solid rgba(170,255,0,0.3);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  font-size: 11px; font-weight: 800; letter-spacing: 0.14em; color: var(--lime); text-transform: uppercase;
}
.sync-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 10px var(--lime); animation: livePulse 1.8s ease-in-out infinite; }
.sync-chip-off { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.55); }
.sync-chip-off .sync-dot { background: rgba(255,255,255,0.45); box-shadow: none; animation: none; }

.icon-btn {
  width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: #fff; transition: background .18s, border-color .18s, transform .18s;
  position: relative; overflow: hidden;
}
.icon-btn:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.3); transform: translateY(-1px); }

/* ── Hero ── */
.hero-row { display: grid; grid-template-columns: 1.15fr 1fr; gap: 24px; align-items: stretch; }
.hero {
  display: flex; flex-direction: column; justify-content: center; gap: 18px;
  padding: 38px 34px; border-radius: 26px;
}
.hero-glow {
  position: absolute; top: -120px; right: -80px; width: 320px; height: 320px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,45,120,0.32), transparent 68%); pointer-events: none;
}
.hero-title {
  position: relative; margin: 0;
  font-family: var(--font-display);
  font-size: clamp(72px, 9vw, 124px); line-height: 0.84; letter-spacing: 0.03em;
  background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 42%, var(--blue) 84%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 44px rgba(255,45,120,0.35));
}
.hero-sub {
  position: relative; margin: 0;
  font-size: 12px; font-weight: 800; letter-spacing: 0.26em; text-transform: uppercase;
  color: rgba(255,255,255,0.72);
}
.cta {
  position: relative; margin-top: 8px; width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 22px 26px; border-radius: 18px; cursor: pointer; text-align: left;
  background: linear-gradient(120deg, rgba(255,45,120,0.9), rgba(191,95,255,0.82) 52%, rgba(0,212,255,0.85));
  border: 1px solid rgba(255,255,255,0.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 20px 44px -18px rgba(255,45,120,0.6);
  transition: transform .16s, box-shadow .16s;
  overflow: hidden;
}
.cta:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 26px 58px -18px rgba(255,45,120,0.8); }
.cta-copy { display: flex; flex-direction: column; gap: 3px; }
.cta-title { font-size: 30px; letter-spacing: 0.09em; color: #fff; line-height: 1; }
.cta-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: rgba(255,255,255,0.78); text-transform: uppercase; }
.cta-arrow { font-size: 26px; color: #fff; flex-shrink: 0; }

.hero-side { display: flex; flex-direction: column; gap: 16px; }

/* ── Resume ── */
.resume-card {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 20px 22px; border-radius: 20px;
  background: linear-gradient(150deg, rgba(255,45,120,0.2), rgba(255,45,120,0.06));
  border-color: rgba(255,45,120,0.45);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.24), 0 0 40px -8px rgba(255,45,120,0.4), 0 22px 50px -26px rgba(0,0,0,0.8);
}
.resume-info { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.resume-head { display: flex; align-items: center; gap: 8px; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; animation: livePulse 1.6s ease-in-out infinite; }
.live-dot-pink { background: var(--pink); box-shadow: 0 0 10px var(--pink); }
.resume-label { font-size: 16px; letter-spacing: 0.14em; color: var(--pink); }
.resume-sub { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.72); }
.resume-meta { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.resume-btn {
  flex-shrink: 0; padding: 14px 22px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.28);
  cursor: pointer; font-size: 19px; letter-spacing: 0.1em; color: #fff;
  background: linear-gradient(135deg, var(--pink), var(--purple));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 0 24px rgba(255,45,120,0.5);
  transition: transform .16s, box-shadow .16s;
  position: relative; overflow: hidden;
}
.resume-btn:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 0 34px rgba(255,45,120,0.75); }

/* ── Counters ── */
.counter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; flex: 1; }
.counter {
  display: flex; flex-direction: column; justify-content: space-between; gap: 14px;
  padding: 20px; border-radius: 20px; min-height: 132px;
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
.counter-value { position: relative; font-size: 52px; line-height: 0.8; color: #fff; }
.counter-value-gold { color: var(--gold); }
.counter-foot { position: relative; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: rgba(255,255,255,0.55); }

/* ── Mode tiles ── */
.mode-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.mode {
  display: flex; align-items: center; gap: 16px;
  padding: 20px 22px; border-radius: 20px; cursor: pointer; text-align: left;
  transition: transform .16s, box-shadow .16s, border-color .16s;
}
.mode:hover { transform: translateY(-3px); }
.mode-glow { position: absolute; top: -60px; right: -40px; width: 180px; height: 180px; border-radius: 50%; pointer-events: none; }
.mode-icon {
  width: 48px; height: 48px; flex-shrink: 0; border-radius: 15px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.28);
}
.mode-copy { position: relative; display: flex; flex-direction: column; gap: 3px; }
.mode-title { font-size: 22px; letter-spacing: 0.1em; color: #fff; line-height: 1; }
.mode-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); text-transform: uppercase; }

.mode-blue { background: linear-gradient(150deg, rgba(0,212,255,0.16), rgba(255,255,255,0.03)); border-color: rgba(0,212,255,0.3); }
.mode-blue .mode-glow { background: radial-gradient(circle, rgba(0,212,255,0.3), transparent 68%); }
.mode-blue .mode-icon { background: rgba(0,212,255,0.16); border: 1px solid rgba(0,212,255,0.34); }
.mode-blue:hover { border-color: rgba(0,212,255,0.6); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 0 40px -10px rgba(0,212,255,0.5), 0 26px 52px -24px rgba(0,0,0,0.85); }

.mode-purple { background: linear-gradient(150deg, rgba(153,0,255,0.2), rgba(255,255,255,0.03)); border-color: rgba(191,95,255,0.32); }
.mode-purple .mode-glow { background: radial-gradient(circle, rgba(153,0,255,0.34), transparent 68%); }
.mode-purple .mode-icon { background: rgba(153,0,255,0.2); border: 1px solid rgba(191,95,255,0.36); }
.mode-purple:hover { border-color: rgba(191,95,255,0.62); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 0 40px -10px rgba(153,0,255,0.55), 0 26px 52px -24px rgba(0,0,0,0.85); }

.mode-green { background: linear-gradient(150deg, rgba(51,170,51,0.2), rgba(255,255,255,0.03)); border-color: rgba(85,204,102,0.32); }
.mode-green .mode-glow { background: radial-gradient(circle, rgba(51,170,51,0.32), transparent 68%); }
.mode-green .mode-icon { background: rgba(51,170,51,0.2); border: 1px solid rgba(85,204,102,0.36); }
.mode-green:hover { border-color: rgba(85,204,102,0.62); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 0 40px -10px rgba(51,170,51,0.5), 0 26px 52px -24px rgba(0,0,0,0.85); }

/* ── Leaderboard ── */
.board-row { display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; align-items: start; }
.board { display: flex; flex-direction: column; gap: 16px; padding: 26px 26px 22px; border-radius: 24px; }
.board-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.board-title {
  font-size: 24px; letter-spacing: 0.14em;
  background: linear-gradient(135deg, var(--gold), var(--orange));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.board-link {
  background: none; border: none; cursor: pointer;
  font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(255,255,255,0.5); transition: color .15s;
  /* Rendered 95x17, under the 44px touch floor. The text stays 11px — only the hit area
     grows, with the padding pulled back by an equal margin so the header's optical
     alignment is unchanged. */
  min-height: 44px; display: inline-flex; align-items: center;
  padding: 0 6px; margin: 0 -6px;
}
.board-link:hover { color: var(--blue); }
.board-empty { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.55); padding: 18px 2px 6px; }

.board-cols {
  display: grid; grid-template-columns: 36px 1fr 66px 66px 74px; padding: 0 14px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(255,255,255,0.35);
}
.board-rows { display: flex; flex-direction: column; gap: 8px; }
.board-row-item {
  display: grid; grid-template-columns: 36px 1fr 66px 66px 74px; align-items: center;
  padding: 13px 14px; border-radius: 14px;
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,0.1); border-left: 3px solid rgba(255,255,255,0.2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
  font-size: 14px; font-weight: 700;
  transition: background .15s;
}
.board-row-item:hover { background: rgba(255,255,255,0.09); }
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
  font-size: 9px; font-weight: 900; letter-spacing: 0.12em; padding: 3px 7px; border-radius: 6px; flex-shrink: 0;
}
.tag-pink { color: var(--pink); background: rgba(255,45,120,0.14); border: 1px solid rgba(255,45,120,0.35); }

/* ── Roster / narrator ── */
.board-side { display: flex; flex-direction: column; gap: 16px; }
.roster { display: flex; flex-direction: column; gap: 12px; padding: 24px; border-radius: 24px; }
.roster-stack { display: flex; align-items: center; }
.roster-more {
  width: 38px; height: 38px; margin-left: -12px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2); outline: 2px solid rgba(10,10,12,0.92); outline-offset: -1px;
}
.roster-empty { margin: 0; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); }
.ghost-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; min-height: 48px; padding: 13px 18px; border-radius: 14px; cursor: pointer;
  font-size: 14px; font-weight: 800; letter-spacing: 0.06em; color: #fff;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  transition: background .16s, border-color .16s, transform .16s;
  position: relative; overflow: hidden;
}
.ghost-btn:hover { background: rgba(255,45,120,0.16); border-color: rgba(255,45,120,0.55); transform: translateY(-1px); }

.narrator {
  display: flex; flex-direction: column; gap: 14px; padding: 24px; border-radius: 24px; cursor: pointer;
  transition: border-color .18s, transform .18s;
}
.narrator:hover { border-color: rgba(0,212,255,0.5); transform: translateY(-2px); }
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
  padding: 10px 12px; border-radius: 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
}
.nstat-label { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.nstat-value { font-size: 19px; }
.nstat-blue { color: var(--blue); }
.nstat-purple { color: var(--purple); }
.nstat-lime { color: var(--lime); }
.nstat-dim { color: rgba(255,255,255,0.45); }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .hero-row, .board-row { grid-template-columns: 1fr; }
  .mode-row { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .home-inner { padding: 28px 18px 44px; gap: 18px; }
  .topbar { flex-wrap: wrap; padding: 14px; border-radius: 18px; }
  .topbar-actions { width: 100%; }
  .sync-chip { flex: 1; justify-content: center; }
  .hero { padding: 28px 22px; border-radius: 22px; }
  .hero-title { font-size: clamp(60px, 20vw, 96px); }
  .counter-row { grid-template-columns: 1fr; }
  .resume-card { flex-direction: column; align-items: stretch; }
  .resume-btn { width: 100%; }
  .board { padding: 20px 18px; }
  .board-cols, .board-row-item { grid-template-columns: 28px 1fr 50px 44px 56px; font-size: 13px; }
  .board-cols { font-size: 9px; letter-spacing: 0.1em; }
}

/* ── Narrator scope segmented control ── */
.scope-seg { display: flex; gap: 8px; }
.scope-btn {
  flex: 1; padding: 11px 0; border-radius: 8px; cursor: pointer;
  border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 700;
  transition: all .15s; position: relative; overflow: hidden;
}
.scope-btn:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
.scope-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.12); }
.scope-hint { color: rgba(255,255,255,0.5); font-size: 13px; }
.grid-dim { opacity: 0.4; pointer-events: none; }

/* ── Settings modal (unchanged from the shipped panel) ── */
.settings-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(6,6,10,0.68); backdrop-filter: blur(14px) saturate(120%); -webkit-backdrop-filter: blur(14px) saturate(120%);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.settings-panel {
  background: linear-gradient(155deg, rgba(28,28,34,0.92), rgba(16,16,20,0.94));
  backdrop-filter: blur(30px) saturate(160%); -webkit-backdrop-filter: blur(30px) saturate(160%);
  border: 1px solid rgba(255,255,255,0.16); border-radius: 20px;
  padding: 28px; width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 24px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 50px 100px -40px rgba(0,0,0,0.95);
}
.settings-header { display: flex; align-items: center; justify-content: space-between; }
.settings-title { font-size: 20px; letter-spacing: 0.15em; color: var(--pink); }
/* Close controls sit in a corner where a mis-tap dismisses the panel or hits nothing.
   Padding alone left them at 32x38; min dimensions guarantee the floor without changing
   the glyph size, and the negative margin keeps them optically in the corner. */
.settings-close { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 20px; cursor: pointer;
  min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
  padding: 0; margin: -4px -8px -4px 0; }
.settings-close:hover { color: #fff; }

.settings-section { display: flex; flex-direction: column; gap: 10px; }
.settings-label { font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #fff; }
/* Sub-label within a section — quieter than .settings-label so "Narrator Style" still
   leads, but the grid below is no longer unlabelled. */
.personality-label { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-top: 4px; }
.settings-muted { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5; }

.voice-list { display: flex; flex-direction: column; gap: 6px; }
.voice-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; text-align: left;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.9);
  transition: all 0.15s; width: 100%;
}
.voice-btn.active { background: rgba(255,45,120,0.2); border-color: var(--pink); color: #fff; box-shadow: 0 0 12px rgba(255,45,120,0.25); }
.voice-btn:hover:not(.active) { background: rgba(255,255,255,0.1); color: #fff; }
.voice-btn-label { font-weight: 700; }
.voice-btn-sub { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); flex-shrink: 0; }

.test-btn { align-self: flex-end; }

.slider-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 14px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
}
.slider-label { font-size: 15px; font-weight: 700; color: #fff; width: 42px; flex-shrink: 0; }
.slider-val { font-size: 15px; font-weight: 700; color: var(--pink); width: 50px; text-align: right; flex-shrink: 0; font-family: var(--font-display); }
/* The track is 4px, but the INPUT must not be — its box is the hit area, and an 18px thumb
   painted outside a 4px box means the control looks 18px and behaves as 4px. A tap inside
   the visible thumb but a few pixels off centre used to land on the row behind it and do
   nothing. 44px tall with the track drawn as a centred background stripe: same visual,
   whole height grabbable. --val drives the filled portion so it reflects the real value
   instead of being a decorative fade. */
.voice-slider {
  flex: 1; -webkit-appearance: none; appearance: none;
  height: 44px; outline: none; cursor: pointer;
  background-color: transparent;
  background-image: linear-gradient(to right,
    var(--pink) 0%, var(--pink) var(--val, 50%),
    rgba(255,255,255,0.16) var(--val, 50%), rgba(255,255,255,0.16) 100%);
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 4px;
  border-radius: 2px;
}
.voice-slider::-moz-range-track { background: transparent; height: 4px; }
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
  padding: 12px 14px; border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  transition: background 0.15s; user-select: none;
}
.toggle-row:hover { background: rgba(255,255,255,0.08); }
.toggle-track {
  width: 44px; height: 24px; border-radius: 12px; flex-shrink: 0;
  background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
  position: relative; transition: background 0.2s;
}
.toggle-track.active { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 14px rgba(255,45,120,0.5); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}
.toggle-track.active .toggle-thumb { transform: translateX(20px); }
.toggle-info { display: flex; flex-direction: column; gap: 2px; }
.toggle-title { font-size: 16px; font-weight: 700; color: #fff; }
.toggle-sub { font-size: 13px; color: rgba(255,255,255,0.65); line-height: 1.4; }

.personality-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
.personality-btn {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04); cursor: pointer; transition: all 0.15s; text-align: left;
  position: relative; overflow: hidden;
}
.personality-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25); }
.personality-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.per-label { font-size: 13px; font-weight: 800; font-family: var(--font-display); letter-spacing: 0.05em; color: #fff; }
.personality-btn.active .per-label { color: var(--pink); }
.per-sub { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 600; line-height: 1.3; }

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
}
.coin-modal::-webkit-scrollbar { display: none; }
.coin-modal-header { display: flex; align-items: center; justify-content: center; width: 100%; position: relative; }
.coin-modal-title { font-size: 38px; letter-spacing: 0.2em; color: var(--gold); font-weight: 900; }
.coin-close-btn {
  position: absolute; right: 0; background: none; border: none;
  color: rgba(255,255,255,0.45); font-size: 22px; cursor: pointer; line-height: 1;
  min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
  padding: 0; margin-right: -8px;
}
.coin-close-btn:hover { color: #fff; }
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
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; width: 100%;
}
.coin-cust-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.coin-cust-label { font-size: 10px; font-weight: 800; letter-spacing: 0.15em; color: rgba(255,255,255,0.38); text-transform: uppercase; }
.coin-cust-btn {
  width: 64px; height: 64px; border-radius: 50%;
  border: 2px dashed rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  overflow: hidden; transition: border-color 0.15s, background 0.15s;
}
.coin-cust-btn:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1); }
.cust-preview { width: 100%; height: 100%; object-fit: cover; }
.cust-placeholder { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 700; }
.coin-cust-clear { background: none; border: none; color: rgba(255,80,80,0.65); font-size: 13px; cursor: pointer; padding: 2px 6px; }
.coin-cust-clear:hover { color: #ff4444; }
.coin-cust-divider { width: 1px; height: 60px; background: rgba(255,255,255,0.08); flex-shrink: 0; }
.coin-fade-enter-active, .coin-fade-leave-active { transition: opacity 0.22s; }
.coin-fade-enter-from, .coin-fade-leave-to { opacity: 0; }
.result-slide-enter-active { transition: opacity 0.3s, transform 0.3s; }
.result-slide-enter-from { opacity: 0; transform: translateY(14px) scale(0.75); }

.coin-series-modes { display: flex; gap: 8px; justify-content: center; width: 100%; }
.coin-mode-btn {
  flex: 1; min-height: 44px; padding: 7px 0; border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
}
.coin-mode-btn:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
.coin-mode-btn.active { border-color: var(--gold); color: var(--gold); background: rgba(255,215,0,0.1); }

.coin-series-board { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; padding: 10px 0; }
.series-side {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  flex: 1; padding: 10px; border-radius: 10px;
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
.coin-reset-btn {
  width: 100%; padding: 10px; border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
}
.coin-reset-btn:hover { border-color: var(--gold); color: var(--gold); background: rgba(255,215,0,0.1); }

.coin-question-section { width: 100%; display: flex; flex-direction: column; align-items: center; }
.coin-question-toggle {
  background: none; border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px;
  color: rgba(255,255,255,0.35); font-size: 12px; font-weight: 700; letter-spacing: 0.05em;
  padding: 7px 16px; min-height: 44px; cursor: pointer; width: 100%; transition: all 0.15s;
}
.coin-question-toggle:hover { border-color: rgba(255,215,0,0.4); color: rgba(255,215,0,0.6); }
.coin-question-display {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: rgba(255,215,0,0.07); border: 1px solid rgba(255,215,0,0.25);
  border-radius: 10px; padding: 10px 14px;
}
.coin-question-text {
  flex: 1; font-size: 15px; font-weight: 800; font-family: var(--font-display);
  letter-spacing: 0.04em; color: var(--gold); text-align: center;
  filter: drop-shadow(0 0 8px rgba(255,215,0,0.4));
}
.coin-question-clear { background: none; border: none; color: rgba(255,215,0,0.5); font-size: 14px; cursor: pointer; padding: 2px 4px; flex-shrink: 0; line-height: 1; }
.coin-question-clear:hover { color: #ff5555; }
.coin-question-input-row { display: flex; align-items: center; gap: 6px; width: 100%; }
.coin-question-input {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,215,0,0.3);
  border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600;
  padding: 9px 12px; outline: none; font-family: inherit;
}
.coin-question-input::placeholder { color: rgba(255,255,255,0.3); }
.coin-question-input:focus { border-color: rgba(255,215,0,0.6); }
.coin-q-confirm, .coin-q-cancel {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 8px; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s;
}
.coin-q-confirm { background: rgba(255,215,0,0.15); color: var(--gold); }
.coin-q-confirm:hover { background: rgba(255,215,0,0.3); }
.coin-q-cancel { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.45); }
.coin-q-cancel:hover { color: #ff5555; }

/* ── Cloud sync ── */
.sync-panel { max-width: 420px; }
.sync-signed-in,
.sync-sign-in { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0 8px; text-align: center; }
.sync-status-icon { font-size: 40px; }
.sync-email { font-size: 14px; font-weight: 700; color: var(--pink); }
.sync-desc { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.6; max-width: 320px; }
.sync-email-input {
  width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18);
  border-radius: 10px; color: #fff; font-size: 15px; outline: none; text-align: center;
}
.sync-email-input:focus { border-color: var(--pink); }
.sync-error { font-size: 12px; color: #ff5555; }
.sync-sent { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; padding: 8px 0; }
.w-full { width: 100%; }

@media (min-width: 768px) and (max-width: 1100px) {
  .coin-modal { max-width: 480px; }
  .coin-modal-title { font-size: clamp(36px, 5vw, 56px); letter-spacing: 0.25em; }
  .coin-close-btn { font-size: 28px; }
  .coin-series-modes { gap: 12px; }
  .coin-mode-btn { font-size: 17px; padding: 11px 0; border-radius: 10px; }
  .coin-arena { gap: 22px; }
  .coin-perspective { perspective: 1000px; }
  .coin { width: 220px; height: 220px; }
  .coin-letter { font-size: 68px; }
  .coin-tap-hint { font-size: 15px; min-height: 22px; }
  .coin-result-text { font-size: 72px; }
  .coin-series-winner { font-size: 42px; }
  .coin-series-board { gap: 20px; }
  .series-side { padding: 14px 20px; border-radius: 12px; }
  .series-count { font-size: 52px; }
  .series-pip { width: 13px; height: 13px; }
  .coin-reset-btn { font-size: 17px; padding: 13px; }
  .coin-customize { padding: 16px 24px; }
  .coin-cust-btn { width: 80px; height: 80px; }
}
</style>

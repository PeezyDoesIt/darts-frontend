<template>
  <div class="page">
    <div class="drip-bar" />
    <div class="page-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="router.push('/')">← Back</button>
      <h2 class="page-title display">LEADERBOARD</h2>
      <div style="width:80px" />
    </div>

    <div class="lb-body">
      <div v-if="sorted.length === 0" class="empty">
        <div class="empty-title display">NO PLAYERS YET</div>
        <div class="empty-sub">Add someone and start keeping score.</div>
        <button v-ripple class="btn btn-spray btn-lg" @click="router.push('/player-setup')">+ Add Player</button>
      </div>

      <div v-if="sorted.length >= 2" class="podium">
        <div v-if="sorted[1]" class="podium-slot second">
          <div class="pod-avatar" :style="{ background: sorted[1].color, boxShadow: '4px 4px 0 rgba(0,0,0,0.55)' }">
            <img v-if="isPhoto(sorted[1].avatarUrl)" :src="sorted[1].avatarUrl!" alt="" />
            <span v-else>{{ avatarGlyph(sorted[1]) }}</span>
          </div>
          <div class="pod-name">{{ sorted[1].name }}</div>
          <div class="pod-wins display" :style="{ color: sorted[1].color }">{{ sorted[1].wins }}W</div>
          <div class="pod-base second-base">2ND</div>
        </div>
        <div v-if="sorted[0]" class="podium-slot first">
          <div class="pod-crown">👑</div>
          <div class="pod-avatar large" :style="{ background: sorted[0].color, boxShadow: '6px 6px 0 rgba(0,0,0,0.6)' }">
            <img v-if="isPhoto(sorted[0].avatarUrl)" :src="sorted[0].avatarUrl!" alt="" />
            <span v-else>{{ avatarGlyph(sorted[0]) }}</span>
          </div>
          <div class="pod-name">{{ sorted[0].name }}</div>
          <div class="pod-wins display" :style="{ color: sorted[0].color }">{{ sorted[0].wins }}W</div>
          <div class="pod-base first-base">1ST</div>
        </div>
        <div v-if="sorted[2]" class="podium-slot third">
          <div class="pod-avatar" :style="{ background: sorted[2].color, boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }">
            <img v-if="isPhoto(sorted[2].avatarUrl)" :src="sorted[2].avatarUrl!" alt="" />
            <span v-else>{{ avatarGlyph(sorted[2]) }}</span>
          </div>
          <div class="pod-name">{{ sorted[2].name }}</div>
          <div class="pod-wins display" :style="{ color: sorted[2].color }">{{ sorted[2].wins }}W</div>
          <div class="pod-base third-base">3RD</div>
        </div>
      </div>

      <div v-if="sorted.length > 0" class="lb-table-scroll">
        <div class="lb-table-header">
          <span>#</span><span>Player</span><span>Games</span><span>Wins</span><span>Win %</span>
        </div>
        <div v-for="(p, i) in sorted" :key="p.id" class="lb-table-row" :class="{ top: i < 3 }"
          :style="i < 3 ? { borderLeftColor: p.color } : {}">
          <span class="rank display" :style="i < 3 ? { color: p.color } : {}">{{ i + 1 }}</span>
          <div class="player-cell">
            <div class="cell-avatar" :style="{ background: p.color, boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ avatarGlyph(p) }}</span>
            </div>
            <span>{{ p.name }}</span>
          </div>
          <span>{{ p.gamesPlayed }}</span>
          <span>{{ p.wins }}</span>
          <span :style="i === 0 ? { color: 'var(--gold)', fontWeight: '800' } : {}">
            {{ p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0 }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import { usePlayersStore } from '../stores/players'

const router = useRouter()
const playersStore = usePlayersStore()
const sorted = computed(() => [...playersStore.players].sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.gamesPlayed - a.gamesPlayed))
</script>

<style scoped>
.page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; }
.page-header {
  display: flex; align-items: center; justify-content: space-between; padding: 18px 40px;
  padding-top: calc(18px + env(safe-area-inset-top));
  border-bottom: 2px solid rgba(255,255,255,0.08);
  background: #141419; flex-shrink: 0;
}
.page-title { font-size: 28px; letter-spacing: 0.12em; background: linear-gradient(135deg, var(--gold), var(--orange)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-outline { color: #ffffff !important; font-weight: 700 !important; border: 2px solid #ffffff !important; }


/* overflow-y: auto, not hidden. As a flex child inside a shell that never scrolls, this
   clipped its own content with no way to reach it — on a 568px phone the lower table rows
   were simply invisible and unreachable. */
.lb-body { flex: 1; min-height: 0; display: flex; gap: 48px; padding: 36px 48px; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
.empty { width: 100%; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 24px; text-align: center; }
.empty-title { font-size: 32px; letter-spacing: 0.06em; color: var(--text); }
.empty-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 10px; }

.podium { display: flex; align-items: flex-end; gap: 20px; flex-shrink: 0; }
.podium-slot { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.pod-crown { font-size: 32px; }
.pod-avatar { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; overflow: hidden; }
.pod-avatar.large { width: 96px; height: 96px; font-size: 48px; }
.pod-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pod-name { font-size: 14px; font-weight: 700; }
.pod-wins { font-size: 24px; }
.pod-base { font-size: 12px; font-weight: 900; letter-spacing: 0.1em; padding: 6px 18px;  font-family: var(--font-display); }
.first-base  { background: linear-gradient(135deg, var(--gold), var(--orange)); color: #000; }
.second-base { background: rgba(170,170,170,0.3); color: #aaa; border: 2px solid #aaa; }
.third-base  { background: rgba(205,127,50,0.3); color: #cd7f32; border: 2px solid #cd7f32; }

.lb-table-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
.lb-table-header { display: grid; grid-template-columns: 44px 1fr 80px 80px 80px; padding: 8px 16px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
.lb-table-row {
  display: grid; grid-template-columns: 44px 1fr 80px 80px 80px; align-items: center; padding: 14px 16px;
  background: #16161c; border: 2px solid rgba(255,255,255,0.08); border-left: 3px solid rgba(255,255,255,0.08); 
  font-size: 14px; font-weight: 600; transition: background 0.15s; margin-bottom: 6px;
}

.lb-table-row.top { border-left-width: 4px; }
.rank { font-size: 20px; }
.player-cell { display: flex; align-items: center; gap: 12px; }
.cell-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 17px; }

@media (max-width: 767px) {
  .lb-body { flex-direction: column; padding: 20px; gap: 24px; overflow: auto; }
  .lb-body { height: auto; flex: none; }
  /* `height: auto; min-height: 100dvh` assumes the document scrolls. It does not — the
     app shell is position:fixed / overflow:hidden, so this grew to fit its content
     (919px on a 568px phone), its own overflow never engaged, and the shell clipped the
     bottom 350px with no way to reach it. The page must be viewport-height and own the
     scroll itself. */
  .page { height: 100dvh; min-height: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
  .lb-table-scroll { flex: none; height: auto; }
  .podium { justify-content: center; }
  .lb-table-header, .lb-table-row { grid-template-columns: 36px 1fr 60px 60px 60px; }
  .page-header { padding: 14px 20px; padding-top: calc(14px + env(safe-area-inset-top)); }
}

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
  .btn-outline:hover { color: var(--pink) !important; border-color: var(--pink) !important; }
  .lb-table-row:hover { background: #1c1c22; }
}
</style>

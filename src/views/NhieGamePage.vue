<template>
  <div v-if="game" class="nh-page">
    <div class="drip-bar" />

    <header class="nh-header">
      <button v-ripple class="nh-chrome" @click="quit">QUIT</button>
      <span class="nh-tape">{{ remaining }} LEFT</span>
      <div class="nh-packs">
        <span v-for="t in game.tiers" :key="t" class="nh-pack" :class="`pack-${t}`">
          {{ TIER_LABELS[t] }}
        </span>
      </div>
    </header>

    <div class="nh-field">
      <template v-if="card">
        <span class="nh-opener">NEVER HAVE I EVER</span>
        <p class="nh-card" :class="`tier-${card.tier}`">{{ card.text }}</p>
        <span v-if="card.edited" class="nh-edited">edited</span>
      </template>

      <template v-else>
        <p class="nh-done">That's the deck.</p>
        <p class="nh-done-sub">
          {{ game.skipped.length }} skipped — they'll be back next time.
        </p>
        <button v-ripple class="nh-next nh-wide" @click="finish">DONE</button>
      </template>
    </div>

    <!--
      Skip is the same size and weight as Next, on purpose.
      With people you don't know well, the sharp end of this game is that a skip which looks
      like chickening out gets answered instead. Making the two controls equals is the whole
      difference between a good night and a bad one, and it costs nothing.
    -->
    <footer v-if="card" class="nh-footer">
      <button v-ripple class="nh-skip" @click="nhie.skip()">SKIP</button>
      <button v-ripple class="nh-next" @click="nhie.next()">NEXT →</button>
    </footer>

    <div v-if="card" class="nh-tools">
      <button v-ripple class="nh-tool" @click="openEdit">EDIT</button>
      <button v-ripple class="nh-tool nh-tool-bin" @click="hideCard">NEVER AGAIN</button>
    </div>

    <div v-if="editing" class="nh-overlay" @click.self="editing = false">
      <div class="nh-panel">
        <span class="nh-panel-label">REWORD THIS CARD</span>
        <textarea v-model="draft" class="nh-textarea" rows="3" maxlength="160" />
        <p class="nh-panel-hint">Clearing it puts the original back.</p>
        <div class="nh-panel-row">
          <button v-ripple class="nh-skip nh-half" @click="editing = false">CANCEL</button>
          <button v-ripple class="nh-next nh-half" @click="saveEdit">SAVE</button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="nh-empty">
    <p>No game in progress.</p>
    <button v-ripple class="nh-next" @click="router.replace('/nhie/setup')">SET ONE UP</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNhieStore } from '../stores/nhie'
import { TIER_LABELS } from '../lib/nhiePrompts'
import { goBack } from '../router/goBack'

const router = useRouter()
const nhie = useNhieStore()
const game = computed(() => nhie.game)

const card = computed(() => nhie.current())
const remaining = computed(() => nhie.remaining())

const editing = ref(false)
const draft = ref('')

function openEdit() {
  draft.value = card.value?.text ?? ''
  editing.value = true
}

function saveEdit() {
  const c = card.value
  if (c) nhie.editPrompt(c.id, draft.value)
  editing.value = false
}

function hideCard() {
  const c = card.value
  if (c) nhie.hide(c.id)
}

function finish() { nhie.endGame(); router.replace('/') }
function quit() { nhie.endGame(); goBack(router, '/') }
</script>

<style scoped>
.nh-page {
  display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden;
  background: #0d0d11;
  background-image: radial-gradient(rgba(255,255,255,0.11) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  font-family: var(--font-body, Inter, system-ui, sans-serif);
}

.nh-header {
  flex-shrink: 0; display: flex; align-items: center; gap: 14px; min-height: 74px; padding: 0 22px;
  padding-top: env(safe-area-inset-top);
  background: #101014; border-bottom: 3px solid var(--pink, #ff2d78);
}
.nh-chrome {
  background: transparent; border: 2px solid rgba(255,255,255,0.22); color: #fff;
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 18px; letter-spacing: 0.14em;
  padding: 9px 14px; cursor: pointer; flex-shrink: 0;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.nh-tape {
  background: #fff; color: #101014;
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 22px; letter-spacing: 0.12em;
  padding: 3px 11px 1px; transform: rotate(-1.2deg); box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
}
.nh-packs { margin-left: auto; display: flex; gap: 7px; }
.nh-pack {
  font-size: 11px; font-weight: 900; letter-spacing: 0.16em; padding: 4px 9px; border: 2px solid;
}
.pack-bar    { color: #e8e2d0; border-color: rgba(232,226,208,0.5); }
.pack-late   { color: var(--gold, #ffd700); border-color: rgba(255,215,0,0.55); }
.pack-filthy { color: var(--pink, #ff2d78); border-color: rgba(255,45,120,0.6); }

.nh-field {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; padding: 24px 26px; text-align: center;
}
.nh-opener {
  font-size: 13px; font-weight: 900; letter-spacing: 0.22em; color: rgba(255,255,255,0.42);
}
/*
 * The card is the screen. It is read aloud across a table, often by someone who has had a few,
 * so it is set large and it wraps rather than shrinking to fit — a prompt that has to be
 * squinted at gets misread, and a misread prompt kills the round.
 */
.nh-card {
  margin: 0; max-width: 22ch;
  font-family: var(--font-display, 'Bebas Neue', sans-serif);
  font-size: clamp(38px, 9vw, 92px); line-height: 1.02; letter-spacing: 0.01em;
  color: #fff; text-shadow: 4px 4px 0 rgba(0,0,0,0.6);
}
.nh-card.tier-late   { color: var(--gold, #ffd700); }
.nh-card.tier-filthy { color: var(--pink, #ff2d78); }
.nh-edited { font-size: 11px; letter-spacing: 0.16em; color: rgba(255,255,255,0.35); }

.nh-done { margin: 0; font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 54px; color: #fff; }
.nh-done-sub { margin: 0; font-size: 15px; color: rgba(255,255,255,0.55); }

.nh-footer {
  flex-shrink: 0; display: flex; gap: 14px; padding: 14px 22px; align-items: stretch;
  background: #141419; border-top: 4px solid var(--pink, #ff2d78);
}
/* Equal weight, equal width. See the note in the template. */
.nh-footer > button { flex: 1; min-height: 84px; }
.nh-next {
  background: var(--lime, #aaff00); color: #101014; border: 3px solid #101014;
  box-shadow: 6px 6px 0 rgba(0,0,0,0.6);
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 34px; letter-spacing: 0.1em;
  min-height: 84px; padding: 0 26px; cursor: pointer;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.nh-skip {
  background: #17171d; color: #fff; border: 3px solid rgba(255,255,255,0.3);
  box-shadow: 6px 6px 0 rgba(0,0,0,0.6);
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 34px; letter-spacing: 0.1em;
  min-height: 84px; padding: 0 26px; cursor: pointer;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.nh-wide { width: 100%; max-width: 320px; }
.nh-half { flex: 1; min-height: 60px; font-size: 24px; }

.nh-tools {
  flex-shrink: 0; display: flex; gap: 10px; justify-content: center;
  padding: 0 22px 12px; padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #141419;
}
.nh-tool {
  background: transparent; border: 2px solid rgba(255,255,255,0.16); color: rgba(255,255,255,0.6);
  font-size: 11px; font-weight: 900; letter-spacing: 0.16em; padding: 8px 14px; cursor: pointer;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.nh-tool-bin { color: rgba(255,120,120,0.8); border-color: rgba(255,120,120,0.3); }

.nh-overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  padding: 24px; background: rgba(0,0,0,0.88);
}
.nh-panel {
  width: 100%; max-width: 460px; display: flex; flex-direction: column; gap: 12px;
  padding: 24px 20px; background: #101014; border: 2px solid #2a2a34;
  box-shadow: 10px 10px 0 rgba(0,0,0,0.65);
}
.nh-panel-label { font-size: 12px; font-weight: 900; letter-spacing: 0.18em; color: rgba(255,255,255,0.45); }
.nh-panel-hint { margin: 0; font-size: 12px; color: rgba(255,255,255,0.45); }
.nh-panel-row { display: flex; gap: 10px; }
.nh-textarea {
  background: #17171d; border: 2px solid #2a2a34; color: #fff; padding: 12px 14px;
  font-size: 17px; font-family: inherit; outline: none; resize: vertical; -webkit-appearance: none;
}
.nh-textarea:focus { border-color: var(--pink, #ff2d78); }

.nh-empty {
  height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; background: #0d0d11; color: rgba(255,255,255,0.6);
}

@media (max-width: 767px) {
  .nh-header { min-height: 62px; padding: 8px 14px; gap: 9px; }
  .nh-tape { font-size: 17px; }
  .nh-pack { font-size: 9px; padding: 3px 6px; }
  .nh-field { padding: 18px 16px; }
  .nh-footer { padding: 12px 14px; gap: 10px; }
  .nh-next, .nh-skip { font-size: 25px; min-height: 68px; padding: 0 14px; border-width: 2px; box-shadow: 4px 4px 0 rgba(0,0,0,0.6); }
  .nh-footer > button { min-height: 68px; }
}
</style>

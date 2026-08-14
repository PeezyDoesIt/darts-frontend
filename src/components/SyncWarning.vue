<template>
  <!--
    Two states the app knew about and never mentioned.

    `syncFailure` means a cloud write or read was rejected — the roster on this device is
    ahead of the one in the account, and opening the app anywhere else will show something
    older. `storageDegraded` means a local save had to drop photos to fit in localStorage.

    Both were reachable only from the browser console, which is how three missing columns
    stopped the entire roster syncing for days while the app looked completely normal.
  -->
  <div v-if="playersStore.syncFailure || playersStore.storageDegraded" class="sync-warn" role="status">
    <span class="sync-warn-icon" aria-hidden="true">⚠</span>

    <div class="sync-warn-body">
      <template v-if="playersStore.syncFailure">
        <span class="sync-warn-title">Not synced</span>
        <span class="sync-warn-sub">
          Saved on this device, but <strong>{{ playersStore.syncFailure.what }}</strong> failed —
          other devices will show older players.
        </span>
        <button class="sync-warn-detail" @click="showDetail = !showDetail">
          {{ showDetail ? 'Hide' : 'Why?' }}
        </button>
        <code v-if="showDetail" class="sync-warn-msg">{{ playersStore.syncFailure.message }}</code>
      </template>

      <template v-else>
        <span class="sync-warn-title">Photos dropped</span>
        <span class="sync-warn-sub">
          This device ran out of room, so player photos were left out of the last save.
        </span>
      </template>
    </div>

    <button v-if="playersStore.syncFailure" v-ripple class="btn btn-sm sync-warn-retry" :disabled="retrying" @click="retry">
      {{ retrying ? 'Trying…' : 'Retry' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePlayersStore } from '../stores/players'

const playersStore = usePlayersStore()
const showDetail = ref(false)
const retrying = ref(false)

/**
 * A full sync rather than replaying the one write that failed.
 *
 * syncFromCloud already pushes every player whose local copy is newer, which is exactly the
 * set that failed to go up — and it clears the flag itself if they all land. Replaying the
 * single failed call would leave anything that failed before it still behind.
 */
async function retry() {
  retrying.value = true
  try { await playersStore.syncFromCloud() } finally { retrying.value = false }
}
</script>

<style scoped>
.sync-warn {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(245,158,11,0.45);
  border-left: 3px solid var(--gold, #f59e0b);
  border-radius: 8px;
  background: rgba(245,158,11,0.10);
}
.sync-warn-icon { font-size: 16px; line-height: 1.3; color: var(--gold, #f59e0b); flex-shrink: 0; }
.sync-warn-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.sync-warn-title {
  font-size: 13px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--gold, #f59e0b);
}
.sync-warn-sub { font-size: 12.5px; line-height: 1.45; color: rgba(255,255,255,0.75); }
.sync-warn-detail {
  align-self: flex-start; margin-top: 2px; padding: 0;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.55);
  text-decoration: underline; -webkit-tap-highlight-color: transparent;
}
.sync-warn-msg {
  margin-top: 4px; font-size: 11.5px; line-height: 1.4;
  color: rgba(255,255,255,0.6); word-break: break-word;
}
.sync-warn-retry { flex-shrink: 0; align-self: center; }
</style>

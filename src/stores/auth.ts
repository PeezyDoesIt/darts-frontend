import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  const syncing = ref(false)

  async function init() {
    const { usePlayersStore } = await import('./players')
    const playersStore = usePlayersStore()

    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null
    loading.value = false

    supabase.auth.onAuthStateChange((event, session) => {
      user.value = session?.user ?? null
      if (event === 'SIGNED_IN') {
        syncing.value = true
        playersStore.syncFromCloud().finally(() => {
          syncing.value = false
        })
      }
    })
  }

  async function sendMagicLink(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://peezydoesit.net' },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, loading, syncing, init, sendMagicLink, signOut }
})

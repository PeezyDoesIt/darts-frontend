import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { Player } from '../types/index'

export const usePlayersStore = defineStore('players', () => {
  const players = ref<Player[]>([])

  function loadFromStorage() {
    const raw = localStorage.getItem('darts_players')
    if (raw) {
      const loaded = JSON.parse(raw) as Player[]
      players.value = loaded.map(p => ({ ...p, playerBackground: p.playerBackground ?? null, pinned: p.pinned ?? false, targetLabelColor: p.targetLabelColor ?? null, cricketTargetDisplay: p.cricketTargetDisplay ?? null }))
    } else {
      // Seed default players
      players.value = [
        {
          id: 'brannon-default',
          name: 'Brannon',
          color: '#ff2d78',
          avatarUrl: '🎯',
          playerBackground: null,
          targetLabelColor: null,
          cricketTargetDisplay: null,
          pinned: true,
          wins: 100,
          gamesPlayed: 100,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      persist()
    }
  }

  function persist() {
    localStorage.setItem('darts_players', JSON.stringify(players.value))
  }

  function addPlayer(data: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'createdAt'>) {
    const player: Player = {
      ...data,
      playerBackground: data.playerBackground ?? null,
      targetLabelColor: data.targetLabelColor ?? null,
      cricketTargetDisplay: data.cricketTargetDisplay ?? null,
      pinned: data.pinned ?? false,
      id: uuid(),
      wins: 0,
      gamesPlayed: 0,
      createdAt: new Date().toISOString(),
    }
    players.value.push(player)
    persist()
    return player
  }

  function updatePlayer(id: string, data: Partial<Omit<Player, 'id' | 'createdAt'>>) {
    const idx = players.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      players.value[idx] = { ...players.value[idx]!, ...data }
      persist()
    }
  }

  function recordWin(id: string) {
    updatePlayer(id, {
      wins: (players.value.find(p => p.id === id)?.wins ?? 0) + 1,
      gamesPlayed: (players.value.find(p => p.id === id)?.gamesPlayed ?? 0) + 1,
    })
  }

  function recordGame(id: string) {
    updatePlayer(id, {
      gamesPlayed: (players.value.find(p => p.id === id)?.gamesPlayed ?? 0) + 1,
    })
  }

  function deletePlayer(id: string) {
    players.value = players.value.filter(p => p.id !== id)
    persist()
  }

  loadFromStorage()

  return { players, addPlayer, updatePlayer, deletePlayer, recordWin, recordGame }
})

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
      const PEEZY_BG = 'linear-gradient(160deg, #0c0c0e 0%, #242428 40%, #484850 70%, #a0a0b0 100%)'
      players.value = loaded.map(p => {
        if (p.id !== 'brannon-default') return { ...p, playerBackground: p.playerBackground ?? null, pinned: p.pinned ?? false, targetLabelColor: p.targetLabelColor ?? null, cricketTargetDisplay: p.cricketTargetDisplay ?? null }
        return {
          ...p,
          name: p.name === 'Brannon' ? 'Peezy' : p.name,
          avatarUrl: p.avatarUrl === '🎯' || p.avatarUrl == null ? '☣️' : p.avatarUrl,
          playerBackground: p.playerBackground == null ? PEEZY_BG : p.playerBackground,
          cricketTargetDisplay: p.cricketTargetDisplay == null ? 'hide' : p.cricketTargetDisplay,
          pinned: p.pinned ?? true,
          targetLabelColor: p.targetLabelColor ?? null,
        }
      })
      persist()
    } else {
      // Seed default players
      players.value = [
        {
          id: 'brannon-default',
          name: 'Peezy',
          color: '#ff2d78',
          avatarUrl: '☣️',
          playerBackground: 'linear-gradient(160deg, #0c0c0e 0%, #242428 40%, #484850 70%, #a0a0b0 100%)',
          targetLabelColor: null,
          cricketTargetDisplay: 'hide',
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

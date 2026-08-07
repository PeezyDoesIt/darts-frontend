import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import NewGamePage from '../views/NewGamePage.vue'
import PlayerSetupPage from '../views/PlayerSetupPage.vue'
import GamePage from '../views/GamePage.vue'
import BetweenTurnsPage from '../views/BetweenTurnsPage.vue'
import WinPage from '../views/WinPage.vue'
import LeaderboardPage from '../views/LeaderboardPage.vue'
import YahtzeeSetupPage from '../views/YahtzeeSetupPage.vue'
import YahtzeeGamePage from '../views/YahtzeeGamePage.vue'
import LRCSetupPage from '../views/LRCSetupPage.vue'
import LRCGamePage from '../views/LRCGamePage.vue'
import DiceGameSetupPage from '../views/DiceGameSetupPage.vue'
import FarkleGamePage from '../views/FarkleGamePage.vue'
import SCCGamePage from '../views/SCCGamePage.vue'
import PigGamePage from '../views/PigGamePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',              name: 'Home',         component: HomePage },
    { path: '/new-game',      name: 'NewGame',       component: NewGamePage },
    { path: '/player-setup',  name: 'PlayerSetup',   component: PlayerSetupPage },
    { path: '/game',          name: 'Game',          component: GamePage },
    { path: '/between',       name: 'BetweenTurns',  component: BetweenTurnsPage },
    { path: '/win',           name: 'Win',           component: WinPage },
    { path: '/leaderboard',   name: 'Leaderboard',   component: LeaderboardPage },
    { path: '/yahtzee/setup', name: 'YahtzeeSetup',  component: YahtzeeSetupPage },
    { path: '/yahtzee',       name: 'YahtzeeGame',   component: YahtzeeGamePage },
    { path: '/lrc/setup',     name: 'LRCSetup',      component: LRCSetupPage },
    { path: '/lrc',           name: 'LRCGame',       component: LRCGamePage },
    // One setup page serves all three dice games; the variant selects title, target and rules.
    { path: '/dice/:variant/setup', name: 'DiceSetup', component: DiceGameSetupPage },
    { path: '/dice/farkle',   name: 'FarkleGame',    component: FarkleGamePage },
    { path: '/dice/scc',      name: 'SCCGame',       component: SCCGamePage },
    { path: '/dice/pig',      name: 'PigGame',       component: PigGamePage },
  ],
})

// On hard refresh, restore the correct page based on saved game state
router.beforeEach((to) => {
  // LRC active game redirect
  if (to.path === '/') {
    try {
      const lrcRaw = localStorage.getItem('lrc_active_game')
      if (lrcRaw) {
        const lrcGame = JSON.parse(lrcRaw)
        if (lrcGame.phase && lrcGame.phase !== 'game_over') return '/lrc'
      }
    } catch {}
  }

  const raw = localStorage.getItem('darts_active_game')
  if (!raw) return
  const game = JSON.parse(raw)
  const statusRoutes: Record<string, string> = {
    playing: '/game',
    between_turns: '/game', // reset between_turns to /game on refresh so timer restarts cleanly
    finished: '/win',
  }
  const target = statusRoutes[game.status]
  if (target && to.path === '/') return target
})

export default router

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
  ],
})

// On hard refresh, restore the correct page based on saved game state
router.beforeEach((to) => {
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

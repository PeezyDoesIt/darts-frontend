import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import NewGamePage from '../views/NewGamePage.vue'
import PlayerSetupPage from '../views/PlayerSetupPage.vue'
import GamePage from '../views/GamePage.vue'
import BetweenTurnsPage from '../views/BetweenTurnsPage.vue'
import WinPage from '../views/WinPage.vue'
import LeaderboardPage from '../views/LeaderboardPage.vue'
import HistoryPage from '../views/HistoryPage.vue'
import YahtzeeSetupPage from '../views/YahtzeeSetupPage.vue'
import YahtzeeGamePage from '../views/YahtzeeGamePage.vue'
import LRCSetupPage from '../views/LRCSetupPage.vue'
import LRCGamePage from '../views/LRCGamePage.vue'
import DiceGameSetupPage from '../views/DiceGameSetupPage.vue'
import FarkleGamePage from '../views/FarkleGamePage.vue'
import SCCGamePage from '../views/SCCGamePage.vue'
import PigGamePage from '../views/PigGamePage.vue'
import SpadesSetupPage from '../views/SpadesSetupPage.vue'
import SpadesGamePage from '../views/SpadesGamePage.vue'
import BlackjackSetupPage from '../views/BlackjackSetupPage.vue'
import BlackjackGamePage from '../views/BlackjackGamePage.vue'

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
    { path: '/history',       name: 'History',       component: HistoryPage },
    { path: '/yahtzee/setup', name: 'YahtzeeSetup',  component: YahtzeeSetupPage },
    { path: '/yahtzee',       name: 'YahtzeeGame',   component: YahtzeeGamePage },
    { path: '/lrc/setup',     name: 'LRCSetup',      component: LRCSetupPage },
    { path: '/lrc',           name: 'LRCGame',       component: LRCGamePage },
    // One setup page serves all three dice games; the variant selects title, target and rules.
    { path: '/dice/:variant/setup', name: 'DiceSetup', component: DiceGameSetupPage },
    { path: '/dice/farkle',   name: 'FarkleGame',    component: FarkleGamePage },
    { path: '/dice/scc',      name: 'SCCGame',       component: SCCGamePage },
    { path: '/dice/pig',      name: 'PigGame',       component: PigGamePage },
    { path: '/spades/setup',  name: 'SpadesSetup',   component: SpadesSetupPage },
    { path: '/spades',        name: 'SpadesGame',    component: SpadesGamePage },
    { path: '/blackjack/setup', name: 'BlackjackSetup', component: BlackjackSetupPage },
    { path: '/blackjack',     name: 'BlackjackGame', component: BlackjackGamePage },
  ],
})

/**
 * Opening the app lands on the main menu, always.
 *
 * A game in progress used to hijack that: the home page redirected straight into darts or
 * Left Right Center, so on an iPad the app never showed its own menu. The home screen now
 * offers every unfinished game back explicitly — see lib/resumable — which covers the five
 * games the redirect never knew about as well.
 *
 * The one exception is a darts game that has finished but never reached the win screen,
 * because that screen is where the result is recorded: it credits the win, counts the game
 * for each player and posts the result to the API. Landing on the menu instead would drop
 * that silently, so a finished game is still sent to collect it.
 */
router.beforeEach((to) => {
  if (to.path !== '/') return
  try {
    const raw = localStorage.getItem('darts_active_game')
    if (!raw) return
    if (JSON.parse(raw).status === 'finished') return '/win'
  } catch { /* a corrupt save must not block the menu */ }
})

export default router

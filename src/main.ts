import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Ripple, Dialog } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'
import App from './App.vue'
import router from './router'
import './style.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(Quasar, {
    plugins: { Dialog },
    directives: { Ripple },
    config: { dark: true },
  })
  .mount('#app')

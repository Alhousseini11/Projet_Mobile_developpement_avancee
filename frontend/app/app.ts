import { createApp } from 'nativescript-vue'

import AppShell from './AppShell.vue'
import AuthService, { authState } from './services/AuthService'
import { navigationState } from './utils/navigation'

createApp(AppShell).start()

void AuthService.initializeSession().then(() => {
  navigationState.stack.splice(0, navigationState.stack.length, {
    page: authState.isAuthenticated ? 'home' : 'login',
    props: {}
  })
})

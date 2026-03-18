import { createApp } from 'nativescript-vue'

import AppShell from './AppShell.vue'
import AuthService, { authState } from './services/AuthService'
import { navigationState } from './utils/navigation'

AuthService.initializeSession()

navigationState.stack.splice(0, navigationState.stack.length, {
  page: authState.isAuthenticated ? 'home' : 'login',
  props: {}
})

createApp(AppShell).start()

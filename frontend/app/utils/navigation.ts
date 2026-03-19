import { reactive } from 'nativescript-vue'
import { authState } from '@/services/AuthService'

export type AppPage =
  | 'login'
  | 'register'
  | 'forgotPassword'
  | 'home'
  | 'reservations'
  | 'myAppointments'
  | 'myInformation'
  | 'invoices'
  | 'tutorials'
  | 'vehicles'
  | 'vehicleDetails'
  | 'addVehicle'
  | 'paymentMethods'
  | 'reviews'
  | 'profile'

interface NavigationOptions {
  currentPage?: AppPage
  clearHistory?: boolean
  props?: Record<string, unknown>
}

interface PageEntry {
  page: AppPage
  props: Record<string, unknown>
}

type PageModule = {
  default?: unknown
}

const pageRegistry: Record<AppPage, () => PageModule | unknown> = {
  login: () => require('@/components/Login.vue'),
  register: () => require('@/components/Register.vue'),
  forgotPassword: () => require('@/components/ForgotPassword.vue'),
  home: () => require('@/components/Home.vue'),
  reservations: () => require('@/components/Reservations.vue'),
  myAppointments: () => require('@/components/MyAppointments.vue'),
  myInformation: () => require('@/components/MyInformation.vue'),
  invoices: () => require('@/components/Invoices.vue'),
  tutorials: () => require('@/components/Tutorials.vue'),
  vehicles: () => require('@/components/Vehicles.vue'),
  vehicleDetails: () => require('@/components/VehicleDetails.vue'),
  addVehicle: () => require('@/components/AddVehicle.vue'),
  paymentMethods: () => require('@/components/PaymentMethods.vue'),
  reviews: () => require('@/components/Reviews.vue'),
  profile: () => require('@/components/Profile.vue')
}

export const navigationState = reactive<{
  stack: PageEntry[]
}>({
  stack: [
    {
      page: 'login',
      props: {}
    }
  ]
})

function resolveGuardedPage(page: AppPage) {
  const publicPages: AppPage[] = ['login', 'register', 'forgotPassword']

  if (!authState.isAuthenticated && !publicPages.includes(page)) {
    return 'login' as AppPage
  }

  if (authState.isAuthenticated && publicPages.includes(page)) {
    return 'home' as AppPage
  }

  return page
}

function normalizePageModule(module: PageModule | unknown) {
  if (!module) {
    return null
  }

  if (typeof module === 'object' && module !== null && 'default' in module) {
    return (module as PageModule).default ?? null
  }

  return module
}

export function getCurrentPageComponent(page: AppPage) {
  return normalizePageModule(pageRegistry[page]?.())
}

export function navigateToPage(page: AppPage, options: NavigationOptions = {}) {
  const nextPage = resolveGuardedPage(page)
  const currentEntry = navigationState.stack[navigationState.stack.length - 1]

  if (!getCurrentPageComponent(nextPage)) {
    console.error(`Unknown page: ${nextPage}`)
    return
  }

  if ((options.currentPage && options.currentPage === nextPage) || currentEntry?.page === nextPage) {
    return
  }

  const nextEntry: PageEntry = {
    page: nextPage,
    props: options.props ?? {}
  }

  if (options.clearHistory) {
    navigationState.stack.splice(0, navigationState.stack.length, nextEntry)
    return
  }

  navigationState.stack.push(nextEntry)
}

export function goBack() {
  if (navigationState.stack.length <= 1) {
    return
  }

  navigationState.stack.pop()
}

<template>
  <Page @loaded="onPageLoaded" class="bg-gray-900">
    <!-- ActionBar with Menu -->
    <ActionBar title="Mon Garage" class="bg-red-600">
      <GridLayout columns="auto,*,auto" class="w-full">
        <!-- Menu Hamburger -->
        <GridLayout
          col="0"
          rows="auto,auto,auto"
          class="justify-center items-center px-4 py-2"
          @tap="toggleMenu"
        >
          <StackLayout row="0" class="h-1 bg-white mb-1" width="24" />
          <StackLayout row="1" class="h-1 bg-white mb-1" width="24" />
          <StackLayout row="2" class="h-1 bg-white" width="24" />
        </GridLayout>

        <!-- Title -->
        <Label col="1" text="Tableau de Bord" class="text-white text-lg font-bold text-center" />

        <!-- Settings Icon -->
        <Label
          col="2"
          text="⚙️"
          class="text-white text-2xl px-4 py-2"
          @tap="openSettings"
        />
      </GridLayout>
    </ActionBar>

    <!-- Side Menu (Drawer) -->
    <GridLayout
      v-if="menuOpen"
      rows="*"
      columns="*"
      class="absolute z-50 w-full h-full bg-black/50"
      @tap="toggleMenu"
    >
      <StackLayout
        class="bg-gray-800 w-64 h-full px-4 py-6"
        @tap.stop="() => {}"
      >
        <!-- Menu Header -->
        <GridLayout rows="auto" columns="auto,*" class="mb-6 items-center">
          <Label col="0" text="👤" class="text-3xl mr-3" />
          <StackLayout col="1">
            <Label text="Alex Dupont" class="text-white font-bold text-lg" />
            <Label text="alex@example.com" class="text-gray-400 text-sm" />
          </StackLayout>
        </GridLayout>

        <Separator class="bg-gray-600 mb-4" />

        <!-- Menu Items -->
        <StackLayout class="mb-4">
          <Label text="MENU" class="text-gray-500 text-xs font-bold mb-3" />
          <GridLayout
            rows="auto"
            columns="auto,*"
            class="mb-4 items-center"
            @tap="handleMenuItem('home'); toggleMenu()"
          >
            <Label col="0" text="🏠" class="text-xl mr-3 text-red-600" />
            <Label col="1" text="Accueil" class="text-white" />
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="auto,*"
            class="mb-4 items-center"
            @tap="handleMenuItem('reservations'); toggleMenu()"
          >
            <Label col="0" text="📅" class="text-xl mr-3 text-red-600" />
            <Label col="1" text="Mes Rendez-vous" class="text-white" />
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="auto,*"
            class="mb-4 items-center"
            @tap="handleMenuItem('vehicles'); toggleMenu()"
          >
            <Label col="0" text="🚗" class="text-xl mr-3 text-red-600" />
            <Label col="1" text="Mes Véhicules" class="text-white" />
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="auto,*"
            class="mb-4 items-center"
            @tap="handleMenuItem('tutorials'); toggleMenu()"
          >
            <Label col="0" text="🎓" class="text-xl mr-3 text-red-600" />
            <Label col="1" text="Tutoriels" class="text-white" />
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="auto,*"
            class="mb-4 items-center"
            @tap="handleMenuItem('profile'); toggleMenu()"
          >
            <Label col="0" text="⚙️" class="text-xl mr-3 text-red-600" />
            <Label col="1" text="Paramètres" class="text-white" />
          </GridLayout>
        </StackLayout>

        <Separator class="bg-gray-600 mb-4" />

        <!-- Logout -->
        <GridLayout
          rows="auto"
          columns="auto,*"
          class="items-center mt-4"
          @tap="logout"
        >
          <Label col="0" text="🚪" class="text-xl mr-3 text-red-600" />
          <Label col="1" text="Déconnexion" class="text-white" />
        </GridLayout>
      </StackLayout>
    </GridLayout>

    <!-- Main Content -->
    <GridLayout rows="*,60" class="bg-gray-900">
      <ScrollView row="0" class="bg-gray-900">
        <StackLayout class="px-4 py-6">
          <!-- Welcome Card -->
          <GridLayout
            rows="auto,auto,auto"
            columns="*"
            class="bg-red-700 rounded-xl p-6 mb-6"
          >
            <Label
              row="0"
              :text="`Bonjour ${userName}!`"
              class="text-white text-2xl font-bold mb-2"
            />
            <Label
              row="1"
              text="Prochain rendez-vous:"
              class="text-red-100 text-sm mb-1"
            />
            <Label
              row="2"
              text="📅 Lundi 12 Juillet à 10h00"
              class="text-white text-lg font-bold"
            />
          </GridLayout>

          <!-- Search & Promotion Section -->
          <StackLayout class="mb-6">
            <Label
              text="🎯 Découvrez nos Promotions"
              class="text-white text-lg font-bold mb-3"
            />

            <!-- Search Bar -->
            <GridLayout
              rows="auto"
              columns="*,auto"
              class="bg-gray-800 rounded-lg px-4 py-3 mb-4 items-center"
            >
              <TextField
                col="0"
                v-model="searchPromo"
                hint="Rechercher une promo..."
                class="text-white placeholder-gray-500"
              />
              <Label
                col="1"
                text="🔍"
                class="text-white text-xl"
                @tap="searchPromotions"
              />
            </GridLayout>

            <!-- Promotion Cards -->
            <GridLayout
              rows="auto"
              columns="*"
              class="bg-yellow-500 rounded-xl overflow-hidden mb-4 shadow-md"
              @tap="viewPromotion(0)"
            >
              <StackLayout class="p-4">
                <!-- Image Placeholder -->
                <GridLayout
                  rows="120"
                  columns="*"
                  class="bg-yellow-400 rounded-lg mb-4 items-center justify-center"
                >
                  <Label text="🛠️" class="text-6xl" />
                </GridLayout>

                <!-- Promo Details -->
                <Label
                  text="OFFRE SPÉCIALE - 20% DE RÉDUCTION"
                  class="text-white font-bold text-lg mb-1"
                />
                <Label
                  text="Entretien complet de freins + plaquettes"
                  class="text-yellow-100 text-sm mb-2"
                />
                <Label
                  text="Valid jusqu'au 31 Mars 2026"
                  class="text-yellow-50 text-xs"
                />
              </StackLayout>
            </GridLayout>

            <GridLayout
              rows="auto"
              columns="*"
              class="bg-blue-600 rounded-xl overflow-hidden shadow-md"
              @tap="viewPromotion(1)"
            >
              <StackLayout class="p-4">
                <!-- Image Placeholder -->
                <GridLayout
                  rows="120"
                  columns="*"
                  class="bg-blue-500 rounded-lg mb-4 items-center justify-center"
                >
                  <Label text="🛞" class="text-6xl" />
                </GridLayout>

                <!-- Promo Details -->
                <Label
                  text="PNEUS USÉS? CHANGEZ LES!"
                  class="text-white font-bold text-lg mb-1"
                />
                <Label
                  text="Achat 3 pneus + 1 GRATUIT (Michelin & Goodyear)"
                  class="text-blue-100 text-sm mb-2"
                />
                <Label
                  text="Code: PNEUS2026"
                  class="text-blue-50 text-xs font-bold"
                />
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <!-- CTA Button - Prendre RDV -->
          <GridLayout
            rows="auto"
            columns="*"
            class="bg-red-600 rounded-xl p-5 mb-6"
            @tap="navigateTo('reservations')"
          >
            <StackLayout rows="auto" class="items-center justify-center">
              <Label
                text="📅 PRENDRE UN RENDEZ-VOUS"
                class="text-white text-center font-bold text-base mb-1"
              />
              <Label
                text="Réservez maintenant votre créneau"
                class="text-red-100 text-center text-xs"
              />
            </StackLayout>
          </GridLayout>

          <!-- Reminders Section -->
          <StackLayout class="mb-4">
            <GridLayout columns="*,auto" class="items-center mb-3">
              <Label col="0" text="🔔 Mes Rappels & Alertes" class="text-white text-lg font-bold" />
              <Label
                col="1"
                text="3"
                class="bg-red-600 text-white rounded-full text-center text-sm font-bold w-6 h-6"
              />
            </GridLayout>

            <!-- Reminder 1 - Important -->
            <GridLayout
              rows="auto,auto"
              columns="auto,*,auto"
              class="bg-red-900/30 border-l-4 border-red-500 rounded-lg p-4 mb-3"
            >
              <Label col="0" row="0" text="⚠️" class="text-xl text-red-500 mr-3" />
              <StackLayout col="1" rows="auto,auto">
                <Label
                  text="Vidange moteur"
                  class="text-white font-bold text-base"
                />
                <Label
                  text="À faire dans 500 km - Très important!"
                  class="text-red-200 text-xs mt-1"
                />
              </StackLayout>
              <Label col="2" row="0" text="🔴" class="text-lg text-red-500" />
            </GridLayout>

            <!-- Reminder 2 - Warning -->
            <GridLayout
              rows="auto,auto"
              columns="auto,*,auto"
              class="bg-yellow-900/30 border-l-4 border-yellow-500 rounded-lg p-4 mb-3"
            >
              <Label col="0" row="0" text="⚡" class="text-xl text-yellow-500 mr-3" />
              <StackLayout col="1" rows="auto,auto">
                <Label
                  text="Contrôle technique"
                  class="text-white font-bold text-base"
                />
                <Label
                  text="À effectuer dans 2 mois"
                  class="text-yellow-200 text-xs mt-1"
                />
              </StackLayout>
              <Label col="2" row="0" text="🟡" class="text-lg text-yellow-500" />
            </GridLayout>

            <!-- Reminder 3 - Info -->
            <GridLayout
              rows="auto,auto"
              columns="auto,*,auto"
              class="bg-green-900/30 border-l-4 border-green-500 rounded-lg p-4"
            >
              <Label col="0" row="0" text="✅" class="text-xl text-green-500 mr-3" />
              <StackLayout col="1" rows="auto,auto">
                <Label
                  text="Assurance auto"
                  class="text-white font-bold text-base"
                />
                <Label
                  text="À jour jusqu'au 15 mai 2026"
                  class="text-green-200 text-xs mt-1"
                />
              </StackLayout>
              <Label col="2" row="0" text="🟢" class="text-lg text-green-500" />
            </GridLayout>
          </StackLayout>

          <!-- Quick Actions -->
          <StackLayout class="mb-4">
            <Label text="Actions Rapides" class="text-white text-lg font-bold mb-3" />

            <GridLayout rows="auto" columns="*,*,*" column-spacing="8">
              <GridLayout
                col="0"
                rows="auto,auto"
                class="bg-gray-800 rounded-lg p-3 items-center justify-center"
                @tap="navigateTo('vehicles')"
              >
                <Label row="0" text="🚗" class="text-3xl mb-2" />
                <Label
                  row="1"
                  text="Véhicules"
                  class="text-gray-300 text-center text-xs font-bold"
                />
              </GridLayout>

              <GridLayout
                col="1"
                rows="auto,auto"
                class="bg-gray-800 rounded-lg p-3 items-center justify-center"
                @tap="navigateTo('tutorials')"
              >
                <Label row="0" text="🎓" class="text-3xl mb-2" />
                <Label
                  row="1"
                  text="Tutoriels"
                  class="text-gray-300 text-center text-xs font-bold"
                />
              </GridLayout>

              <GridLayout
                col="2"
                rows="auto,auto"
                class="bg-gray-800 rounded-lg p-3 items-center justify-center"
                @tap="navigateTo('profile')"
              >
                <Label row="0" text="👤" class="text-3xl mb-2" />
                <Label
                  row="1"
                  text="Profil"
                  class="text-gray-300 text-center text-xs font-bold"
                />
              </GridLayout>
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <!-- Bottom Navigation Bar -->
      <GridLayout
        row="1"
        columns="*,*,*,*,*"
        class="bg-gray-800 border-t border-gray-700"
      >
        <GridLayout col="0" class="items-center justify-center" @tap="navigateTo('home')">
          <Label text="🏠" class="text-2xl text-red-600 font-bold" />
        </GridLayout>
        <GridLayout col="1" class="items-center justify-center" @tap="navigateTo('reservations')">
          <Label text="📅" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="2" class="items-center justify-center" @tap="navigateTo('tutorials')">
          <Label text="🎓" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="3" class="items-center justify-center" @tap="navigateTo('vehicles')">
          <Label text="🚗" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="4" class="items-center justify-center" @tap="navigateTo('profile')">
          <Label text="👤" class="text-2xl text-gray-400" />
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'nativescript-vue'
import { HomeService } from '../services/HomeService'

// Services
const homeService = new HomeService()

// States
const userName = ref('')
const promotions = ref<any[]>([])
const reminders = ref<any[]>([])
const upcomingReservation = ref<any>(null)
const menuOpen = ref(false)
const searchPromo = ref('')
const loading = ref(false)
const error = ref('')

// Computed
const filteredPromotions = computed(() =>
  promotions.value.filter(p =>
    p.title.toLowerCase().includes(searchPromo.value.toLowerCase())
  )
)

async function loadHomeData() {
  try {
    loading.value = true
    error.value = ''
    const data = await homeService.getHomeData()
    userName.value = data.userName
    promotions.value = data.promotions
    reminders.value = data.reminders
    upcomingReservation.value = data.upcomingReservation
  } catch (err) {
    error.value = 'Erreur: Impossible de charger les données'
    console.error('Home data error:', err)
  } finally {
    loading.value = false
  }
}

function onPageLoaded() {
  loadHomeData()
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function handleMenuItem(page: string) {
  navigateTo(page)
}

function navigateTo(page: string) {
  console.log('Navigate to:', page)
  // TODO: integrate with router/navigation
}

function openSettings() {
  console.log('Open settings')
}

function logout() {
  try {
    localStorage.removeItem('authToken')
    userName.value = ''
    promotions.value = []
    reminders.value = []
    menuOpen.value = false
    navigateTo('login')
  } catch (err) {
    console.error('Logout error:', err)
  }
}

function searchPromotions() {
  // Filter is already done via computed property
  console.log('Searching for:', searchPromo.value)
}

function viewPromotion(index: number) {
  console.log('View promotion:', index)
  // TODO: navigate to promotion details
}

onMounted(() => {
  loadHomeData()
})
</script>

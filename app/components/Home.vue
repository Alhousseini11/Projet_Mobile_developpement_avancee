<template>
  <Page @loaded="onPageLoaded" class="bg-gray-900">
    <ActionBar title="Accueil" class="bg-red-600">
      <Label text="⚙️" class="text-white text-2xl absolute right-4" @tap="openSettings" />
    </ActionBar>

    <GridLayout rows="*,60" class="bg-gray-900">
      <!-- Main Content -->
      <ScrollView row="0" class="bg-gray-900">
        <StackLayout class="px-4 py-6">
          <!-- Welcome Header -->
          <GridLayout
            rows="auto,auto,auto"
            columns="*"
            class="bg-red-600 rounded-lg p-6 mb-6"
          >
            <Label
              row="0"
              text="Bonjour Alex!"
              class="text-white text-2xl font-bold mb-2"
            />
            <Label
              row="1"
              text="Prochain RDV:"
              class="text-red-100 text-sm mb-1"
            />
            <Label
              row="2"
              text="Lundi 12 Juillet à 10h"
              class="text-white text-lg font-bold"
            />
          </GridLayout>

          <!-- Action Buttons -->
          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 mb-4"
            @tap="navigateTo('reservations')"
          >
            <Label
              text="📅 Prendre RDV"
              class="text-red-600 text-center font-bold text-lg"
            />
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 mb-4"
            @tap="navigateTo('tutorials')"
          >
            <Label
              text="🎓 Tutoriels"
              class="text-red-600 text-center font-bold text-lg"
            />
          </GridLayout>

          <!-- Promo Section -->
          <GridLayout
            rows="auto"
            columns="*"
            class="bg-yellow-600 rounded-lg p-4 mb-6"
          >
            <StackLayout class="items-center">
              <Label
                text="🎉"
                class="text-4xl mb-2"
              />
              <Label
                text="Promos: 20% sur les freins!"
                class="text-white text-center font-bold text-lg"
              />
            </StackLayout>
          </GridLayout>

          <!-- Info Section -->
          <Label
            text="Reminders"
            class="text-white text-lg font-bold mb-3"
          />

          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500 mb-3"
          >
            <Label
              text="🔔 Vidange à faire dans 500 km"
              class="text-gray-300 text-base"
            />
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500 mb-6"
          >
            <Label
              text="✅ Contrôle technique à jour"
              class="text-gray-300 text-base"
            />
          </GridLayout>

          <!-- Quick Links -->
          <Label
            text="Services"
            class="text-white text-lg font-bold mb-3"
          />

          <GridLayout rows="auto" columns="*,*" class="mb-4" column-spacing="12">
            <GridLayout
              col="0"
              rows="auto,auto"
              class="bg-gray-800 rounded-lg p-4 items-center justify-center"
            >
              <Label
                row="0"
                text="🚗"
                class="text-3xl mb-2"
              />
              <Label
                row="1"
                text="Mes Véhicules"
                class="text-gray-300 text-center text-sm"
              />
            </GridLayout>

            <GridLayout
              col="1"
              rows="auto,auto"
              class="bg-gray-800 rounded-lg p-4 items-center justify-center"
              @tap="navigateTo('profile')"
            >
              <Label
                row="0"
                text="👤"
                class="text-3xl mb-2"
              />
              <Label
                row="1"
                text="Mon Profil"
                class="text-gray-300 text-center text-sm"
              />
            </GridLayout>
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <!-- Bottom Navigation -->
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

<script lang="ts">
export default {
  name: 'Home',
  data() {
    return {
      userName: 'Alex'
    }
  },
  methods: {
    onPageLoaded() {
      console.log('Home page loaded')
    },
    navigateTo(page: string) {
      console.log('Navigate to:', page)
      // Implement proper navigation when router is set up
    },
    openSettings() {
      console.log('Open settings')
    }
  }
}
</script>

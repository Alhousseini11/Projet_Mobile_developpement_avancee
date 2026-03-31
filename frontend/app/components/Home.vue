<template>
  <Page actionBarHidden="true" @loaded="onPageLoaded" class="page">
    <GridLayout rows="*,72" class="page-shell">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout rows="68,146" class="hero-card">
            <GridLayout row="0" columns="56,*,56" class="hero-topbar">
              <Label text="☰" col="0" class="hero-menu" />
              <BrandLogo col="1" size="compact" class="hero-brand-logo" />
              <Label text="● ● ●" col="2" class="hero-status" />
            </GridLayout>

            <GridLayout row="1" class="hero-visual">
              <GridLayout class="hero-shade" />
              <GridLayout class="hero-glow hero-glow-left" />
              <GridLayout class="hero-glow hero-glow-right" />
              <Label text="Garage" class="hero-watermark" />
              <Label text="🚗" class="hero-car" />

              <StackLayout class="hero-copy">
                <Label :text="'Bonjour ' + homeFeed.displayName + '!'" class="hero-title" />
                <Label text="Prochain RDV:" class="hero-subtitle" />
                <Label :text="homeFeed.nextAppointmentLabel" class="hero-appointment" textWrap="true" />
              </StackLayout>
            </GridLayout>
          </GridLayout>

          <StackLayout class="action-stack">
            <GridLayout
              v-for="action in quickActions"
              :key="action.id"
              columns="56,*"
              class="action-card"
              :class="action.variant"
              @tap="navigateTo(action.page)"
            >
              <GridLayout col="0" class="action-icon-shell">
                <Label :text="action.icon" class="action-icon" />
              </GridLayout>
              <Label col="1" :text="action.label" class="action-label" />
            </GridLayout>
          </StackLayout>

          <GridLayout columns="40,*" class="banner promo-banner">
            <Label text="🎁" col="0" class="banner-icon" />
            <Label :text="homeFeed.promoMessage" col="1" class="banner-text" textWrap="true" />
          </GridLayout>

          <GridLayout columns="40,*" class="banner reminder-banner">
            <Label text="⏰" col="0" class="banner-icon" />
            <Label :text="homeFeed.reminderMessage" col="1" class="banner-text dark" textWrap="true" />
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item active" @tap="navigateTo('home')">
          <StackLayout class="nav-stack">
            <Label text="🏠" class="nav-icon" />
            <Label text="Accueil" class="nav-label" />
          </StackLayout>
        </GridLayout>

        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <StackLayout class="nav-stack">
            <Label text="📅" class="nav-icon" />
            <Label text="Reserver" class="nav-label" />
          </StackLayout>
        </GridLayout>

        <GridLayout col="2" class="nav-item" @tap="navigateTo('tutorials')">
          <StackLayout class="nav-stack">
            <Label text="🎥" class="nav-icon" />
            <Label text="Tutoriels" class="nav-label" />
          </StackLayout>
        </GridLayout>

        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <StackLayout class="nav-stack">
            <Label text="🚗" class="nav-icon" />
            <Label text="Vehicules" class="nav-label" />
          </StackLayout>
        </GridLayout>

        <GridLayout col="4" class="nav-item" @tap="navigateTo('profile')">
          <StackLayout class="nav-stack">
            <Label text="👤" class="nav-icon" />
            <Label text="Profil" class="nav-label" />
          </StackLayout>
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue'
import BrandLogo from '@/components/BrandLogo.vue'
import AuthService from '@/services/AuthService'
import HomeService from '@/services/HomeService'
import { navigateToPage, type AppPage } from '@/utils/navigation'
import type { HomeFeed } from '@/types/home'

interface QuickAction {
  id: string
  label: string
  icon: string
  page: AppPage
  variant: 'primary' | 'dark'
}

const homeFeed = ref<HomeFeed>(HomeService.getFallbackFeed())

const quickActions: QuickAction[] = [
  {
    id: 'rdv',
    label: 'Prendre RDV',
    icon: '🗓',
    page: 'reservations',
    variant: 'primary'
  },
  {
    id: 'tutorials',
    label: 'Tutoriels',
    icon: '📹',
    page: 'tutorials',
    variant: 'dark'
  },
  {
    id: 'vehicles',
    label: 'Mes Vehicules',
    icon: '🚘',
    page: 'vehicles',
    variant: 'dark'
  }
]

async function onPageLoaded() {
  if (!AuthService.isAuthenticated()) {
    void navigateToPage('login', { clearHistory: true })
    return
  }

  homeFeed.value = HomeService.getFallbackFeed()
  homeFeed.value = await HomeService.getHomeFeed()
  console.log('Home page loaded')
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'home' })
}
</script>

<style scoped>
.page {
  background-color: #eceef2;
}

.page-shell {
  background-color: #eceef2;
}

.content {
  padding: 16 16 26 16;
}

.hero-card {
  border-radius: 22;
  overflow: hidden;
  margin-bottom: 18;
  background-color: #151a24;
  shadow-color: #000000;
  shadow-opacity: 0.2;
  shadow-radius: 16;
  shadow-offset: 0 6;
}

.hero-topbar {
  background-color: #ffffff;
  padding: 8 14;
  vertical-align: center;
}

.hero-menu {
  font-size: 21;
  color: #e53a33;
  font-weight: 700;
  horizontal-align: center;
  vertical-align: center;
}

.hero-brand-logo {
  horizontal-align: center;
  vertical-align: center;
}

.hero-status {
  color: #e53a33;
  font-size: 9;
  horizontal-align: center;
  vertical-align: center;
}

.hero-visual {
  background-color: #212734;
}

.hero-shade {
  background-color: rgba(8, 11, 18, 0.7);
}

.hero-glow {
  width: 160;
  height: 160;
  border-radius: 80;
  opacity: 0.85;
}

.hero-glow-left {
  background-color: rgba(255, 255, 255, 0.08);
  horizontal-align: left;
  vertical-align: top;
  margin-left: -30;
  margin-top: -20;
}

.hero-glow-right {
  background-color: rgba(229, 58, 51, 0.65);
  horizontal-align: right;
  vertical-align: center;
  margin-right: -22;
}

.hero-watermark {
  color: rgba(255, 255, 255, 0.08);
  font-size: 56;
  font-weight: 900;
  letter-spacing: 2;
  horizontal-align: left;
  vertical-align: bottom;
  margin-left: 12;
  margin-bottom: -2;
}

.hero-car {
  font-size: 72;
  horizontal-align: right;
  vertical-align: center;
  margin-right: 18;
  margin-top: 4;
}

.hero-copy {
  horizontal-align: left;
  vertical-align: center;
  margin-left: 18;
  margin-right: 122;
}

.hero-title {
  color: #ffffff;
  font-size: 24;
  font-weight: 800;
  margin-bottom: 6;
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.86);
  font-size: 14;
  font-weight: 600;
  margin-bottom: 4;
}

.hero-appointment {
  color: #ffffff;
  font-size: 16;
  font-weight: 700;
}

.action-stack {
  margin-bottom: 16;
}

.action-card {
  border-radius: 12;
  padding: 8 14;
  margin-bottom: 10;
  vertical-align: center;
  shadow-color: #000000;
  shadow-opacity: 0.16;
  shadow-radius: 10;
  shadow-offset: 0 3;
}

.action-card.primary {
  background-color: #ef4339;
}

.action-card.dark {
  background-color: #2b3443;
}

.action-icon-shell {
  width: 34;
  height: 34;
  border-radius: 8;
  background-color: rgba(255, 255, 255, 0.14);
  vertical-align: center;
  horizontal-align: left;
}

.action-icon {
  color: #ffffff;
  font-size: 18;
  text-align: center;
  vertical-align: center;
}

.action-label {
  color: #ffffff;
  font-size: 18;
  font-weight: 700;
  vertical-align: center;
  margin-left: 12;
}

.banner {
  border-radius: 10;
  padding: 10 12;
  margin-bottom: 10;
  vertical-align: center;
}

.promo-banner {
  background-color: #df4a43;
}

.reminder-banner {
  background-color: #e6e8ec;
}

.banner-icon {
  font-size: 18;
  text-align: center;
  vertical-align: center;
}

.banner-text {
  color: #ffffff;
  font-size: 16;
  font-weight: 700;
  vertical-align: center;
}

.banner-text.dark {
  color: #242b35;
}

.bottom-nav {
  background-color: #161c27;
  border-top-left-radius: 18;
  border-top-right-radius: 18;
  border-top-width: 1;
  border-top-color: rgba(255, 255, 255, 0.05);
}

.nav-item {
  align-items: center;
  justify-content: center;
  padding: 8 2 6 2;
}

.nav-stack {
  horizontal-align: center;
  vertical-align: center;
  height: 60;
}

.nav-icon {
  font-size: 22;
  text-align: center;
  color: #f0f2f6;
  margin-bottom: 4;
  vertical-align: top;
}

.nav-label {
  font-size: 11;
  font-weight: 700;
  text-align: center;
  color: #f0f2f6;
  vertical-align: bottom;
}

.nav-item.active .nav-icon {
  color: #e53a33;
}

.nav-item.active .nav-label {
  color: #e53a33;
}
</style>

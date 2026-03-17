<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Mes informations" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout columns="76,*" class="hero-card">
            <GridLayout col="0" class="avatar-shell">
              <Label :text="initials" class="avatar-text" />
            </GridLayout>

            <StackLayout col="1" class="hero-copy">
              <Label :text="profile.fullName" class="hero-title" />
              <Label :text="profile.membershipLabel" class="hero-subtitle" />
              <Label
                :text="profile.verified ? 'Compte verifie et actif' : 'Compte a completer'"
                class="hero-meta"
              />
            </StackLayout>
          </GridLayout>

          <GridLayout columns="*,*" columnSpacing="12" class="summary-grid">
            <StackLayout col="0" class="summary-card">
              <Label :text="String(profile.appointmentCount).padStart(2, '0')" class="summary-value" />
              <Label text="Rendez-vous" class="summary-label" />
            </StackLayout>

            <StackLayout col="1" class="summary-card summary-card-dark">
              <Label :text="String(profile.loyaltyPoints)" class="summary-value light" />
              <Label text="Points fidelite" class="summary-label light" />
            </StackLayout>
          </GridLayout>

          <Label text="Coordonnees" class="section-title" />
          <StackLayout class="section-card">
            <GridLayout columns="*,auto" class="info-row">
              <StackLayout col="0">
                <Label text="Nom complet" class="info-label" />
                <Label :text="profile.fullName" class="info-value" />
              </StackLayout>
              <Label col="1" text="ID" class="info-tag" />
            </GridLayout>

            <GridLayout columns="*,auto" class="info-row">
              <StackLayout col="0">
                <Label text="Email" class="info-label" />
                <Label :text="profile.email" class="info-value" />
              </StackLayout>
              <Label col="1" text="MAIL" class="info-tag muted" />
            </GridLayout>

            <GridLayout columns="*,auto" class="info-row">
              <StackLayout col="0">
                <Label text="Telephone" class="info-label" />
                <Label :text="profile.phone" class="info-value" />
              </StackLayout>
              <Label col="1" text="TEL" class="info-tag muted" />
            </GridLayout>

            <GridLayout columns="*,auto" class="info-row last">
              <StackLayout col="0">
                <Label text="Adresse" class="info-label" />
                <Label :text="profile.addressLine + ', ' + profile.city" class="info-value" textWrap="true" />
              </StackLayout>
              <Label col="1" text="ADR" class="info-tag muted" />
            </GridLayout>
          </StackLayout>

          <Label text="Profil client" class="section-title" />
          <StackLayout class="section-card">
            <GridLayout columns="*,auto" class="info-row">
              <StackLayout col="0">
                <Label text="Garage prefere" class="info-label" />
                <Label :text="profile.preferredGarage" class="info-value" />
              </StackLayout>
              <Label col="1" text="GAR" class="info-tag muted" />
            </GridLayout>

            <GridLayout columns="*,auto" class="info-row">
              <StackLayout col="0">
                <Label text="Vehicule principal" class="info-label" />
                <Label :text="profile.defaultVehicleLabel" class="info-value" />
              </StackLayout>
              <Label col="1" text="CAR" class="info-tag muted" />
            </GridLayout>

            <GridLayout columns="*,auto" class="info-row">
              <StackLayout col="0">
                <Label text="Membre depuis" class="info-label" />
                <Label :text="memberSinceLabel" class="info-value" />
              </StackLayout>
              <Label col="1" text="DATE" class="info-tag muted" />
            </GridLayout>

            <GridLayout columns="*,auto" class="info-row last">
              <StackLayout col="0">
                <Label text="Notes client" class="info-label" />
                <Label :text="profile.notes" class="info-value" textWrap="true" />
              </StackLayout>
              <Label col="1" text="NOTE" class="info-tag muted" />
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <Label text="Accueil" class="nav-label" />
        </GridLayout>
        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <Label text="Reserver" class="nav-label" />
        </GridLayout>
        <GridLayout col="2" class="nav-item" @tap="navigateTo('tutorials')">
          <Label text="Tutoriels" class="nav-label" />
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <Label text="Vehicules" class="nav-label" />
        </GridLayout>
        <GridLayout col="4" class="nav-item active" @tap="navigateTo('profile')">
          <Label text="Profil" class="nav-label" />
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { computed, ref } from 'nativescript-vue'
import ProfileService from '@/services/ProfileService'
import { formatDate } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'
import type { UserProfile } from '@/types/profile'

const profile = ref<UserProfile>(ProfileService.getFallbackProfile())

const initials = computed(() => {
  return profile.value.fullName
    .split(' ')
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase()
})

const memberSinceLabel = computed(() => {
  return formatDate(new Date(profile.value.memberSince), 'long')
})

async function onPageLoaded() {
  profile.value = await ProfileService.getProfile()
  console.log('My information page loaded')
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'myInformation' })
}

function goBack() {
  void navigateBack()
}
</script>

<style scoped>
.page { background-color: #eef1f5; }
.action-bar { background-color: #1f2733; color: #fff; }
.action-bar-content { padding: 0 12; height: 56; vertical-align: center; }
.icon-back { font-size: 20; color: #fff; }
.action-title { font-size: 18; font-weight: 700; color: #fff; vertical-align: center; }
.page-body { background-color: #eef1f5; }
.content { padding: 16 16 24 16; }
.hero-card { background-color: #ffffff; border-radius: 18; padding: 18; margin-bottom: 14; shadow-color: #000; shadow-opacity: 0.08; shadow-radius: 12; shadow-offset: 0 3; }
.avatar-shell { width: 58; height: 58; border-radius: 29; background-color: #dc2626; vertical-align: top; }
.avatar-text { color: #ffffff; font-size: 18; font-weight: 800; text-align: center; vertical-align: center; }
.hero-copy { margin-left: 14; }
.hero-title { color: #111827; font-size: 22; font-weight: 800; }
.hero-subtitle { color: #6b7280; font-size: 13; font-weight: 600; margin-top: 3; }
.hero-meta { color: #166534; font-size: 12; font-weight: 700; margin-top: 12; }
.summary-grid { margin-bottom: 18; }
.summary-card { background-color: #ffffff; border-radius: 16; padding: 16; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.summary-card-dark { background-color: #1f2733; }
.summary-value { color: #111827; font-size: 24; font-weight: 800; margin-bottom: 4; }
.summary-value.light { color: #ffffff; }
.summary-label { color: #6b7280; font-size: 12; font-weight: 600; }
.summary-label.light { color: #cbd5e1; }
.section-title { color: #1f2733; font-size: 16; font-weight: 800; margin-bottom: 10; }
.section-card { background-color: #ffffff; border-radius: 16; margin-bottom: 18; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.info-row { padding: 14 16; border-bottom-width: 1; border-bottom-color: #edf1f5; }
.info-row.last { border-bottom-width: 0; }
.info-label { color: #6b7280; font-size: 11; font-weight: 700; text-transform: uppercase; }
.info-value { color: #111827; font-size: 15; font-weight: 700; margin-top: 6; }
.info-tag { color: #ffffff; background-color: #dc2626; border-radius: 999; padding: 6 10; font-size: 10; font-weight: 800; vertical-align: center; }
.info-tag.muted { background-color: #eef2f7; color: #475569; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 4 4 4; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 600; text-align: center; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
</style>

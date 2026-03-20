<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Profil" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <GridLayout columns="76,*" class="profile-hero">
            <GridLayout col="0" class="avatar-shell">
              <Label :text="profileInitials" class="avatar-text" />
            </GridLayout>

            <StackLayout col="1" class="hero-copy">
              <Label :text="profile.fullName" class="profile-name" />
              <Label :text="profile.membershipLabel" class="profile-subtitle" />
              <GridLayout columns="auto,auto" class="hero-meta">
                <Label
                  :text="profile.verified ? 'Compte verifie' : 'Profil a completer'"
                  col="0"
                  class="meta-pill"
                />
                <Label :text="'Depuis ' + profile.memberSince.slice(0, 4)" col="1" class="meta-text" />
              </GridLayout>
            </StackLayout>
          </GridLayout>

          <GridLayout columns="*,*" columnSpacing="12" class="summary-grid">
            <StackLayout col="0" class="summary-card">
              <Label :text="String(profile.appointmentCount).padStart(2, '0')" class="summary-value" />
              <Label text="Rendez-vous" class="summary-label" />
            </StackLayout>

            <StackLayout col="1" class="summary-card summary-card-dark">
              <Label :text="profile.membershipLabel" class="summary-value small" />
              <Label text="Plan actif" class="summary-label light" />
            </StackLayout>
          </GridLayout>

          <Label text="Mon compte" class="section-title" />
          <StackLayout class="section-card">
            <GridLayout
              v-for="item in accountItems"
              :key="item.id"
              columns="58,*,auto"
              class="list-item"
              :class="{ featured: item.featured }"
              @tap="handleItemTap(item)"
            >
              <GridLayout col="0" class="item-badge" :class="{ featured: item.featured }">
                <Label :text="item.badge" class="item-badge-text" />
              </GridLayout>

              <StackLayout col="1" class="item-copy">
                <Label :text="item.label" class="item-title" />
                <Label :text="item.description" class="item-description" textWrap="true" />
              </StackLayout>

              <Label col="2" text=">" class="item-chevron" />
            </GridLayout>
          </StackLayout>

          <Label text="Documents et assistance" class="section-title" />
          <StackLayout class="section-card">
            <GridLayout
              v-for="item in supportItems"
              :key="item.id"
              columns="58,*,auto"
              class="list-item compact"
              @tap="handleItemTap(item)"
            >
              <GridLayout col="0" class="item-badge muted">
                <Label :text="item.badge" class="item-badge-text muted" />
              </GridLayout>

              <StackLayout col="1" class="item-copy">
                <Label :text="item.label" class="item-title" />
                <Label :text="item.description" class="item-description" textWrap="true" />
              </StackLayout>

              <Label col="2" text=">" class="item-chevron" />
            </GridLayout>
          </StackLayout>

          <Label text="Session" class="section-title" />
          <StackLayout class="section-card">
            <GridLayout columns="58,*,auto" class="list-item compact" @tap="handleLogout">
              <GridLayout col="0" class="item-badge alert">
                <Label text="OFF" class="item-badge-text alert" />
              </GridLayout>

              <StackLayout col="1" class="item-copy">
                <Label text="Se deconnecter" class="item-title" />
                <Label
                  text="Fermer la session et revenir a l ecran de connexion."
                  class="item-description"
                  textWrap="true"
                />
              </StackLayout>

              <Label col="2" text=">" class="item-chevron" />
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="Accueil" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="Reserver" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
        <GridLayout col="2" class="nav-item" @tap="navigateTo('tutorials')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="Tutoriels" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="Vehicules" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
        <GridLayout col="4" class="nav-item active" @tap="navigateTo('profile')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="Profil" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { alert, confirm } from '@nativescript/core'
import { computed, ref } from 'nativescript-vue'
import AuthService from '@/services/AuthService'
import ProfileService from '@/services/ProfileService'
import type { UserProfile } from '@/types/profile'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'

interface ProfileItem {
  id: string
  label: string
  description: string
  badge: string
  page?: AppPage
  featured?: boolean
}

const accountItems: ProfileItem[] = [
  {
    id: 'appointments',
    label: 'Mes rendez-vous',
    description: 'Consulter les reservations a venir et l historique recent.',
    badge: 'RDV',
    page: 'myAppointments',
    featured: true
  },
  {
    id: 'info',
    label: 'Mes informations',
    description: 'Coordonnees, profil client et preferences personnelles.',
    badge: 'ID',
    page: 'myInformation'
  }
]

const supportItems: ProfileItem[] = [
  {
    id: 'invoice',
    label: 'Factures PDF',
    description: 'Retrouver les documents et justificatifs telechargeables.',
    badge: 'PDF',
    page: 'invoices'
  },
  {
    id: 'payment',
    label: 'Mode de paiement',
    description: 'Gerer vos moyens de paiement et options de facturation.',
    badge: 'CB',
    page: 'paymentMethods'
  },
  {
    id: 'reviews',
    label: 'Avis et evaluations',
    description: 'Partager votre retour sur les interventions du garage.',
    badge: 'AV',
    page: 'reviews'
  },
  {
    id: 'support',
    label: 'Support et FAQ',
    description: 'Aide, questions frequentes et contact atelier.',
    badge: 'FAQ'
  }
]

const profile = ref<UserProfile>(ProfileService.getFallbackProfile())

const profileInitials = computed(() => {
  return profile.value.fullName
    .split(' ')
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase()
})

async function onPageLoaded() {
  profile.value = await ProfileService.getProfile()
  console.log('Profile page loaded')
}

async function handleItemTap(item: ProfileItem) {
  if (item.page) {
    void navigateToPage(item.page, { currentPage: 'profile' })
    return
  }

  await alert({
    title: item.label,
    message: 'Cette section sera disponible bientot.',
    okButtonText: 'OK'
  })
}

async function handleLogout() {
  const approved = await confirm({
    title: 'Deconnexion',
    message: 'Voulez-vous fermer cette session maintenant ?',
    okButtonText: 'Oui',
    cancelButtonText: 'Non'
  })

  if (!approved) {
    return
  }

  AuthService.logout()
  void navigateToPage('login', { clearHistory: true })
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'profile' })
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
.inline-back {
  width: 92;
  background-color: #ffffff;
  border-radius: 999;
  padding: 10 14;
  margin-bottom: 14;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 8;
  shadow-offset: 0 2;
}
.inline-back-text {
  color: #1f2733;
  font-size: 13;
  font-weight: 800;
}
.profile-hero { background-color: #ffffff; border-radius: 18; padding: 18; margin-bottom: 14; shadow-color: #000; shadow-opacity: 0.08; shadow-radius: 12; shadow-offset: 0 3; }
.avatar-shell { width: 56; height: 56; border-radius: 28; background-color: #dc2626; vertical-align: top; }
.avatar-text { color: #ffffff; font-size: 18; font-weight: 800; text-align: center; vertical-align: center; }
.hero-copy { margin-left: 14; }
.profile-name { color: #111827; font-size: 22; font-weight: 800; }
.profile-subtitle { color: #6b7280; font-size: 13; font-weight: 600; margin-top: 2; }
.hero-meta { margin-top: 12; }
.meta-pill { color: #166534; background-color: #dcfce7; font-size: 11; font-weight: 700; padding: 6 10; border-radius: 999; margin-right: 10; }
.meta-text { color: #6b7280; font-size: 12; font-weight: 600; vertical-align: center; }
.summary-grid { margin-bottom: 18; }
.summary-card { background-color: #ffffff; border-radius: 16; padding: 16; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.summary-card-dark { background-color: #1f2733; }
.summary-value { color: #111827; font-size: 24; font-weight: 800; margin-bottom: 4; }
.summary-value.small { color: #ffffff; font-size: 20; }
.summary-label { color: #6b7280; font-size: 12; font-weight: 600; }
.summary-label.light { color: #cbd5e1; }
.section-title { color: #1f2733; font-size: 16; font-weight: 800; margin-bottom: 10; }
.section-card { background-color: #ffffff; border-radius: 16; margin-bottom: 18; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.list-item { padding: 14 16; border-bottom-width: 1; border-bottom-color: #edf1f5; align-items: center; }
.list-item.compact { padding-top: 13; padding-bottom: 13; }
.list-item:last-child { border-bottom-width: 0; }
.list-item.featured { background-color: #fff8f8; }
.item-badge { width: 38; height: 38; border-radius: 10; background-color: #f3f4f6; vertical-align: center; }
.item-badge.featured { background-color: #dc2626; }
.item-badge.alert { background-color: #fee2e2; }
.item-badge.muted { background-color: #eef2f7; }
.item-badge-text { color: #1f2733; font-size: 11; font-weight: 800; text-align: center; vertical-align: center; }
.item-badge-text.alert { color: #b91c1c; }
.item-badge-text.muted { color: #475569; }
.list-item.featured .item-badge-text { color: #ffffff; }
.item-copy { margin-left: 14; margin-right: 12; }
.item-title { color: #111827; font-size: 15; font-weight: 700; }
.item-description { color: #6b7280; font-size: 12; margin-top: 4; }
.item-chevron { color: #9ca3af; font-size: 15; font-weight: 700; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 0 4 0; }
.nav-content { horizontal-align: center; vertical-align: center; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 600; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
</style>

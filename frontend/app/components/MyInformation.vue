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
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <GridLayout columns="76,*" class="hero-card">
            <GridLayout col="0" class="avatar-shell">
              <Label :text="initials" class="avatar-text" />
            </GridLayout>

            <StackLayout col="1" class="hero-copy">
              <Label :text="displayFullName" class="hero-title" />
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
            <Label text="Nom complet" class="field-label" />
            <TextField
              v-model="form.fullName"
              hint="Votre nom complet"
              class="field-input"
            />

            <Label text="Email" class="field-label" />
            <TextField
              v-model="form.email"
              hint="client@example.com"
              autocapitalizationType="none"
              class="field-input"
            />

            <Label text="Telephone" class="field-label" />
            <TextField
              v-model="form.phone"
              hint="+1 514 555 0101"
              keyboardType="phone"
              class="field-input"
            />

            <Label text="Adresse" class="field-label" />
            <TextField
              v-model="form.addressLine"
              hint="245 Rue du Centre"
              class="field-input"
            />

            <Label text="Ville" class="field-label" />
            <TextField
              v-model="form.city"
              hint="Montreal, QC"
              class="field-input"
            />
          </StackLayout>

          <Label text="Profil client" class="section-title" />
          <StackLayout class="section-card">
            <Label text="Garage prefere" class="field-label" />
            <TextField
              v-model="form.preferredGarage"
              hint="Garage Montreal Centre"
              class="field-input"
            />

            <GridLayout columns="*,auto" class="read-only-row">
              <StackLayout col="0">
                <Label text="Vehicule principal" class="field-label read-only" />
                <Label :text="profile.defaultVehicleLabel" class="read-only-value" />
              </StackLayout>
              <Label col="1" text="AUTO" class="read-only-tag" />
            </GridLayout>

            <GridLayout columns="*,auto" class="read-only-row">
              <StackLayout col="0">
                <Label text="Membre depuis" class="field-label read-only" />
                <Label :text="memberSinceLabel" class="read-only-value" />
              </StackLayout>
              <Label col="1" text="DATE" class="read-only-tag" />
            </GridLayout>

            <Label text="Notes client" class="field-label" />
            <TextView
              v-model="form.notes"
              hint="Informations utiles pour l atelier"
              class="field-input field-input-multiline"
            />
          </StackLayout>

          <GridLayout class="primary-cta" :class="{ disabled: !canSave }" @tap="saveProfile">
            <Label
              :text="isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'"
              class="primary-cta-text"
            />
          </GridLayout>

          <GridLayout class="secondary-cta" @tap="resetForm">
            <Label text="Reinitialiser" class="secondary-cta-text" />
          </GridLayout>
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
import { alert } from '@nativescript/core'
import { computed, ref } from 'nativescript-vue'
import ProfileService from '@/services/ProfileService'
import { formatDate } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'
import type { ProfileUpdatePayload, UserProfile } from '@/types/profile'

interface EditableProfileForm {
  fullName: string
  email: string
  phone: string
  addressLine: string
  city: string
  preferredGarage: string
  notes: string
}

const profile = ref<UserProfile>(ProfileService.getFallbackProfile())
const form = ref<EditableProfileForm>(createFormFromProfile(profile.value))
const isSaving = ref(false)

const initials = computed(() => {
  return displayFullName.value
    .split(' ')
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase()
})

const displayFullName = computed(() => {
  const value = form.value.fullName.trim()
  return value || profile.value.fullName
})

const memberSinceLabel = computed(() => {
  return formatDate(new Date(profile.value.memberSince), 'long')
})

const hasChanges = computed(() => {
  return (
    normalizeValue(form.value.fullName) !== normalizeValue(profile.value.fullName) ||
    normalizeValue(form.value.email) !== normalizeValue(profile.value.email) ||
    normalizeValue(form.value.phone) !== normalizeValue(profile.value.phone) ||
    normalizeValue(form.value.addressLine) !== normalizeValue(profile.value.addressLine) ||
    normalizeValue(form.value.city) !== normalizeValue(profile.value.city) ||
    normalizeValue(form.value.preferredGarage) !== normalizeValue(profile.value.preferredGarage) ||
    normalizeValue(form.value.notes) !== normalizeValue(profile.value.notes)
  )
})

const canSave = computed(() => {
  return (
    !isSaving.value &&
    hasChanges.value &&
    normalizeValue(form.value.fullName).length >= 2 &&
    isValidEmail(normalizeValue(form.value.email))
  )
})

function normalizeValue(value: string) {
  return value.trim()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function createFormFromProfile(source: UserProfile): EditableProfileForm {
  return {
    fullName: source.fullName,
    email: source.email,
    phone: source.phone,
    addressLine: source.addressLine,
    city: source.city,
    preferredGarage: source.preferredGarage,
    notes: source.notes
  }
}

function applyProfile(nextProfile: UserProfile) {
  profile.value = nextProfile
  form.value = createFormFromProfile(nextProfile)
}

function buildProfilePayload(): ProfileUpdatePayload {
  return {
    fullName: normalizeValue(form.value.fullName),
    email: normalizeValue(form.value.email).toLowerCase(),
    phone: normalizeValue(form.value.phone),
    addressLine: normalizeValue(form.value.addressLine),
    city: normalizeValue(form.value.city),
    preferredGarage: normalizeValue(form.value.preferredGarage),
    notes: normalizeValue(form.value.notes)
  }
}

async function onPageLoaded() {
  applyProfile(await ProfileService.getProfile())
  console.log('My information page loaded')
}

async function saveProfile() {
  if (isSaving.value) {
    return
  }

  if (normalizeValue(form.value.fullName).length < 2) {
    await alert({
      title: 'Nom invalide',
      message: 'Saisissez un nom complet valide.',
      okButtonText: 'OK'
    })
    return
  }

  if (!isValidEmail(normalizeValue(form.value.email))) {
    await alert({
      title: 'Email invalide',
      message: 'Saisissez une adresse email valide.',
      okButtonText: 'OK'
    })
    return
  }

  if (!hasChanges.value) {
    await alert({
      title: 'Aucune modification',
      message: 'Modifiez au moins un champ avant d enregistrer.',
      okButtonText: 'OK'
    })
    return
  }

  try {
    isSaving.value = true
    const updatedProfile = await ProfileService.updateProfile(buildProfilePayload())
    applyProfile(updatedProfile)

    await alert({
      title: 'Profil mis a jour',
      message: 'Vos informations personnelles ont ete enregistrees.',
      okButtonText: 'OK'
    })
  } catch (error) {
    await alert({
      title: 'Erreur',
      message: error instanceof Error ? error.message : 'Impossible de mettre a jour le profil.',
      okButtonText: 'OK'
    })
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  applyProfile(profile.value)
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
.inline-back {
  width: 92;
  background-color: #ffffff;
  border-radius: 999;
  padding: 10 14;
  margin-bottom: 14;
}
.inline-back-text {
  color: #1f2733;
  font-size: 13;
  font-weight: 800;
}
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
.section-card { background-color: #ffffff; border-radius: 16; padding: 18; margin-bottom: 18; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.field-label { color: #6b7280; font-size: 11; font-weight: 700; text-transform: uppercase; margin-bottom: 6; }
.field-label.read-only { margin-bottom: 4; }
.field-input { background-color: #f8fafc; border-width: 1; border-color: #d9e0e8; border-radius: 14; padding: 14 16; font-size: 14; color: #111827; placeholder-color: #94a3b8; margin-bottom: 14; }
.field-input-multiline { min-height: 104; padding-top: 12; padding-bottom: 12; margin-bottom: 0; }
.read-only-row { background-color: #f8fafc; border-radius: 14; padding: 14 16; margin-bottom: 14; vertical-align: center; }
.read-only-value { color: #111827; font-size: 15; font-weight: 700; }
.read-only-tag { color: #475569; background-color: #eef2f7; border-radius: 999; padding: 6 10; font-size: 10; font-weight: 800; vertical-align: center; }
.primary-cta { background-color: #dc2626; border-radius: 12; padding: 14; margin-bottom: 10; }
.primary-cta.disabled { background-color: #fca5a5; }
.primary-cta-text { color: #ffffff; font-size: 15; font-weight: 700; text-align: center; }
.secondary-cta { background-color: #ffffff; border-radius: 12; padding: 14; margin-bottom: 18; border-width: 1; border-color: #d9e0e8; }
.secondary-cta-text { color: #475569; font-size: 14; font-weight: 700; text-align: center; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 4 4 4; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 600; text-align: center; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
</style>

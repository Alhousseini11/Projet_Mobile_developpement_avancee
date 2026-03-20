<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Mode de paiement" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="hero-card">
            <Label text="Paiement securise Stripe" class="hero-title" />
            <Label :text="statusDescription" class="hero-subtitle" textWrap="true" />
          </StackLayout>

          <GridLayout columns="*,*" columnSpacing="12" class="summary-grid">
            <StackLayout col="0" class="summary-card">
              <Label :text="statusBadge" class="summary-value" />
              <Label text="Etat" class="summary-label" />
            </StackLayout>

            <StackLayout col="1" class="summary-card summary-card-dark">
              <Label :text="providerLabel" class="summary-value small light" />
              <Label text="Prestataire" class="summary-label light" />
            </StackLayout>
          </GridLayout>

          <StackLayout class="section-card">
            <Label text="Profil client" class="section-title" />
            <Label :text="profile.fullName" class="primary-copy" />
            <Label :text="profile.email" class="secondary-copy" />
            <Label :text="profile.phone" class="secondary-copy" />
          </StackLayout>

          <StackLayout class="section-card">
            <Label text="Moyen de paiement enregistre" class="section-title" />

            <StackLayout v-if="payment.card" class="card-preview">
              <Label :text="cardBrandLabel" class="card-brand" />
              <Label :text="maskedCardLabel" class="card-number" />
              <Label :text="expiryLabel" class="card-expiry" />
            </StackLayout>

            <StackLayout v-else class="empty-payment-card">
              <Label text="Aucune carte Stripe enregistree." class="empty-payment-title" />
              <Label :text="payment.message" class="empty-payment-copy" textWrap="true" />
            </StackLayout>

            <Label
              v-if="payment.customerId"
              :text="'Client Stripe : ' + payment.customerId"
              class="support-copy"
              textWrap="true"
            />
            <Label
              v-if="payment.lastSyncAt"
              :text="'Derniere synchro : ' + syncDateLabel"
              class="support-copy"
            />

            <GridLayout
              v-if="payment.backendReachable && payment.stripeConfigured"
              class="primary-cta"
              @tap="startStripeSetup"
            >
              <Label :text="primaryActionLabel" class="primary-cta-text" />
            </GridLayout>

            <GridLayout
              v-if="payment.backendReachable && payment.stripeConfigured && payment.lastCheckoutSessionId"
              class="secondary-cta"
              @tap="syncPaymentMethod"
            >
              <Label text="J'ai termine sur Stripe" class="secondary-cta-text" />
            </GridLayout>

            <GridLayout class="ghost-cta" @tap="refreshPaymentMethod">
              <Label text="Rafraichir l'etat" class="ghost-cta-text" />
            </GridLayout>
          </StackLayout>

          <StackLayout v-if="!payment.backendReachable || !payment.stripeConfigured" class="notice-card">
            <Label :text="noticeTitle" class="notice-title" />
            <Label :text="noticeCopy" class="notice-copy" textWrap="true" />
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
import { alert } from '@nativescript/core'
import { openUrlAsync } from '@nativescript/core/utils'
import { computed, ref } from 'nativescript-vue'
import ProfileService from '@/services/ProfileService'
import { formatDate } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'
import type { PaymentMethodSummary, UserProfile } from '@/types/profile'

const profile = ref<UserProfile>(ProfileService.getFallbackProfile())
const payment = ref<PaymentMethodSummary>(ProfileService.getFallbackPaymentMethod())

const providerLabel = computed(() => payment.value.provider.toUpperCase())

const statusBadge = computed(() => {
  if (!payment.value.backendReachable) return 'Hors ligne'
  if (payment.value.status === 'ready') return 'Actif'
  if (payment.value.status === 'pending') return 'En attente'
  if (payment.value.stripeConfigured) return 'Aucune carte'
  return 'A configurer'
})

const statusDescription = computed(() => {
  if (!payment.value.backendReachable) {
    return payment.value.message
  }

  if (payment.value.status === 'ready' && payment.value.card) {
    return 'Votre carte Stripe est enregistree et disponible pour les futures reservations.'
  }

  if (payment.value.status === 'pending') {
    return 'La session Stripe est ouverte. Revenez ensuite ici pour synchroniser le moyen de paiement.'
  }

  return payment.value.message
})

const primaryActionLabel = computed(() => {
  return payment.value.card ? 'Mettre a jour sur Stripe' : 'Configurer avec Stripe'
})

const cardBrandLabel = computed(() => {
  return payment.value.card?.brand?.toUpperCase() ?? 'CARTE'
})

const maskedCardLabel = computed(() => {
  return payment.value.card ? `**** **** **** ${payment.value.card.last4}` : '****'
})

const expiryLabel = computed(() => {
  if (!payment.value.card) {
    return ''
  }

  const month = `${payment.value.card.expMonth}`.padStart(2, '0')
  return `Expire ${month}/${payment.value.card.expYear}`
})

const syncDateLabel = computed(() => {
  if (!payment.value.lastSyncAt) {
    return ''
  }

  return formatDate(new Date(payment.value.lastSyncAt), 'long')
})

const noticeTitle = computed(() => {
  return payment.value.backendReachable ? 'Activation Stripe' : 'Backend indisponible'
})

const noticeCopy = computed(() => {
  if (!payment.value.backendReachable) {
    return 'Le serveur backend n est pas joignable. Demarrez backend/npm run dev puis touchez "Rafraichir l etat".'
  }

  return 'Ajoutez STRIPE_KEY dans backend/.env pour activer l ouverture de Stripe Checkout.'
})

async function onPageLoaded() {
  const [nextProfile, nextPayment] = await Promise.all([
    ProfileService.getProfile(),
    ProfileService.getPaymentMethod()
  ])
  profile.value = nextProfile
  payment.value = nextPayment
  console.log('Payment methods page loaded')
}

async function startStripeSetup() {
  try {
    const session = await ProfileService.createStripeCheckoutSession()
    payment.value = await ProfileService.getPaymentMethod()
    const opened = await openUrlAsync(session.url)

    if (!opened) {
      await alert({
        title: 'Stripe',
        message: 'Impossible d ouvrir le navigateur Stripe sur cet appareil.',
        okButtonText: 'OK'
      })
      return
    }

    await alert({
      title: 'Stripe',
      message: 'Stripe Checkout a ete ouvert. Revenez ensuite sur cette page puis touchez "J ai termine sur Stripe".',
      okButtonText: 'OK'
    })
  } catch (error) {
    await alert({
      title: 'Stripe indisponible',
      message: getErrorMessage(error),
      okButtonText: 'OK'
    })
  }
}

async function syncPaymentMethod() {
  payment.value = await ProfileService.syncStripePaymentMethod(payment.value.lastCheckoutSessionId ?? undefined)

  await alert({
    title: 'Mode de paiement',
    message:
      payment.value.status === 'ready'
        ? 'Votre moyen de paiement Stripe a ete synchronise.'
        : payment.value.message,
    okButtonText: 'OK'
  })
}

async function refreshPaymentMethod() {
  payment.value = await ProfileService.getPaymentMethod()
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Une erreur est survenue.'
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'paymentMethods' })
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
.hero-title { color: #111827; font-size: 22; font-weight: 800; margin-bottom: 4; }
.hero-subtitle { color: #6b7280; font-size: 13; }
.summary-grid { margin-bottom: 18; }
.summary-card { background-color: #ffffff; border-radius: 16; padding: 16; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.summary-card-dark { background-color: #1f2733; }
.summary-value { color: #111827; font-size: 22; font-weight: 800; margin-bottom: 4; }
.summary-value.small { font-size: 18; }
.summary-value.light { color: #ffffff; }
.summary-label { color: #6b7280; font-size: 12; font-weight: 600; }
.summary-label.light { color: #cbd5e1; }
.section-card { background-color: #ffffff; border-radius: 16; padding: 18; margin-bottom: 18; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.section-title { color: #1f2733; font-size: 16; font-weight: 800; margin-bottom: 12; }
.primary-copy { color: #111827; font-size: 16; font-weight: 700; margin-bottom: 4; }
.secondary-copy { color: #6b7280; font-size: 13; margin-top: 2; }
.card-preview { background-color: #1f2733; border-radius: 16; padding: 18; margin-bottom: 12; }
.card-brand { color: #fca5a5; font-size: 11; font-weight: 800; margin-bottom: 14; }
.card-number { color: #ffffff; font-size: 20; font-weight: 800; margin-bottom: 12; }
.card-expiry { color: #cbd5e1; font-size: 12; font-weight: 700; }
.empty-payment-card { background-color: #f8fafc; border-radius: 14; padding: 16; margin-bottom: 12; }
.empty-payment-title { color: #111827; font-size: 16; font-weight: 700; margin-bottom: 6; }
.empty-payment-copy { color: #6b7280; font-size: 13; }
.support-copy { color: #6b7280; font-size: 12; margin-top: 6; }
.primary-cta { background-color: #dc2626; border-radius: 12; padding: 14; margin-top: 14; }
.primary-cta-text { color: #ffffff; font-size: 15; font-weight: 700; text-align: center; }
.secondary-cta { background-color: #1f2733; border-radius: 12; padding: 14; margin-top: 10; }
.secondary-cta-text { color: #ffffff; font-size: 14; font-weight: 700; text-align: center; }
.ghost-cta { background-color: #f3f4f6; border-radius: 12; padding: 14; margin-top: 10; }
.ghost-cta-text { color: #374151; font-size: 14; font-weight: 700; text-align: center; }
.notice-card { background-color: #fff7ed; border-radius: 16; padding: 16; margin-bottom: 16; }
.notice-title { color: #9a3412; font-size: 15; font-weight: 800; margin-bottom: 6; }
.notice-copy { color: #c2410c; font-size: 13; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 4 4 4; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 600; text-align: center; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
</style>

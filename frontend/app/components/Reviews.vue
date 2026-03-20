<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Avis et evaluations" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="hero-card">
            <Label text="Partagez votre retour atelier" class="hero-title" />
            <Label
              text="Notez vos rendez-vous et laissez un commentaire pour suivre la satisfaction client."
              class="hero-subtitle"
              textWrap="true"
            />
          </StackLayout>

          <GridLayout columns="*,*" columnSpacing="12" class="summary-grid">
            <StackLayout col="0" class="summary-card">
              <Label :text="averageRatingLabel" class="summary-value" />
              <Label text="Note moyenne" class="summary-label" />
            </StackLayout>

            <StackLayout col="1" class="summary-card summary-card-dark">
              <Label :text="String(reviews.length).padStart(2, '0')" class="summary-value light" />
              <Label text="Avis publies" class="summary-label light" />
            </StackLayout>
          </GridLayout>

          <StackLayout class="section-card">
            <Label text="Deposer un avis" class="section-title" />

            <StackLayout v-if="reservations.length === 0" class="empty-card muted">
              <Label text="Aucun rendez-vous a evaluer." class="empty-title" />
              <Label
                text="Prenez d'abord un rendez-vous depuis l'onglet Reservation pour pouvoir laisser un avis."
                class="empty-copy"
                textWrap="true"
              />
            </StackLayout>

            <StackLayout v-else>
              <Label text="Choisir un rendez-vous" class="field-label" />

              <StackLayout class="reservation-list">
                <GridLayout
                  v-for="reservation in reservations"
                  :key="reservation.id"
                  columns="*,auto"
                  class="reservation-card"
                  :class="{ selected: selectedReservationId === reservation.id }"
                  @tap="selectReservation(reservation.id)"
                >
                  <StackLayout col="0">
                    <Label :text="reservation.serviceLabel" class="reservation-title" />
                    <Label
                      :text="formatReservationMeta(reservation)"
                      class="reservation-meta"
                      textWrap="true"
                    />
                  </StackLayout>

                  <Label
                    col="1"
                    :text="hasReviewForReservation(reservation.id) ? 'Avis deja laisse' : 'A evaluer'"
                    class="reservation-badge"
                    :class="{ ready: hasReviewForReservation(reservation.id) }"
                  />
                </GridLayout>
              </StackLayout>

              <Label text="Votre note" class="field-label" />
              <FlexboxLayout class="star-row">
                <Label
                  v-for="value in [1, 2, 3, 4, 5]"
                  :key="value"
                  :text="value <= rating ? '★' : '☆'"
                  class="star-chip"
                  :class="{ active: value <= rating }"
                  @tap="rating = value"
                />
              </FlexboxLayout>

              <Label text="Commentaire" class="field-label" />
              <TextField
                v-model="comment"
                hint="Ex: Intervention claire, delai respecte, atelier accueillant."
                class="comment-input"
                autocorrect="true"
              />

              <GridLayout class="primary-cta" :class="{ disabled: !canSubmit }" @tap="submitReview">
                <Label :text="submitLabel" class="primary-cta-text" />
              </GridLayout>
            </StackLayout>
          </StackLayout>

          <StackLayout class="section-card">
            <Label text="Historique des avis" class="section-title" />

            <StackLayout v-if="reviews.length === 0" class="empty-card">
              <Label text="Aucun avis pour le moment." class="empty-title" />
              <Label
                text="Vos prochains commentaires apparaitront ici avec leur note."
                class="empty-copy"
                textWrap="true"
              />
            </StackLayout>

            <StackLayout v-else>
              <GridLayout
                v-for="review in reviews"
                :key="review.id"
                rows="auto,auto,auto"
                columns="*,auto"
                class="review-card"
              >
                <Label row="0" col="0" :text="review.reservationLabel" class="review-title" />
                <Label row="0" col="1" :text="formatStars(review.rating)" class="review-stars" />
                <Label
                  row="1"
                  colSpan="2"
                  :text="'Rendez-vous du ' + formatAppointmentDate(review.appointmentDate)"
                  class="review-meta"
                />
                <Label
                  row="2"
                  colSpan="2"
                  :text="review.comment || 'Aucun commentaire ajoute.'"
                  class="review-copy"
                  textWrap="true"
                />
              </GridLayout>
            </StackLayout>
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
import { computed, ref } from 'nativescript-vue'
import ReservationService from '@/services/ReservationService'
import ReviewService from '@/services/ReviewService'
import type { Reservation } from '@/types/reservation'
import type { CreateReviewDTO, Review } from '@/types/review'
import { formatDate } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'

const reviews = ref<Review[]>(ReviewService.getFallbackReviews())
const reservations = ref<Reservation[]>(ReservationService.getFallbackReservations())
const selectedReservationId = ref('')
const rating = ref(0)
const comment = ref('')
const isSaving = ref(false)

const averageRatingLabel = computed(() => {
  if (reviews.value.length === 0) {
    return '0.0'
  }

  const total = reviews.value.reduce((sum, review) => sum + review.rating, 0)
  return (total / reviews.value.length).toFixed(1)
})

const selectedReview = computed(() => {
  return reviews.value.find(review => review.reservationId === selectedReservationId.value) ?? null
})

const submitLabel = computed(() => {
  if (isSaving.value) {
    return 'Enregistrement...'
  }

  return selectedReview.value ? 'Mettre a jour mon avis' : 'Publier mon avis'
})

const canSubmit = computed(() => {
  return Boolean(selectedReservationId.value && rating.value > 0 && !isSaving.value)
})

async function onPageLoaded() {
  const [nextReviews, nextReservations] = await Promise.all([
    ReviewService.getReviews(),
    ReservationService.getMyReservations()
  ])

  reviews.value = nextReviews
  reservations.value = nextReservations
  ensureSelection()
  console.log('Reviews page loaded')
}

function ensureSelection() {
  if (reservations.value.length === 0) {
    selectedReservationId.value = ''
    rating.value = 0
    comment.value = ''
    return
  }

  const currentReservation = reservations.value.find(
    reservation => reservation.id === selectedReservationId.value
  )

  const targetReservationId = currentReservation?.id ?? reservations.value[0].id
  selectReservation(targetReservationId)
}

function selectReservation(reservationId: string) {
  selectedReservationId.value = reservationId
  const existingReview = reviews.value.find(review => review.reservationId === reservationId)
  rating.value = existingReview?.rating ?? 0
  comment.value = existingReview?.comment ?? ''
}

function hasReviewForReservation(reservationId: string) {
  return reviews.value.some(review => review.reservationId === reservationId)
}

function formatReservationMeta(reservation: Reservation) {
  return `${formatAppointmentDate(reservation.date)} a ${reservation.time}`
}

function formatAppointmentDate(date: string) {
  return formatDate(new Date(`${date}T00:00:00`), 'short')
}

function formatStars(value: number) {
  return `${'★'.repeat(value)}${'☆'.repeat(Math.max(0, 5 - value))}`
}

async function submitReview() {
  if (!canSubmit.value) {
    await alert({
      title: 'Avis incomplet',
      message: 'Choisissez un rendez-vous et une note avant de publier votre avis.',
      okButtonText: 'OK'
    })
    return
  }

  try {
    isSaving.value = true

    const payload: CreateReviewDTO = {
      reservationId: selectedReservationId.value,
      rating: rating.value,
      comment: comment.value.trim() || undefined
    }

    const savedReview = await ReviewService.upsertReview(payload)
    const relatedReservation =
      reservations.value.find(reservation => reservation.id === selectedReservationId.value) ?? null

    const normalizedReview: Review = {
      ...savedReview,
      reservationLabel: savedReview.reservationLabel || relatedReservation?.serviceLabel || 'Rendez-vous',
      appointmentDate: savedReview.appointmentDate || relatedReservation?.date || savedReview.appointmentDate
    }

    const existingIndex = reviews.value.findIndex(
      review => review.reservationId === normalizedReview.reservationId
    )

    if (existingIndex >= 0) {
      reviews.value.splice(existingIndex, 1, normalizedReview)
    } else {
      reviews.value.unshift(normalizedReview)
    }

    selectReservation(normalizedReview.reservationId)

    await alert({
      title: 'Avis enregistre',
      message: 'Votre evaluation a bien ete prise en compte.',
      okButtonText: 'OK'
    })
  } catch (error) {
    await alert({
      title: 'Erreur',
      message: error instanceof Error ? error.message : 'Impossible d enregistrer cet avis.',
      okButtonText: 'OK'
    })
  } finally {
    isSaving.value = false
  }
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'reviews' })
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
.summary-value { color: #111827; font-size: 24; font-weight: 800; margin-bottom: 4; }
.summary-value.light { color: #ffffff; }
.summary-label { color: #6b7280; font-size: 12; font-weight: 600; }
.summary-label.light { color: #cbd5e1; }
.section-card { background-color: #ffffff; border-radius: 16; padding: 18; margin-bottom: 18; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.section-title { color: #1f2733; font-size: 16; font-weight: 800; margin-bottom: 12; }
.field-label { color: #374151; font-size: 12; font-weight: 700; margin-bottom: 8; }
.reservation-list { margin-bottom: 14; }
.reservation-card { background-color: #f8fafc; border-radius: 14; border-width: 1; border-color: #e2e8f0; padding: 14 16; margin-bottom: 10; }
.reservation-card.selected { border-color: #dc2626; background-color: #fff1f2; }
.reservation-title { color: #111827; font-size: 14; font-weight: 700; }
.reservation-meta { color: #6b7280; font-size: 12; margin-top: 4; }
.reservation-badge { color: #7c2d12; background-color: #ffedd5; border-radius: 999; padding: 6 10; font-size: 10; font-weight: 800; vertical-align: center; }
.reservation-badge.ready { color: #166534; background-color: #dcfce7; }
.star-row { margin-bottom: 14; }
.star-chip { color: #cbd5e1; font-size: 28; margin-right: 8; }
.star-chip.active { color: #f59e0b; }
.comment-input { background-color: #f8fafc; border-width: 1; border-color: #d9e0e8; border-radius: 14; padding: 14 16; font-size: 14; color: #111827; placeholder-color: #94a3b8; margin-bottom: 14; }
.primary-cta { background-color: #dc2626; border-radius: 12; padding: 14; }
.primary-cta.disabled { background-color: #fca5a5; }
.primary-cta-text { color: #ffffff; font-size: 15; font-weight: 700; text-align: center; }
.empty-card { background-color: #f8fafc; border-radius: 14; padding: 16; }
.empty-card.muted { margin-bottom: 4; }
.empty-title { color: #111827; font-size: 15; font-weight: 700; margin-bottom: 6; }
.empty-copy { color: #6b7280; font-size: 13; }
.review-card { background-color: #f8fafc; border-radius: 14; padding: 14 16; margin-bottom: 10; }
.review-title { color: #111827; font-size: 15; font-weight: 700; }
.review-stars { color: #f59e0b; font-size: 14; font-weight: 800; }
.review-meta { color: #6b7280; font-size: 12; margin-top: 8; }
.review-copy { color: #374151; font-size: 13; margin-top: 10; line-height: 1.35; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 4 4 4; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 600; text-align: center; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
</style>

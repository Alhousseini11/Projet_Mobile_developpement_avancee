<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Reservation" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="intro-card">
            <Label text="Prendre un rendez-vous" class="intro-title" />
            <Label
              text="Choisissez un service, une date puis un creneau disponible."
              class="intro-text"
              textWrap="true"
            />
          </StackLayout>

          <Label text="Services" class="section-title" />
          <StackLayout class="service-list">
            <GridLayout
              v-for="service in services"
              :key="service.id"
              columns="*,auto"
              class="service-item"
              :class="{ selected: selectedServiceId === service.id }"
              @tap="selectService(service.id)"
            >
              <StackLayout col="0">
                <Label :text="service.label" class="service-text" />
                <Label
                  :text="service.durationMinutes + ' min   ' + formatCurrency(service.price)"
                  class="service-meta"
                />
                <Label :text="formatServiceReviews(service)" class="service-rating" />
              </StackLayout>
              <Label col="1" :text="selectedServiceId === service.id ? 'OK' : '+'" class="service-badge" />
            </GridLayout>
          </StackLayout>

          <Label text="Choisir la date" class="section-title" />
          <FlexboxLayout class="chip-wrap" flexWrap="wrap">
            <GridLayout
              v-for="dateOption in dateOptions"
              :key="dateOption.isoDate"
              rows="auto,auto"
              class="date-card"
              :class="{ selected: selectedDate === dateOption.isoDate }"
              @tap="selectDate(dateOption.isoDate)"
            >
              <Label row="0" :text="dateOption.weekday" class="date-weekday" />
              <Label row="1" :text="dateOption.label" class="date-label" />
            </GridLayout>
          </FlexboxLayout>

          <Label text="Choisir l'heure" class="section-title" />
          <FlexboxLayout class="chip-wrap" flexWrap="wrap">
            <Label
              v-for="slot in availableSlots"
              :key="slot"
              :text="slot"
              class="time-chip"
              :class="{ selected: selectedTime === slot }"
              @tap="selectTime(slot)"
            />
          </FlexboxLayout>
          <Label
            v-if="selectedServiceId && selectedDate && availableSlots.length === 0"
            text="Aucun creneau disponible pour cette date."
            class="helper-text"
            textWrap="true"
          />
          <Label
            v-else-if="!selectedServiceId"
            text="Selectionnez d'abord un service pour afficher les creneaux."
            class="helper-text"
            textWrap="true"
          />

          <StackLayout class="summary-card">
            <Label text="Recapitulatif" class="summary-title" />
            <Label :text="'Service : ' + selectedServiceLabel" class="summary-line" />
            <Label :text="'Date : ' + selectedDateLabel" class="summary-line" />
            <Label :text="'Heure : ' + selectedTimeLabel" class="summary-line" />
          </StackLayout>

          <GridLayout
            class="cta"
            :class="{ disabled: !canSubmit }"
            @tap="createReservation"
          >
            <Label :text="isSubmitting ? 'Confirmation...' : 'Continuer'" class="cta-text" />
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <Label text="Accueil" class="nav-label" />
        </GridLayout>
        <GridLayout col="1" class="nav-item active" @tap="navigateTo('reservations')">
          <Label text="Reserver" class="nav-label" />
        </GridLayout>
        <GridLayout col="2" class="nav-item" @tap="navigateTo('tutorials')">
          <Label text="Tutoriels" class="nav-label" />
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <Label text="Vehicules" class="nav-label" />
        </GridLayout>
        <GridLayout col="4" class="nav-item" @tap="navigateTo('profile')">
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
import { formatCurrency } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'
import type { ReservationServiceOption } from '@/types/reservation'

interface DateOption {
  isoDate: string
  weekday: string
  label: string
}

const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

function buildDateOptions(days: number): DateOption[] {
  const options: DateOption[] = []
  const today = new Date()

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() + offset + 1)

    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')

    options.push({
      isoDate: `${year}-${month}-${day}`,
      weekday: WEEKDAY_LABELS[date.getDay()],
      label: `${day} ${MONTH_LABELS[date.getMonth()]}`
    })
  }

  return options
}

function formatServiceReviews(service: ReservationServiceOption) {
  const reviewCount = Number(service.reviewCount ?? 0)
  const reviewAverage = Number(service.reviewAverage ?? 0)

  if (reviewCount <= 0) {
    return 'Aucun avis public pour le moment'
  }

  return `Note ${reviewAverage.toFixed(1)}/5 - ${reviewCount} avis`
}

const dateOptions = buildDateOptions(6)
const initialDate = dateOptions[0]?.isoDate ?? ''

const services = ref<ReservationServiceOption[]>(ReservationService.getFallbackServices())
const availableSlots = ref<string[]>([])
const selectedServiceId = ref<string | null>(null)
const selectedDate = ref<string>(initialDate)
const selectedTime = ref<string | null>(null)
const isSubmitting = ref(false)

const selectedService = computed(() => {
  return services.value.find(service => service.id === selectedServiceId.value) ?? null
})

const selectedDateOption = computed(() => {
  return dateOptions.find(option => option.isoDate === selectedDate.value) ?? null
})

const selectedServiceLabel = computed(() => selectedService.value?.label ?? 'Aucun service')
const selectedDateLabel = computed(() => selectedDateOption.value?.label ?? 'Aucune date')
const selectedTimeLabel = computed(() => selectedTime.value ?? 'Aucune heure')
const canSubmit = computed(() => {
  return Boolean(selectedServiceId.value && selectedDate.value && selectedTime.value && !isSubmitting.value)
})

async function loadServices() {
  services.value = ReservationService.getFallbackServices()
  services.value = await ReservationService.getServices()
}

async function refreshSlots() {
  if (!selectedServiceId.value || !selectedDate.value) {
    availableSlots.value = []
    selectedTime.value = null
    return
  }

  availableSlots.value = ReservationService.getFallbackAvailableSlots(
    selectedServiceId.value,
    selectedDate.value
  )

  availableSlots.value = await ReservationService.getAvailableSlots(
    selectedServiceId.value,
    selectedDate.value
  )

  if (!availableSlots.value.includes(selectedTime.value ?? '')) {
    selectedTime.value = null
  }
}

async function onPageLoaded() {
  await loadServices()
  console.log('Reservations page loaded')
}

async function selectService(serviceId: string) {
  selectedServiceId.value = serviceId
  await refreshSlots()
}

async function selectDate(date: string) {
  selectedDate.value = date
  await refreshSlots()
}

function selectTime(slot: string) {
  selectedTime.value = slot
}

async function createReservation() {
  if (!canSubmit.value || !selectedService.value) {
    await alert({
      title: 'Reservation incomplete',
      message: 'Choisissez un service, une date et une heure avant de continuer.',
      okButtonText: 'OK'
    })
    return
  }

  try {
    isSubmitting.value = true

    const reservation = await ReservationService.createReservation({
      serviceId: selectedService.value.id,
      serviceLabel: selectedService.value.label,
      date: selectedDate.value,
      time: selectedTime.value as string
    })

    await alert({
      title: 'Reservation confirmee',
      message: `${reservation.serviceLabel} reservee le ${selectedDateLabel.value} a ${reservation.time}.`,
      okButtonText: 'OK'
    })

    selectedServiceId.value = null
    selectedTime.value = null
    availableSlots.value = []
  } catch (error) {
    console.error('Reservation failed:', error)
    await alert({
      title: 'Erreur',
      message: 'Impossible de creer la reservation pour le moment.',
      okButtonText: 'OK'
    })
  } finally {
    isSubmitting.value = false
  }
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'reservations' })
}

function goBack() {
  void navigateBack()
}
</script>

<style scoped>
.page {
  background-color: #f5f6f8;
}

.action-bar {
  background-color: #1f2733;
  color: #fff;
}

.action-bar-content {
  padding: 0 12;
  height: 56;
  vertical-align: center;
}

.icon-back {
  font-size: 20;
  color: #fff;
}

.action-title {
  font-size: 18;
  font-weight: 700;
  color: #fff;
  vertical-align: center;
}

.page-body {
  background-color: #f5f6f8;
}

.content {
  padding: 16 16 24 16;
}

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

.intro-card {
  background-color: #ffffff;
  border-radius: 14;
  padding: 16;
  margin-bottom: 16;
  shadow-color: #000;
  shadow-opacity: 0.06;
  shadow-radius: 10;
  shadow-offset: 0 2;
}

.intro-title {
  color: #1f2733;
  font-size: 18;
  font-weight: 700;
  margin-bottom: 6;
}

.intro-text {
  color: #6b7280;
  font-size: 13;
}

.section-title {
  font-size: 16;
  font-weight: 700;
  color: #1f2733;
  margin-bottom: 10;
}

.service-list {
  margin-bottom: 18;
}

.service-item {
  background-color: #ffffff;
  border-radius: 12;
  padding: 14 16;
  margin-bottom: 10;
  vertical-align: center;
  border-width: 1;
  border-color: #e5e7eb;
}

.service-item.selected {
  border-color: #dc2626;
  background-color: #fff1f2;
}

.service-text {
  font-size: 15;
  color: #111827;
  font-weight: 700;
}

.service-meta {
  font-size: 12;
  color: #6b7280;
  margin-top: 4;
}

.service-rating {
  font-size: 12;
  color: #b45309;
  margin-top: 4;
  font-weight: 700;
}

.service-badge {
  font-size: 14;
  color: #dc2626;
  font-weight: 700;
  vertical-align: center;
}

.chip-wrap {
  margin-bottom: 16;
}

.date-card {
  width: 92;
  background-color: #ffffff;
  border-radius: 12;
  padding: 12 10;
  margin-right: 10;
  margin-bottom: 10;
  border-width: 1;
  border-color: #e5e7eb;
}

.date-card.selected {
  border-color: #dc2626;
  background-color: #fff1f2;
}

.date-weekday {
  text-align: center;
  font-size: 12;
  color: #6b7280;
  margin-bottom: 4;
}

.date-label {
  text-align: center;
  font-size: 15;
  color: #111827;
  font-weight: 700;
}

.time-chip {
  background-color: #ffffff;
  color: #111827;
  border-radius: 999;
  border-width: 1;
  border-color: #e5e7eb;
  padding: 10 16;
  margin-right: 10;
  margin-bottom: 10;
  font-size: 14;
  font-weight: 600;
}

.time-chip.selected {
  background-color: #dc2626;
  color: #ffffff;
  border-color: #dc2626;
}

.helper-text {
  color: #6b7280;
  font-size: 12;
  margin-top: -6;
  margin-bottom: 16;
}

.summary-card {
  background-color: #1f2733;
  border-radius: 14;
  padding: 16;
  margin-bottom: 18;
}

.summary-title {
  color: #ffffff;
  font-size: 15;
  font-weight: 700;
  margin-bottom: 10;
}

.summary-line {
  color: #e5e7eb;
  font-size: 13;
  margin-bottom: 4;
}

.cta {
  background-color: #dc2626;
  border-radius: 12;
  padding: 15;
  align-items: center;
  margin-bottom: 16;
}

.cta.disabled {
  background-color: #fca5a5;
}

.cta-text {
  color: #ffffff;
  font-weight: 700;
  font-size: 16;
}

.bottom-nav {
  background-color: #121826;
  border-top-width: 1;
  border-top-color: #1f2733;
}

.nav-item {
  align-items: center;
  justify-content: center;
  padding: 10 4 4 4;
}

.nav-label {
  font-size: 12;
  color: #9ca3af;
  font-weight: 600;
  text-align: center;
}

.nav-item.active .nav-label {
  color: #dc2626;
  font-weight: 700;
}
</style>

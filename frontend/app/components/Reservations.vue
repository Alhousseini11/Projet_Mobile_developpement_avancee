<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label :text="actionTitle" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="intro-card">
            <Label :text="introTitle" class="intro-title" />
            <Label
              :text="introText"
              class="intro-text"
              textWrap="true"
            />
          </StackLayout>

          <GridLayout columns="*,auto" class="section-title-row">
            <Label text="Services" col="0" class="section-title" />
            <GridLayout
              v-if="!isEditing"
              col="1"
              class="multi-toggle"
              :class="{ active: multiServiceMode }"
              @tap="toggleMultiServiceMode"
            >
              <Label :text="multiServiceMode ? 'Multi ON' : 'Multi'" class="multi-toggle-text" />
            </GridLayout>
          </GridLayout>
          <StackLayout class="service-list">
            <GridLayout
              v-for="service in services"
              :key="service.id"
              columns="*,auto"
              class="service-item"
              :class="{ selected: selectedServiceId === service.id || (!isEditing && multiServiceMode && selectedServiceIds.includes(service.id)) }"
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
              <Label
                col="1"
                :text="(!isEditing && multiServiceMode && selectedServiceIds.includes(service.id)) ? '✓' : (selectedServiceId === service.id ? 'OK' : '+')"
                class="service-badge"
              />
            </GridLayout>

            <StackLayout v-if="!isEditing && multiServiceMode && selectedServiceIds.length > 0" class="selected-services-card">
              <Label text="Services choisis" class="selected-services-title" />
              <Label :text="selectedServicesLabel" class="selected-services-copy" textWrap="true" />
            </StackLayout>
          </StackLayout>

          <Label text="Choisir le vehicule" class="section-title" />
          <StackLayout v-if="vehicles.length > 0" class="vehicle-list">
            <GridLayout
              v-for="vehicle in vehicles"
              :key="vehicle.id"
              columns="*,auto"
              class="vehicle-item"
              :class="{ selected: selectedVehicleId === vehicle.id }"
              @tap="selectVehicle(vehicle.id)"
            >
              <StackLayout col="0">
                <Label :text="vehicle.name" class="vehicle-text" />
                <Label :text="formatVehicleLabel(vehicle)" class="vehicle-meta" />
              </StackLayout>
              <Label col="1" :text="selectedVehicleId === vehicle.id ? 'OK' : '+'" class="service-badge" />
            </GridLayout>
          </StackLayout>
          <StackLayout v-else class="empty-vehicle-card">
            <Label text="Aucun vehicule enregistre." class="empty-vehicle-title" />
            <Label
              text="Ajoutez d abord un vehicule pour relier les entretiens, documents et assurances au bon dossier."
              class="empty-vehicle-copy"
              textWrap="true"
            />
            <GridLayout class="empty-vehicle-cta" @tap="navigateTo('vehicles')">
              <Label text="Gerer mes vehicules" class="empty-vehicle-cta-text" />
            </GridLayout>
          </StackLayout>

          <Label text="Choisir la date" class="section-title" />
          <ScrollView orientation="horizontal" class="date-scroll">
            <StackLayout orientation="horizontal" class="date-scroll-inner">
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
            </StackLayout>
          </ScrollView>

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
            <Label :text="'Service : ' + selectedServicesSummaryLabel" class="summary-line" textWrap="true" />
            <Label :text="'Vehicule : ' + selectedVehicleLabel" class="summary-line" />
            <Label :text="'Date : ' + selectedDateLabel" class="summary-line" />
            <Label :text="'Heure : ' + selectedTimeLabel" class="summary-line" />
          </StackLayout>

          <GridLayout
            class="cta"
            :class="{ disabled: !canSubmit }"
            @tap="submitReservation"
          >
            <Label :text="ctaLabel" class="cta-text" />
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <StackLayout class="nav-stack">
            <Label text="🏠" class="nav-icon" />
            <Label text="Accueil" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="1" class="nav-item active" @tap="navigateTo('reservations')">
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
import { alert } from '@nativescript/core'
import { computed, ref } from 'nativescript-vue'
import ReservationService from '@/services/ReservationService'
import VehicleService from '@/services/VehicleService'
import { formatCurrency } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'
import type { Reservation, ReservationServiceOption } from '@/types/reservation'
import type { Vehicle } from '@/types/vehicle'

const props = defineProps<{
  reservationToEdit?: Reservation
  onReservationUpdated?: (() => void | Promise<void>) | undefined
}>()

interface DateOption {
  isoDate: string
  weekday: string
  label: string
}

const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
const DATE_OPTIONS_COUNT = 21

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

function buildDateOption(isoDate: string): DateOption {
  const [year, month, day] = isoDate.split('-').map(value => Number(value))
  const date = new Date(year, Math.max(month - 1, 0), day, 12, 0, 0)

  return {
    isoDate,
    weekday: WEEKDAY_LABELS[date.getDay()],
    label: `${`${day}`.padStart(2, '0')} ${MONTH_LABELS[date.getMonth()]}`
  }
}

function formatServiceReviews(service: ReservationServiceOption) {
  const reviewCount = Number(service.reviewCount ?? 0)
  const reviewAverage = Number(service.reviewAverage ?? 0)

  if (reviewCount <= 0) {
    return 'Aucun avis public pour le moment'
  }

  return `Note ${reviewAverage.toFixed(1)}/5 - ${reviewCount} avis`
}

const dateOptions = ref<DateOption[]>([])
const initialDate = buildDateOptions(DATE_OPTIONS_COUNT)[0]?.isoDate ?? ''

const services = ref<ReservationServiceOption[]>(ReservationService.getFallbackServices())
const vehicles = ref<Vehicle[]>([])
const availableSlots = ref<string[]>([])
const selectedServiceId = ref<string | null>(null)
const selectedServiceIds = ref<string[]>([])
const multiServiceMode = ref(false)
const selectedVehicleId = ref<string | null>(null)
const selectedDate = ref<string>(initialDate)
const selectedTime = ref<string | null>(null)
const isSubmitting = ref(false)

const selectedService = computed(() => {
  return services.value.find(service => service.id === selectedServiceId.value) ?? null
})

const isEditing = computed(() => Boolean(props.reservationToEdit?.id))
const actionTitle = computed(() => (isEditing.value ? 'Modifier RDV' : 'Reservation'))
const introTitle = computed(() =>
  isEditing.value ? 'Modifier votre rendez-vous' : 'Prendre un rendez-vous'
)
const introText = computed(() =>
  isEditing.value
    ? 'Ajustez le service, le vehicule, la date et le creneau selon les disponibilites.'
    : 'Choisissez un service, une date puis un creneau disponible.'
)
const ctaLabel = computed(() => {
  if (isSubmitting.value) {
    return isEditing.value ? 'Mise a jour...' : 'Confirmation...'
  }

  if (!isEditing.value && multiServiceMode.value && selectedServiceIds.value.length > 1) {
    return `Confirmer ${selectedServiceIds.value.length} services`
  }

  return isEditing.value ? 'Enregistrer les modifications' : 'Continuer'
})

const selectedDateOption = computed(() => {
  return dateOptions.value.find(option => option.isoDate === selectedDate.value) ?? null
})

const selectedVehicle = computed(() => {
  return vehicles.value.find(vehicle => vehicle.id === selectedVehicleId.value) ?? null
})

const selectedServiceLabel = computed(() => selectedService.value?.label ?? 'Aucun service')
const selectedServicesLabel = computed(() => {
  if (selectedServiceIds.value.length === 0) {
    return selectedServiceLabel.value
  }

  const labels = selectedServiceIds.value
    .map(serviceId => services.value.find(service => service.id === serviceId)?.label)
    .filter((label): label is string => Boolean(label))

  return labels.join(' • ')
})
const selectedServicesSummaryLabel = computed(() => {
  if (isEditing.value || !multiServiceMode.value) {
    return selectedServiceLabel.value
  }

  return selectedServicesLabel.value
})
const selectedVehicleLabel = computed(() => {
  if (!selectedVehicle.value) {
    return vehicles.value.length > 0 ? 'Aucun vehicule' : 'Aucun vehicule enregistre'
  }

  return formatVehicleLabel(selectedVehicle.value)
})
const selectedDateLabel = computed(() => selectedDateOption.value?.label ?? 'Aucune date')
const selectedTimeLabel = computed(() => selectedTime.value ?? 'Aucune heure')
const requiresVehicleSelection = computed(() => vehicles.value.length > 0)
const canSubmit = computed(() => {
  const hasServiceSelection = isEditing.value
    ? Boolean(selectedServiceId.value)
    : (multiServiceMode.value
      ? Boolean(selectedServiceIds.value.length > 0 || selectedServiceId.value)
      : Boolean(selectedServiceId.value))

  return Boolean(
    hasServiceSelection &&
      selectedDate.value &&
      selectedTime.value &&
      (!requiresVehicleSelection.value || selectedVehicleId.value) &&
      !isSubmitting.value
  )
})

async function loadServices() {
  services.value = ReservationService.getFallbackServices()
  services.value = await ReservationService.getServices()
}

async function loadVehicles() {
  vehicles.value = await VehicleService.getVehicles()

  if (!selectedVehicleId.value && vehicles.value.length > 0) {
    selectedVehicleId.value = vehicles.value[0].id
  }

  if (selectedVehicleId.value && !vehicles.value.some(vehicle => vehicle.id === selectedVehicleId.value)) {
    selectedVehicleId.value = vehicles.value[0]?.id ?? null
  }
}

async function refreshSlots() {
  if (!selectedDate.value) {
    availableSlots.value = []
    selectedTime.value = null
    return
  }

  const serviceIds = isEditing.value
    ? (selectedServiceId.value ? [selectedServiceId.value] : [])
    : (multiServiceMode.value
      ? (selectedServiceIds.value.length > 0
        ? [...selectedServiceIds.value]
        : (selectedServiceId.value ? [selectedServiceId.value] : []))
      : (selectedServiceId.value ? [selectedServiceId.value] : []))

  if (serviceIds.length === 0) {
    availableSlots.value = []
    selectedTime.value = null
    return
  }

  const excludeId = props.reservationToEdit?.id

  const fallbackSlotLists = serviceIds.map(serviceId =>
    ReservationService.getFallbackAvailableSlots(serviceId, selectedDate.value, excludeId)
  )
  availableSlots.value = intersectSlots(fallbackSlotLists)

  const slotLists = await Promise.all(
    serviceIds.map(serviceId =>
      ReservationService.getAvailableSlots(serviceId, selectedDate.value, excludeId)
    )
  )
  availableSlots.value = intersectSlots(slotLists)

  if (!availableSlots.value.includes(selectedTime.value ?? '')) {
    selectedTime.value = null
  }
}

function intersectSlots(slotLists: string[][]) {
  if (slotLists.length === 0) {
    return []
  }

  return slotLists.reduce<string[]>((commonSlots, currentSlots) => {
    return commonSlots.filter(slot => currentSlots.includes(slot))
  }, [...slotLists[0]])
}

function initializeSelectionFromProps() {
  if (!props.reservationToEdit) {
    return
  }

  selectedServiceId.value = props.reservationToEdit.serviceId
  selectedServiceIds.value = [props.reservationToEdit.serviceId]
  selectedVehicleId.value = props.reservationToEdit.vehicleId ?? null
  selectedDate.value = props.reservationToEdit.date
  selectedTime.value = props.reservationToEdit.time
}

function toggleMultiServiceMode() {
  if (isEditing.value) {
    return
  }

  multiServiceMode.value = !multiServiceMode.value

  if (!multiServiceMode.value) {
    selectedServiceIds.value = []
  }
}

function syncDateOptions() {
  const nextDateOptions = buildDateOptions(DATE_OPTIONS_COUNT)
  if (selectedDate.value && !nextDateOptions.some(option => option.isoDate === selectedDate.value)) {
    nextDateOptions.unshift(buildDateOption(selectedDate.value))
    nextDateOptions.sort((left, right) => left.isoDate.localeCompare(right.isoDate))
  }

  dateOptions.value = nextDateOptions
}

async function onPageLoaded() {
  initializeSelectionFromProps()
  syncDateOptions()
  await Promise.all([loadServices(), loadVehicles()])
  if (selectedServiceId.value && selectedDate.value) {
    await refreshSlots()
  }
  console.log('Reservations page loaded')
}

async function selectService(serviceId: string) {
  if (!isEditing.value && multiServiceMode.value) {
    if (selectedServiceIds.value.includes(serviceId)) {
      selectedServiceIds.value = selectedServiceIds.value.filter(id => id !== serviceId)
      if (selectedServiceId.value === serviceId) {
        selectedServiceId.value = selectedServiceIds.value[0] ?? null
      }
    } else {
      selectedServiceIds.value = [...selectedServiceIds.value, serviceId]
      selectedServiceId.value = serviceId
    }

    if (selectedServiceId.value) {
      await refreshSlots()
    } else {
      availableSlots.value = []
      selectedTime.value = null
    }

    return
  }

  selectedServiceId.value = serviceId

  if (!isEditing.value && !multiServiceMode.value) {
    selectedServiceIds.value = []
  }

  await refreshSlots()
}

async function selectDate(date: string) {
  selectedDate.value = date
  await refreshSlots()
}

function selectTime(slot: string) {
  selectedTime.value = slot
}

function selectVehicle(vehicleId: string) {
  selectedVehicleId.value = vehicleId
}

function formatVehicleLabel(vehicle: Vehicle) {
  const details = [vehicle.model?.trim(), vehicle.licensePlate?.trim()].filter(Boolean)
  return details.length > 0 ? details.join(' - ') : vehicle.name
}

async function createReservation() {
  if (!canSubmit.value) {
    await alert({
      title: isEditing.value ? 'Modification incomplete' : 'Reservation incomplete',
      message: requiresVehicleSelection.value
        ? 'Choisissez un service, un vehicule, une date et une heure avant de continuer.'
        : 'Choisissez un service, une date et une heure avant de continuer.',
      okButtonText: 'OK'
    })
    return
  }

  try {
    isSubmitting.value = true

    const serviceIdsToBook = multiServiceMode.value
      ? (selectedServiceIds.value.length > 0
        ? selectedServiceIds.value
        : (selectedServiceId.value ? [selectedServiceId.value] : []))
      : (selectedServiceId.value ? [selectedServiceId.value] : [])

    if (serviceIdsToBook.length === 0) {
      throw new Error('Aucun service selectionne.')
    }

    const selectedServices = serviceIdsToBook
      .map(serviceId => services.value.find(service => service.id === serviceId))
      .filter((service): service is ReservationServiceOption => Boolean(service))

    for (const service of selectedServices) {
      await ReservationService.createReservation({
        serviceId: service.id,
        serviceLabel: service.label,
        vehicleId: selectedVehicleId.value ?? undefined,
        date: selectedDate.value,
        time: selectedTime.value as string
      })
    }

    const confirmationLabel = selectedServices.length > 1
      ? `${selectedServices.length} services`
      : (selectedServices[0]?.label ?? 'Service')

    await alert({
      title: 'Reservation confirmee',
      message: `${confirmationLabel} reserves le ${selectedDateLabel.value} a ${selectedTime.value}.`,
      okButtonText: 'OK'
    })

    selectedServiceId.value = null
    selectedServiceIds.value = []
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

async function updateReservation() {
  if (!canSubmit.value || !selectedService.value || !props.reservationToEdit) {
    await createReservation()
    return
  }

  try {
    isSubmitting.value = true

    const reservation = await ReservationService.updateReservation(props.reservationToEdit.id, {
      serviceId: selectedService.value.id,
      vehicleId: selectedVehicleId.value ?? undefined,
      date: selectedDate.value,
      time: selectedTime.value as string
    })

    await alert({
      title: 'Rendez-vous modifie',
      message: `${reservation.serviceLabel} repositionne le ${selectedDateLabel.value} a ${reservation.time}.`,
      okButtonText: 'OK'
    })

    try {
      await props.onReservationUpdated?.()
    } catch (refreshError) {
      console.warn('Unable to refresh appointments after update:', refreshError)
    }

    goBack()
  } catch (error) {
    console.error('Reservation update failed:', error)
    await alert({
      title: 'Erreur',
      message: 'Impossible de modifier le rendez-vous pour le moment.',
      okButtonText: 'OK'
    })
  } finally {
    isSubmitting.value = false
  }
}

async function submitReservation() {
  if (isEditing.value) {
    await updateReservation()
    return
  }

  await createReservation()
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

.section-title-row {
  margin-bottom: 10;
}

.section-title-row .section-title {
  margin-bottom: 0;
  vertical-align: center;
}

.multi-toggle {
  background-color: #e5e7eb;
  border-radius: 999;
  padding: 6 10;
  min-width: 58;
}

.multi-toggle.active {
  background-color: #fee2e2;
}

.multi-toggle-text {
  color: #374151;
  font-size: 11;
  font-weight: 800;
  text-align: center;
}

.multi-toggle.active .multi-toggle-text {
  color: #b91c1c;
}

.service-list {
  margin-bottom: 18;
}

.selected-services-card {
  background-color: #fff7ed;
  border-radius: 10;
  border-width: 1;
  border-color: #fdba74;
  padding: 10 12;
}

.selected-services-title {
  color: #9a3412;
  font-size: 12;
  font-weight: 800;
  margin-bottom: 4;
}

.selected-services-copy {
  color: #7c2d12;
  font-size: 12;
  font-weight: 600;
}

.vehicle-list {
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

.vehicle-item {
  background-color: #ffffff;
  border-radius: 12;
  padding: 14 16;
  margin-bottom: 10;
  vertical-align: center;
  border-width: 1;
  border-color: #e5e7eb;
}

.vehicle-item.selected {
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

.vehicle-text {
  font-size: 15;
  color: #111827;
  font-weight: 700;
}

.vehicle-meta {
  font-size: 12;
  color: #6b7280;
  margin-top: 4;
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

.date-scroll {
  margin-bottom: 16;
}

.date-scroll-inner {
  padding-right: 16;
}

.date-card {
  width: 92;
  background-color: #ffffff;
  border-radius: 12;
  padding: 12 10;
  margin-right: 10;
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

.empty-vehicle-card {
  background-color: #ffffff;
  border-radius: 14;
  padding: 16;
  margin-bottom: 18;
}

.empty-vehicle-title {
  color: #111827;
  font-size: 15;
  font-weight: 700;
  margin-bottom: 6;
}

.empty-vehicle-copy {
  color: #6b7280;
  font-size: 12;
  margin-bottom: 14;
}

.empty-vehicle-cta {
  background-color: #1f2733;
  border-radius: 12;
  padding: 13 14;
}

.empty-vehicle-cta-text {
  color: #ffffff;
  font-size: 14;
  font-weight: 700;
  text-align: center;
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
  color: #dc2626;
}

.nav-item.active .nav-label {
  color: #dc2626;
  font-weight: 700;
}
</style>

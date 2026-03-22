<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Mes vehicules" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="hero-card">
            <Label text="Parc automobile" class="hero-title" />
            <Label
              text="Consultez vos vehicules, leur kilometrage et les actions disponibles."
              class="hero-subtitle"
              textWrap="true"
            />
          </StackLayout>

          <GridLayout columns="*,*" columnSpacing="12" class="summary-grid">
            <StackLayout col="0" class="summary-card">
              <Label :text="String(totalVehicles)" class="summary-value" />
              <Label text="Vehicules actifs" class="summary-label" />
            </StackLayout>

            <StackLayout col="1" class="summary-card summary-card-dark">
              <Label :text="averageMileageLabel" class="summary-value small light" />
              <Label text="Kilometrage moyen" class="summary-label light" />
            </StackLayout>
          </GridLayout>

          <GridLayout columns="*,auto" class="section-header">
            <Label text="Ma flotte" col="0" class="section-title" />
            <GridLayout col="1" class="primary-action" @tap="addVehicle">
              <Label text="Ajouter" class="primary-action-text" />
            </GridLayout>
          </GridLayout>

          <StackLayout v-if="vehicles.length === 0" class="empty-card">
            <Label text="Aucun vehicule enregistre." class="empty-title" />
            <Label
              text="Ajoutez votre premier vehicule pour suivre l entretien et les interventions."
              class="empty-text"
              textWrap="true"
            />
            <GridLayout class="empty-cta" @tap="addVehicle">
              <Label text="Ajouter un vehicule" class="empty-cta-text" />
            </GridLayout>
          </StackLayout>

          <StackLayout v-else>
            <GridLayout
              v-for="vehicle in vehicles"
              :key="vehicle.id"
              rows="auto,auto,auto"
              columns="56,*,auto"
              class="vehicle-card"
              @tap="selectVehicle(vehicle)"
            >
              <GridLayout row="0" rowSpan="3" col="0" class="vehicle-badge">
                <Label :text="getVehicleBadge(vehicle)" class="vehicle-badge-text" />
              </GridLayout>

              <StackLayout row="0" col="1" class="vehicle-copy">
                <Label :text="vehicle.name" class="vehicle-title" />
                <Label :text="vehicle.model" class="vehicle-subtitle" />
              </StackLayout>

              <GridLayout row="0" col="2" class="more-btn" @tap="openVehicleOptions(vehicle)">
                <Label text="..." class="more-btn-text" />
              </GridLayout>

              <GridLayout row="1" col="1" colSpan="2" columns="auto,auto,auto" columnSpacing="8" class="meta-row">
                <Label col="0" :text="'Annee ' + vehicle.year" class="meta-pill" />
                <Label col="1" :text="fuelLabel(vehicle)" class="meta-pill" />
                <Label col="2" :text="typeLabel(vehicle)" class="meta-pill" />
              </GridLayout>

              <GridLayout row="2" col="1" colSpan="2" columns="*,auto" class="vehicle-footer">
                <Label col="0" :text="plateLabel(vehicle)" class="vehicle-detail" />
                <Label col="1" :text="formatKilometers(vehicle.mileage)" class="vehicle-mileage" />
              </GridLayout>
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
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
        <GridLayout col="3" class="nav-item active" @tap="navigateTo('vehicles')">
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

    <GridLayout v-if="showVehicleDialog" class="sheet-backdrop" @tap="showVehicleDialog = false">
      <StackLayout class="sheet" @tap="consumeTap">
        <Label text="Options du vehicule" class="sheet-title" />
        <GridLayout class="sheet-btn" @tap="viewVehicleDetails">
          <Label text="Voir les details" class="sheet-btn-text" />
        </GridLayout>
        <GridLayout class="sheet-btn" @tap="editVehicle">
          <Label text="Modifier" class="sheet-btn-text" />
        </GridLayout>
        <GridLayout class="sheet-btn danger" @tap="deleteVehicle">
          <Label text="Supprimer" class="sheet-btn-text" />
        </GridLayout>
        <GridLayout class="sheet-cancel" @tap="showVehicleDialog = false">
          <Label text="Fermer" class="sheet-cancel-text" />
        </GridLayout>
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { alert } from '@nativescript/core'
import { computed, ref } from 'nativescript-vue'
import VehicleService from '@/services/VehicleService'
import { formatKilometers } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'
import type { Vehicle } from '@/types/vehicle'

const vehicles = ref<Vehicle[]>([])
const selectedVehicle = ref<Vehicle | null>(null)
const showVehicleDialog = ref(false)

const totalVehicles = computed(() => vehicles.value.length)
const averageMileageLabel = computed(() => {
  if (vehicles.value.length === 0) {
    return '0 km'
  }

  const totalMileage = vehicles.value.reduce((sum, vehicle) => sum + vehicle.mileage, 0)
  return formatKilometers(Math.round(totalMileage / vehicles.value.length))
})

async function onPageLoaded() {
  vehicles.value = await VehicleService.getVehicles()
  console.log('Vehicles page loaded')
}

function getVehicleBadge(vehicle: Vehicle) {
  return vehicle.name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase()
}

function typeLabel(vehicle: Vehicle) {
  if (vehicle.type === 'sedan') return 'Berline'
  if (vehicle.type === 'suv') return 'SUV'
  if (vehicle.type === 'truck') return 'Camion'
  if (vehicle.type === 'minivan') return 'Monospace'
  if (vehicle.type === 'coupe') return 'Coupe'
  return 'Autre'
}

function fuelLabel(vehicle: Vehicle) {
  return vehicle.fuelType ?? 'Carburant'
}

function plateLabel(vehicle: Vehicle) {
  return vehicle.licensePlate ? `Plaque ${vehicle.licensePlate}` : 'Plaque non renseignee'
}

function selectVehicle(vehicle: Vehicle) {
  selectedVehicle.value = vehicle
  void navigateToPage('vehicleDetails', {
    props: { vehicle }
  })
}

function openVehicleOptions(vehicle: Vehicle) {
  selectedVehicle.value = vehicle
  showVehicleDialog.value = true
}

function editVehicle() {
  if (!selectedVehicle.value) {
    return
  }

  showVehicleDialog.value = false
  void navigateToPage('addVehicle', {
    props: { vehicle: selectedVehicle.value }
  })
}

function viewVehicleDetails() {
  if (!selectedVehicle.value) {
    return
  }

  showVehicleDialog.value = false
  void navigateToPage('vehicleDetails', {
    props: { vehicle: selectedVehicle.value }
  })
}

async function deleteVehicle() {
  if (!selectedVehicle.value) {
    return
  }

  try {
    const id = selectedVehicle.value.id
    await VehicleService.deleteVehicle(id)
    vehicles.value = vehicles.value.filter(vehicle => vehicle.id !== id)
    showVehicleDialog.value = false
  } catch (error) {
    await alert({
      title: 'Erreur',
      message: error instanceof Error ? error.message : 'Impossible de supprimer ce vehicule.',
      okButtonText: 'OK'
    })
  }
}

function addVehicle() {
  void navigateToPage('addVehicle')
}

function consumeTap() {
  return
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'vehicles' })
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
.summary-grid { column-gap: 12; margin-bottom: 18; }
.summary-card { background-color: #ffffff; border-radius: 16; padding: 16; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.summary-card-dark { background-color: #1f2733; }
.summary-value { color: #111827; font-size: 24; font-weight: 800; margin-bottom: 4; }
.summary-value.small { font-size: 18; }
.summary-value.light { color: #ffffff; }
.summary-label { color: #6b7280; font-size: 12; font-weight: 600; }
.summary-label.light { color: #cbd5e1; }
.section-header { margin-bottom: 10; }
.section-title { color: #1f2733; font-size: 16; font-weight: 800; vertical-align: center; }
.primary-action { background-color: #dc2626; border-radius: 12; padding: 10 16; }
.primary-action-text { color: #ffffff; font-size: 13; font-weight: 700; text-align: center; }
.empty-card { background-color: #ffffff; border-radius: 16; padding: 20; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.empty-title { color: #111827; font-size: 18; font-weight: 700; margin-bottom: 8; }
.empty-text { color: #6b7280; font-size: 13; margin-bottom: 16; }
.empty-cta { background-color: #dc2626; border-radius: 12; padding: 14; }
.empty-cta-text { color: #ffffff; font-size: 15; font-weight: 700; text-align: center; }
.vehicle-card { background-color: #ffffff; border-radius: 16; padding: 16; margin-bottom: 12; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.vehicle-badge { width: 40; height: 40; border-radius: 12; background-color: #dc2626; vertical-align: top; }
.vehicle-badge-text { color: #ffffff; font-size: 12; font-weight: 800; text-align: center; vertical-align: center; }
.vehicle-copy { margin-left: 14; margin-right: 12; }
.vehicle-title { color: #111827; font-size: 16; font-weight: 700; }
.vehicle-subtitle { color: #6b7280; font-size: 13; margin-top: 4; }
.more-btn { width: 34; height: 34; border-radius: 10; background-color: #f3f4f6; }
.more-btn-text { color: #6b7280; font-size: 16; font-weight: 700; text-align: center; vertical-align: center; }
.meta-row { margin-top: 12; column-gap: 8; }
.meta-pill { background-color: #f3f4f6; color: #374151; font-size: 11; font-weight: 700; padding: 6 10; border-radius: 999; }
.vehicle-footer { margin-top: 14; }
.vehicle-detail { color: #6b7280; font-size: 12; }
.vehicle-mileage { color: #dc2626; font-size: 14; font-weight: 800; text-align: right; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 8 2 6 2; }
.nav-stack { horizontal-align: center; vertical-align: center; height: 60; }
.nav-icon { font-size: 22; text-align: center; color: #f0f2f6; margin-bottom: 4; vertical-align: top; }
.nav-label { font-size: 11; font-weight: 700; text-align: center; color: #f0f2f6; vertical-align: bottom; }
.nav-item.active .nav-icon { color: #dc2626; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
.sheet-backdrop { position: absolute; left: 0; right: 0; top: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.4); justify-content: flex-end; }
.sheet { background-color: #1f2733; padding: 20 16 28 16; border-top-left-radius: 16; border-top-right-radius: 16; }
.sheet-title { color: #fff; font-size: 16; font-weight: 700; text-align: center; margin-bottom: 8; }
.sheet-btn { background-color: #dc2626; border-radius: 10; padding: 12; margin-top: 8; }
.sheet-btn-text { color: #fff; font-size: 15; font-weight: 700; text-align: center; }
.sheet-btn.danger { background-color: #b91c1c; }
.sheet-cancel { background-color: #2c3544; border-radius: 10; padding: 12; margin-top: 12; }
.sheet-cancel-text { color: #d1d5db; font-size: 14; text-align: center; }
</style>

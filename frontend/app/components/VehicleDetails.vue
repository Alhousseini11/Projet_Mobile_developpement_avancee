<template>
  <Page @loaded="onPageLoaded" class="bg-gray-900">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Details du vehicule" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <ScrollView class="bg-gray-900">
      <StackLayout class="px-4 py-6">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>
        <GridLayout rows="auto,auto" columns="*" class="bg-gray-800 rounded-lg p-6 mb-6">
          <StackLayout row="0" class="mb-4">
            <Label text="Vehicule" class="text-white text-sm uppercase text-center mb-2" />
            <Label :text="vehicle.name" class="text-white text-2xl font-bold text-center" />
            <Label :text="vehicle.model" class="text-gray-400 text-lg text-center" />
          </StackLayout>

          <GridLayout row="1" rows="auto" columns="*,*" class="gap-4">
            <GridLayout col="0" rows="auto,auto" class="bg-gray-700 rounded-lg p-4 text-center">
              <Label text="Annee" class="text-gray-400 text-center text-sm" />
              <Label :text="vehicle.year.toString()" class="text-white text-lg font-bold" />
            </GridLayout>

            <GridLayout col="1" rows="auto,auto" class="bg-gray-700 rounded-lg p-4 text-center">
              <Label text="Km" class="text-gray-400 text-center text-sm" />
              <Label :text="`${vehicle.mileage.toLocaleString()} km`" class="text-white text-sm font-bold" />
            </GridLayout>
          </GridLayout>
        </GridLayout>

        <Label text="Informations generales" class="text-white text-lg font-bold mb-4" />

        <StackLayout class="mb-6">
          <StackLayout class="info-row mb-3">
            <Label text="Immatriculation" class="info-label" />
            <Label :text="vehicle.licensePlate || 'Non renseignee'" class="info-value" />
          </StackLayout>

          <StackLayout class="info-row mb-3">
            <Label text="Carburant" class="info-label" />
            <Label :text="vehicle.fuelType || 'Non renseigne'" class="info-value" />
          </StackLayout>

          <StackLayout class="info-row">
            <Label text="Categorie" class="info-label" />
            <Label :text="getVehicleTypeLabel(vehicle.type)" class="info-value" />
          </StackLayout>
        </StackLayout>

        <Label text="Actions" class="text-white text-lg font-bold mb-4" />

        <GridLayout rows="auto" columns="*" class="bg-gray-800 rounded-lg p-4 mb-3" @tap="viewMaintenanceHistory">
          <Label text="Voir l'historique d'entretien" class="text-red-600 text-center font-bold" />
        </GridLayout>

        <GridLayout rows="auto" columns="*" class="bg-gray-800 rounded-lg p-4 mb-3" @tap="viewDocuments">
          <Label text="Voir les documents" class="text-red-600 text-center font-bold" />
        </GridLayout>

        <GridLayout rows="auto" columns="*" class="bg-gray-800 rounded-lg p-4 mb-6" @tap="viewInsurance">
          <Label text="Voir l'assurance" class="text-red-600 text-center font-bold" />
        </GridLayout>

        <GridLayout rows="auto" columns="*" class="bg-yellow-600 rounded-lg p-4 mb-3" @tap="editVehicle">
          <Label text="Modifier le vehicule" class="text-white text-center font-bold text-lg" />
        </GridLayout>

        <GridLayout rows="auto" columns="*" class="bg-red-700 rounded-lg p-4" @tap="deleteVehicle">
          <Label text="Supprimer le vehicule" class="text-white text-center font-bold text-lg" />
        </GridLayout>
      </StackLayout>
    </ScrollView>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue'
import { goBack as navigateBack, navigateToPage } from '@/utils/navigation'

interface VehicleRecord {
  id?: string
  name: string
  model: string
  year: number
  mileage: number
  type: 'sedan' | 'suv' | 'truck' | 'other'
  licensePlate?: string
  fuelType?: string
}

const props = defineProps<{
  vehicle?: VehicleRecord
}>()

const defaultVehicle = (): VehicleRecord => ({
  id: '1',
  name: 'Toyota Corolla',
  model: 'Corolla 2018',
  year: 2018,
  mileage: 75000,
  type: 'sedan',
  licensePlate: 'AB-123-CD',
  fuelType: 'Essence'
})

const vehicle = ref<VehicleRecord>(props.vehicle ?? defaultVehicle())

const onPageLoaded = () => {
  console.log('Vehicle details page loaded')
}

const getVehicleTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    sedan: 'Berline',
    suv: 'SUV',
    truck: 'Camion',
    other: 'Autre'
  }

  return typeMap[type] || 'Type inconnu'
}

const editVehicle = () => {
  void navigateToPage('addVehicle', {
    props: { vehicle: vehicle.value }
  })
}

const deleteVehicle = () => {
  console.log('Delete vehicle:', vehicle.value.id)
}

const viewMaintenanceHistory = () => {
  console.log('View maintenance history for:', vehicle.value.id)
}

const viewDocuments = () => {
  console.log('View documents for:', vehicle.value.id)
}

const viewInsurance = () => {
  console.log('View insurance for:', vehicle.value.id)
}

const goBack = () => {
  void navigateBack()
}
</script>

<style scoped>
.bg-red-600 {
  background-color: #dc2626;
}

.bg-red-700 {
  background-color: #b91c1c;
}

.bg-yellow-600 {
  background-color: #ca8a04;
}

.bg-gray-900 {
  background-color: #111827;
}

.bg-gray-800 {
  background-color: #1f2937;
}

.bg-gray-700 {
  background-color: #374151;
}

.text-white {
  color: #ffffff;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-red-600 {
  color: #dc2626;
}

.action-bar {
  background-color: #dc2626;
  color: #ffffff;
}

  .action-bar-content {
    padding: 0 12;
  }

  .icon-back {
    color: #ffffff;
    font-size: 22;
    font-weight: 700;
    vertical-align: center;
  }

  .action-title {
    color: #ffffff;
    font-size: 17;
    font-weight: 700;
    text-align: left;
    vertical-align: center;
  }

  .inline-back {
    margin-bottom: 10;
  }

  .inline-back-text {
    color: #ef4339;
    font-size: 14;
    font-weight: 600;
  }

.info-row {
  background-color: #1f2937;
  border-radius: 10;
  padding: 14 16;
  text-align: center;
}

.info-label {
  color: #9ca3af;
  font-size: 13;
  text-align: center;
  margin-bottom: 4;
}

.info-value {
  color: #ffffff;
  font-size: 18;
  font-weight: 700;
  text-align: center;
}
</style>

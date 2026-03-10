<template>
  <Page @loaded="onPageLoaded" class="bg-gray-900">
    <ActionBar title="Détails du Véhicule" class="bg-red-600">
      <Label text="←" class="text-white text-2xl absolute left-4" @tap="goBack" />
      <Label text="✏️" class="text-white text-2xl absolute right-4" @tap="editVehicle" />
    </ActionBar>

    <ScrollView class="bg-gray-900">
      <StackLayout class="px-4 py-6">
        <!-- Vehicle Header -->
        <GridLayout
          rows="auto,auto"
          columns="*"
          class="bg-gray-800 rounded-lg p-6 mb-6"
        >
          <!-- Vehicle Icon and Name -->
          <StackLayout row="0" class="mb-4">
            <Label
              text="🚗"
              class="text-6xl text-center mb-2"
            />
            <Label
              :text="vehicle.name"
              class="text-white text-2xl font-bold text-center"
            />
            <Label
              :text="vehicle.model"
              class="text-gray-400 text-lg text-center"
            />
          </StackLayout>

          <!-- Quick Info -->
          <GridLayout
            row="1"
            rows="auto"
            columns="*,*"
            class="gap-4"
          >
            <GridLayout
              col="0"
              rows="auto,auto"
              class="bg-gray-700 rounded-lg p-4 text-center"
            >
              <Label
                text="📅"
                class="text-3xl text-center"
              />
              <Label
                :text="vehicle.year.toString()"
                class="text-white text-lg font-bold"
              />
            </GridLayout>

            <GridLayout
              col="1"
              rows="auto,auto"
              class="bg-gray-700 rounded-lg p-4 text-center"
            >
              <Label
                text="🔧"
                class="text-3xl text-center"
              />
              <Label
                :text="`${vehicle.mileage.toLocaleString()} km`"
                class="text-white text-sm font-bold"
              />
            </GridLayout>
          </GridLayout>
        </GridLayout>

        <!-- Detailed Information -->
        <Label
          text="Informations Générales"
          class="text-white text-lg font-bold mb-4"
        />

        <!-- Information cards -->
        <StackLayout class="mb-6">
          <!-- License Plate -->
          <GridLayout
            rows="auto,auto"
            columns="auto,*"
            class="bg-gray-800 rounded-lg p-4 mb-3"
          >
            <Label
              col="0"
              row="0"
              text="🆔"
              class="text-2xl"
            />
            <StackLayout col="1" row="0">
              <Label
                text="Immatriculation"
                class="text-gray-400 text-sm"
              />
              <Label
                :text="vehicle.licensePlate || 'Non renseignée'"
                class="text-white text-lg font-bold"
              />
            </StackLayout>
          </GridLayout>

          <!-- Fuel Type -->
          <GridLayout
            rows="auto,auto"
            columns="auto,*"
            class="bg-gray-800 rounded-lg p-4 mb-3"
          >
            <Label
              col="0"
              row="0"
              text="⛽"
              class="text-2xl"
            />
            <StackLayout col="1" row="0">
              <Label
                text="Type de Carburant"
                class="text-gray-400 text-sm"
              />
              <Label
                :text="vehicle.fuelType || 'Non renseigné'"
                class="text-white text-lg font-bold"
              />
            </StackLayout>
          </GridLayout>

          <!-- Vehicle Type -->
          <GridLayout
            rows="auto,auto"
            columns="auto,*"
            class="bg-gray-800 rounded-lg p-4"
          >
            <Label
              col="0"
              row="0"
              text="🚙"
              class="text-2xl"
            />
            <StackLayout col="1" row="0">
              <Label
                text="Type de Véhicule"
                class="text-gray-400 text-sm"
              />
              <Label
                :text="getVehicleTypeLabel(vehicle.type)"
                class="text-white text-lg font-bold"
              />
            </StackLayout>
          </GridLayout>
        </StackLayout>

        <!-- Maintenance Info -->
        <Label
          text="Historique d'Entretien"
          class="text-white text-lg font-bold mb-4"
        />

        <StackLayout class="mb-6">
          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 items-center justify-center"
            @tap="viewMaintenanceHistory"
          >
            <Label
              text="📋 Voir l'historique d'entretien"
              class="text-red-600 text-center font-bold"
            />
          </GridLayout>
        </StackLayout>

        <!-- Documents -->
        <Label
          text="Documents"
          class="text-white text-lg font-bold mb-4"
        />

        <StackLayout class="mb-6">
          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 mb-3 items-center justify-center"
            @tap="viewDocuments"
          >
            <Label
              text="📄 Documents du Véhicule"
              class="text-red-600 text-center font-bold"
            />
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 items-center justify-center"
            @tap="viewInsurance"
          >
            <Label
              text="🛡️ Assurance"
              class="text-red-600 text-center font-bold"
            />
          </GridLayout>
        </StackLayout>

        <!-- Action Buttons -->
        <Label
          text="Actions"
          class="text-white text-lg font-bold mb-4"
        />

        <GridLayout
          rows="auto"
          columns="*"
          class="bg-yellow-600 rounded-lg p-4 mb-3"
          @tap="editVehicle"
        >
          <Label
            text="✏️ Modifier Véhicule"
            class="text-white text-center font-bold text-lg"
          />
        </GridLayout>

        <GridLayout
          rows="auto"
          columns="*"
          class="bg-red-700 rounded-lg p-4"
          @tap="deleteVehicle"
        >
          <Label
            text="🗑️ Supprimer Véhicule"
            class="text-white text-center font-bold text-lg"
          />
        </GridLayout>
      </StackLayout>
    </ScrollView>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue'

interface Vehicle {
  id?: string
  name: string
  model: string
  year: number
  mileage: number
  type: 'sedan' | 'suv' | 'truck' | 'other'
  licensePlate?: string
  fuelType?: string
}

const vehicle = ref<Vehicle>({
  id: '1',
  name: 'Toyota Corolla',
  model: 'Corolla 2018',
  year: 2018,
  mileage: 75000,
  type: 'sedan',
  licensePlate: 'AB-123-CD',
  fuelType: 'Essence'
})

const onPageLoaded = () => {
  // Load vehicle details from navigation context
  // if (this.$route.params?.vehicleId) {
  //   this.loadVehicleData(this.$route.params.vehicleId)
  // }
}

const getVehicleTypeLabel = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    sedan: '🚗 Berline',
    suv: '🏎️ SUV',
    truck: '🚚 Camion',
    other: '🚙 Autre'
  }
  return typeMap[type] || 'Type inconnu'
}

const editVehicle = () => {
  console.log('Edit vehicle:', vehicle.value.id)
  // this.$navigator.navigate({
  //   moduleName: 'components/AddVehicle',
  //   context: { vehicleId: vehicle.value.id }
  // })
}

const deleteVehicle = () => {
  console.log('Delete vehicle:', vehicle.value.id)
  // Show confirmation dialog
  // Then call backend to delete
}

const viewMaintenanceHistory = () => {
  console.log('View maintenance history for:', vehicle.value.id)
  // Navigate to maintenance history
}

const viewDocuments = () => {
  console.log('View documents for:', vehicle.value.id)
  // Navigate to documents page
}

const viewInsurance = () => {
  console.log('View insurance for:', vehicle.value.id)
  // Navigate to insurance page
}

const goBack = () => {
  console.log('Go back to vehicles list')
  // this.$navigator.goBack()
}

const loadVehicleData = (vehicleId: string) => {
  // Load vehicle data from backend
  // this.$http.get(`/api/vehicles/${vehicleId}`)
  //   .then(response => {
  //     vehicle.value = response.data
  //   })
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
</style>

<template>
  <Page @loaded="onPageLoaded">
    <ActionBar :title="'Mes Véhicules'" class="bg-red-600">
      <Label text="←" class="text-white text-2xl absolute left-4" @tap="goBack" />
    </ActionBar>

    <GridLayout rows="*,60" class="bg-gray-900">
      <!-- ScrollView for vehicles list -->
      <ScrollView row="0" class="bg-gray-900">
        <StackLayout class="px-4 py-4">
          <!-- Empty state -->
          <StackLayout v-if="vehicles.length === 0" class="justify-center items-center py-20">
            <Label
              text="❌"
              class="text-6xl text-gray-500 mb-4"
            />
            <Label
              text="Aucun véhicule"
              class="text-white text-xl font-bold text-center"
            />
            <Label
              text="Ajoutez votre premier véhicule"
              class="text-gray-400 text-center mt-2"
            />
          </StackLayout>

          <!-- Vehicles list -->
          <StackLayout v-for="(vehicle, index) in vehicles" :key="index" class="mb-4">
            <!-- Vehicle card -->
            <GridLayout
              rows="auto,auto,auto"
              columns="*"
              class="bg-gray-800 rounded-lg p-4 border-l-4"
              :class="getBorderColorClass(vehicle.type)"
              @tap="selectVehicle(vehicle)"
              @longPress="showVehicleOptions(vehicle, index)"
            >
              <!-- Vehicle name and model -->
              <StackLayout row="0" class="mb-2">
                <Label
                  :text="vehicle.name"
                  class="text-white text-lg font-bold"
                />
                <Label
                  :text="vehicle.model"
                  class="text-gray-400 text-sm"
                />
              </StackLayout>

              <!-- Mileage -->
              <StackLayout row="1" class="mb-2 flex-row">
                <Label
                  text="🔧 "
                  class="text-lg"
                />
                <Label
                  :text="`${vehicle.mileage.toLocaleString()} km`"
                  class="text-gray-300 text-base"
                />
              </StackLayout>

              <!-- Year -->
              <StackLayout row="2" class="flex-row">
                <Label
                  text="📅 "
                  class="text-lg"
                />
                <Label
                  :text="`Année: ${vehicle.year}`"
                  class="text-gray-300 text-sm"
                />
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <!-- Add vehicle button (in scrollable area) -->
          <GridLayout
            rows="auto"
            columns="*"
            class="bg-red-600 rounded-lg p-4 mt-6 mb-4"
            @tap="addVehicle"
          >
            <Label
              text="➕ Ajouter Véhicule"
              class="text-white text-center font-bold text-lg"
            />
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <!-- Bottom navigation -->
      <GridLayout
        row="1"
        columns="*,*,*,*,*"
        class="bg-gray-800 border-t border-gray-700"
      >
        <GridLayout col="0" class="items-center justify-center" @tap="navigateTo('home')">
          <Label text="🏠" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="1" class="items-center justify-center" @tap="navigateTo('reservations')">
          <Label text="📅" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="2" class="items-center justify-center" @tap="navigateTo('tutorials')">
          <Label text="🎓" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="3" class="items-center justify-center" @tap="navigateTo('vehicles')">
          <Label text="🚗" class="text-2xl text-red-600 font-bold" />
        </GridLayout>
        <GridLayout col="4" class="items-center justify-center" @tap="navigateTo('profile')">
          <Label text="👤" class="text-2xl text-gray-400" />
        </GridLayout>
      </GridLayout>
    </GridLayout>

    <!-- Action dialog for vehicle options -->
    <GridLayout
      v-if="showVehicleDialog"
      class="absolute inset-0 bg-black bg-opacity-50 z-50 justify-center items-end"
      @tap="showVehicleDialog = false"
    >
      <StackLayout class="bg-gray-800 rounded-t-lg w-full p-4 pb-8" @tap.stop="() => {}">
        <Label
          text="Options du véhicule"
          class="text-white text-lg font-bold mb-4 text-center"
        />
        
        <GridLayout
          rows="auto"
          columns="*"
          class="bg-red-600 rounded-lg p-3 mb-3"
          @tap="editVehicle"
        >
          <Label
            text="✏️ Modifier"
            class="text-white text-center font-bold"
          />
        </GridLayout>

        <GridLayout
          rows="auto"
          columns="*"
          class="bg-red-600 rounded-lg p-3 mb-3"
          @tap="viewVehicleDetails"
        >
          <Label
            text="👁️ Détails"
            class="text-white text-center font-bold"
          />
        </GridLayout>

        <GridLayout
          rows="auto"
          columns="*"
          class="bg-red-700 rounded-lg p-3"
          @tap="deleteVehicle"
        >
          <Label
            text="🗑️ Supprimer"
            class="text-white text-center font-bold"
          />
        </GridLayout>

        <GridLayout
          rows="auto"
          columns="*"
          class="bg-gray-700 rounded-lg p-3 mt-3"
          @tap="showVehicleDialog = false"
        >
          <Label
            text="Annuler"
            class="text-gray-300 text-center"
          />
        </GridLayout>
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'nativescript-vue'
import VehicleService from '../services/VehicleService'

interface Vehicle {
  id?: string
  name: string
  model: string
  year: number
  mileage: number
  type: 'sedan' | 'suv' | 'truck' | 'other'
  licensePlate?: string
  fuelType?: string
  createdAt?: Date
  updatedAt?: Date
}

const vehicles = ref<Vehicle[]>([])
const selectedVehicle = ref<Vehicle | null>(null)
const showVehicleDialog = ref(false)
const isLoading = ref(false)

const onPageLoaded = async () => {
  console.log('Vehicles page loaded')
  await loadVehicles()
}

const loadVehicles = async () => {
  try {
    isLoading.value = true
    const data = await VehicleService.getVehicles()
    vehicles.value = data
    console.log('Vehicles loaded:', vehicles.value.length)
  } catch (error) {
    console.error('Error loading vehicles:', error)
  } finally {
    isLoading.value = false
  }
}

const getBorderColorClass = (type: string): string => {
  const colorMap: { [key: string]: string } = {
    sedan: 'border-red-600',
    suv: 'border-yellow-500',
    truck: 'border-blue-500',
    other: 'border-purple-500'
  }
  return colorMap[type] || 'border-red-600'
}

const selectVehicle = (vehicle: Vehicle) => {
  selectedVehicle.value = vehicle
  console.log('Selected vehicle:', vehicle)
}

const showVehicleOptions = (vehicle: Vehicle, index: number) => {
  selectedVehicle.value = vehicle
  showVehicleDialog.value = true
}

const editVehicle = () => {
  if (selectedVehicle.value) {
    console.log('Edit vehicle:', selectedVehicle.value.id)
    showVehicleDialog.value = false
  }
}

const viewVehicleDetails = () => {
  if (selectedVehicle.value) {
    console.log('View details for:', selectedVehicle.value.id)
    showVehicleDialog.value = false
  }
}

const deleteVehicle = async () => {
  if (selectedVehicle.value?.id) {
    try {
      console.log('Delete vehicle:', selectedVehicle.value.id)
      await VehicleService.deleteVehicle(selectedVehicle.value.id)
      
      // Update local state
      const index = vehicles.value.findIndex(
        (v: Vehicle) => v.id === selectedVehicle.value?.id
      )
      if (index > -1) {
        vehicles.value.splice(index, 1)
      }
      showVehicleDialog.value = false
      selectedVehicle.value = null
    } catch (error) {
      console.error('Error deleting vehicle:', error)
    }
  }
}

const addVehicle = () => {
  console.log('Add new vehicle')
}

const navigateTo = (page: string) => {
  console.log('Navigate to:', page)
}

const goBack = () => {
  console.log('Go back')
}
</script>

<style scoped>
.bg-red-600 {
  background-color: #dc2626;
}

.bg-red-700 {
  background-color: #b91c1c;
}

.text-red-600 {
  color: #dc2626;
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

.text-gray-300 {
  color: #d1d5db;
}

.text-gray-500 {
  color: #6b7280;
}

.border-red-600 {
  border-left-color: #dc2626;
}

.border-yellow-500 {
  border-left-color: #eab308;
}

.border-blue-500 {
  border-left-color: #3b82f6;
}

.border-purple-500 {
  border-left-color: #a855f7;
}

.bg-opacity-50 {
  opacity: 0.5;
}
</style>

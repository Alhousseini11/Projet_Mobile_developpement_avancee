<template>
  <Page @loaded="onPageLoaded" class="bg-gray-900">
    <ActionBar :title="isEditing ? 'Modifier Véhicule' : 'Ajouter Véhicule'" class="bg-red-600">
      <Label text="←" class="text-white text-2xl absolute left-4" @tap="goBack" />
    </ActionBar>

    <ScrollView class="bg-gray-900">
      <StackLayout class="px-4 py-6">
        <!-- Vehicle Name -->
        <Label text="Nom du Véhicule" class="text-white font-bold text-lg mb-2" />
        <TextField
          v-model="form.name"
          hint="Ex: Toyota Corolla"
          class="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 mb-4"
          :hint-color="'#9ca3af'"
        />

        <!-- Vehicle Model -->
        <Label text="Modèle" class="text-white font-bold text-lg mb-2" />
        <TextField
          v-model="form.model"
          hint="Ex: Corolla 2018"
          class="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 mb-4"
          :hint-color="'#9ca3af'"
        />

        <!-- Year -->
        <Label text="Année" class="text-white font-bold text-lg mb-2" />
        <TextField
          v-model.number="form.year"
          hint="Année de fabrication"
          keyboardType="number"
          class="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 mb-4"
          :hint-color="'#9ca3af'"
        />

        <!-- Mileage -->
        <Label text="Kilométrage" class="text-white font-bold text-lg mb-2" />
        <TextField
          v-model.number="form.mileage"
          hint="Ex: 75000"
          keyboardType="number"
          class="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 mb-4"
          :hint-color="'#9ca3af'"
        />

        <!-- License Plate -->
        <Label text="Immatriculation" class="text-white font-bold text-lg mb-2" />
        <TextField
          v-model="form.licensePlate"
          hint="Ex: AB-123-CD"
          class="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 mb-4"
          :hint-color="'#9ca3af'"
        />

        <!-- Fuel Type -->
        <Label text="Type de Carburant" class="text-white font-bold text-lg mb-2" />
        <GridLayout rows="auto" columns="*,*" class="mb-4" column-spacing="10">
          <GridLayout
            col="0"
            class="bg-gray-800 border rounded-lg p-3 justify-center"
            :class="form.fuelType === 'Essence' ? 'border-red-600 border-2' : 'border-gray-700'"
            @tap="form.fuelType = 'Essence'"
          >
            <Label text="⛽ Essence" class="text-white text-center font-bold" />
          </GridLayout>
          <GridLayout
            col="1"
            class="bg-gray-800 border rounded-lg p-3 justify-center"
            :class="form.fuelType === 'Diesel' ? 'border-red-600 border-2' : 'border-gray-700'"
            @tap="form.fuelType = 'Diesel'"
          >
            <Label text="⛽ Diesel" class="text-white text-center font-bold" />
          </GridLayout>
        </GridLayout>

        <!-- Vehicle Type -->
        <Label text="Type de Véhicule" class="text-white font-bold text-lg mb-2" />
        <GridLayout rows="auto,auto" columns="*,*" class="mb-6" column-spacing="10" row-spacing="10">
          <GridLayout
            col="0"
            row="0"
            class="bg-gray-800 border rounded-lg p-3 justify-center"
            :class="form.type === 'sedan' ? 'border-red-600 border-2' : 'border-gray-700'"
            @tap="form.type = 'sedan'"
          >
            <Label text="🚗 Berline" class="text-white text-center" />
          </GridLayout>
          <GridLayout
            col="1"
            row="0"
            class="bg-gray-800 border rounded-lg p-3 justify-center"
            :class="form.type === 'suv' ? 'border-red-600 border-2' : 'border-gray-700'"
            @tap="form.type = 'suv'"
          >
            <Label text="🏎️ SUV" class="text-white text-center" />
          </GridLayout>
          <GridLayout
            col="0"
            row="1"
            class="bg-gray-800 border rounded-lg p-3 justify-center"
            :class="form.type === 'truck' ? 'border-red-600 border-2' : 'border-gray-700'"
            @tap="form.type = 'truck'"
          >
            <Label text="🚚 Camion" class="text-white text-center" />
          </GridLayout>
          <GridLayout
            col="1"
            row="1"
            class="bg-gray-800 border rounded-lg p-3 justify-center"
            :class="form.type === 'other' ? 'border-red-600 border-2' : 'border-gray-700'"
            @tap="form.type = 'other'"
          >
            <Label text="🚙 Autre" class="text-white text-center" />
          </GridLayout>
        </GridLayout>

        <!-- Save Button -->
        <GridLayout
          rows="auto"
          columns="*"
          class="bg-red-600 rounded-lg p-4 mb-4"
          @tap="saveVehicle"
        >
          <Label
            :text="isSaving ? 'Enregistrement...' : isEditing ? '💾 Modifier Véhicule' : '➕ Ajouter Véhicule'"
            class="text-white text-center font-bold text-lg"
          />
        </GridLayout>

        <!-- Cancel Button -->
        <GridLayout
          rows="auto"
          columns="*"
          class="bg-gray-700 rounded-lg p-4"
          @tap="goBack"
        >
          <Label
            text="❌ Annuler"
            class="text-gray-300 text-center font-bold text-lg"
          />
        </GridLayout>
      </StackLayout>
    </ScrollView>
  </Page>
</template>

<script lang="ts" setup>
import { alert } from '@nativescript/core'
import { ref } from 'nativescript-vue'
import VehicleService from '@/services/VehicleService'
import { FuelType, type CreateVehicleDTO, type Vehicle, VehicleType } from '@/types/vehicle'
import { goBack as navigateBack } from '@/utils/navigation'

interface VehicleForm {
  id?: string
  name: string
  model: string
  year: number
  mileage: number
  licensePlate?: string
  fuelType: FuelType | `${FuelType}`
  type: VehicleType | `${VehicleType}`
  color?: string
}

const props = defineProps<{
  vehicle?: Vehicle
}>()

const defaultForm = (): VehicleForm => ({
  id: undefined,
  name: '',
  model: '',
  year: new Date().getFullYear(),
  mileage: 0,
  licensePlate: undefined,
  fuelType: FuelType.PETROL,
  type: VehicleType.SEDAN,
  color: undefined
})

const isEditing = ref(Boolean(props.vehicle?.id))
const isSaving = ref(false)
const form = ref<VehicleForm>({
  ...defaultForm(),
  ...(props.vehicle
    ? {
        ...props.vehicle,
        fuelType: props.vehicle.fuelType ?? FuelType.PETROL
      }
    : {})
})

const onPageLoaded = () => {
  console.log('AddVehicle page loaded')
}

function buildPayload(): CreateVehicleDTO {
  const name = form.value.name.trim()
  const model = form.value.model.trim()
  const licensePlate = form.value.licensePlate?.trim()
  const color = form.value.color?.trim()

  return {
    name,
    model,
    year: Number(form.value.year),
    mileage: Number(form.value.mileage),
    type: form.value.type,
    fuelType: form.value.fuelType,
    licensePlate: licensePlate || undefined,
    color: color || undefined
  }
}

const saveVehicle = async () => {
  if (isSaving.value) {
    return
  }

  const payload = buildPayload()

  if (!payload.name || !payload.model || !Number.isFinite(payload.year) || !Number.isFinite(payload.mileage)) {
    await alert({
      title: 'Vehicule incomplet',
      message: 'Renseignez au minimum le nom, le modele, l annee et le kilometrage.',
      okButtonText: 'OK'
    })
    return
  }

  try {
    isSaving.value = true

    if (isEditing.value && form.value.id) {
      console.log('Update vehicle:', payload)
      await VehicleService.updateVehicle(form.value.id, payload)
    } else {
      console.log('Create vehicle:', payload)
      await VehicleService.createVehicle(payload)
    }

    await alert({
      title: 'Vehicule',
      message: isEditing.value ? 'Vehicule mis a jour.' : 'Vehicule ajoute.',
      okButtonText: 'OK'
    })

    goBack()
  } catch (error) {
    console.error('Vehicle save failed:', error)
    await alert({
      title: 'Erreur',
      message: error instanceof Error ? error.message : 'Impossible d enregistrer le vehicule.',
      okButtonText: 'OK'
    })
  } finally {
    isSaving.value = false
  }
}

const goBack = () => {
  void navigateBack()
}

const loadVehicleData = (vehicleId: string) => {
  // Load vehicle data from backend
  // this.$http.get(`/api/vehicles/${vehicleId}`)
  //   .then(response => {
  //     form.value = response.data
  //   })
}
</script>

<style scoped>
.bg-red-600 {
  background-color: #dc2626;
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

.text-gray-300 {
  color: #d1d5db;
}

.text-gray-400 {
  color: #9ca3af;
}

.border-gray-700 {
  border-color: #374151;
}

.border-red-600 {
  border-color: #dc2626;
}

.border-2 {
  border-width: 2;
}

.border {
  border-width: 1;
}
</style>

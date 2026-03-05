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
            :text="isEditing ? '💾 Modifier Véhicule' : '➕ Ajouter Véhicule'"
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
import { ref } from 'nativescript-vue'

interface VehicleForm {
  id?: string
  name: string
  model: string
  year: number
  mileage: number
  licensePlate?: string
  fuelType: string
  type: string
}

const isEditing = ref(false)
const form = ref<VehicleForm>({
  id: '',
  name: '',
  model: '',
  year: new Date().getFullYear(),
  mileage: 0,
  licensePlate: '',
  fuelType: 'Essence',
  type: 'sedan'
})

const onPageLoaded = () => {
  console.log('AddVehicle page loaded')
  // Check if we're editing by looking at navigation context
  // if (this.$route.params?.vehicleId) {
  //   isEditing.value = true
  //   loadVehicleData(this.$route.params.vehicleId)
  // }
}

const saveVehicle = () => {
  if (!form.value.name || !form.value.model) {
    console.log('Please fill all required fields')
    return
  }

  const vehicleData = {
    ...form.value,
    mileage: parseInt(form.value.mileage.toString()),
    year: parseInt(form.value.year.toString())
  }

  if (isEditing.value) {
    console.log('Update vehicle:', vehicleData)
    // this.$http.put(`/api/vehicles/${form.value.id}`, vehicleData)
  } else {
    console.log('Create vehicle:', vehicleData)
    // this.$http.post('/api/vehicles', vehicleData)
  }

  goBack()
}

const goBack = () => {
  console.log('Go back to vehicles list')
  // this.$navigator.goBack()
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

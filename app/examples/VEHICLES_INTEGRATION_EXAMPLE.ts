/**
 * EXEMPLE D'INTÉGRATION SIMPLIFIÉE - Gestion des Véhicules
 */

import { ref, onMounted, readonly } from 'nativescript-vue'
import VehicleService from '../services/VehicleService'
import type { Vehicle, CreateVehicleDTO } from '../services/VehicleService'
import { formatKilometers, validateVehicleForm, showAlert } from '../utils/ui'

// ============================================
// COMPOSABLES RÉUTILISABLES
// ============================================

/**
 * Composable pour gérer les véhicules
 */
export function useVehicles() {
  const vehicles = ref<Vehicle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadVehicles = async () => {
    loading.value = true
    error.value = null
    try {
      vehicles.value = await VehicleService.getVehicles()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      loading.value = false
    }
  }

  const createVehicle = async (data: CreateVehicleDTO) => {
    try {
      const newVehicle = await VehicleService.createVehicle(data)
      vehicles.value.push(newVehicle)
      return newVehicle
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    }
  }

  const updateVehicle = async (id: string, data: Partial<CreateVehicleDTO>) => {
    try {
      const updated = await VehicleService.updateVehicle(id, data)
      const index = vehicles.value.findIndex((v: Vehicle) => v.id === id)
      if (index > -1) {
        vehicles.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    }
  }

  const deleteVehicle = async (id: string) => {
    try {
      await VehicleService.deleteVehicle(id)
      vehicles.value = vehicles.value.filter((v: Vehicle) => v.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      throw err
    }
  }

  onMounted(() => {
    loadVehicles()
  })

  return {
    vehicles: readonly(vehicles),
    loading: readonly(loading),
    error: readonly(error),
    loadVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle
  }
}

// ============================================
// EXEMPLE D'UTILISATION
// ============================================

export async function exampleCreateVehicle() {
  const newVehicleData: CreateVehicleDTO = {
    name: 'Ma Voiture',
    model: 'Citroën C3',
    year: 2022,
    mileage: 15000,
    type: 'sedan',
    licensePlate: 'AB-123-CD',
    fuelType: 'Essence'
  }

  return newVehicleData
}

export function exampleFormValidation() {
  const formData = {
    name: 'Toyota Corolla',
    model: 'Corolla',
    year: 2018,
    mileage: 75000,
    type: 'sedan',
    fuelType: 'Essence'
  }

  const validationResult = validateVehicleForm(formData)

  if (validationResult.valid) {
    console.log('Formulaire valide!')
  } else {
    console.log('Erreurs:')
    validationResult.errors.forEach(error => {
      console.log(`  - ${error}`)
    })
  }
}

export function exampleDataFormatting() {
  const vehicle: Vehicle = {
    id: '1',
    name: 'Toyota Corolla',
    model: 'Corolla 2018',
    year: 2018,
    mileage: 75000,
    type: 'sedan',
    licensePlate: 'AB-123-CD',
    fuelType: 'Essence',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // Formater le kilométrage
  const formattedKm = formatKilometers(vehicle.mileage)
  console.log(formattedKm) // "75 000 km"
}

export async function exampleCreateAndUpdate() {
  try {
    // 1. Créer un véhicule
    const newVehicle = await VehicleService.createVehicle({
      name: 'Renault Clio',
      model: 'Clio V',
      year: 2020,
      mileage: 45000,
      type: 'sedan',
      licensePlate: 'EF-456-GH',
      fuelType: 'Diesel'
    })

    console.log('Véhicule créé:', newVehicle)

    // 2. Récupérer les détails
    const details = await VehicleService.getVehicleById(newVehicle.id || '1')
    console.log('Détails du véhicule:', details)

    // 3. Supprimer le véhicule
    // await VehicleService.deleteVehicle(newVehicle.id)
  } catch (error) {
    console.error('Erreur:', error)
  }
}

export async function exampleErrorHandling() {
  try {
    const vehicles = await VehicleService.getVehicles()
    return vehicles
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Erreur réseau:', error)
    } else if (error instanceof Error) {
      console.error('Erreur:', error.message)
    } else {
      console.error('Erreur inconnue:', error)
    }
    return []
  }
}

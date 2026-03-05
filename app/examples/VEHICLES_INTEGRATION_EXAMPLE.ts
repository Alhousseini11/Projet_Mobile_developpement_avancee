/**
 * EXEMPLE D'INTÉGRATION - Gestion des Véhicules
 * 
 * Ce fichier montre comment utiliser les composants et services
 * créés pour la gestion des véhicules dans l'application mobile.
 */

// ============================================
// 1. IMPORTER LES SERVICES ET TYPES
// ============================================

import VehicleService, { Vehicle, CreateVehicleDTO } from '@/services/VehicleService'
import { VehicleType, FuelType } from '@/types/vehicle'
import { formatKilometers, validateVehicleForm, showAlert } from '@/utils/ui'

// ============================================
// 2. UTILISER LE SERVICE DANS LES COMPOSANTS
// ============================================

/**
 * Exemple d'utilisation dans le composant Vehicles.vue
 */
export const vehiclesComponentExample = {
  data() {
    return {
      vehicles: [] as Vehicle[],
      loading: false,
      error: null as string | null
    }
  },

  async mounted() {
    await this.loadVehicles()
  },

  methods: {
    async loadVehicles() {
      this.loading = true
      try {
        this.vehicles = await VehicleService.getVehicles()
        console.log('Véhicules chargés:', this.vehicles)
      } catch (error) {
        this.error = 'Erreur lors du chargement des véhicules'
        await showAlert('Erreur', this.error)
      } finally {
        this.loading = false
      }
    },

    async addVehicle(formData: CreateVehicleDTO) {
      try {
        const newVehicle = await VehicleService.createVehicle(formData)
        this.vehicles.push(newVehicle)
        await showAlert('Succès', 'Véhicule ajouté avec succès!')
      } catch (error) {
        await showAlert('Erreur', 'Impossible d\'ajouter le véhicule')
      }
    },

    async deleteVehicle(vehicleId: string) {
      try {
        await VehicleService.deleteVehicle(vehicleId)
        this.vehicles = this.vehicles.filter(v => v.id !== vehicleId)
        await showAlert('Succès', 'Véhicule supprimé')
      } catch (error) {
        await showAlert('Erreur', 'Impossible de supprimer le véhicule')
      }
    }
  }
}

// ============================================
// 3. UTILISER LES TYPES
// ============================================

/**
 * Exemple d'utilisation des types
 */
export function exampleCreateVehicle() {
  const newVehicleData: CreateVehicleDTO = {
    name: 'Ma Voiture',
    model: 'Citroën C3',
    year: 2022,
    mileage: 15000,
    type: VehicleType.SEDAN,
    licensePlate: 'AB-123-CD',
    fuelType: FuelType.PETROL,
    color: 'Bleu'
  }

  return newVehicleData
}

// ============================================
// 4. VALIDATION DES DONNÉES
// ============================================

/**
 * Exemple de validation de formulaire
 */
export function exampleFormValidation() {
  const formData = {
    name: 'Toyota Corolla',
    model: 'Corolla',
    year: 2018,
    mileage: 75000
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

// ============================================
// 5. FORMATAGE DES DONNÉES
// ============================================

/**
 * Exemple de formatage des données
 */
export function exampleDataFormatting() {
  const vehicle: Vehicle = {
    id: '1',
    name: 'Toyota Corolla',
    model: 'Corolla 2018',
    year: 2018,
    mileage: 75000,
    type: VehicleType.SEDAN,
    licensePlate: 'AB-123-CD',
    fuelType: FuelType.PETROL,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // Formater le kilométrage
  const formattedKm = formatKilometers(vehicle.mileage)
  console.log(formattedKm) // "75 000 km"

  // Afficher l'icône et le label du type
  const typeInfo = getVehicleTypeInfo(vehicle.type)
  console.log(`${typeInfo.icon} ${typeInfo.label}`) // "🚗 Berline"
}

// ============================================
// 6. OPÉRATIONS COMPLÈTES
// ============================================

/**
 * Exemple: Créer et mettre à jour un véhicule
 */
export async function exampleCreateAndUpdate() {
  try {
    // 1. Créer un véhicule
    const newVehicle = await VehicleService.createVehicle({
      name: 'Renault Clio',
      model: 'Clio V',
      year: 2020,
      mileage: 45000,
      type: VehicleType.SEDAN,
      licensePlate: 'EF-456-GH',
      fuelType: FuelType.DIESEL
    })

    console.log('Véhicule créé:', newVehicle)

    // 2. Mettre à jour le kilométrage
    const updated = await VehicleService.updateVehicle(newVehicle.id, {
      mileage: 46000
    })

    console.log('Véhicule mis à jour:', updated)

    // 3. Récupérer les détails
    const details = await VehicleService.getVehicleById(newVehicle.id)
    console.log('Détails du véhicule:', details)

    // 4. Récupérer l'historique d'entretien
    const maintenance = await VehicleService.getMaintenanceHistory(newVehicle.id)
    console.log('Historique d\'entretien:', maintenance)

    // 5. Supprimer le véhicule
    // await VehicleService.deleteVehicle(newVehicle.id)
  } catch (error) {
    console.error('Erreur:', error)
  }
}

// ============================================
// 7. UTILISATION DANS LES TEMPLATES VUE
// ============================================

/**
 * Exemple de template Vue utilisant les données formatées
 */
export const templateExample = `
<template>
  <StackLayout>
    <!-- Liste des véhicules -->
    <GridLayout
      v-for="(vehicle, index) in vehicles"
      :key="vehicle.id"
      class="vehicle-card"
    >
      <!-- Icône du type de véhicule -->
      <Label
        :text="getVehicleTypeInfo(vehicle.type).icon"
        class="vehicle-icon"
      />

      <!-- Informations du véhicule -->
      <StackLayout class="vehicle-info">
        <Label
          :text="vehicle.name"
          class="vehicle-name"
        />
        <Label
          :text="'Année: ' + vehicle.year"
          class="vehicle-year"
        />
        <Label
          :text="formatKilometers(vehicle.mileage)"
          class="vehicle-mileage"
        />
      </StackLayout>

      <!-- Actions -->
      <StackLayout class="vehicle-actions">
        <Button
          text="Modifier"
          @tap="editVehicle(vehicle)"
        />
        <Button
          text="Supprimer"
          @tap="deleteVehicle(vehicle.id)"
        />
      </StackLayout>
    </GridLayout>
  </StackLayout>
</template>

<script>
import { formatKilometers, getVehicleTypeInfo } from '@/utils/ui'

export default {
  methods: {
    formatKilometers,
    getVehicleTypeInfo,
    editVehicle(vehicle) {
      // Naviguer vers la page d'édition
    },
    deleteVehicle(vehicleId) {
      // Supprimer le véhicule
    }
  }
}
</script>
`

// ============================================
// 8. GESTION DES ERREURS
// ============================================

/**
 * Exemple de gestion d'erreur robuste
 */
export async function exampleErrorHandling() {
  try {
    const vehicles = await VehicleService.getVehicles()
    return vehicles
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Erreur réseau:', error)
      // Afficher un message à l'utilisateur
      // Essayer de charger depuis le cache local
    } else if (error instanceof Error) {
      console.error('Erreur:', error.message)
    } else {
      console.error('Erreur inconnue:', error)
    }
    return []
  }
}

// ============================================
// 9. CACHE ET PERFORMANCE
// ============================================

/**
 * Exemple de cache simple pour les véhicules
 */
export class VehicleCache {
  private cache: Map<string, Vehicle> = new Map()
  private cacheTime: number = 5 * 60 * 1000 // 5 minutes

  async getVehicle(id: string): Promise<Vehicle> {
    // Vérifier le cache
    if (this.cache.has(id)) {
      console.log('Retour du cache')
      return this.cache.get(id)!
    }

    // Charger depuis le service
    console.log('Chargement depuis le service')
    const vehicle = await VehicleService.getVehicleById(id)

    // Stocker en cache
    this.cache.set(id, vehicle)

    // Nettoyer le cache après le délai
    setTimeout(() => {
      this.cache.delete(id)
    }, this.cacheTime)

    return vehicle
  }

  clearCache() {
    this.cache.clear()
  }
}

// ============================================
// 10. COMPOSABLES RÉUTILISABLES
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
      const index = vehicles.value.findIndex(v => v.id === id)
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
      vehicles.value = vehicles.value.filter(v => v.id !== id)
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

export default {
  vehiclesComponentExample,
  exampleCreateVehicle,
  exampleFormValidation,
  exampleDataFormatting,
  exampleCreateAndUpdate,
  exampleErrorHandling,
  VehicleCache,
  useVehicles,
  templateExample
}

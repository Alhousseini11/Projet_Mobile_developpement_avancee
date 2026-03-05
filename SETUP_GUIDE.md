/**
 * SETUP GUIDE - Configuration recommandée
 * 
 * Suivez ces étapes pour configurer complètement votre projet
 * avec la gestion des véhicules.
 */

// ============================================
// 1. INSTALLATION DES DÉPENDANCES EXISTANTES
// ============================================

/*
  npm install

  Les dépendances actuelles incluent:
  - @nativescript/core: Framework NativeScript
  - nativescript-vue: Intégration Vue 3
  - @nativescript/tailwind: Tailwind CSS
  - typescript: Support TypeScript
*/

// ============================================
// 2. DÉPENDANCES RECOMMANDÉES (optionnelles)
// ============================================

/*
  Pour améliorer l'application, vous pouvez installer:

  # Stockage sécurisé
  npm install @nativescript/secure-storage

  # Requêtes HTTP
  npm install @nativescript/core

  # Notifications locales
  npm install @nativescript/local-notifications

  # Caméra pour photos de véhicules
  npm install @nativescript/camera

  # Galerie d'images
  npm install @nativescript/imagepicker

  # Gestion d'état (optionnel)
  npm install pinia

  # Logs et débogage
  npm install @nativescript/core/console
*/

// ============================================
// 3. STRUCTURE DES FICHIERS CRÉÉS
// ============================================

/*
app/
├── components/
│   ├── Home.vue                      ✅ Créé - Mise à jour
│   ├── Vehicles.vue                  ✅ Créé - Liste des véhicules
│   ├── AddVehicle.vue                ✅ Créé - Ajouter/Modifier
│   └── VehicleDetails.vue            ✅ Créé - Détails du véhicule
│
├── services/
│   └── VehicleService.ts             ✅ Créé - Service API
│
├── types/
│   └── vehicle.ts                    ✅ Créé - Types et interfaces
│
├── utils/
│   └── ui.ts                         ✅ Créé - Utilitaires UI
│
├── config/
│   └── theme.ts                      ✅ Créé - Configuration des couleurs
│
└── examples/
    └── VEHICLES_INTEGRATION_EXAMPLE.ts ✅ Créé - Exemples d'utilisation
*/

// ============================================
// 4. CONFIGURATION DE L'APPLICATION
// ============================================

/*
Mettez à jour app.ts pour charger le composant racine:

import { createApp } from 'nativescript-vue'
import Home from './components/Home.vue'

createApp(Home).start()
*/

// ============================================
// 5. MISE EN PLACE DE LA NAVIGATION
// ============================================

/*
Pour une navigation complète entre les pages, créez un routeur:

// app/router/index.ts
import { createNativeScriptRouter } from 'nativescript-vue/router'
import Home from '@/components/Home.vue'
import Vehicles from '@/components/Vehicles.vue'
import AddVehicle from '@/components/AddVehicle.vue'
import VehicleDetails from '@/components/VehicleDetails.vue'

export const router = createNativeScriptRouter({
  pageRouterOptions: {
    clearHistory: false
  },
  routes: [
    {
      path: '/',
      component: Home,
      meta: { title: 'Accueil' }
    },
    {
      path: '/vehicles',
      component: Vehicles,
      meta: { title: 'Mes Véhicules' }
    },
    {
      path: '/vehicles/add',
      component: AddVehicle,
      meta: { title: 'Ajouter Véhicule' }
    },
    {
      path: '/vehicles/:id',
      component: VehicleDetails,
      meta: { title: 'Détails Véhicule' }
    }
  ]
})
*/

// ============================================
// 6. INTÉGRATION DU BACKEND
// ============================================

/*
Pour connecter votre backend, mettez à jour VehicleService.ts:

const API_BASE_URL = 'https://your-api.com/api'

// Décommenter les appels API réels
// Remplacer les données mock par les vrais appels

Exemple pour getVehicles():

async getVehicles(): Promise<Vehicle[]> {
  const response = await fetch(`${API_BASE_URL}/vehicles`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch vehicles')
  }
  
  return await response.json()
}
*/

// ============================================
// 7. AUTHENTIFICATION
// ============================================

/*
Implémentez l'authentification pour sécuriser les appels API:

// app/services/AuthService.ts
import * as SecureStorage from '@nativescript/secure-storage'

class AuthService {
  private secureStorage = new SecureStorage()

  async getAuthToken(): Promise<string> {
    return this.secureStorage.getSync({
      key: 'auth_token'
    })
  }

  async setAuthToken(token: string): Promise<void> {
    await this.secureStorage.set({
      key: 'auth_token',
      value: token
    })
  }

  async clearAuthToken(): Promise<void> {
    await this.secureStorage.remove({
      key: 'auth_token'
    })
  }
}

export default new AuthService()
*/

// ============================================
// 8. STOCKAGE LOCAL
// ============================================

/*
Implémentez un cache local pour l'offline mode:

// app/services/StorageService.ts
import { ApplicationSettings } from '@nativescript/core'

class StorageService {
  async setVehicles(vehicles: any[]): Promise<void> {
    ApplicationSettings.setString('cached_vehicles', JSON.stringify(vehicles))
  }

  async getVehicles(): Promise<any[]> {
    const cached = ApplicationSettings.getString('cached_vehicles', '[]')
    return JSON.parse(cached)
  }

  async clearCache(): Promise<void> {
    ApplicationSettings.remove('cached_vehicles')
  }
}

export default new StorageService()
*/

// ============================================
// 9. GESTION D'ÉTAT (OPTIONNEL)
// ============================================

/*
Utilisez Pinia pour une gestion d'état centralisée:

// app/stores/vehicle.ts
import { defineStore } from 'pinia'
import VehicleService from '@/services/VehicleService'

export const useVehicleStore = defineStore('vehicle', {
  state: () => ({
    vehicles: [] as Vehicle[],
    selectedVehicle: null as Vehicle | null,
    loading: false,
    error: null as string | null
  }),

  getters: {
    vehicleCount: (state) => state.vehicles.length,
    hasVehicles: (state) => state.vehicles.length > 0
  },

  actions: {
    async fetchVehicles() {
      this.loading = true
      try {
        this.vehicles = await VehicleService.getVehicles()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        this.loading = false
      }
    },

    async addVehicle(data: CreateVehicleDTO) {
      try {
        const vehicle = await VehicleService.createVehicle(data)
        this.vehicles.push(vehicle)
        return vehicle
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
        throw error
      }
    }
  }
})
*/

// ============================================
// 10. TESTS UNITAIRES
// ============================================

/*
Créez des tests pour VehicleService:

// app/services/__tests__/VehicleService.test.ts
import { describe, it, expect } from 'vitest'
import VehicleService from '../VehicleService'

describe('VehicleService', () => {
  it('should get all vehicles', async () => {
    const vehicles = await VehicleService.getVehicles()
    expect(Array.isArray(vehicles)).toBe(true)
  })

  it('should create a vehicle', async () => {
    const data = {
      name: 'Test Car',
      model: 'Test Model',
      year: 2023,
      mileage: 0,
      type: 'sedan'
    }
    const vehicle = await VehicleService.createVehicle(data)
    expect(vehicle.id).toBeDefined()
    expect(vehicle.name).toBe(data.name)
  })

  it('should delete a vehicle', async () => {
    const vehicles = await VehicleService.getVehicles()
    if (vehicles.length > 0) {
      await VehicleService.deleteVehicle(vehicles[0].id)
      const remaining = await VehicleService.getVehicles()
      expect(remaining.length).toBe(vehicles.length - 1)
    }
  })
})
*/

// ============================================
// 11. VARIABLES D'ENVIRONNEMENT
// ============================================

/*
Créez un fichier .env:

# .env
VITE_API_URL=http://localhost:3000/api
VITE_API_TIMEOUT=10000
VITE_DEBUG=true

Utilisez dans le code:

const API_URL = import.meta.env.VITE_API_URL
*/

// ============================================
// 12. SCRIPTS NPM RECOMMANDÉS
// ============================================

/*
Ajoutez à package.json:

"scripts": {
  "start": "ns run",
  "start:android": "ns run android",
  "start:ios": "ns run ios",
  "build:android": "ns build android --release",
  "build:ios": "ns build ios --release",
  "dev": "ns run --emulator",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "lint": "eslint src/**/*.{ts,vue}",
  "format": "prettier --write src/**/*.{ts,vue,css}",
  "type-check": "tsc --noEmit"
}
*/

// ============================================
// 13. LANCEMENT DE L'APPLICATION
// ============================================

/*
Pour lancer l'application:

1. Développement:
   ns run android        (Émulateur Android)
   ns run ios            (Simulateur iOS)
   ns run --emulator     (Émulateur par défaut)

2. Production:
   ns build android --release
   ns build ios --release

3. Hot reload:
   ns run android --no-hmr

4. Débogage:
   ns run android --debug
*/

// ============================================
// 14. RESOURCES UTILES
// ============================================

/*
Documentation officielle:
- https://nativescript.org/
- https://nativescript.org/docs/
- https://vue.nativescript.org/
- https://tailwindcss.com/

Guides:
- NativeScript Components: https://nativescript.org/docs/ui/
- Vue 3 Guide: https://v3.vuejs.org/
- Tailwind CSS: https://tailwindcss.com/docs

Community:
- NativeScript Community: https://nativescript.org/community
- Vue Community: https://vuejs.org/community/
*/

// ============================================
// 15. CHECKLIST DE DÉPLOIEMENT
// ============================================

/*
Avant de déployer:

☐ Vérifier que tous les appels API utilisent le bon endpoint
☐ Ajouter la gestion d'erreur robuste
☐ Implémenter la validation des formulaires
☐ Ajouter les logs appropriés
☐ Tester sur dispositifs réels
☐ Vérifier les permissions (Android/iOS)
☐ Implémenter la gestion des sessions
☐ Ajouter les termes d'utilisation et politique de confidentialité
☐ Optimiser les performances
☐ Mettre en cache les données appropriées
☐ Tester le mode offline
☐ Préparer les screenshots pour l'App Store/Play Store
*/

export default {
  name: 'Projet Mobile - Gestion des Véhicules',
  version: '1.0.0',
  description: 'Application mobile pour la gestion des véhicules d\'un mécanicien'
}

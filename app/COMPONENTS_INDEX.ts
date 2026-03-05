/**
 * INDEX DES COMPOSANTS ET SERVICES
 * Guide rapide de tous les fichiers créés
 */

export interface ComponentReference {
  name: string
  path: string
  type: 'component' | 'service' | 'type' | 'utility' | 'config' | 'docs'
  imports: string[]
  exports: string[]
  description: string
  linesOfCode: number
}

export const COMPONENTS_INDEX: ComponentReference[] = [
  {
    name: 'Home',
    path: 'app/components/Home.vue',
    type: 'component',
    imports: [],
    exports: ['Home'],
    description: 'Page d\'accueil avec navigation vers tous les services',
    linesOfCode: 200
  },
  {
    name: 'Vehicles',
    path: 'app/components/Vehicles.vue',
    type: 'component',
    imports: ['VehicleService'],
    exports: ['Vehicles'],
    description: 'Liste complète des véhicules avec options CRUD',
    linesOfCode: 400
  },
  {
    name: 'AddVehicle',
    path: 'app/components/AddVehicle.vue',
    type: 'component',
    imports: ['VehicleService', 'validateVehicleForm'],
    exports: ['AddVehicle'],
    description: 'Formulaire pour ajouter ou modifier un véhicule',
    linesOfCode: 350
  },
  {
    name: 'VehicleDetails',
    path: 'app/components/VehicleDetails.vue',
    type: 'component',
    imports: ['VehicleService'],
    exports: ['VehicleDetails'],
    description: 'Affichage détaillé d\'un véhicule avec actions',
    linesOfCode: 380
  },
  {
    name: 'VehicleService',
    path: 'app/services/VehicleService.ts',
    type: 'service',
    imports: [],
    exports: [
      'VehicleService',
      'Vehicle',
      'CreateVehicleDTO',
      'UpdateVehicleDTO'
    ],
    description: 'Service API pour les opérations CRUD des véhicules',
    linesOfCode: 300
  },
  {
    name: 'Vehicle Types',
    path: 'app/types/vehicle.ts',
    type: 'type',
    imports: [],
    exports: [
      'Vehicle',
      'VehicleType',
      'FuelType',
      'MaintenanceRecord',
      'VehicleDocument',
      'VehicleInsurance',
      'VEHICLE_TYPE_LABELS',
      'VEHICLE_TYPE_ICONS'
    ],
    description: 'Types TypeScript pour les véhicules et entités liées',
    linesOfCode: 350
  },
  {
    name: 'UI Utils',
    path: 'app/utils/ui.ts',
    type: 'utility',
    imports: [],
    exports: [
      'showAlert',
      'showConfirm',
      'formatKilometers',
      'formatDate',
      'formatCurrency',
      'getVehicleTypeInfo',
      'validateVehicleForm',
      'debounce',
      'throttle',
      'NavigationHelper'
    ],
    description: 'Utilitaires réutilisables pour l\'interface utilisateur',
    linesOfCode: 250
  },
  {
    name: 'Theme Config',
    path: 'app/config/theme.ts',
    type: 'config',
    imports: [],
    exports: ['colors', 'vehicleTypeColors', 'theme'],
    description: 'Configuration centralisée des couleurs et styles',
    linesOfCode: 150
  }
]

/**
 * Guide d'utilisation rapide
 */
export const QUICK_START = {
  afficherLesVehicules: `
    // Dans Home.vue ou Vehicles.vue
    import VehicleService from '@/services/VehicleService'
    
    async mounted() {
      this.vehicles = await VehicleService.getVehicles()
    }
  `,

  ajouterUnVehicule: `
    // Dans AddVehicle.vue
    async saveVehicle() {
      const newVehicle = await VehicleService.createVehicle({
        name: 'Ma Voiture',
        model: 'Model X',
        year: 2023,
        mileage: 0,
        type: 'sedan'
      })
    }
  `,

  mettreAJourUnVehicule: `
    // Dans VehicleDetails.vue
    async updateMileage() {
      await VehicleService.updateVehicle(vehicleId, {
        mileage: 50000
      })
    }
  `,

  supprimerUnVehicule: `
    // Dans Vehicles.vue
    async deleteVehicle(vehicleId) {
      await VehicleService.deleteVehicle(vehicleId)
      // Recharger la liste
      this.vehicles = await VehicleService.getVehicles()
    }
  `,

  validerFormulaire: `
    // Dans AddVehicle.vue
    import { validateVehicleForm } from '@/utils/ui'
    
    methods: {
      saveVehicle() {
        const result = validateVehicleForm(this.form)
        if (!result.valid) {
          result.errors.forEach(err => console.log(err))
          return
        }
        // Sauvegarder...
      }
    }
  `,

  formatterDonnees: `
    // Dans les templates Vue
    import { formatKilometers, formatDate } from '@/utils/ui'
    
    <Label :text="formatKilometers(vehicle.mileage)" />
    <Label :text="formatDate(vehicle.createdAt)" />
  `
}

/**
 * Arborescence complète du projet
 */
export const PROJECT_STRUCTURE = `
app/
├── components/
│   ├── Home.vue                         ✅ Page d'accueil
│   ├── Vehicles.vue                     ✅ Liste des véhicules
│   ├── AddVehicle.vue                   ✅ Formulaire ajout/édition
│   └── VehicleDetails.vue               ✅ Détails véhicule
│
├── services/
│   └── VehicleService.ts                ✅ API service
│
├── types/
│   └── vehicle.ts                       ✅ Types TypeScript
│
├── utils/
│   └── ui.ts                            ✅ Utilitaires UI
│
├── config/
│   └── theme.ts                         ✅ Configuration couleurs
│
├── examples/
│   └── VEHICLES_INTEGRATION_EXAMPLE.ts  ✅ Exemples d'utilisation
│
├── app.ts
├── app.css
└── app.vue

Documentation/
├── FRONTEND_SUMMARY.md                  ✅ Résumé général
├── VEHICLES_FRONTEND_README.md          ✅ Guide complet
├── SETUP_GUIDE.md                       ✅ Guide d'installation
└── COMPONENTS_INDEX.ts                  ✅ Cet index

Root/
├── nativescript.config.ts
├── package.json
├── tsconfig.json
└── webpack.config.js
`

/**
 * Chemin de navigation entre les composants
 */
export const NAVIGATION_FLOW = {
  home: {
    description: 'Page d\'accueil',
    canNavigateTo: ['vehicles', 'profile', 'reservations', 'tutorials'],
    children: []
  },
  vehicles: {
    description: 'Liste des véhicules',
    canNavigateTo: ['home', 'vehicleDetails', 'addVehicle'],
    children: ['vehicleDetails', 'addVehicle']
  },
  vehicleDetails: {
    description: 'Détails d\'un véhicule',
    canNavigateTo: ['vehicles', 'addVehicle', 'maintenance', 'documents'],
    children: ['maintenance', 'documents']
  },
  addVehicle: {
    description: 'Ajouter/Modifier un véhicule',
    canNavigateTo: ['vehicles'],
    children: []
  }
}

/**
 * Liste des imports recommandés pour chaque fichier
 */
export const RECOMMENDED_IMPORTS = {
  'Home.vue': [
    "import { NavigationHelper } from '@/utils/ui'",
    "// Optionnel: import { useVehicles } from '@/composables/useVehicles'"
  ],
  'Vehicles.vue': [
    "import VehicleService from '@/services/VehicleService'",
    "import { formatKilometers, showAlert } from '@/utils/ui'",
    "import { Vehicle } from '@/types/vehicle'"
  ],
  'AddVehicle.vue': [
    "import VehicleService from '@/services/VehicleService'",
    "import { validateVehicleForm } from '@/utils/ui'",
    "import { CreateVehicleDTO, VehicleType, FuelType } from '@/types/vehicle'"
  ],
  'VehicleDetails.vue': [
    "import VehicleService from '@/services/VehicleService'",
    "import { formatKilometers, formatDate } from '@/utils/ui'",
    "import { Vehicle, VEHICLE_TYPE_LABELS } from '@/types/vehicle'"
  ]
}

/**
 * Checklist d'implémentation
 */
export const IMPLEMENTATION_CHECKLIST = {
  'Phase 1 - Setup': [
    { task: 'Copier tous les fichiers créés', done: false },
    { task: 'Vérifier les imports', done: false },
    { task: 'Compiler le projet', done: false },
    { task: 'Tester sur l\'émulateur', done: false }
  ],
  'Phase 2 - Intégration': [
    { task: 'Configurer l\'URL API', done: false },
    { task: 'Implémenter l\'authentification', done: false },
    { task: 'Connecter les appels API réels', done: false },
    { task: 'Tester les opérations CRUD', done: false }
  ],
  'Phase 3 - Amélioration': [
    { task: 'Ajouter la gestion d\'erreur', done: false },
    { task: 'Implémenter le caching', done: false },
    { task: 'Ajouter les animations', done: false },
    { task: 'Optimiser les performances', done: false }
  ]
}

/**
 * Ressources et documentation
 */
export const RESOURCES = {
  documentation: {
    'Résumé Général': './FRONTEND_SUMMARY.md',
    'Guide Complet': './VEHICLES_FRONTEND_README.md',
    'Guide Installation': './SETUP_GUIDE.md'
  },
  examples: {
    'Intégration': './app/examples/VEHICLES_INTEGRATION_EXAMPLE.ts'
  },
  external: {
    'NativeScript': 'https://nativescript.org/docs/',
    'Vue 3': 'https://v3.vuejs.org/',
    'Tailwind CSS': 'https://tailwindcss.com/'
  }
}

/**
 * Export principal
 */
export default {
  COMPONENTS_INDEX,
  QUICK_START,
  PROJECT_STRUCTURE,
  NAVIGATION_FLOW,
  RECOMMENDED_IMPORTS,
  IMPLEMENTATION_CHECKLIST,
  RESOURCES,

  /**
   * Fonction utile pour chercher un composant
   */
  findComponent: (name: string): ComponentReference | undefined => {
    return COMPONENTS_INDEX.find(c => c.name.toLowerCase() === name.toLowerCase())
  },

  /**
   * Fonction pour obtenir les imports recommandés
   */
  getImportsFor: (fileName: string): string[] => {
    return RECOMMENDED_IMPORTS[fileName as keyof typeof RECOMMENDED_IMPORTS] || []
  },

  /**
   * Fonction pour afficher la structure
   */
  printStructure: () => {
    console.log(PROJECT_STRUCTURE)
  },

  /**
   * Fonction pour afficher le flux de navigation
   */
  printNavigation: () => {
    console.log(JSON.stringify(NAVIGATION_FLOW, null, 2))
  }
}

# Frontend - Gestion des Véhicules

Cette partie du projet contient l'interface utilisateur complète pour la gestion des véhicules dans l'application mobile du mécanicien.

## 📱 Composants

### 1. **Vehicles.vue** - Liste des véhicules
Affiche tous les véhicules de l'utilisateur avec les informations principales:
- Nom et modèle du véhicule
- Année et kilométrage
- Type de véhicule (Berline, SUV, Camion, Autre)
- Bouton "Ajouter Véhicule"

**Fonctionnalités:**
- Liste scrollable des véhicules
- Couleur de bordure différente selon le type de véhicule
- Tap court: Sélectionner le véhicule
- Long press: Options (Modifier, Détails, Supprimer)
- État vide avec message quand aucun véhicule
- Barre de navigation inférieure

### 2. **AddVehicle.vue** - Ajouter/Modifier un véhicule
Formulaire complet pour ajouter ou modifier un véhicule.

**Champs:**
- Nom du véhicule (TextField)
- Modèle (TextField)
- Année (TextField avec clavier numérique)
- Kilométrage (TextField avec clavier numérique)
- Immatriculation (TextField)
- Type de carburant (Essence/Diesel - Sélection)
- Type de véhicule (Berline/SUV/Camion/Autre - Sélection)

**Boutons:**
- ➕ Ajouter/💾 Modifier Véhicule
- ❌ Annuler

### 3. **VehicleDetails.vue** - Détails du véhicule
Affiche tous les détails d'un véhicule avec actions associées.

**Sections:**
- **En-tête**: Icône, nom, modèle, année, kilométrage
- **Informations Générales**: Immatriculation, carburant, type
- **Historique d'Entretien**: Accès aux historiques
- **Documents**: Voir les documents, assurance
- **Actions**: Modifier, Supprimer

## 🎨 Design

### Palette de couleurs
```
Principal: Rouge (#dc2626) - Boutons d'action
Fond: Gris très foncé (#111827)
Surfaces: Gris (#1f2937)
Texte: Blanc (#ffffff)
Texte secondaire: Gris (#9ca3af, #d1d5db)
Accents: Jaune (#ca8a04), Bleu (#3b82f6)
```

### Bordures par type de véhicule
- Berline (sedan): Rouge
- SUV: Jaune
- Camion (truck): Bleu
- Autre: Violet

## 📂 Structure des fichiers

```
app/
├── components/
│   ├── Home.vue                    # Page d'accueil
│   ├── Vehicles.vue                # Liste des véhicules
│   ├── AddVehicle.vue              # Formulaire d'ajout/modification
│   └── VehicleDetails.vue          # Détails d'un véhicule
├── services/
│   └── VehicleService.ts           # Service API pour les véhicules
└── utils/
    └── ui.ts                       # Utilitaires UI et helpers
```

## 🔧 Service - VehicleService.ts

Classe singleton qui gère toutes les opérations CRUD pour les véhicules.

### Méthodes

#### `getVehicles(): Promise<Vehicle[]>`
Récupère tous les véhicules de l'utilisateur.

```typescript
const vehicles = await VehicleService.getVehicles()
```

#### `getVehicleById(vehicleId: string): Promise<Vehicle>`
Récupère un véhicule spécifique par ID.

```typescript
const vehicle = await VehicleService.getVehicleById('1')
```

#### `createVehicle(data: CreateVehicleDTO): Promise<Vehicle>`
Crée un nouveau véhicule.

```typescript
const newVehicle = await VehicleService.createVehicle({
  name: 'Toyota Corolla',
  model: 'Corolla 2018',
  year: 2018,
  mileage: 75000,
  type: 'sedan',
  licensePlate: 'AB-123-CD',
  fuelType: 'Essence'
})
```

#### `updateVehicle(vehicleId: string, data: UpdateVehicleDTO): Promise<Vehicle>`
Met à jour un véhicule existant.

```typescript
const updated = await VehicleService.updateVehicle('1', {
  mileage: 80000
})
```

#### `deleteVehicle(vehicleId: string): Promise<void>`
Supprime un véhicule.

```typescript
await VehicleService.deleteVehicle('1')
```

#### `getMaintenanceHistory(vehicleId: string): Promise<any[]>`
Récupère l'historique d'entretien d'un véhicule.

#### `getVehicleDocuments(vehicleId: string): Promise<any[]>`
Récupère les documents d'un véhicule.

## 📋 Interfaces TypeScript

### Vehicle
```typescript
interface Vehicle {
  id: string
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
```

### CreateVehicleDTO
```typescript
interface CreateVehicleDTO {
  name: string
  model: string
  year: number
  mileage: number
  type: 'sedan' | 'suv' | 'truck' | 'other'
  licensePlate?: string
  fuelType?: string
}
```

## 🛠️ Utilitaires UI

Fichier `app/utils/ui.ts` contient:

- **`formatKilometers(km: number): string`** - Formate le kilométrage
- **`formatDate(date: Date, format: string): string`** - Formate une date
- **`formatCurrency(amount: number): string`** - Formate une monnaie
- **`getVehicleTypeInfo(type: string): { icon: string; label: string }`** - Récupère l'icône et le label du type
- **`getVehicleBorderColor(type: string): string`** - Récupère la couleur de bordure
- **`validateVehicleForm(data: any): { valid: boolean; errors: string[] }`** - Valide un formulaire de véhicule
- **`showAlert(title: string, message: string): Promise<void>`** - Affiche une alerte
- **`showConfirm(title: string, message: string): Promise<boolean>`** - Affiche une confirmation
- **Helpers de navigation** - NavigationHelper pour gérer la pile de navigation

## 🔄 Flux de navigation

```
Home
├── Vehicles (via nav bar)
│   ├── Add Vehicle (bouton +)
│   ├── Vehicle Details (tap sur véhicule)
│   └── Edit Vehicle (option long press)
└── Profile, Reservations, Tutorials (via nav bar)
```

## 📲 Intégration avec le Backend

Actuellement le service utilise des données mock. Pour intégrer le vrai backend:

1. Remplacer `http://localhost:3000/api` par votre URL API réelle
2. Implémenter l'authentification (récupérer le token JWT)
3. Activer les appels API commentés dans `VehicleService.ts`
4. Ajouter la gestion d'erreur appropriée

Exemple d'intégration:

```typescript
async getVehicles(): Promise<Vehicle[]> {
  const response = await fetch(`${this.apiBaseUrl}/vehicles`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  })
  if (!response.ok) throw new Error('Failed to fetch vehicles')
  return await response.json()
}
```

## ✅ Fonctionnalités implémentées

- [x] Affichage de la liste des véhicules
- [x] Ajouter un nouveau véhicule
- [x] Voir les détails d'un véhicule
- [x] Modifier un véhicule
- [x] Supprimer un véhicule
- [x] Service API complet (avec mock data)
- [x] Utilitaires UI et validation
- [x] Navigation inférieure
- [x] Design UI complet

## 🚀 Prochaines étapes

- [ ] Intégrer avec le backend réel
- [ ] Ajouter l'authentification
- [ ] Implémenter les pages liées (Historique d'entretien, Documents)
- [ ] Ajouter les animations de transition
- [ ] Implémenter la search et le filtrage
- [ ] Ajouter les images/photos de véhicules
- [ ] Intégration avec des services de géolocalisation
- [ ] Synchronisation offline avec base de données locale

## 📝 Exemple d'utilisation

```vue
<script>
import VehicleService from '@/services/VehicleService'

export default {
  async mounted() {
    try {
      this.vehicles = await VehicleService.getVehicles()
    } catch (error) {
      console.error('Erreur lors du chargement des véhicules:', error)
    }
  },

  methods: {
    async addNewVehicle(formData) {
      try {
        const newVehicle = await VehicleService.createVehicle(formData)
        this.vehicles.push(newVehicle)
      } catch (error) {
        console.error('Erreur lors de la création du véhicule:', error)
      }
    }
  }
}
</script>
```

## 🐛 Débogage

Pour activer les logs détaillés, modifier le début de `VehicleService.ts`:

```typescript
class VehicleService {
  private debug = true
  
  private log(...args: any[]) {
    if (this.debug) console.log('[VehicleService]', ...args)
  }
}
```

---

**Développé avec NativeScript Vue 3 et Tailwind CSS**

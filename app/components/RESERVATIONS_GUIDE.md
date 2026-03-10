# 📅 PAGE DE RÉSERVATION - DOCUMENTATION COMPLÈTE

## Vue d'ensemble
La page de réservation est un flux multi-étapes (8 étapes) pour permettre aux utilisateurs de réserver facilement un service automobile.

## 📍 Localisation
- **Fichier**: `app/components/Reservations.vue`
- **Route**: `/reservations` (à configurer avec le routeur)

## 🎯 Les 8 Étapes du Processus

### Étape 1: Sélection du Service
- Utilisateur choisit parmi 3 services:
  - 🛢️ Vidange d'huile
  - 🛑 Freins
  - 🔋 Batterie
- Option pour sélection multiple de services
- **Validation**: Au moins un service doit être sélectionné

### Étape 2: Date & Heure
- Calendrier intuitif pour sélectionner la date
- Navigation mois/année (← →)
- Grille des jours avec sélection
- Sélection de l'heure avec 6 créneaux disponibles:
  - 16:30, 17:00, 18:00, 20:30, 22:00, 24:00
- **Validation**: Date et heure doivent être sélectionnées

### Étape 3: Véhicule Concerné
- Liste des véhicules existants de l'utilisateur
- Chaque véhicule affiche:
  - Nom complet (Marque Modèle Année)
  - Kilométrage actuel
- Bouton pour ajouter un nouveau véhicule
- **Validation**: Un véhicule doit être sélectionné

### Étape 4: Ajouter un Véhicule (Conditionnel)
- Apparaît seulement si l'utilisateur clique sur "Ajouter un véhicule"
- Formulaire avec champs:
  - **Marque** (Ex: Toyota)
  - **Modèle** (Ex: Corolla)
  - **Année** (Ex: 2020)
  - **Kilométrage** (Ex: 45000)
  - **Photo** (Upload via galerie)
- Boutons: Retour (étape 3) / Enregistrer (retour à étape 3)
- **Validation**: Marque et modèle obligatoires

### Étape 5: Contact
- Formulaire avec champs:
  - **Nom Complet** (obligatoire)
  - **Téléphone** (format: 06 XX XX XX XX, obligatoire)
  - **Email** (format email, obligatoire)
- Checkbox: "Utiliser données de profil"
- **Validation**: Tous les champs doivent être remplis

### Étape 6: Paiement
- Deux options de paiement:
  1. **Payer au Garage** (Carte/Cash sur place)
  2. **Payer en Ligne** (via Stripe)
- Si paiement en ligne sélectionné:
  - Numéro de carte (obligatoire)
  - Expiration (MM/YY)
  - CVV (3 chiffres)

### Étape 7: Récapitulatif
- Affichage complet de toutes les informations:
  - 🛠️ Service sélectionné
  - 📅 Date et heure
  - 🚗 Véhicule
  - 💰 Prix (€ 25,00 - prix fixe)
  - ☎️ Contact
- Boutons: Modifier (retour étape 1) / Confirmer (étape 8)

### Étape 8: Confirmation
- Message de confirmation avec:
  - ✅ Checkmark géant
  - "Réservation Confirmée!"
  - Détails du garage (numéro, email)
- Options finales:
  - "Voir mes RDV" (vers page réservations)
  - "Retour à l'Accueil" (vers page d'accueil)

## 🏗️ Structure des Données

### Objet Réservation
```typescript
reservation = {
  service: string           // 'oil_change', 'brakes', 'battery'
  multipleServices: boolean // Si sélection multiple
  selectedDate: Date        // Date choisie
  selectedTime: string      // Heure choisie (16:30, 17:00, etc)
  vehicleId: string         // ID du véhicule
  contact: {
    name: string            // Nom complet
    phone: string           // Téléphone
    email: string           // Email
    useProfileData: boolean // Utiliser données profil
  },
  payment: {
    method: string          // 'garage' ou 'online'
    cardNumber: string      // Numéro de carte
    expiry: string          // MM/YY
    cvv: string             // 3 chiffres
  }
}
```

### Objet Véhicule Nouveau
```typescript
newVehicle = {
  name: string      // Marque
  model: string     // Modèle
  year: string      // Année
  mileage: string   // Kilométrage
  photo: any        // Image (optionnel)
}
```

## 🎨 Design & Styles

### Couleurs Utilisées
- **Couleur primaire**: Rouge (#DC2626)
- **Fond principal**: Gris très foncé (#111827)
- **Éléments sélectionnés**: Rouge/Jaune/Bleu selon contexte
- **Texte**: Blanc/Gris

### Responsive Design
- Layout utilise GridLayout et StackLayout
- Adaptation automatique à tous les écrans
- Barre de progression visible en haut
- Barre de navigation inférieure persistante

## 🔄 Navigation

### Flux Normal
1 → 2 → 3 → 5 → 6 → 7 → 8

### Avec Ajout Véhicule
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

### Navigation Alternative
- **Retour**: Revient à l'étape précédente
- **Modifier** (Étape 7): Revient à l'étape 1
- **Bouton Menu** (Top): Retour à l'accueil

## 📱 Barre de Navigation Inférieure
- 5 icônes représentant les pages principales
- 📅 Réservations en surbrillance rouge
- Permet de naviguer vers:
  - 🏠 Accueil
  - 📅 Réservations (actuel)
  - 🎓 Tutoriels
  - 🚗 Véhicules
  - 👤 Profil

## 🔌 Intégration Backend

### Appels API à Implémenter

#### 1. Récupérer les véhicules de l'utilisateur
```typescript
GET /api/vehicles
Response: Vehicle[]
```

#### 2. Ajouter un nouveau véhicule
```typescript
POST /api/vehicles
Body: CreateVehicleDTO
Response: Vehicle
```

#### 3. Créer une réservation
```typescript
POST /api/reservations
Body: {
  service: string
  selectedDate: Date
  selectedTime: string
  vehicleId: string
  contact: ContactInfo
  payment: PaymentInfo
}
Response: Reservation
```

#### 4. Traitement du paiement (Stripe)
```typescript
POST /api/payments
Body: {
  amount: number
  method: 'garage' | 'online'
  cardData?: CardData
}
Response: PaymentResult
```

## 🧪 Données de Test

### Véhicules Mock
```typescript
[
  {
    id: '1',
    name: 'Toyota Corolla 2018',
    model: 'Corolla',
    year: 2018,
    mileage: 75000
  },
  {
    id: '2',
    name: 'Renault Clio 2020',
    model: 'Clio',
    year: 2020,
    mileage: 45000
  }
]
```

### Horaires Disponibles
```typescript
['16:30', '17:00', '18:00', '20:30', '22:00', '24:00']
```

## 📊 Métriques

### Ligne de Code
- Total: ~800 lignes
- Template: ~550 lignes
- Script: ~250 lignes

### Composants Utilisés
- Page
- ActionBar
- GridLayout, StackLayout
- Label, TextField, Button
- CheckBox
- ScrollView
- Separator

## ✨ Fonctionnalités Avancées

### Validation Progressive
- Chaque étape valide les données avant de passer à la suivante
- Boutons "Continuer" désactivés jusqu'à validation

### Barre de Progression
- Affiche le pourcentage complété (étape actuelle / 8)
- Indicateur visuel du progres

### Gestion d'Historique
- Boutons "Retour" présents à chaque étape (sauf étape 1)
- Possibilité de modifier les données via "Modifier" (étape 7)

## 🚀 Prochaines Étapes

1. Connecter le composant aux services API réels
2. Implémenter l'intégration Stripe pour les paiements
3. Ajouter les notifications de confirmation par email/SMS
4. Persister les réservations en base de données
5. Ajouter les rappels pour les RDV à venir
6. Intégrer avec Google Calendar pour les créneaux

## 📝 Notes

- Prix fixe: € 25,00 pour tous les services
- Horaires: 16:30 à 24:00 (à adapter selon garage)
- Données de test utilisées pour le développement
- À remplacer par API réelle en production

---

**Version**: 1.0  
**Dernière mise à jour**: Mars 2026  
**Auteur**: AI Assistant

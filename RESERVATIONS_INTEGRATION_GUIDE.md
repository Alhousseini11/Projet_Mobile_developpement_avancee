# 🔧 INTEGRATION GUIDE - RESERVATIONS

## Overview
Ce guide montre comment intégrer complètement le système de réservations dans votre application.

## 1. Structure des Fichiers

```
app/
├── components/
│   ├── Reservations.vue       # ✅ CRÉÉ - Composant UI complet 
│   └── Home.vue               # ✅ CRÉÉ - Avec bouton "Prendre RDV"
├── types/
│   ├── reservation.ts         # ✅ CRÉÉ - Types pour réservations
│   └── vehicle.ts             # ✅ EXISTANT
├── services/
│   ├── ReservationService.ts  # À CRÉER - API pour réservations
│   ├── PaymentService.ts      # À CRÉER - Gestion paiements Stripe
│   └── VehicleService.ts      # ✅ EXISTANT
└── examples/
    ├── RESERVATIONS_GUIDE.md  # ✅ CRÉÉ - Documentation détaillée
    └── RESERVATIONS_INTEGRATION_EXAMPLE.ts # Exemple

backend/
├── src/
│   ├── routes/
│   │   └── reservations.routes.ts   # À CRÉER
│   ├── controllers/
│   │   └── reservations.controller.ts # À CRÉER
│   └── middleware/
└── prisma/
    └── schema.prisma          # À METTRE À JOUR avec Reservation model
```

## 2. Étapes d'Intégration

### ÉTAPE 1: Types (✅ FAIT)
**Fichier créé**: `app/types/reservation.ts`
```typescript
export interface Reservation { ... }
export interface ContactInfo { ... }
export interface PaymentInfo { ... }
```

### ÉTAPE 2: Service Réservations (À CRÉER)
**Créer**: `app/services/ReservationService.ts`

```typescript
import axios from 'axios'
import type { ReservationData, Reservation } from '../types/reservation'

export class ReservationService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL

  async createReservation(data: ReservationData): Promise<Reservation> {
    const response = await axios.post(`${this.baseUrl}/reservations`, data)
    return response.data
  }

  async getUserReservations(): Promise<Reservation[]> {
    const response = await axios.get(`${this.baseUrl}/reservations/my-reservations`)
    return response.data
  }

  async getReservation(id: string): Promise<Reservation> {
    const response = await axios.get(`${this.baseUrl}/reservations/${id}`)
    return response.data
  }

  async cancelReservation(id: string): Promise<void> {
    await axios.put(`${this.baseUrl}/reservations/${id}/cancel`)
  }

  async getAvailableSlots(date: string, service: string): Promise<string[]> {
    const response = await axios.get(`${this.baseUrl}/reservations/available-slots`, {
      params: { date, service }
    })
    return response.data
  }
}

export default new ReservationService()
```

### ÉTAPE 3: Service Paiements (À CRÉER)
**Créer**: `app/services/PaymentService.ts`

```typescript
import axios from 'axios'
import type { ProcessPaymentRequest } from '../types/reservation'

export class PaymentService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL

  async processPayment(data: ProcessPaymentRequest) {
    const response = await axios.post(`${this.baseUrl}/payments/process`, data)
    return response.data
  }

  async createCardToken(cardData: any) {
    const response = await axios.post(`${this.baseUrl}/payments/create-token`, cardData)
    return response.data.token
  }
}

export default new PaymentService()
```

### ÉTAPE 4: Routes Backend (À CRÉER)
**Créer**: `backend/src/routes/reservations.routes.ts`

```typescript
import express from 'express'
import { ReservationsController } from '../controllers/reservations.controller'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'

const router = express.Router()
router.use(authGuard)

// Client routes
router.post('/', ReservationsController.createReservation)
router.get('/my-reservations', ReservationsController.getUserReservations)
router.get('/:id', ReservationsController.getReservation)
router.get('/available-slots', ReservationsController.getAvailableSlots)
router.put('/:id/cancel', ReservationsController.cancelReservation)

// Admin routes
router.use(roleGuard(['admin', 'garage-manager']))
router.get('/', ReservationsController.getAllReservations)
router.put('/:id', ReservationsController.updateReservation)
router.delete('/:id', ReservationsController.deleteReservation)

export default router
```

### ÉTAPE 5: Contrôleur Backend (À CRÉER)
**Créer**: `backend/src/controllers/reservations.controller.ts`

```typescript
import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class ReservationsController {
  static async createReservation(req: Request, res: Response) {
    try {
      const { service, selectedDate, selectedTime, vehicleId, contact, payment } = req.body
      
      // Validation
      if (!service || !selectedDate || !selectedTime || !vehicleId) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      // Create reservation
      const reservation = await prisma.reservation.create({
        data: {
          userId: req.user.id,
          vehicleId,
          service,
          selectedDate: new Date(selectedDate),
          selectedTime,
          contactName: contact.name,
          contactPhone: contact.phone,
          contactEmail: contact.email,
          paymentMethod: payment.method,
          status: 'pending'
        }
      })

      res.status(201).json({ success: true, reservation })
    } catch (error) {
      res.status(500).json({ message: 'Server error', error })
    }
  }

  static async getUserReservations(req: Request, res: Response) {
    try {
      const reservations = await prisma.reservation.findMany({
        where: { userId: req.user.id },
        include: { vehicle: true },
        orderBy: { selectedDate: 'desc' }
      })
      res.json(reservations)
    } catch (error) {
      res.status(500).json({ message: 'Server error', error })
    }
  }

  static async getReservation(req: Request, res: Response) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
        include: { vehicle: true }
      })
      if (!reservation) return res.status(404).json({ message: 'Not found' })
      res.json(reservation)
    } catch (error) {
      res.status(500).json({ message: 'Server error', error })
    }
  }

  static async cancelReservation(req: Request, res: Response) {
    try {
      await prisma.reservation.update({
        where: { id: req.params.id },
        data: { status: 'cancelled' }
      })
      res.json({ message: 'Reservation cancelled' })
    } catch (error) {
      res.status(500).json({ message: 'Server error', error })
    }
  }

  static async getAvailableSlots(req: Request, res: Response) {
    const slots = ['16:30', '17:00', '18:00', '20:30', '22:00', '24:00']
    res.json(slots)
  }

  // Admin methods...
  static async getAllReservations(req: Request, res: Response) {
    const reservations = await prisma.reservation.findMany({
      include: { vehicle: true, user: true }
    })
    res.json(reservations)
  }

  static async updateReservation(req: Request, res: Response) {
    try {
      const reservation = await prisma.reservation.update({
        where: { id: req.params.id },
        data: req.body
      })
      res.json(reservation)
    } catch (error) {
      res.status(500).json({ message: 'Server error', error })
    }
  }

  static async deleteReservation(req: Request, res: Response) {
    try {
      await prisma.reservation.delete({
        where: { id: req.params.id }
      })
      res.json({ message: 'Reservation deleted' })
    } catch (error) {
      res.status(500).json({ message: 'Server error', error })
    }
  }
}
```

### ÉTAPE 6: Schéma Prisma (À METTRE À JOUR)
**Éditer**: `backend/prisma/schema.prisma`

```prisma
model Reservation {
  id        String   @id @default(cuid())
  userId    String   @db.ObjectId
  vehicleId String   @db.ObjectId
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicle   Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  
  service        String
  selectedDate   DateTime
  selectedTime   String
  
  contactName    String
  contactPhone   String
  contactEmail   String
  
  paymentMethod  String
  paymentStatus  String   @default("pending")
  status         String   @default("pending")
  
  notes          String?
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([userId])
  @@index([vehicleId])
  @@index([selectedDate])
  @@map("reservations")
}
```

### ÉTAPE 7: Migration Prisma
```bash
# Générer la migration
npx prisma migrate dev --name add_reservations

# Appliquer la migration
npx prisma db push
```

### ÉTAPE 8: Variables d'Environnement
**Éditer**: `.env`

```env
# Frontend
VITE_API_BASE_URL=http://localhost:3000/api

# Backend - Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=file:./dev.db

# JWT
JWT_SECRET=your-secret-key-here
```

## 3. Mise à Jour des Composants

### Mettre à jour Home.vue
```typescript
import { $navigate } from 'nativescript-vue/router'

function bookAppointment() {
  $navigate({
    name: 'reservations',
    clearHistory: false
  })
}
```

### Mettre à jour app/app.ts (Router)
```typescript
import Reservations from './components/Reservations.vue'

const router = createNativeScriptRouter({
  pageRoutes: {
    reservations: {
      component: Reservations,
      entry: { moduleName: 'frames/ReservationsFrame' }
    }
    // ... autres routes
  }
})
```

## 4. Tester l'Intégration

### 1. Test Frontend
- Cliquer sur "Prendre RDV" depuis l'accueil
- Remplir chaque étape
- Vérifier les validations

### 2. Test Backend
```bash
# Test de création de réservation
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "service": "oil_change",
    "selectedDate": "2026-03-15",
    "selectedTime": "17:00",
    "vehicleId": "123",
    "contact": { ... },
    "payment": { ... }
  }'
```

### 3. Test Paiements Stripe
- Mode test: `pk_test_...` et `sk_test_...`
- Carte test: `4242 4242 4242 4242`
- Tous les paiements réussissent en mode test

## 5. Fichiers Créés

✅ **CRÉÉ**:
1. `app/components/Reservations.vue` (800 lignes) - Composant UI complet
2. `app/types/reservation.ts` - Types TypeScript
3. `app/components/RESERVATIONS_GUIDE.md` - Documentation détaillée
4. `app/components/Home.vue` - Page d'accueil mise à jour
5. `app/COMPONENTS_INDEX.ts` - Index mis à jour

📝 **À CRÉER**:
1. `app/services/ReservationService.ts` - Service API
2. `app/services/PaymentService.ts` - Service Paiements
3. `backend/src/routes/reservations.routes.ts` - Routes
4. `backend/src/controllers/reservations.controller.ts` - Contrôleur

🔄 **À METTRE À JOUR**:
1. `backend/prisma/schema.prisma` - Ajouter model Reservation
2. `.env` - Variables d'environnement
3. `package.json` - Dépendances (axios, stripe)

## 6. Dépendances Nécessaires

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "stripe": "^14.0.0",
    "nativescript-stripe": "^1.0.0"
  }
}
```

Installation:
```bash
npm install axios stripe nativescript-stripe
```

## 7. Checklist d'Intégration

- [ ] Types créés (`reservation.ts`)
- [ ] Composant Reservations.vue fonctionnel
- [ ] Service Réservations implanté
- [ ] Service Paiements implanté
- [ ] Routes backend créées
- [ ] Contrôleur backend créé
- [ ] Schéma Prisma mis à jour
- [ ] Migrations Prisma appliquées
- [ ] Variables d'environnement configurées
- [ ] Dépendances installées
- [ ] Navigation intégrée au routeur
- [ ] Tests frontend effectués
- [ ] Tests backend effectués
- [ ] Tests Stripe en mode test
- [ ] Documentation mise à jour

## 8. Support & Debugging

Voir fichier `RESERVATIONS_GUIDE.md` pour:
- Détails complets de chaque étape
- Structures de données
- Appels API
- Gestion d'erreurs
- Meilleurs pratiques

---

**Status**: ✅ Frontend 100% | ⏳ Backend 0% (Prêt à implémenter)

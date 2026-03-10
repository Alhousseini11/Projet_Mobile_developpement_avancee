<template>
  <Page @loaded="onPageLoaded" class="bg-gray-900">
    <!-- ActionBar -->
    <ActionBar class="bg-red-600">
      <GridLayout columns="auto,*,auto" class="w-full">
        <Label
          col="0"
          text="←"
          class="text-white text-2xl px-4 py-2"
          @tap="goBack"
        />
        <Label
          col="1"
          :text="`Étape ${currentStep}/8`"
          class="text-white text-lg font-bold text-center"
        />
        <Label
          col="2"
          text="ℹ️"
          class="text-white text-xl px-4 py-2"
        />
      </GridLayout>
    </ActionBar>

    <!-- Progress Bar -->
    <GridLayout rows="auto" columns="*" class="bg-gray-800 p-2">
      <GridLayout
        rows="4"
        columns="*"
        :class="`${progressPercentage}% bg-red-600 rounded`"
      />
    </GridLayout>

    <!-- Content -->
    <GridLayout rows="*,60" class="bg-gray-900">
      <ScrollView row="0" class="bg-gray-900">
        <!-- STEP 1: Select Service -->
        <StackLayout v-if="currentStep === 1" class="px-4 py-6">
          <Label
            text="Réserver un Service"
            class="text-white text-2xl font-bold mb-6"
          />

          <Label
            text="Sélectionnez le service souhaité:"
            class="text-gray-300 text-sm mb-4"
          />

          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 mb-3"
            :class="{ 'bg-red-700': reservation.service === 'oil_change' }"
            @tap="selectService('oil_change')"
          >
            <GridLayout columns="auto,*" class="items-center">
              <Label col="0" text="🛢️" class="text-3xl mr-3" />
              <StackLayout col="1">
                <Label
                  text="Vidange d'huile"
                  class="text-white font-bold text-base"
                />
                <Label
                  text="Changement d'huile moteur"
                  class="text-gray-400 text-xs mt-1"
                />
              </StackLayout>
            </GridLayout>
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 mb-3"
            :class="{ 'bg-red-700': reservation.service === 'brakes' }"
            @tap="selectService('brakes')"
          >
            <GridLayout columns="auto,*" class="items-center">
              <Label col="0" text="🛑" class="text-3xl mr-3" />
              <StackLayout col="1">
                <Label
                  text="Freins"
                  class="text-white font-bold text-base"
                />
                <Label
                  text="Remplacement des plaquettes"
                  class="text-gray-400 text-xs mt-1"
                />
              </StackLayout>
            </GridLayout>
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 mb-6"
            :class="{ 'bg-red-700': reservation.service === 'battery' }"
            @tap="selectService('battery')"
          >
            <GridLayout columns="auto,*" class="items-center">
              <Label col="0" text="🔋" class="text-3xl mr-3" />
              <StackLayout col="1">
                <Label
                  text="Batterie"
                  class="text-white font-bold text-base"
                />
                <Label
                  text="Remplacement de la batterie"
                  class="text-gray-400 text-xs mt-1"
                />
              </StackLayout>
            </GridLayout>
          </GridLayout>

          <CheckBox
            v-model="reservation.multipleServices"
            text="Utiliser sélection multiple services"
            class="text-gray-300 mb-6"
          />

          <Button
            text="Continuer"
            class="bg-red-600 text-white font-bold rounded-lg p-4"
            :isEnabled="reservation.service !== ''"
            @tap="nextStep"
          />
        </StackLayout>

        <!-- STEP 2: Date & Time -->
        <StackLayout v-if="currentStep === 2" class="px-4 py-6">
          <Label
            text="Date & Heure"
            class="text-white text-2xl font-bold mb-2"
          />

          <Label
            text="Choisir la date et l'heure"
            class="text-gray-400 text-sm mb-6"
          />

          <!-- Calendar -->
          <GridLayout
            rows="auto,auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 mb-6"
          >
            <!-- Month/Year -->
            <GridLayout
              row="0"
              columns="auto,*,auto"
              class="items-center mb-4"
            >
              <Label
                col="0"
                text="←"
                class="text-white text-xl"
                @tap="previousMonth"
              />
              <Label
                col="1"
                :text="`${monthNames[currentDateMonth]} ${currentDateYear}`"
                class="text-white font-bold text-center"
              />
              <Label
                col="2"
                text="→"
                class="text-white text-xl"
                @tap="nextMonth"
              />
            </GridLayout>

            <!-- Day headers -->
            <GridLayout
              row="1"
              rows="auto"
              columns="*,*,*,*,*,*,*"
              class="mb-2"
            >
              <Label
                col="0"
                text="L"
                class="text-gray-400 text-center font-bold text-sm"
              />
              <Label
                col="1"
                text="M"
                class="text-gray-400 text-center font-bold text-sm"
              />
              <Label
                col="2"
                text="M"
                class="text-gray-400 text-center font-bold text-sm"
              />
              <Label
                col="3"
                text="J"
                class="text-gray-400 text-center font-bold text-sm"
              />
              <Label
                col="4"
                text="V"
                class="text-gray-400 text-center font-bold text-sm"
              />
              <Label
                col="5"
                text="S"
                class="text-gray-400 text-center font-bold text-sm"
              />
              <Label
                col="6"
                text="D"
                class="text-gray-400 text-center font-bold text-sm"
              />
            </GridLayout>
          </GridLayout>

          <!-- Simple date picker -->
          <Label
            text="Sélectionnez une date:"
            class="text-white font-bold mb-3"
          />

          <GridLayout
            rows="auto"
            columns="*"
            class="bg-gray-800 rounded-lg p-4 mb-6 items-center justify-center"
          >
            <Label
              :text="formatDate(reservation.selectedDate)"
              class="text-white text-lg font-bold"
              @tap="openDatePicker"
            />
          </GridLayout>

          <!-- Time slots -->
          <Label
            text="Sélectionnez une heure:"
            class="text-white font-bold mb-3"
          />

          <GridLayout rows="auto" columns="*,*,*,*" class="mb-6" column-spacing="8">
            <Button
              v-for="(time, idx) in timeSlots"
              :key="idx"
              :col="idx"
              :text="time"
              :class="{
                'bg-red-600 text-white': reservation.selectedTime === time,
                'bg-gray-800 text-gray-300': reservation.selectedTime !== time
              }"
              class="rounded-lg p-2 font-bold text-sm"
              @tap="selectTime(time)"
            />
          </GridLayout>

          <GridLayout columns="*,*" column-spacing="8" class="mb-6">
            <Button
              col="0"
              text="Retour"
              class="bg-gray-700 text-white font-bold rounded-lg p-4"
              @tap="previousStep"
            />
            <Button
              col="1"
              text="Continuer"
              class="bg-red-600 text-white font-bold rounded-lg p-4"
              :isEnabled="reservation.selectedDate && reservation.selectedTime"
              @tap="nextStep"
            />
          </GridLayout>
        </StackLayout>

        <!-- STEP 3: Select Vehicle -->
        <StackLayout v-if="currentStep === 3" class="px-4 py-6">
          <Label
            text="Véhicule Concerné"
            class="text-white text-2xl font-bold mb-2"
          />

          <Label
            text="Sélectionnez le véhicule:"
            class="text-gray-400 text-sm mb-4"
          />

          <GridLayout
            v-for="(vehicle, idx) in userVehicles"
            :key="idx"
            rows="auto"
            columns="auto,*,auto"
            class="bg-gray-800 rounded-lg p-4 mb-3 items-center"
            :class="{ 'bg-red-700': reservation.vehicleId === vehicle.id }"
            @tap="selectVehicle(vehicle)"
          >
            <Label col="0" text="🚗" class="text-2xl mr-3" />
            <StackLayout col="1">
              <Label
                :text="vehicle.name"
                class="text-white font-bold text-base"
              />
              <Label
                :text="`${vehicle.mileage} km`"
                class="text-gray-300 text-xs mt-1"
              />
            </StackLayout>
            <Label col="2" text="→" class="text-red-400 text-xl" />
          </GridLayout>

          <!-- Add Vehicle Button -->
          <GridLayout
            rows="auto"
            columns="*"
            class="bg-blue-600 rounded-lg p-4 mb-6 items-center justify-center"
            @tap="switchToAddVehicle"
          >
            <Label
              text="➕ Ajouter une véhicule"
              class="text-white font-bold text-center"
            />
          </GridLayout>

          <GridLayout columns="*,*" column-spacing="8" class="mb-6">
            <Button
              col="0"
              text="Retour"
              class="bg-gray-700 text-white font-bold rounded-lg p-4"
              @tap="previousStep"
            />
            <Button
              col="1"
              text="Continuer"
              class="bg-red-600 text-white font-bold rounded-lg p-4"
              :isEnabled="reservation.vehicleId"
              @tap="nextStep"
            />
          </GridLayout>
        </StackLayout>

        <!-- STEP 4: Add Vehicle -->
        <StackLayout v-if="currentStep === 4" class="px-4 py-6">
          <Label
            text="Ajouter Véhicule"
            class="text-white text-2xl font-bold mb-6"
          />

          <Label
            text="Marque"
            class="text-white font-bold text-sm mb-2"
          />
          <TextField
            v-model="newVehicle.name"
            hint="Ex: Toyota"
            class="bg-gray-800 text-white rounded-lg p-3 mb-4"
          />

          <Label
            text="Modèle"
            class="text-white font-bold text-sm mb-2"
          />
          <TextField
            v-model="newVehicle.model"
            hint="Ex: Corolla"
            class="bg-gray-800 text-white rounded-lg p-3 mb-4"
          />

          <GridLayout columns="*,*" column-spacing="8" class="mb-4">
            <StackLayout col="0">
              <Label
                text="Année"
                class="text-white font-bold text-sm mb-2"
              />
              <TextField
                v-model="newVehicle.year"
                hint="2020"
                class="bg-gray-800 text-white rounded-lg p-3"
              />
            </StackLayout>

            <StackLayout col="1">
              <Label
                text="Kilométrage"
                class="text-white font-bold text-sm mb-2"
              />
              <TextField
                v-model="newVehicle.mileage"
                hint="45000"
                class="bg-gray-800 text-white rounded-lg p-3"
              />
            </StackLayout>
          </GridLayout>

          <!-- Photo -->
          <Label
            text="Photo"
            class="text-white font-bold text-sm mb-2"
          />
          <GridLayout
            rows="80"
            columns="*"
            class="bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 mb-6 items-center justify-center"
            @tap="pickPhoto"
          >
            <Label text="📷" class="text-4xl" />
          </GridLayout>

          <GridLayout columns="*,*" column-spacing="8" class="mb-6">
            <Button
              col="0"
              text="Retour"
              class="bg-gray-700 text-white font-bold rounded-lg p-4"
              @tap="previousStep"
            />
            <Button
              col="1"
              text="Enregistrer"
              class="bg-red-600 text-white font-bold rounded-lg p-4"
              @tap="saveNewVehicle"
            />
          </GridLayout>
        </StackLayout>

        <!-- STEP 5: Contact -->
        <StackLayout v-if="currentStep === 5" class="px-4 py-6">
          <Label
            text="Contact"
            class="text-white text-2xl font-bold mb-6"
          />

          <Label
            text="Nom Complet"
            class="text-white font-bold text-sm mb-2"
          />
          <TextField
            v-model="reservation.contact.name"
            hint="Votre nom"
            class="bg-gray-800 text-white rounded-lg p-3 mb-4"
          />

          <Label
            text="Téléphone"
            class="text-white font-bold text-sm mb-2"
          />
          <TextField
            v-model="reservation.contact.phone"
            hint="06 XX XX XX XX"
            keyboardType="phone"
            class="bg-gray-800 text-white rounded-lg p-3 mb-4"
          />

          <Label
            text="Email"
            class="text-white font-bold text-sm mb-2"
          />
          <TextField
            v-model="reservation.contact.email"
            hint="exemple@email.com"
            keyboardType="email"
            class="bg-gray-800 text-white rounded-lg p-3 mb-4"
          />

          <CheckBox
            v-model="reservation.contact.useProfileData"
            text="Utiliser données de profil"
            class="text-gray-300 mb-6"
          />

          <GridLayout columns="*,*" column-spacing="8" class="mb-6">
            <Button
              col="0"
              text="Retour"
              class="bg-gray-700 text-white font-bold rounded-lg p-4"
              @tap="previousStep"
            />
            <Button
              col="1"
              text="Continuer"
              class="bg-red-600 text-white font-bold rounded-lg p-4"
              :isEnabled="reservation.contact.name && reservation.contact.phone && reservation.contact.email"
              @tap="nextStep"
            />
          </GridLayout>
        </StackLayout>

        <!-- STEP 6: Payment -->
        <StackLayout v-if="currentStep === 6" class="px-4 py-6">
          <Label
            text="Paiement"
            class="text-white text-2xl font-bold mb-6"
          />

          <Label
            text="Mode de paiement:"
            class="text-white font-bold text-sm mb-4"
          />

          <GridLayout
            rows="auto"
            columns="auto,*"
            class="bg-gray-800 rounded-lg p-4 mb-3 items-center"
            @tap="selectPaymentMethod('garage')"
          >
            <CheckBox
              col="0"
              :checked="reservation.payment.method === 'garage'"
              class="mr-3"
              isUserInteractionEnabled="false"
            />
            <StackLayout col="1">
              <Label
                text="🏪 Payer au Garage"
                class="text-white font-bold"
              />
              <Label
                text="Carte / Cash"
                class="text-gray-400 text-xs mt-1"
              />
            </StackLayout>
          </GridLayout>

          <GridLayout
            rows="auto"
            columns="auto,*"
            class="bg-gray-800 rounded-lg p-4 mb-6 items-center"
            @tap="selectPaymentMethod('online')"
          >
            <CheckBox
              col="0"
              :checked="reservation.payment.method === 'online'"
              class="mr-3"
              isUserInteractionEnabled="false"
            />
            <StackLayout col="1">
              <Label
                text="💳 Payer en Ligne"
                class="text-white font-bold"
              />
              <Label
                text="Sécurisé par Stripe"
                class="text-gray-400 text-xs mt-1"
              />
            </StackLayout>
          </GridLayout>

          <!-- Payment card info - shown only when online payment selected -->
          <StackLayout v-if="reservation.payment.method === 'online'" class="mb-6">
            <Label
              text="Informations de Carte Bancaire"
              class="text-white font-bold text-sm mb-3"
            />

            <Label
              text="Numéro de Carte:"
              class="text-gray-300 text-xs mb-1"
            />
            <TextField
              v-model="reservation.payment.cardNumber"
              hint="4111 1111 1111 1111"
              class="bg-gray-800 text-white rounded-lg p-3 mb-3"
            />

            <GridLayout columns="*,*" column-spacing="8" class="mb-3">
              <StackLayout col="0">
                <Label
                  text="Expiration:"
                  class="text-gray-300 text-xs mb-1"
                />
                <TextField
                  v-model="reservation.payment.expiry"
                  hint="MM/YY"
                  class="bg-gray-800 text-white rounded-lg p-3"
                />
              </StackLayout>

              <StackLayout col="1">
                <Label
                  text="CVV:"
                  class="text-gray-300 text-xs mb-1"
                />
                <TextField
                  v-model="reservation.payment.cvv"
                  hint="***"
                  class="bg-gray-800 text-white rounded-lg p-3"
                />
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <GridLayout columns="*,*" column-spacing="8" class="mb-6">
            <Button
              col="0"
              text="Retour"
              class="bg-gray-700 text-white font-bold rounded-lg p-4"
              @tap="previousStep"
            />
            <Button
              col="1"
              text="Continuer"
              class="bg-red-600 text-white font-bold rounded-lg p-4"
              @tap="nextStep"
            />
          </GridLayout>
        </StackLayout>

        <!-- STEP 7: Summary -->
        <StackLayout v-if="currentStep === 7" class="px-4 py-6">
          <Label
            text="Récapitulatif"
            class="text-white text-2xl font-bold mb-6"
          />

          <!-- Service Summary -->
          <GridLayout
            rows="auto"
            columns="auto,*,auto"
            class="bg-gray-800 rounded-lg p-4 mb-4 items-start"
          >
            <Label col="0" text="🛠️" class="text-2xl mr-3" />
            <StackLayout col="1">
              <Label
                text="Service"
                class="text-gray-400 text-xs"
              />
              <Label
                :text="getServiceName(reservation.service)"
                class="text-white font-bold text-base mt-1"
              />
            </StackLayout>
          </GridLayout>

          <!-- Date Summary -->
          <GridLayout
            rows="auto"
            columns="auto,*,auto"
            class="bg-gray-800 rounded-lg p-4 mb-4 items-start"
          >
            <Label col="0" text="📅" class="text-2xl mr-3" />
            <StackLayout col="1">
              <Label
                text="Date & Heure"
                class="text-gray-400 text-xs"
              />
              <Label
                :text="`${formatDate(reservation.selectedDate)} - ${reservation.selectedTime}`"
                class="text-white font-bold text-base mt-1"
              />
            </StackLayout>
          </GridLayout>

          <!-- Vehicle Summary -->
          <GridLayout
            rows="auto"
            columns="auto,*,auto"
            class="bg-gray-800 rounded-lg p-4 mb-4 items-start"
          >
            <Label col="0" text="🚗" class="text-2xl mr-3" />
            <StackLayout col="1">
              <Label
                text="Véhicule"
                class="text-gray-400 text-xs"
              />
              <Label
                :text="getCurrentVehicleName()"
                class="text-white font-bold text-base mt-1"
              />
            </StackLayout>
          </GridLayout>

          <!-- Price Summary -->
          <GridLayout
            rows="auto"
            columns="auto,*,auto"
            class="bg-yellow-700 rounded-lg p-4 mb-6 items-center"
          >
            <Label col="0" text="💰" class="text-2xl mr-3" />
            <StackLayout col="1">
              <Label
                text="Prix"
                class="text-yellow-100 text-xs"
              />
            </StackLayout>
            <Label
              col="2"
              text="€ 25,00"
              class="text-white font-bold text-lg"
            />
          </GridLayout>

          <!-- Contact Summary -->
          <GridLayout
            rows="auto"
            columns="auto,*,auto"
            class="bg-gray-800 rounded-lg p-4 mb-4 items-start"
          >
            <Label col="0" text="☎️" class="text-2xl mr-3" />
            <StackLayout col="1">
              <Label
                text="Contact"
                class="text-gray-400 text-xs"
              />
              <Label
                :text="reservation.contact.phone"
                class="text-white font-bold text-base mt-1"
              />
            </StackLayout>
          </GridLayout>

          <GridLayout columns="*,*" column-spacing="8" class="mb-6">
            <Button
              col="0"
              text="Modifier"
              class="bg-gray-700 text-white font-bold rounded-lg p-4"
              @tap="goToStep(1)"
            />
            <Button
              col="1"
              text="Confirmer"
              class="bg-red-600 text-white font-bold rounded-lg p-4"
              @tap="nextStep"
            />
          </GridLayout>
        </StackLayout>

        <!-- STEP 8: Confirmation -->
        <StackLayout v-if="currentStep === 8" class="px-4 py-6 items-center justify-center">
          <Label
            text="✅"
            class="text-6xl mb-6"
          />

          <Label
            text="Confirmation"
            class="text-white text-2xl font-bold mb-4 text-center"
          />

          <Label
            text="Réservation Confirmée!"
            class="text-green-400 text-lg font-bold mb-6 text-center"
          />

          <Label
            text="Réservation confirmée! Les détails et peut préciser pas votre email."
            class="text-gray-300 text-sm text-center mb-8"
          />

          <Label
            text="Contact: 03 33 73 43"
            class="text-red-400 font-bold text-center mb-2"
          />

          <Label
            text="mail@example.com"
            class="text-red-400 font-bold text-center mb-8"
          />

          <GridLayout columns="*,*" column-spacing="8" class="mb-6">
            <Button
              col="0"
              text="Voir mes RDV"
              class="bg-blue-600 text-white font-bold rounded-lg p-4"
              @tap="navigateTo('reservations')"
            />
            <Button
              col="1"
              text="Retour à l'Accueil"
              class="bg-gray-700 text-white font-bold rounded-lg p-4"
              @tap="navigateTo('home')"
            />
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <!-- Bottom Navigation Bar -->
      <GridLayout
        row="1"
        columns="*,*,*,*,*"
        class="bg-gray-800 border-t border-gray-700"
      >
        <GridLayout col="0" class="items-center justify-center" @tap="navigateTo('home')">
          <Label text="🏠" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="1" class="items-center justify-center" @tap="navigateTo('reservations')">
          <Label text="📅" class="text-2xl text-red-600 font-bold" />
        </GridLayout>
        <GridLayout col="2" class="items-center justify-center" @tap="navigateTo('tutorials')">
          <Label text="🎓" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="3" class="items-center justify-center" @tap="navigateTo('vehicles')">
          <Label text="🚗" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="4" class="items-center justify-center" @tap="navigateTo('profile')">
          <Label text="👤" class="text-2xl text-gray-400" />
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'nativescript-vue'
import { ReservationService } from '../services/ReservationService'
import { PaymentService } from '../services/PaymentService'

// Services
const reservationService = new ReservationService()
const paymentService = new PaymentService()

// Step Management
const currentStep = ref(1)

// Progress calculation
const progressPercentage = computed(() => (currentStep.value / 8) * 100)

// Time slots
const timeSlots = ['16:30', '17:00', '18:00', '20:30', '22:00', '24:00']

// Month names
const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

// Current date for calendar
const currentDateMonth = ref(new Date().getMonth())
const currentDateYear = ref(new Date().getFullYear())

// Loading and error states
const loading = ref(false)
const error = ref('')

// User vehicles (loaded from API)
const userVehicles = ref<any[]>([])

// Reservation state
const reservation = ref({
  service: '',
  multipleServices: false,
  selectedDate: new Date(),
  selectedTime: '',
  vehicleId: '',
  contact: {
    name: '',
    phone: '',
    email: '',
    useProfileData: false
  },
  payment: {
    method: 'garage',
    cardNumber: '',
    expiry: '',
    cvv: ''
  }
})

// New vehicle state
const newVehicle = ref({
  name: '',
  model: '',
  year: '',
  mileage: '',
  photo: null
})

// Methods
async function loadUserVehicles() {
  try {
    loading.value = true
    error.value = ''
    const reservations = await reservationService.getUserReservations()
    // Extract vehicles from reservations or fetch separately
    // For now, initialize with empty array - will be populated from profile data
    userVehicles.value = []
  } catch (err) {
    error.value = 'Erreur: Impossible de charger les véhicules'
    console.error('Load vehicles error:', err)
  } finally {
    loading.value = false
  }
}

async function createReservation() {
  try {
    loading.value = true
    error.value = ''
    
    const data = {
      service: reservation.value.service,
      selectedDate: reservation.value.selectedDate,
      selectedTime: reservation.value.selectedTime,
      vehicleId: reservation.value.vehicleId,
      contact: reservation.value.contact,
      payment: {
        method: reservation.value.payment.method as 'garage' | 'online',
        cardNumber: reservation.value.payment.cardNumber,
        expiry: reservation.value.payment.expiry,
        cvv: reservation.value.payment.cvv
      }
    }
    
    const response = await reservationService.createReservation(data)
    console.log('Reservation created:', response)
    
    // Process payment if needed
    if (reservation.value.payment.method === 'online') {
      await processPayment(response.reservation.id)
    }
    
    // Navigate to confirmation
    navigateTo('confirmation')
  } catch (err) {
    error.value = 'Erreur: Impossible de créer la réservation'
    console.error('Create reservation error:', err)
  } finally {
    loading.value = false
  }
}

async function processPayment(reservationId: string) {
  try {
    const paymentData = {
      amount: 100, // TODO: calculate from service
      currency: 'EUR',
      reservationId: reservationId,
      method: reservation.value.payment.method as 'garage' | 'online',
      cardToken: await paymentService.createCardToken({
        number: reservation.value.payment.cardNumber!,
        expiry: reservation.value.payment.expiry!,
        cvv: reservation.value.payment.cvv!
      })
    }
    
    const response = await paymentService.processPayment(paymentData)
    console.log('Payment processed:', response)
  } catch (err) {
    error.value = 'Erreur: Problème de paiement'
    console.error('Payment error:', err)
    throw err
  }
}

function onPageLoaded() {
  loadUserVehicles()
}

function nextStep() {
  if (currentStep.value < 8) {
    if (currentStep.value === 3 && reservation.value.vehicleId === 'new') {
      currentStep.value = 4
    } else if (currentStep.value === 4) {
      currentStep.value = 5
    } else {
      currentStep.value++
    }
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function goToStep(step: number) {
  currentStep.value = step
}

function selectService(service: string) {
  reservation.value.service = reservation.value.service === service ? '' : service
}

function selectTime(time: string) {
  reservation.value.selectedTime = time
}

function selectVehicle(vehicle: any) {
  reservation.value.vehicleId = vehicle.id
}

function switchToAddVehicle() {
  currentStep.value = 4
}

function saveNewVehicle() {
  if (newVehicle.value.name && newVehicle.value.model) {
    const vehicle = {
      id: Date.now().toString(),
      name: `${newVehicle.value.name} ${newVehicle.value.model}`,
      model: newVehicle.value.model,
      year: parseInt(newVehicle.value.year),
      mileage: parseInt(newVehicle.value.mileage)
    }
    userVehicles.value.push(vehicle)
    reservation.value.vehicleId = vehicle.id
    currentStep.value = 3
  }
}

function pickPhoto() {
  console.log('Open photo picker')
}

function selectPaymentMethod(method: string) {
  reservation.value.payment.method = method
}

function previousMonth() {
  if (currentDateMonth.value === 0) {
    currentDateMonth.value = 11
    currentDateYear.value--
  } else {
    currentDateMonth.value--
  }
}

function nextMonth() {
  if (currentDateMonth.value === 11) {
    currentDateMonth.value = 0
    currentDateYear.value++
  } else {
    currentDateMonth.value++
  }
}

function getServiceName(service: string): string {
  const services: Record<string, string> = {
    oil_change: 'Vidange d\'huile',
    brakes: 'Freins',
    battery: 'Batterie'
  }
  return services[service] || 'Service non spécifié'
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const month = ('0' + (d.getMonth() + 1)).slice(-2)
  const day = ('0' + d.getDate()).slice(-2)
  return `${day}/${month}/${d.getFullYear()}`
}

function getCurrentVehicleName(): string {
  const vehicle = userVehicles.value.find(v => v.id === reservation.value.vehicleId)
  return vehicle ? vehicle.name : 'Véhicule non sélectionné'
}

function goBack() {
  if (currentStep.value > 1) {
    previousStep()
  } else {
    navigateTo('home')
  }
}

function navigateTo(page: string) {
  console.log('Navigate to:', page)
  // TODO: implement navigation
}

function openDatePicker() {
  // Simple interaction to change date
  const tomorrow = new Date(reservation.value.selectedDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  reservation.value.selectedDate = tomorrow
  console.log('Date changed to:', formatDate(reservation.value.selectedDate))
}

// Load data on mount
onMounted(() => {
  loadUserVehicles()
})
</script>

<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Mes rendez-vous" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="header-card">
            <Label text="Vos rendez-vous garage" class="header-title" />
            <Label
              :text="appointments.length + ' rendez-vous trouves'"
              class="header-subtitle"
            />
          </StackLayout>

          <StackLayout v-if="appointments.length > 0" class="appointment-list">
            <GridLayout
              v-for="appointment in appointments"
              :key="appointment.id"
              rows="auto,auto,auto"
              columns="*,auto"
              class="appointment-card"
            >
              <Label row="0" col="0" :text="appointment.serviceLabel" class="appointment-service" />
              <Label
                row="0"
                col="1"
                :text="getStatusLabel(appointment.status)"
                class="status-pill"
                :class="getStatusClass(appointment.status)"
              />

              <Label
                row="1"
                colSpan="2"
                :text="'Date : ' + formatAppointmentDate(appointment.date)"
                class="appointment-detail"
              />
              <Label
                row="2"
                colSpan="2"
                :text="'Heure : ' + appointment.time"
                class="appointment-detail"
              />
            </GridLayout>
          </StackLayout>

          <StackLayout v-else class="empty-card">
            <Label text="Aucun rendez-vous pour le moment." class="empty-title" />
            <Label
              text="Prenez un nouveau rendez-vous depuis l'ecran Reservation."
              class="empty-text"
              textWrap="true"
            />
            <GridLayout class="empty-cta" @tap="navigateTo('reservations')">
              <Label text="Prendre RDV" class="empty-cta-text" />
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <Label text="Accueil" class="nav-label" />
        </GridLayout>
        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <Label text="Reserver" class="nav-label" />
        </GridLayout>
        <GridLayout col="2" class="nav-item" @tap="navigateTo('tutorials')">
          <Label text="Tutoriels" class="nav-label" />
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <Label text="Vehicules" class="nav-label" />
        </GridLayout>
        <GridLayout col="4" class="nav-item active" @tap="navigateTo('profile')">
          <Label text="Profil" class="nav-label" />
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue'
import ReservationService from '@/services/ReservationService'
import { formatDate } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'
import type { Reservation, ReservationStatus } from '@/types/reservation'

const appointments = ref<Reservation[]>([])

async function onPageLoaded() {
  appointments.value = await ReservationService.getMyReservations()
  console.log('My appointments page loaded')
}

function formatAppointmentDate(date: string) {
  return formatDate(new Date(`${date}T00:00:00`), 'long')
}

function getStatusLabel(status: ReservationStatus) {
  if (status === 'confirmed') return 'Confirme'
  if (status === 'pending') return 'En attente'
  if (status === 'completed') return 'Termine'
  return 'Annule'
}

function getStatusClass(status: ReservationStatus) {
  if (status === 'confirmed') return 'confirmed'
  if (status === 'pending') return 'pending'
  if (status === 'completed') return 'completed'
  return 'cancelled'
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'myAppointments' })
}

function goBack() {
  void navigateBack()
}
</script>

<style scoped>
.page {
  background-color: #f5f6f8;
}

.action-bar {
  background-color: #1f2733;
  color: #fff;
}

.action-bar-content {
  padding: 0 12;
  height: 56;
  vertical-align: center;
}

.icon-back {
  font-size: 20;
  color: #fff;
}

.action-title {
  font-size: 18;
  font-weight: 700;
  color: #fff;
  vertical-align: center;
}

.page-body {
  background-color: #f5f6f8;
}

.content {
  padding: 16 16 24 16;
}

.inline-back {
  width: 92;
  background-color: #ffffff;
  border-radius: 999;
  padding: 10 14;
  margin-bottom: 14;
}

.inline-back-text {
  color: #1f2733;
  font-size: 13;
  font-weight: 800;
}

.header-card {
  background-color: #dc2626;
  border-radius: 14;
  padding: 16;
  margin-bottom: 16;
  shadow-color: #000;
  shadow-opacity: 0.08;
  shadow-radius: 10;
  shadow-offset: 0 3;
}

.header-title {
  color: #fff;
  font-size: 20;
  font-weight: 800;
  margin-bottom: 4;
}

.header-subtitle {
  color: #fee2e2;
  font-size: 13;
  font-weight: 600;
}

.appointment-list {
  margin-bottom: 16;
}

.appointment-card {
  background-color: #ffffff;
  border-radius: 12;
  padding: 14 16;
  margin-bottom: 12;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 8;
  shadow-offset: 0 2;
}

.appointment-service {
  color: #111827;
  font-size: 16;
  font-weight: 700;
}

.appointment-detail {
  color: #4b5563;
  font-size: 13;
  margin-top: 8;
}

.status-pill {
  font-size: 11;
  font-weight: 700;
  padding: 6 10;
  border-radius: 999;
  text-align: center;
}

.status-pill.confirmed {
  background-color: #dcfce7;
  color: #166534;
}

.status-pill.pending {
  background-color: #fef3c7;
  color: #92400e;
}

.status-pill.completed {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.status-pill.cancelled {
  background-color: #fee2e2;
  color: #b91c1c;
}

.empty-card {
  background-color: #ffffff;
  border-radius: 12;
  padding: 18;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 8;
  shadow-offset: 0 2;
}

.empty-title {
  color: #111827;
  font-size: 16;
  font-weight: 700;
  margin-bottom: 8;
}

.empty-text {
  color: #6b7280;
  font-size: 13;
  margin-bottom: 16;
}

.empty-cta {
  background-color: #dc2626;
  border-radius: 12;
  padding: 14;
}

.empty-cta-text {
  color: #ffffff;
  font-size: 15;
  font-weight: 700;
  text-align: center;
}

.bottom-nav {
  background-color: #121826;
  border-top-width: 1;
  border-top-color: #1f2733;
}

.nav-item {
  align-items: center;
  justify-content: center;
  padding: 10 4 4 4;
}

.nav-label {
  font-size: 12;
  color: #9ca3af;
  font-weight: 600;
  text-align: center;
}

.nav-item.active .nav-label {
  color: #dc2626;
  font-weight: 700;
}
</style>

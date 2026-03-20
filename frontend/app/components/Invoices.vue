<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Factures PDF" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="hero-card">
            <Label text="Documents de facturation" class="hero-title" />
            <Label
              :text="invoices.length + ' facture(s) disponible(s) au format PDF.'"
              class="hero-subtitle"
              textWrap="true"
            />
          </StackLayout>

          <GridLayout columns="*,*" columnSpacing="12" class="summary-grid">
            <StackLayout col="0" class="summary-card">
              <Label :text="String(invoices.length).padStart(2, '0')" class="summary-value" />
              <Label text="Factures" class="summary-label" />
            </StackLayout>

            <StackLayout col="1" class="summary-card summary-card-dark">
              <Label :text="totalAmountLabel" class="summary-value light" />
              <Label text="Total facture" class="summary-label light" />
            </StackLayout>
          </GridLayout>

          <StackLayout v-if="invoices.length === 0" class="empty-card">
            <Label text="Aucune facture disponible." class="empty-title" />
            <Label
              text="Les prochaines interventions payees apparaitront ici en PDF."
              class="empty-copy"
              textWrap="true"
            />
          </StackLayout>

          <StackLayout v-else>
            <StackLayout
              v-for="invoice in invoices"
              :key="invoice.id"
              class="invoice-card"
            >
              <GridLayout columns="*,auto" class="invoice-header">
                <Label col="0" :text="invoice.number" class="invoice-number" />
                <Label
                  col="1"
                  :text="getStatusLabel(invoice.status)"
                  class="status-pill"
                  :class="invoice.status"
                />
              </GridLayout>

              <Label :text="invoice.serviceLabel" class="invoice-service" />

              <GridLayout columns="*,*" columnSpacing="12" class="invoice-meta-grid">
                <StackLayout col="0" class="invoice-meta-card">
                  <Label text="Date emission" class="invoice-meta-label" />
                  <Label :text="formatInvoiceDate(invoice.issuedAt)" class="invoice-meta-value" />
                </StackLayout>

                <StackLayout col="1" class="invoice-meta-card">
                  <Label text="Date rendez-vous" class="invoice-meta-label" />
                  <Label :text="formatInvoiceDate(invoice.appointmentDate)" class="invoice-meta-value" />
                </StackLayout>
              </GridLayout>

              <GridLayout columns="*,auto" class="invoice-total-row">
                <StackLayout col="0">
                  <Label
                    :text="'TVA/Taxes : ' + formatAmount(invoice.taxAmount, invoice.currency)"
                    class="invoice-tax"
                  />
                  <Label :text="formatAmount(invoice.totalAmount, invoice.currency)" class="invoice-total" />
                </StackLayout>

                <StackLayout col="1" class="invoice-total-badge">
                  <Label text="Total" class="invoice-total-badge-label" />
                </StackLayout>
              </GridLayout>

              <GridLayout class="invoice-cta" @tap="openInvoicePdf(invoice.id)">
                <Label text="Ouvrir le PDF" class="invoice-cta-text" />
              </GridLayout>
            </StackLayout>
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
import { alert } from '@nativescript/core'
import { openUrlAsync } from '@nativescript/core/utils'
import { computed, ref } from 'nativescript-vue'
import InvoiceService from '@/services/InvoiceService'
import type { InvoiceStatus, InvoiceSummary } from '@/types/invoice'
import { formatDate } from '@/utils/ui'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'

const invoices = ref<InvoiceSummary[]>(InvoiceService.getFallbackInvoices())

const totalAmountLabel = computed(() => {
  const total = invoices.value.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  return formatAmount(total, 'CAD')
})

async function onPageLoaded() {
  invoices.value = await InvoiceService.getInvoices()
  console.log('Invoices page loaded')
}

function formatInvoiceDate(value: string) {
  return formatDate(new Date(`${value}T00:00:00`), 'short')
}

function getStatusLabel(status: InvoiceStatus) {
  return status === 'paid' ? 'Payee' : 'En attente'
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`
}

async function openInvoicePdf(invoiceId: string) {
  const opened = await openUrlAsync(InvoiceService.getInvoicePdfUrl(invoiceId))

  if (!opened) {
    await alert({
      title: 'Facture PDF',
      message: 'Impossible d ouvrir la facture PDF sur cet appareil.',
      okButtonText: 'OK'
    })
  }
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'invoices' })
}

function goBack() {
  void navigateBack()
}
</script>

<style scoped>
.page { background-color: #eef1f5; }
.action-bar { background-color: #1f2733; color: #fff; }
.action-bar-content { padding: 0 12; height: 56; vertical-align: center; }
.icon-back { font-size: 20; color: #fff; }
.action-title { font-size: 18; font-weight: 700; color: #fff; vertical-align: center; }
.page-body { background-color: #eef1f5; }
.content { padding: 16 16 24 16; }
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
.hero-card { background-color: #ffffff; border-radius: 18; padding: 18; margin-bottom: 14; shadow-color: #000; shadow-opacity: 0.08; shadow-radius: 12; shadow-offset: 0 3; }
.hero-title { color: #111827; font-size: 22; font-weight: 800; margin-bottom: 4; }
.hero-subtitle { color: #6b7280; font-size: 13; }
.summary-grid { margin-bottom: 18; }
.summary-card { background-color: #ffffff; border-radius: 16; padding: 16; min-height: 96; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; vertical-align: center; }
.summary-card-dark { background-color: #1f2733; }
.summary-value { color: #111827; font-size: 24; font-weight: 800; margin-bottom: 4; }
.summary-value.light { color: #ffffff; font-size: 18; }
.summary-label { color: #6b7280; font-size: 12; font-weight: 600; }
.summary-label.light { color: #cbd5e1; }
.empty-card { background-color: #ffffff; border-radius: 16; padding: 18; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.empty-title { color: #111827; font-size: 16; font-weight: 700; margin-bottom: 8; }
.empty-copy { color: #6b7280; font-size: 13; }
.invoice-card { background-color: #ffffff; border-radius: 16; padding: 16; margin-bottom: 12; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.invoice-header { margin-bottom: 10; }
.invoice-number { color: #111827; font-size: 16; font-weight: 800; }
.status-pill { font-size: 11; font-weight: 700; padding: 6 10; border-radius: 999; text-align: center; }
.status-pill.paid { background-color: #dcfce7; color: #166534; }
.status-pill.pending { background-color: #fef3c7; color: #92400e; }
.invoice-service { color: #111827; font-size: 16; font-weight: 700; margin-bottom: 12; }
.invoice-meta-grid { margin-bottom: 14; }
.invoice-meta-card { background-color: #f8fafc; border-radius: 12; padding: 12; min-height: 72; }
.invoice-meta-label { color: #6b7280; font-size: 11; font-weight: 700; margin-bottom: 6; text-transform: uppercase; }
.invoice-meta-value { color: #111827; font-size: 13; font-weight: 700; }
.invoice-total-row { background-color: #fff7ed; border-radius: 12; padding: 12 14; margin-bottom: 12; vertical-align: center; }
.invoice-tax { color: #6b7280; font-size: 12; }
.invoice-total { color: #dc2626; font-size: 20; font-weight: 800; margin-top: 4; }
.invoice-total-badge { background-color: #ffffff; border-radius: 999; padding: 8 12; vertical-align: center; }
.invoice-total-badge-label { color: #c2410c; font-size: 11; font-weight: 800; text-align: center; }
.invoice-cta { background-color: #dc2626; border-radius: 12; padding: 14 16; vertical-align: center; }
.invoice-cta-text { color: #ffffff; font-size: 14; font-weight: 700; text-align: center; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 4 4 4; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 600; text-align: center; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
</style>

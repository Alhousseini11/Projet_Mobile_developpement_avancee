<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Support et FAQ" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="hero-card">
            <Label text="Aide et assistance" class="hero-title" />
            <Label
              text="Retrouvez les reponses aux questions les plus frequentes et contactez l'atelier directement."
              class="hero-subtitle"
              textWrap="true"
            />
          </StackLayout>

          <!-- Contact rapide -->
          <Label text="Contact atelier" class="section-title" />
          <StackLayout class="section-card">
            <GridLayout columns="58,*,auto" class="list-item compact" @tap="callAtelier">
              <GridLayout col="0" class="item-badge phone">
                <Label text="TEL" class="item-badge-text" />
              </GridLayout>
              <StackLayout col="1" class="item-copy">
                <Label text="Appeler l'atelier" class="item-title" />
                <Label text="+1 (438)-340 7583" class="item-description" textWrap="true" />
              </StackLayout>
              <Label col="2" text=">" class="item-chevron" />
            </GridLayout>

            <GridLayout columns="58,*,auto" class="list-item compact" @tap="emailAtelier">
              <GridLayout col="0" class="item-badge mail">
                <Label text="@" class="item-badge-text" />
              </GridLayout>
              <StackLayout col="1" class="item-copy">
                <Label text="Envoyer un email" class="item-title" />
                <Label text="Oussama@gmail.ca" class="item-description" textWrap="true" />
              </StackLayout>
              <Label col="2" text=">" class="item-chevron" />
            </GridLayout>

            <GridLayout columns="58,*,auto" class="list-item compact no-border" @tap="openHours">
              <GridLayout col="0" class="item-badge hours">
                <Label text="HRS" class="item-badge-text" />
              </GridLayout>
              <StackLayout col="1" class="item-copy">
                <Label text="Horaires d'ouverture" class="item-title" />
                <Label text="Lun-Ven 8h-18h  |  Sam 9h-12h" class="item-description" textWrap="true" />
              </StackLayout>
              <Label col="2" text=">" class="item-chevron" />
            </GridLayout>
          </StackLayout>

          <!-- FAQ -->
          <Label text="Questions frequentes" class="section-title" />
          <StackLayout class="section-card faq-card">
            <StackLayout
              v-for="(faq, index) in faqs"
              :key="faq.id"
              :class="['faq-item', index === faqs.length - 1 ? 'no-border' : '']"
            >
              <GridLayout columns="*,auto" class="faq-question" @tap="toggleFaq(faq.id)">
                <Label col="0" :text="faq.question" class="faq-q-text" textWrap="true" />
                <Label col="1" :text="activeFaqId === faq.id ? '▲' : '▼'" class="faq-chevron" />
              </GridLayout>
              <StackLayout v-if="activeFaqId === faq.id" class="faq-answer-block">
                <Label :text="faq.answer" class="faq-a-text" textWrap="true" />
              </StackLayout>
            </StackLayout>
          </StackLayout>

          <!-- Message de contact -->
          <Label text="Envoyer un message" class="section-title" />
          <StackLayout class="section-card message-card">
            <Label text="Votre demande" class="field-label" />
            <TextField
              v-model="messageText"
              hint="Decrivez votre question ou votre probleme..."
              class="message-input"
              autocorrect="true"
            />

            <GridLayout
              class="primary-cta"
              :class="{ disabled: messageText.trim().length === 0 }"
              @tap="sendMessage"
            >
              <Label text="Envoyer le message" class="cta-label" />
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <StackLayout class="nav-stack">
            <Label text="🏠" class="nav-icon" />
            <Label text="Accueil" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <StackLayout class="nav-stack">
            <Label text="📅" class="nav-icon" />
            <Label text="Reserver" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="2" class="nav-item" @tap="navigateTo('tutorials')">
          <StackLayout class="nav-stack">
            <Label text="🎥" class="nav-icon" />
            <Label text="Tutoriels" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <StackLayout class="nav-stack">
            <Label text="🚗" class="nav-icon" />
            <Label text="Vehicules" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="4" class="nav-item active" @tap="navigateTo('profile')">
          <StackLayout class="nav-stack">
            <Label text="👤" class="nav-icon" />
            <Label text="Profil" class="nav-label" />
          </StackLayout>
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue'
import { alert } from '@nativescript/core'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'

interface FaqItem {
  id: string
  question: string
  answer: string
}

const activeFaqId = ref<string | null>(null)
const messageText = ref('')

const faqs: FaqItem[] = [
  {
    id: 'faq1',
    question: 'Comment prendre un rendez-vous ?',
    answer:
      "Rendez-vous dans l'onglet \"Reserver\" depuis l'accueil. Choisissez le type d'intervention, une date et un creneau disponible, puis confirmez votre reservation. Vous recevrez une confirmation par email."
  },
  {
    id: 'faq2',
    question: 'Puis-je annuler ou modifier un rendez-vous ?',
    answer:
      "Oui. Depuis \"Mes rendez-vous\" dans votre profil, vous pouvez annuler ou demander une modification jusqu'a 24h avant la date prevue. Au-dela, contactez directement l'atelier par telephone."
  },
  {
    id: 'faq3',
    question: 'Comment ajouter un vehicule ?',
    answer:
      "Allez dans l'onglet \"Vehicules\" puis appuyez sur \"Ajouter un vehicule\". Renseignez la marque, le modele, l'annee et la plaque d'immatriculation. Votre vehicule sera alors disponible lors de vos prochaines reservations."
  },
  {
    id: 'faq4',
    question: 'Ou trouver mes factures ?',
    answer:
      "Vos factures PDF sont disponibles dans la section \"Factures PDF\" de votre profil. Vous pouvez les consulter et les telecharger apres chaque intervention validee."
  },
  {
    id: 'faq5',
    question: 'Comment mettre a jour mes informations personnelles ?',
    answer:
      "Dans votre profil, appuyez sur \"Mes informations\" pour modifier votre nom, email, telephone et adresse. Les changements sont enregistres automatiquement."
  },
  {
    id: 'faq6',
    question: "Mes donnees sont-elles securisees ?",
    answer:
      "Oui. Toutes vos donnees sont chiffrees et stockees de maniere securisee. Nous ne partageons jamais vos informations avec des tiers sans votre consentement explicite."
  }
]

function onPageLoaded() {
  console.log('Support FAQ page loaded')
}

function toggleFaq(id: string) {
  activeFaqId.value = activeFaqId.value === id ? null : id
}

function callAtelier() {
  void alert({
    title: 'Appeler l atelier',
    message: 'Composition du numero : +33 1 23 45 67 89',
    okButtonText: 'OK'
  })
}

function emailAtelier() {
  void alert({
    title: 'Envoyer un email',
    message: 'Adresse : contact@garageplus.fr',
    okButtonText: 'OK'
  })
}

function openHours() {
  void alert({
    title: 'Horaires',
    message: 'Lundi - Vendredi : 8h00 - 18h00\nSamedi : 9h00 - 12h00\nDimanche : Ferme',
    okButtonText: 'OK'
  })
}

async function sendMessage() {
  if (messageText.value.trim().length === 0) return
  await alert({
    title: 'Message envoye',
    message: "Votre message a ete transmis a l'equipe. Nous vous repondrons dans les plus brefs delais.",
    okButtonText: 'OK'
  })
  messageText.value = ''
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'supportFaq' })
}

function goBack() {
  navigateBack()
}
</script>

<style scoped>
.page {
  background-color: #eceef2;
}

.page-body {
  background-color: #eceef2;
}

.action-bar {
  background-color: #151a24;
  color: #ffffff;
}

.action-bar-content {
  padding: 0 12;
}

.icon-back {
  color: #ffffff;
  font-size: 20;
  font-weight: 700;
  vertical-align: center;
}

.action-title {
  color: #ffffff;
  font-size: 17;
  font-weight: 700;
  vertical-align: center;
  text-align: left;
}

.inline-back {
  margin-bottom: 10;
}

.inline-back-text {
  color: #e53a33;
  font-size: 14;
  font-weight: 600;
}

.content {
  padding: 16 16 30 16;
}

/* Hero */
.hero-card {
  background-color: #151a24;
  border-radius: 16;
  padding: 20 18;
  margin-bottom: 20;
}

.hero-title {
  color: #ffffff;
  font-size: 20;
  font-weight: 800;
  margin-bottom: 8;
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14;
  font-weight: 500;
}

/* Section titles */
.section-title {
  font-size: 13;
  font-weight: 700;
  color: #8a8f9b;
  letter-spacing: 0.8;
  margin-bottom: 8;
  margin-top: 4;
}

/* Section cards */
.section-card {
  background-color: #ffffff;
  border-radius: 14;
  margin-bottom: 18;
  overflow: hidden;
}

/* List items */
.list-item {
  padding: 14 16;
  border-bottom-width: 1;
  border-bottom-color: #eceef2;
  vertical-align: center;
}

.list-item.compact {
  padding: 12 16;
}

.list-item.no-border {
  border-bottom-width: 0;
}

.item-badge {
  width: 42;
  height: 42;
  border-radius: 10;
  background-color: #2b3443;
  vertical-align: center;
  horizontal-align: center;
}

.item-badge.phone {
  background-color: #27ae60;
}

.item-badge.mail {
  background-color: #2980b9;
}

.item-badge.hours {
  background-color: #8e5ea2;
}

.item-badge-text {
  color: #ffffff;
  font-size: 10;
  font-weight: 800;
  text-align: center;
  vertical-align: center;
}

.item-copy {
  margin-left: 12;
  vertical-align: center;
}

.item-title {
  font-size: 15;
  font-weight: 700;
  color: #1a2030;
  margin-bottom: 2;
}

.item-description {
  font-size: 13;
  color: #6b7280;
}

.item-chevron {
  color: #c0c4cc;
  font-size: 16;
  font-weight: 700;
  vertical-align: center;
}

/* FAQ */
.faq-card {
  padding: 0;
}

.faq-item {
  border-bottom-width: 1;
  border-bottom-color: #eceef2;
}

.faq-item.no-border {
  border-bottom-width: 0;
}

.faq-question {
  padding: 14 16;
  vertical-align: center;
}

.faq-q-text {
  font-size: 15;
  font-weight: 600;
  color: #1a2030;
  vertical-align: center;
}

.faq-chevron {
  font-size: 11;
  color: #e53a33;
  vertical-align: center;
  margin-left: 8;
}

.faq-answer-block {
  background-color: #f7f8fa;
  padding: 10 16 14 16;
  border-top-width: 1;
  border-top-color: #eceef2;
}

.faq-a-text {
  font-size: 14;
  color: #4b5563;
  line-height: 1.5;
}

/* Message form */
.message-card {
  padding: 16;
}

.field-label {
  font-size: 13;
  font-weight: 700;
  color: #8a8f9b;
  margin-bottom: 8;
}

.message-input {
  background-color: #f0f2f6;
  border-radius: 10;
  padding: 12 14;
  font-size: 15;
  color: #1a2030;
  margin-bottom: 16;
  border-width: 0;
}

.primary-cta {
  background-color: #e53a33;
  border-radius: 12;
  padding: 14;
  margin-top: 4;
}

.primary-cta.disabled {
  background-color: #c0c4cc;
}

.cta-label {
  color: #ffffff;
  font-size: 16;
  font-weight: 700;
  text-align: center;
}

/* Bottom nav */
.bottom-nav {
  background-color: #161c27;
  border-top-left-radius: 18;
  border-top-right-radius: 18;
}

.nav-item {
  align-items: center;
  justify-content: center;
  padding: 6 2 4 2;
}

.nav-stack {
  horizontal-align: center;
}

.nav-icon {
  font-size: 18;
  text-align: center;
  color: #f0f2f6;
  margin-bottom: 1;
}

.nav-label {
  font-size: 10;
  font-weight: 700;
  text-align: center;
  color: #f0f2f6;
}

.nav-item.active .nav-icon {
  color: #e53a33;
}

.nav-item.active .nav-label {
  color: #e53a33;
}
</style>

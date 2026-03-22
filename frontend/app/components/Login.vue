<template>
  <Page actionBarHidden="true" @loaded="onPageLoaded" class="page">
    <GridLayout rows="372,*" class="page-shell">
      <GridLayout row="0" rows="*,auto" class="hero-panel">
        <GridLayout class="hero-orb hero-orb-left" />
        <GridLayout class="hero-orb hero-orb-right" />
        <GridLayout class="hero-grid" />

        <StackLayout row="0" class="hero-copy">
          <Label text="Garage+" class="hero-brand" />
          <Label text="Connexion atelier moderne" class="hero-title" textWrap="true" />
          <Label
            text="Connectez-vous pour gerer vos rendez-vous, vos factures PDF et vos paiements depuis le mobile."
            class="hero-description"
            textWrap="true"
          />
        </StackLayout>

        <GridLayout row="1" columns="*,*" columnSpacing="12" class="hero-metrics">
          <StackLayout col="0" class="metric-card">
            <Label text="24/7" class="metric-value" />
            <Label text="Acces client" class="metric-label" />
          </StackLayout>

          <StackLayout col="1" class="metric-card metric-card-highlight">
            <Label text="RDV" class="metric-value" />
            <Label text="Suivi rapide" class="metric-label light" />
          </StackLayout>
        </GridLayout>
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="content">
          <StackLayout class="login-card">
            <Label text="Se connecter" class="card-title" />
            <Label
              text="Entrez dans l'espace client ou utilisez le compte demo backend deja prepare."
              class="card-subtitle"
              textWrap="true"
            />

            <StackLayout v-if="errorMessage" class="error-banner">
              <Label :text="errorMessage" class="error-copy" textWrap="true" />
            </StackLayout>

            <StackLayout class="field-block">
              <Label text="Adresse email" class="field-label" />
              <TextField
                v-model="email"
                :hint="demoCredentials.email"
                autocorrect="false"
                autocapitalizationType="none"
                class="field-input"
              />
            </StackLayout>

            <StackLayout class="field-block">
              <GridLayout columns="*,auto" class="field-header">
                <Label text="Mot de passe" col="0" class="field-label" />
                <Label
                  :text="showPassword ? 'Masquer' : 'Afficher'"
                  col="1"
                  class="field-action"
                  @tap="togglePasswordVisibility"
                />
              </GridLayout>

              <TextField
                v-model="password"
                hint="Votre mot de passe"
                :secure="!showPassword"
                autocorrect="false"
                autocapitalizationType="none"
                class="field-input"
              />
            </StackLayout>

            <GridLayout columns="*,auto" class="remember-row">
              <Label
                :text="rememberMe ? 'Session memorisee sur cet appareil' : 'Session locale uniquement'"
                col="0"
                class="remember-copy"
                textWrap="true"
              />
              <GridLayout
                col="1"
                class="remember-pill"
                :class="{ active: rememberMe }"
                @tap="rememberMe = !rememberMe"
              >
                <Label :text="rememberMe ? 'Memoire' : 'Local'" class="remember-pill-text" />
              </GridLayout>
            </GridLayout>

            <GridLayout class="primary-cta" :class="{ disabled: isSubmitting }" @tap="submitLogin">
              <ActivityIndicator
                v-if="isSubmitting"
                busy="true"
                color="#ffffff"
                width="22"
                height="22"
              />
              <Label v-else text="Entrer dans l'espace client" class="primary-cta-text" />
            </GridLayout>

            <GridLayout class="secondary-cta" :class="{ disabled: isSubmitting }" @tap="loginWithDemoAccount">
              <Label text="Connexion demo rapide" class="secondary-cta-text" />
            </GridLayout>

            <GridLayout columns="auto,*,auto" class="support-row">
              <Label text="Creer un compte" col="0" class="support-link" @tap="goToRegister" />
              <GridLayout col="1" />
              <Label text="Mot de passe oublie ?" col="2" class="support-link" @tap="goToForgotPassword" />
            </GridLayout>
          </StackLayout>

          <StackLayout class="credentials-card">
            <Label text="Compte demo backend" class="credentials-title" />
            <Label :text="'Email: ' + demoCredentials.email" class="credentials-copy" />
            <Label :text="'Mot de passe: ' + demoCredentials.password" class="credentials-copy" />
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue'
import AuthService, { authState } from '@/services/AuthService'
import { navigateToPage } from '@/utils/navigation'

const demoCredentials = AuthService.getDemoCredentials()

const email = ref(demoCredentials.email)
const password = ref(demoCredentials.password)
const rememberMe = ref(true)
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function onPageLoaded() {
  await AuthService.initializeSession()

  if (authState.isAuthenticated) {
    void navigateToPage('home', { clearHistory: true })
  }
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}

async function loginWithDemoAccount() {
  email.value = demoCredentials.email
  password.value = demoCredentials.password
  await submitLogin()
}

async function submitLogin() {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await AuthService.login({
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value
    })

    void navigateToPage('home', { clearHistory: true })
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

function goToRegister() {
  void navigateToPage('register', { currentPage: 'login' })
}

function goToForgotPassword() {
  void navigateToPage('forgotPassword', { currentPage: 'login' })
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Une erreur est survenue pendant la connexion.'
}
</script>

<style scoped>
.page { background-color: #0f1723; }
.page-shell { background-color: #0f1723; }
.hero-panel {
  background-color: #151c29;
  padding: 26 22 24 22;
  overflow: hidden;
}
.hero-orb {
  width: 180;
  height: 180;
  border-radius: 90;
  opacity: 0.95;
}
.hero-orb-left {
  background-color: rgba(220, 38, 38, 0.92);
  horizontal-align: left;
  vertical-align: top;
  margin-left: -72;
  margin-top: -48;
}
.hero-orb-right {
  background-color: rgba(255, 255, 255, 0.09);
  horizontal-align: right;
  vertical-align: top;
  margin-right: -88;
  margin-top: 32;
}
.hero-grid {
  width: 220;
  height: 220;
  border-width: 1;
  border-color: rgba(255, 255, 255, 0.06);
  horizontal-align: right;
  vertical-align: bottom;
  margin-right: -60;
  margin-bottom: -90;
}
.hero-copy {
  vertical-align: center;
  margin-top: 22;
  margin-right: 32;
}
.hero-brand {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14;
  font-weight: 700;
  letter-spacing: 0.8;
  text-transform: uppercase;
}
.hero-title {
  color: #ffffff;
  font-size: 30;
  font-weight: 900;
  margin-top: 10;
}
.hero-description {
  color: rgba(255, 255, 255, 0.78);
  font-size: 14;
  margin-top: 12;
}
.hero-metrics {
  margin-top: 18;
}
.metric-card {
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 18;
  padding: 14 16;
}
.metric-card-highlight {
  background-color: #dc2626;
}
.metric-value {
  color: #ffffff;
  font-size: 22;
  font-weight: 800;
}
.metric-label {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12;
  font-weight: 600;
  margin-top: 4;
}
.metric-label.light {
  color: rgba(255, 255, 255, 0.92);
}
.content {
  padding: 0 16 28 16;
  margin-top: -20;
}
.login-card {
  background-color: #ffffff;
  border-radius: 28;
  padding: 22 20 18 20;
  shadow-color: #000000;
  shadow-opacity: 0.24;
  shadow-radius: 22;
  shadow-offset: 0 8;
}
.card-title {
  color: #111827;
  font-size: 28;
  font-weight: 900;
}
.card-subtitle {
  color: #6b7280;
  font-size: 13;
  line-height: 5;
  margin-top: 8;
  margin-bottom: 14;
}
.error-banner {
  background-color: #fff1f2;
  border-radius: 14;
  padding: 12 14;
  margin-bottom: 14;
}
.error-copy {
  color: #be123c;
  font-size: 12;
  font-weight: 700;
}
.field-block {
  margin-bottom: 14;
}
.field-header {
  margin-bottom: 6;
}
.field-label {
  color: #374151;
  font-size: 12;
  font-weight: 700;
}
.field-action {
  color: #dc2626;
  font-size: 12;
  font-weight: 700;
}
.field-input {
  background-color: #f8fafc;
  border-width: 1;
  border-color: #d9e0e8;
  border-radius: 14;
  padding: 14 16;
  font-size: 15;
  color: #111827;
  placeholder-color: #94a3b8;
}
.remember-row {
  margin-top: 2;
  margin-bottom: 16;
}
.remember-copy {
  color: #64748b;
  font-size: 12;
  font-weight: 600;
  margin-right: 12;
}
.remember-pill {
  background-color: #e2e8f0;
  border-radius: 999;
  padding: 8 12;
  min-width: 82;
}
.remember-pill.active {
  background-color: #fee2e2;
}
.remember-pill-text {
  color: #334155;
  font-size: 11;
  font-weight: 800;
  text-align: center;
}
.remember-pill.active .remember-pill-text {
  color: #b91c1c;
}
.primary-cta {
  background-color: #dc2626;
  border-radius: 16;
  height: 56;
  align-items: center;
  justify-content: center;
}
.primary-cta.disabled {
  opacity: 0.7;
}
.primary-cta-text {
  color: #ffffff;
  font-size: 15;
  font-weight: 800;
  text-align: center;
}
.secondary-cta {
  background-color: #111827;
  border-radius: 16;
  height: 52;
  align-items: center;
  justify-content: center;
  margin-top: 10;
}
.secondary-cta.disabled {
  opacity: 0.7;
}
.secondary-cta-text {
  color: #ffffff;
  font-size: 14;
  font-weight: 700;
  text-align: center;
}
.support-row {
  margin-top: 16;
  margin-bottom: 2;
}
.support-link {
  color: #dc2626;
  font-size: 12;
  font-weight: 800;
}
.credentials-card {
  background-color: #1a2230;
  border-radius: 22;
  padding: 18;
  margin-top: 14;
  margin-bottom: 18;
}
.credentials-title {
  color: #ffffff;
  font-size: 15;
  font-weight: 800;
  margin-bottom: 8;
}
.credentials-copy {
  color: #cbd5e1;
  font-size: 13;
  font-weight: 600;
  margin-top: 2;
}
</style>

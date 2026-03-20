<template>
  <Page actionBarHidden="true" class="page">
    <GridLayout rows="258,*" class="page-shell">
      <GridLayout row="0" class="hero-panel">
        <GridLayout class="hero-glow hero-glow-left" />
        <GridLayout class="hero-glow hero-glow-right" />
        <GridLayout class="back-pill" @tap="goBack">
          <Label text="<" class="back-pill-text" />
        </GridLayout>

        <StackLayout class="hero-copy">
          <Label text="Nouveau compte" class="hero-kicker" />
          <Label text="Creer votre espace client" class="hero-title" textWrap="true" />
          <Label
            text="Inscrivez-vous pour suivre vos rendez-vous, vos vehicules et vos paiements."
            class="hero-subtitle"
            textWrap="true"
          />
        </StackLayout>
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="content">
          <StackLayout class="card">
            <Label text="Inscription" class="card-title" />

            <StackLayout v-if="errorMessage" class="error-banner">
              <Label :text="errorMessage" class="error-copy" textWrap="true" />
            </StackLayout>

            <StackLayout class="field-block">
              <Label text="Nom complet" class="field-label" />
              <TextField v-model="fullName" hint="Votre nom complet" class="field-input" />
            </StackLayout>

            <StackLayout class="field-block">
              <Label text="Adresse email" class="field-label" />
              <TextField
                v-model="email"
                hint="client@example.com"
                keyboardType="email"
                autocorrect="false"
                autocapitalizationType="none"
                class="field-input"
              />
            </StackLayout>

            <StackLayout class="field-block">
              <Label text="Telephone" class="field-label" />
              <TextField v-model="phone" hint="+1 514 555 0101" keyboardType="phone" class="field-input" />
            </StackLayout>

            <StackLayout class="field-block">
              <Label text="Mot de passe" class="field-label" />
              <TextField
                v-model="password"
                hint="Minimum 8 caracteres"
                :secure="!showPassword"
                autocorrect="false"
                autocapitalizationType="none"
                class="field-input"
              />
            </StackLayout>

            <StackLayout class="field-block">
              <GridLayout columns="*,auto" class="field-header">
                <Label text="Confirmation" col="0" class="field-label" />
                <Label
                  :text="showPassword ? 'Masquer' : 'Afficher'"
                  col="1"
                  class="field-action"
                  @tap="showPassword = !showPassword"
                />
              </GridLayout>

              <TextField
                v-model="confirmPassword"
                hint="Confirmez le mot de passe"
                :secure="!showPassword"
                autocorrect="false"
                autocapitalizationType="none"
                class="field-input"
              />
            </StackLayout>

            <GridLayout columns="*,auto" class="remember-row">
              <Label
                :text="rememberMe ? 'Connexion memorisee apres inscription' : 'Connexion locale uniquement'"
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

            <GridLayout class="primary-cta" :class="{ disabled: isSubmitting }" @tap="submitRegister">
              <ActivityIndicator
                v-if="isSubmitting"
                busy="true"
                color="#ffffff"
                width="22"
                height="22"
              />
              <Label v-else text="Creer le compte" class="primary-cta-text" />
            </GridLayout>

            <Label text="J'ai deja un compte" class="secondary-link" @tap="goToLogin" />
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue'
import AuthService from '@/services/AuthService'
import { goBack as navigateBack, navigateToPage } from '@/utils/navigation'

const fullName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(true)
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submitRegister() {
  if (isSubmitting.value) {
    return
  }

  if (!fullName.value.trim() || !email.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Nom, email et mot de passe sont obligatoires.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Les deux mots de passe doivent correspondre.'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await AuthService.register({
      fullName: fullName.value,
      email: email.value,
      phone: phone.value,
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

function goToLogin() {
  void navigateToPage('login', { currentPage: 'register' })
}

function goBack() {
  void navigateBack()
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Inscription impossible pour le moment.'
}
</script>

<style scoped>
.page { background-color: #111827; }
.page-shell { background-color: #111827; }
.hero-panel { background-color: #181f2d; padding: 26 22 22 22; overflow: hidden; }
.back-pill {
  width: 40;
  height: 40;
  border-radius: 20;
  background-color: rgba(255, 255, 255, 0.1);
  horizontal-align: left;
  vertical-align: top;
}
.back-pill-text {
  color: #ffffff;
  font-size: 20;
  font-weight: 800;
  text-align: center;
  vertical-align: center;
}
.hero-glow { width: 160; height: 160; border-radius: 80; opacity: 0.88; }
.hero-glow-left { background-color: rgba(220, 38, 38, 0.92); horizontal-align: left; vertical-align: top; margin-left: -58; margin-top: -56; }
.hero-glow-right { background-color: rgba(255, 255, 255, 0.08); horizontal-align: right; vertical-align: bottom; margin-right: -70; margin-bottom: -50; }
.hero-copy { margin-top: 34; margin-right: 42; }
.hero-kicker { color: rgba(255, 255, 255, 0.66); font-size: 12; font-weight: 800; letter-spacing: 1; text-transform: uppercase; }
.hero-title { color: #ffffff; font-size: 30; font-weight: 900; margin-top: 10; }
.hero-subtitle { color: rgba(255, 255, 255, 0.75); font-size: 14; margin-top: 12; }
.content { padding: 16; margin-top: -18; }
.card { background-color: #ffffff; border-radius: 24; padding: 22 20 24 20; shadow-color: #000000; shadow-opacity: 0.2; shadow-radius: 16; shadow-offset: 0 6; }
.card-title { color: #111827; font-size: 26; font-weight: 900; margin-bottom: 12; }
.error-banner { background-color: #fff1f2; border-radius: 14; padding: 12 14; margin-bottom: 14; }
.error-copy { color: #be123c; font-size: 12; font-weight: 700; }
.field-block { margin-bottom: 14; }
.field-header { margin-bottom: 6; }
.field-label { color: #374151; font-size: 12; font-weight: 700; }
.field-action { color: #dc2626; font-size: 12; font-weight: 700; }
.field-input { background-color: #f8fafc; border-width: 1; border-color: #d9e0e8; border-radius: 14; padding: 14 16; font-size: 15; color: #111827; placeholder-color: #94a3b8; }
.remember-row { margin-top: 2; margin-bottom: 18; }
.remember-copy { color: #64748b; font-size: 12; font-weight: 600; margin-right: 12; }
.remember-pill { background-color: #e2e8f0; border-radius: 999; padding: 8 12; min-width: 82; }
.remember-pill.active { background-color: #fee2e2; }
.remember-pill-text { color: #334155; font-size: 11; font-weight: 800; text-align: center; }
.remember-pill.active .remember-pill-text { color: #b91c1c; }
.primary-cta { background-color: #dc2626; border-radius: 16; height: 56; align-items: center; justify-content: center; }
.primary-cta.disabled { opacity: 0.7; }
.primary-cta-text { color: #ffffff; font-size: 15; font-weight: 800; text-align: center; }
.secondary-link { color: #dc2626; font-size: 13; font-weight: 800; text-align: center; margin-top: 16; }
</style>

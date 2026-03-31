<template>
  <Page class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Detail du tutoriel" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goToPreviousPage">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="hero-card">
            <Label :text="tutorialCategoryLabel(tutorial.category)" class="hero-kicker" />
            <Label :text="tutorial.title" class="hero-title" textWrap="true" />
            <Label :text="tutorial.description" class="hero-subtitle" textWrap="true" />

            <GridLayout columns="*,*,*" columnSpacing="8" class="fact-grid">
              <StackLayout col="0" class="fact-card">
                <Label text="Niveau" class="fact-label" />
                <Label :text="difficultyLabel(tutorial.difficulty)" class="fact-value" />
              </StackLayout>
              <StackLayout col="1" class="fact-card">
                <Label text="Duree" class="fact-label" />
                <Label :text="formatDuration(tutorial.duration)" class="fact-value" />
              </StackLayout>
              <StackLayout col="2" class="fact-card">
                <Label text="Audience" class="fact-label" />
                <Label :text="viewsLabel(tutorial.views)" class="fact-value" />
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <StackLayout v-if="tutorial.tools?.length" class="section-card">
            <Label text="Outils requis" class="section-title" />
            <Label :text="tutorial.tools.join(', ')" class="section-copy" textWrap="true" />
          </StackLayout>

          <StackLayout class="section-card">
            <Label text="Etapes du tutoriel" class="section-title" />
            <GridLayout
              v-for="(instruction, idx) in tutorial.instructions"
              :key="idx"
              columns="28,*"
              class="instruction-row"
            >
              <StackLayout col="0" class="instruction-index">
                <Label :text="String(idx + 1)" class="instruction-index-text" />
              </StackLayout>
              <Label col="1" :text="instruction" class="section-copy instruction-copy" textWrap="true" />
            </GridLayout>
          </StackLayout>

          <GridLayout class="primary-cta" @tap="playVideo">
            <Label text="Lire la video dans l'application" class="primary-cta-text" />
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <Label text="Accueil" class="nav-label" />
        </GridLayout>
        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <Label text="Reserver" class="nav-label" />
        </GridLayout>
        <GridLayout col="2" class="nav-item active" @tap="navigateTo('tutorials')">
          <Label text="Tutoriels" class="nav-label" />
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <Label text="Vehicules" class="nav-label" />
        </GridLayout>
        <GridLayout col="4" class="nav-item" @tap="navigateTo('profile')">
          <Label text="Profil" class="nav-label" />
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { alert } from '@nativescript/core'
import type { Tutorial, TutorialCategory } from '@/types/tutorial'
import { formatDuration, formatViews } from '@/types/tutorial'
import TutorialService from '@/services/TutorialService'
import { goBack, navigateToPage, type AppPage } from '@/utils/navigation'

const props = defineProps<{
  tutorial: Tutorial
}>()

const tutorial = props.tutorial

function tutorialCategoryLabel(category: TutorialCategory) {
  if (category === 'entretien') return 'Entretien'
  if (category === 'freins') return 'Freins'
  if (category === 'suspension') return 'Suspension'
  if (category === 'batterie') return 'Batterie'
  if (category === 'diagnostic') return 'Diagnostic'
  if (category === 'eclairage') return 'Eclairage'
  if (category === 'fluide') return 'Fluides'
  return 'Mecanique'
}

function difficultyLabel(level: Tutorial['difficulty']) {
  if (level === 'facile') return 'Facile'
  if (level === 'moyen') return 'Moyen'
  return 'Difficile'
}

function viewsLabel(views: number) {
  return `${formatViews(views)} vues`
}

async function playVideo() {
  const videoUrl = tutorial.videoUrl?.trim()
  if (!videoUrl) {
    await alert({
      title: 'Video indisponible',
      message: 'Ce tutoriel ne contient pas encore de lien video exploitable.',
      okButtonText: 'OK'
    })
    return
  }

  void TutorialService.incrementViews(tutorial.id)
  void navigateToPage('tutorialVideo', {
    currentPage: 'tutorialDetail',
    props: { tutorial }
  })
}

function goToPreviousPage() {
  goBack()
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'tutorialDetail' })
}
</script>

<style scoped>
.page { background-color: #eef2f7; }
.action-bar { background-color: #111827; color: #fff; }
.action-bar-content { padding: 0 12; height: 56; vertical-align: center; }
.icon-back { font-size: 20; color: #fff; }
.action-title { font-size: 18; font-weight: 700; color: #fff; vertical-align: center; }
.page-body { background-color: #eef2f7; }
.content { padding: 16 16 24 16; }
.inline-back { width: 150; background-color: #ffffff; border-radius: 999; padding: 10 14; margin-bottom: 14; }
.inline-back-text { color: #0f172a; font-size: 13; font-weight: 800; }
.hero-card { background-color: #ffffff; border-radius: 22; padding: 20; margin-bottom: 16; }
.hero-kicker { color: #dc2626; font-size: 11; font-weight: 800; margin-bottom: 8; text-transform: uppercase; }
.hero-title { color: #111827; font-size: 24; font-weight: 800; margin-bottom: 8; }
.hero-subtitle { color: #475569; font-size: 13; }
.fact-grid { margin-top: 18; }
.fact-card { background-color: #f8fafc; border-radius: 16; padding: 12; }
.fact-label { color: #64748b; font-size: 10; font-weight: 800; text-transform: uppercase; margin-bottom: 4; }
.fact-value { color: #111827; font-size: 13; font-weight: 800; }
.section-card { background-color: #ffffff; border-radius: 18; padding: 18; margin-bottom: 14; }
.section-title { color: #111827; font-size: 16; font-weight: 800; margin-bottom: 12; }
.section-copy { color: #475569; font-size: 13; line-height: 18; }
.instruction-row { margin-bottom: 10; }
.instruction-index { width: 24; height: 24; border-radius: 999; background-color: #fee2e2; justify-content: center; align-items: center; margin-top: 1; }
.instruction-index-text { color: #b91c1c; font-size: 11; font-weight: 800; text-align: center; }
.instruction-copy { margin-left: 10; }
.primary-cta { background-color: #dc2626; border-radius: 16; padding: 16; margin-top: 4; }
.primary-cta-text { color: #ffffff; font-size: 15; font-weight: 700; text-align: center; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 4 4 4; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 700; text-align: center; }
.nav-item.active .nav-label { color: #dc2626; }
</style>

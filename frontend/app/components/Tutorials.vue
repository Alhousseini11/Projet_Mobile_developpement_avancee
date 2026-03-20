<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Tutoriels video" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <StackLayout class="hero-card">
            <Label text="Bibliotheque atelier" class="hero-title" />
            <Label
              text="Retrouvez des guides video par categorie, niveau et duree."
              class="hero-subtitle"
              textWrap="true"
            />
          </StackLayout>

          <GridLayout columns="*,*" columnSpacing="12" class="summary-grid">
            <StackLayout col="0" class="summary-card">
              <Label :text="String(tutorials.length)" class="summary-value" />
              <Label text="Tutoriels" class="summary-label" />
            </StackLayout>

            <StackLayout col="1" class="summary-card summary-card-dark">
              <Label :text="featuredDurationLabel" class="summary-value small light" />
              <Label text="Duree mise en avant" class="summary-label light" />
            </StackLayout>
          </GridLayout>

          <StackLayout class="search-card">
            <TextField
              v-model="searchQuery"
              hint="Rechercher un tutoriel"
              class="search-input"
              @textChange="performSearch"
            />
          </StackLayout>

          <ScrollView orientation="horizontal" class="chips">
            <StackLayout orientation="horizontal" class="chips-row">
              <Label
                v-for="category in ['all', ...categories]"
                :key="category"
                :text="chipLabel(category as any)"
                :class="['chip', activeCategory === category ? 'chip-active' : 'chip-inactive']"
                @tap="filterByCategory(category as any)"
              />
            </StackLayout>
          </ScrollView>

          <StackLayout v-if="featuredTutorial" class="featured-card" @tap="watchTutorial(featuredTutorial)">
            <Label text="Tutoriel recommande" class="featured-kicker" />
            <Label :text="featuredTutorial.title" class="featured-title" textWrap="true" />
            <Label :text="featuredTutorial.description" class="featured-description" textWrap="true" />
            <GridLayout columns="auto,auto,auto" columnSpacing="8" class="featured-meta">
              <Label col="0" :text="tutorialCategoryLabel(featuredTutorial.category)" class="featured-pill" />
              <Label col="1" :text="difficultyLabel(featuredTutorial.difficulty)" class="featured-pill" />
              <Label col="2" :text="formatDuration(featuredTutorial.duration)" class="featured-pill" />
            </GridLayout>
          </StackLayout>

          <Label text="Tous les tutoriels" class="section-title" />

          <StackLayout v-if="filteredTutorials.length === 0" class="empty-card">
            <Label text="Aucun tutoriel trouve." class="empty-title" />
            <Label text="Essayez un autre mot-cle ou une autre categorie." class="empty-text" textWrap="true" />
          </StackLayout>

          <StackLayout v-else>
            <GridLayout
              v-for="tutorial in filteredTutorials"
              :key="tutorial.id"
              rows="auto,auto,auto"
              columns="64,*,auto"
              class="tutorial-card"
              @tap="watchTutorial(tutorial)"
            >
              <GridLayout row="0" rowSpan="3" col="0" class="tutorial-badge">
                <Label :text="tutorialBadge(tutorial)" class="tutorial-badge-text" />
              </GridLayout>

              <StackLayout row="0" col="1" class="tutorial-copy">
                <Label :text="tutorial.title" class="tutorial-title" textWrap="true" />
                <Label :text="tutorial.description" class="tutorial-description" textWrap="true" />
              </StackLayout>

              <GridLayout row="0" col="2" class="play-btn">
                <Label text=">" class="play-btn-text" />
              </GridLayout>

              <GridLayout row="1" col="1" colSpan="2" columns="auto,auto,auto" columnSpacing="8" class="meta-row">
                <Label col="0" :text="tutorialCategoryLabel(tutorial.category)" class="meta-pill" />
                <Label col="1" :text="difficultyLabel(tutorial.difficulty)" class="meta-pill" />
                <Label col="2" :text="formatDuration(tutorial.duration)" class="meta-pill" />
              </GridLayout>

              <GridLayout row="2" col="1" colSpan="2" columns="*,auto" class="tutorial-footer">
                <Label col="0" :text="toolsLabel(tutorial)" class="tutorial-detail" textWrap="true" />
                <Label col="1" :text="viewsLabel(tutorial.views)" class="tutorial-views" />
              </GridLayout>
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="🏠" col="0" class="nav-icon" />
            <Label text="Accueil" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="📅" col="0" class="nav-icon" />
            <Label text="Reserver" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
        <GridLayout col="2" class="nav-item active" @tap="navigateTo('tutorials')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="🎥" col="0" class="nav-icon" />
            <Label text="Tutoriels" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="🚗" col="0" class="nav-icon" />
            <Label text="Vehicules" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
        <GridLayout col="4" class="nav-item" @tap="navigateTo('profile')">
          <GridLayout columns="auto,auto" class="nav-content">
            <Label text="👤" col="0" class="nav-icon" />
            <Label text="Profil" col="1" class="nav-label" />
          </GridLayout>
        </GridLayout>
      </GridLayout>
    </GridLayout>

    <GridLayout v-if="showDetailModal" class="sheet-backdrop" @tap="showDetailModal = false">
      <StackLayout class="sheet" @tap="consumeTap">
        <Label text="Detail du tutoriel" class="sheet-title" />
        <ScrollView class="sheet-scroll">
          <StackLayout>
            <Label v-if="selectedTutorial" :text="selectedTutorial.title" class="detail-title" textWrap="true" />
            <Label v-if="selectedTutorial" :text="selectedTutorial.description" class="detail-text" textWrap="true" />
            <Label v-if="selectedTutorial" :text="'Categorie : ' + tutorialCategoryLabel(selectedTutorial.category)" class="detail-meta" />
            <Label v-if="selectedTutorial" :text="'Niveau : ' + difficultyLabel(selectedTutorial.difficulty)" class="detail-meta" />
            <Label v-if="selectedTutorial" :text="'Duree : ' + formatDuration(selectedTutorial.duration)" class="detail-meta" />
            <Label v-if="selectedTutorial?.tools?.length" text="Outils requis" class="detail-subtitle" />
            <Label v-if="selectedTutorial?.tools?.length" :text="selectedTutorial.tools.join(', ')" class="detail-text" textWrap="true" />
            <Label v-if="selectedTutorial" text="Etapes" class="detail-subtitle" />
            <Label
              v-for="(instruction, idx) in selectedTutorial?.instructions || []"
              :key="idx"
              :text="(idx + 1) + '. ' + instruction"
              class="detail-text"
              textWrap="true"
            />
          </StackLayout>
        </ScrollView>
        <GridLayout columns="*,*" columnSpacing="10" class="sheet-actions">
          <GridLayout col="0" class="sheet-btn" @tap="playVideo">
            <Label text="Lire la video" class="sheet-btn-text" />
          </GridLayout>
          <GridLayout col="1" class="sheet-cancel" @tap="showDetailModal = false">
            <Label text="Fermer" class="sheet-cancel-text" />
          </GridLayout>
        </GridLayout>
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { computed, ref } from 'nativescript-vue'
import TutorialService from '@/services/TutorialService'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'
import type { Tutorial, TutorialCategory } from '@/types/tutorial'
import { formatDuration, formatViews } from '@/types/tutorial'

const tutorials = ref<Tutorial[]>(TutorialService.getFallbackTutorials())
const filteredTutorials = ref<Tutorial[]>(TutorialService.getFallbackTutorials())
const selectedTutorial = ref<Tutorial | null>(null)
const showDetailModal = ref(false)
const searchQuery = ref('')
const activeCategory = ref<TutorialCategory | 'all'>('all')
const categories = ref<TutorialCategory[]>([
  'entretien',
  'freins',
  'suspension',
  'batterie',
  'diagnostic',
  'eclairage',
  'fluide',
  'mecanique'
])

const featuredTutorial = computed(() => filteredTutorials.value[0] ?? tutorials.value[0] ?? null)
const featuredDurationLabel = computed(() => {
  return featuredTutorial.value ? formatDuration(featuredTutorial.value.duration) : '0m'
})

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

function tutorialBadge(tutorial: Tutorial) {
  return tutorial.title
    .split(' ')
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase()
}

function toolsLabel(tutorial: Tutorial) {
  return tutorial.tools?.length ? tutorial.tools.slice(0, 3).join(', ') : 'Outils a consulter'
}

function viewsLabel(views: number) {
  return `${formatViews(views)} vues`
}

async function onPageLoaded() {
  console.log('Tutorials page loaded')
  await loadTutorials()
}

async function loadTutorials() {
  try {
    tutorials.value = TutorialService.getFallbackTutorials()
    filteredTutorials.value = tutorials.value
    const data = await TutorialService.getTutorials()
    tutorials.value = data
    filteredTutorials.value = data
  } catch (error) {
    console.error('Error loading tutorials:', error)
  }
}

function chipLabel(category: TutorialCategory | 'all') {
  if (category === 'all') return 'Tous'
  return tutorialCategoryLabel(category)
}

function filterByCategory(category: TutorialCategory | 'all') {
  activeCategory.value = category
  applyFilters()
}

function performSearch() {
  applyFilters()
}

function applyFilters() {
  let results = tutorials.value

  if (activeCategory.value !== 'all') {
    results = results.filter(tutorial => tutorial.category === activeCategory.value)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    results = results.filter(tutorial => {
      return (
        tutorial.title.toLowerCase().includes(query) ||
        tutorial.description.toLowerCase().includes(query)
      )
    })
  }

  filteredTutorials.value = results
}

function watchTutorial(tutorial: Tutorial) {
  selectedTutorial.value = tutorial
  showDetailModal.value = true
}

async function playVideo() {
  if (!selectedTutorial.value) {
    return
  }

  await TutorialService.incrementViews(selectedTutorial.value.id)
  console.log('Playing video:', selectedTutorial.value.videoUrl)
}

function consumeTap() {
  return
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'tutorials' })
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
.summary-grid { column-gap: 12; margin-bottom: 16; }
.summary-card { background-color: #ffffff; border-radius: 16; padding: 16; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.summary-card-dark { background-color: #1f2733; }
.summary-value { color: #111827; font-size: 24; font-weight: 800; margin-bottom: 4; }
.summary-value.small { font-size: 18; }
.summary-value.light { color: #ffffff; }
.summary-label { color: #6b7280; font-size: 12; font-weight: 600; }
.summary-label.light { color: #cbd5e1; }
.search-card { background-color: #ffffff; border-radius: 16; padding: 10 14; margin-bottom: 12; shadow-color: #000; shadow-opacity: 0.05; shadow-radius: 8; shadow-offset: 0 2; }
.search-input { font-size: 14; color: #111827; }
.chips { margin-bottom: 16; }
.chips-row { padding-right: 6; }
.chip { padding: 9 14; border-radius: 999; font-size: 12; font-weight: 700; margin-right: 8; }
.chip-active { background-color: #dc2626; color: #ffffff; }
.chip-inactive { background-color: #ffffff; color: #475569; }
.featured-card { background-color: #1f2733; border-radius: 18; padding: 18; margin-bottom: 18; shadow-color: #000; shadow-opacity: 0.08; shadow-radius: 12; shadow-offset: 0 3; }
.featured-kicker { color: #fca5a5; font-size: 11; font-weight: 700; margin-bottom: 6; }
.featured-title { color: #ffffff; font-size: 18; font-weight: 800; margin-bottom: 8; }
.featured-description { color: #d1d5db; font-size: 13; margin-bottom: 12; }
.featured-meta { column-gap: 8; }
.featured-pill { background-color: rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 11; font-weight: 700; padding: 6 10; border-radius: 999; }
.section-title { color: #1f2733; font-size: 16; font-weight: 800; margin-bottom: 10; }
.empty-card { background-color: #ffffff; border-radius: 16; padding: 20; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.empty-title { color: #111827; font-size: 18; font-weight: 700; margin-bottom: 8; }
.empty-text { color: #6b7280; font-size: 13; }
.tutorial-card { background-color: #ffffff; border-radius: 16; padding: 16; margin-bottom: 12; shadow-color: #000; shadow-opacity: 0.06; shadow-radius: 8; shadow-offset: 0 2; }
.tutorial-badge { width: 42; height: 42; border-radius: 12; background-color: #dc2626; vertical-align: top; }
.tutorial-badge-text { color: #ffffff; font-size: 12; font-weight: 800; text-align: center; vertical-align: center; }
.tutorial-copy { margin-left: 14; margin-right: 12; }
.tutorial-title { color: #111827; font-size: 16; font-weight: 700; }
.tutorial-description { color: #6b7280; font-size: 13; margin-top: 4; }
.play-btn { width: 34; height: 34; border-radius: 10; background-color: #f3f4f6; }
.play-btn-text { color: #dc2626; font-size: 16; font-weight: 800; text-align: center; vertical-align: center; }
.meta-row { margin-top: 12; column-gap: 8; }
.meta-pill { background-color: #f3f4f6; color: #374151; font-size: 11; font-weight: 700; padding: 6 10; border-radius: 999; }
.tutorial-footer { margin-top: 14; }
.tutorial-detail { color: #6b7280; font-size: 12; margin-right: 12; }
.tutorial-views { color: #dc2626; font-size: 13; font-weight: 700; text-align: right; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 0 4 0; }
.nav-content { horizontal-align: center; vertical-align: center; }
.nav-icon { font-size: 18; color: #9ca3af; margin-right: 6; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 600; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
.nav-item.active .nav-icon { color: #dc2626; font-weight: 700; }
.sheet-backdrop { position: absolute; left: 0; right: 0; top: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.4); justify-content: center; align-items: center; }
.sheet { background-color: #1f2733; padding: 18 16 16 16; border-radius: 14; width: 88%; max-height: 80%; }
.sheet-title { color: #fff; font-size: 16; font-weight: 700; text-align: center; margin-bottom: 10; }
.sheet-scroll { max-height: 420; }
.detail-title { color: #fff; font-size: 15; font-weight: 700; margin-bottom: 6; }
.detail-text { color: #d1d5db; font-size: 13; margin-bottom: 4; }
.detail-meta { color: #fca5a5; font-size: 12; font-weight: 600; margin-bottom: 4; }
.detail-subtitle { color: #fff; font-weight: 700; font-size: 13; margin-top: 8; margin-bottom: 2; }
.sheet-actions { margin-top: 12; }
.sheet-btn { background-color: #dc2626; border-radius: 10; padding: 10; }
.sheet-btn-text { color: #fff; font-size: 14; font-weight: 700; text-align: center; }
.sheet-cancel { background-color: #2c3544; border-radius: 10; padding: 10; }
.sheet-cancel-text { color: #d1d5db; font-size: 14; text-align: center; }
</style>

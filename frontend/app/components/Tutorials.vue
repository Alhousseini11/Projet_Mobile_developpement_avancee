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
            <Label text="ATELIER VIDEO" class="hero-kicker" />
            <Label text="Tutoriels atelier" class="hero-title" />
            <Label
              text="Des guides plus lisibles, classes par categorie et prets a etre consultes avant une intervention."
              class="hero-subtitle"
              textWrap="true"
            />

            <GridLayout columns="*,*,*" columnSpacing="10" class="hero-stats">
              <StackLayout col="0" class="hero-stat-card">
                <Label :text="String(tutorials.length)" class="hero-stat-value" />
                <Label text="Videos" class="hero-stat-label" />
              </StackLayout>
              <StackLayout col="1" class="hero-stat-card">
                <Label :text="String(categoryCount)" class="hero-stat-value" />
                <Label text="Categories" class="hero-stat-label" />
              </StackLayout>
              <StackLayout col="2" class="hero-stat-card">
                <Label :text="averageDurationLabel" class="hero-stat-value" />
                <Label text="Duree moy." class="hero-stat-label" />
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <StackLayout class="search-panel">
            <GridLayout columns="*,auto" class="search-header">
              <StackLayout col="0">
                <Label text="Rechercher un guide" class="panel-title" />
                <Label :text="catalogueSubtitle" class="panel-copy" textWrap="true" />
              </StackLayout>
              <StackLayout col="1" class="search-summary-pill">
                <Label :text="resultCountLabel" class="search-summary-text" />
              </StackLayout>
            </GridLayout>

            <TextField
              v-model="searchQuery"
              hint="Titre, categorie, description"
              class="search-input"
              @textChange="performSearch"
            />
          </StackLayout>

          <ScrollView orientation="horizontal" class="chips-scroll">
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

          <StackLayout v-if="featuredTutorial" class="featured-card" @tap="openTutorial(featuredTutorial)">
            <GridLayout columns="72,*" class="featured-grid">
              <StackLayout col="0" class="featured-mark">
                <Label :text="tutorialBadge(featuredTutorial)" class="featured-mark-text" />
              </StackLayout>

              <StackLayout col="1" class="featured-copy">
                <Label text="A la une" class="featured-kicker" />
                <Label :text="featuredTutorial.title" class="featured-title" textWrap="true" />
                <Label :text="featuredTutorial.description" class="featured-description" textWrap="true" />
                <GridLayout columns="auto,auto,auto" columnSpacing="8" class="featured-meta">
                  <Label col="0" :text="tutorialCategoryLabel(featuredTutorial.category)" class="featured-pill" />
                  <Label col="1" :text="difficultyLabel(featuredTutorial.difficulty)" class="featured-pill" />
                  <Label col="2" :text="formatDuration(featuredTutorial.duration)" class="featured-pill" />
                </GridLayout>
                <GridLayout columns="*,auto" class="featured-footer">
                  <Label col="0" :text="featuredSupportLabel(featuredTutorial)" class="featured-support" textWrap="true" />
                  <StackLayout col="1" class="featured-cta">
                    <Label text="Voir le detail" class="featured-cta-text" />
                  </StackLayout>
                </GridLayout>
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <GridLayout columns="*,auto" class="catalogue-header">
            <StackLayout col="0">
              <Label text="Catalogue" class="section-title" />
              <Label text="Touchez une carte pour ouvrir sa fiche detaillee et lancer la lecture." class="section-copy" textWrap="true" />
            </StackLayout>
            <StackLayout col="1" class="catalogue-chip">
              <Label :text="viewCountLabel" class="catalogue-chip-text" />
            </StackLayout>
          </GridLayout>

          <StackLayout v-if="filteredTutorials.length === 0" class="empty-card">
            <Label text="Aucun tutoriel trouve." class="empty-title" />
            <Label text="Essayez un autre mot-cle ou une autre categorie." class="empty-text" textWrap="true" />
          </StackLayout>

          <StackLayout v-else>
            <GridLayout
              v-for="tutorial in filteredTutorials"
              :key="tutorial.id"
              rows="auto,auto,auto"
              columns="74,*,auto"
              class="tutorial-card"
              @tap="openTutorial(tutorial)"
            >
              <StackLayout row="0" rowSpan="3" col="0" class="tutorial-cover">
                <Label :text="tutorialBadge(tutorial)" class="tutorial-cover-badge" />
                <Label text="guide" class="tutorial-cover-copy" />
              </StackLayout>

              <StackLayout row="0" col="1" class="tutorial-copy">
                <GridLayout columns="auto,*" class="tutorial-header-row">
                  <Label col="0" :text="tutorialCategoryLabel(tutorial.category)" class="mini-kicker" />
                  <Label col="1" :text="ratingLabel(tutorial.rating)" class="rating-copy" />
                </GridLayout>
                <Label :text="tutorial.title" class="tutorial-title" textWrap="true" />
                <Label :text="tutorial.description" class="tutorial-description" textWrap="true" />
              </StackLayout>

              <StackLayout row="0" col="2" class="card-action">
                <Label text="Voir" class="card-action-text" />
              </StackLayout>

              <GridLayout row="1" col="1" colSpan="2" columns="auto,auto,auto" columnSpacing="8" class="meta-row">
                <Label col="0" :text="difficultyLabel(tutorial.difficulty)" class="meta-pill" />
                <Label col="1" :text="formatDuration(tutorial.duration)" class="meta-pill" />
                <Label col="2" :text="viewsLabel(tutorial.views)" class="meta-pill meta-pill-accent" />
              </GridLayout>

              <GridLayout row="2" col="1" colSpan="2" columns="*,auto" class="tutorial-footer">
                <Label col="0" :text="toolsLabel(tutorial)" class="tutorial-detail" textWrap="true" />
                <Label col="1" :text="instructionPreview(tutorial)" class="tutorial-preview" textWrap="true" />
              </GridLayout>
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <StackLayout class="nav-stack">
            <Label text="Accueil" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <StackLayout class="nav-stack">
            <Label text="Reserver" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="2" class="nav-item active" @tap="navigateTo('tutorials')">
          <StackLayout class="nav-stack">
            <Label text="Tutoriels" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <StackLayout class="nav-stack">
            <Label text="Vehicules" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="4" class="nav-item" @tap="navigateTo('profile')">
          <StackLayout class="nav-stack">
            <Label text="Profil" class="nav-label" />
          </StackLayout>
        </GridLayout>
      </GridLayout>
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

const categoryCount = computed(() => {
  return new Set(tutorials.value.map(tutorial => tutorial.category)).size
})

const averageDurationLabel = computed(() => {
  if (tutorials.value.length === 0) {
    return '0m'
  }

  const totalDuration = tutorials.value.reduce((sum, tutorial) => sum + tutorial.duration, 0)
  return formatDuration(Math.round(totalDuration / tutorials.value.length))
})

const resultCountLabel = computed(() => `${filteredTutorials.value.length} resultat(s)`)

const viewCountLabel = computed(() => {
  const totalViews = tutorials.value.reduce((sum, tutorial) => sum + tutorial.views, 0)
  return `${formatViews(totalViews)} vues`
})

const catalogueSubtitle = computed(() => {
  if (activeCategory.value === 'all' && !searchQuery.value.trim()) {
    return 'Une bibliotheque claire pour preparer une intervention ou revoir une procedure.'
  }

  return `Filtre actif : ${chipLabel(activeCategory.value)}`
})

async function onPageLoaded() {
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
  if (!tutorial.tools?.length) {
    return 'Sans outil special'
  }

  return tutorial.tools.slice(0, 3).join(', ')
}

function instructionPreview(tutorial: Tutorial) {
  if (!tutorial.instructions?.length) {
    return 'Voir le detail complet'
  }

  return tutorial.instructions[0]
}

function featuredSupportLabel(tutorial: Tutorial) {
  return `${ratingLabel(tutorial.rating)} · ${viewsLabel(tutorial.views)}`
}

function ratingLabel(rating: number) {
  if (!Number.isFinite(rating) || rating <= 0) {
    return 'Nouveau'
  }

  return `${rating.toFixed(1)}/5`
}

function viewsLabel(views: number) {
  return `${formatViews(views)} vues`
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

function openTutorial(tutorial: Tutorial) {
  void navigateToPage('tutorialDetail', {
    currentPage: 'tutorials',
    props: { tutorial }
  })
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'tutorials' })
}

function goBack() {
  void navigateBack()
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
.inline-back { width: 92; background-color: #ffffff; border-radius: 999; padding: 10 14; margin-bottom: 14; }
.inline-back-text { color: #0f172a; font-size: 13; font-weight: 800; }
.hero-card { background-color: #111827; border-radius: 22; padding: 20; margin-bottom: 16; shadow-color: #000; shadow-opacity: 0.12; shadow-radius: 14; shadow-offset: 0 4; }
.hero-kicker { color: #fca5a5; font-size: 11; font-weight: 800; letter-spacing: 1.4; margin-bottom: 8; }
.hero-title { color: #ffffff; font-size: 28; font-weight: 800; margin-bottom: 8; }
.hero-subtitle { color: #d1d5db; font-size: 13; }
.hero-stats { margin-top: 18; }
.hero-stat-card { background-color: rgba(255,255,255,0.08); border-radius: 16; padding: 14 12; }
.hero-stat-value { color: #ffffff; font-size: 20; font-weight: 800; margin-bottom: 4; }
.hero-stat-label { color: #cbd5e1; font-size: 11; font-weight: 700; }
.search-panel { background-color: #ffffff; border-radius: 18; padding: 16; margin-bottom: 14; shadow-color: #000; shadow-opacity: 0.05; shadow-radius: 8; shadow-offset: 0 2; }
.search-header { margin-bottom: 12; }
.panel-title { color: #0f172a; font-size: 16; font-weight: 800; }
.panel-copy { color: #64748b; font-size: 12; margin-top: 4; }
.search-summary-pill { background-color: #f1f5f9; border-radius: 999; padding: 8 12; vertical-align: top; }
.search-summary-text { color: #334155; font-size: 11; font-weight: 700; }
.search-input { background-color: #f8fafc; border-radius: 14; padding: 12 14; font-size: 14; color: #0f172a; }
.chips-scroll { height: 50; margin-bottom: 16; }
.chips-row { padding-right: 4; }
.chip { padding: 9 14; border-radius: 999; font-size: 12; font-weight: 700; margin-right: 8; }
.chip-active { background-color: #dc2626; color: #ffffff; }
.chip-inactive { background-color: #ffffff; color: #475569; }
.featured-card { background-color: #fff6f5; border-radius: 20; padding: 16; margin-bottom: 18; border-width: 1; border-color: #fecaca; }
.featured-grid { column-gap: 14; }
.featured-mark { width: 72; height: 72; border-radius: 18; background-color: #dc2626; justify-content: center; align-items: center; }
.featured-mark-text { color: #ffffff; font-size: 18; font-weight: 800; text-align: center; }
.featured-copy { margin-left: 12; }
.featured-kicker { color: #b91c1c; font-size: 11; font-weight: 800; margin-bottom: 6; }
.featured-title { color: #111827; font-size: 18; font-weight: 800; margin-bottom: 6; }
.featured-description { color: #475569; font-size: 13; margin-bottom: 12; }
.featured-meta { margin-bottom: 12; }
.featured-pill { background-color: #ffffff; color: #b91c1c; font-size: 11; font-weight: 700; padding: 6 10; border-radius: 999; }
.featured-footer { vertical-align: center; }
.featured-support { color: #64748b; font-size: 12; margin-right: 12; }
.featured-cta { background-color: #111827; border-radius: 999; padding: 8 12; }
.featured-cta-text { color: #ffffff; font-size: 12; font-weight: 700; text-align: center; }
.catalogue-header { margin-bottom: 12; }
.section-title { color: #111827; font-size: 17; font-weight: 800; }
.section-copy { color: #64748b; font-size: 12; margin-top: 4; }
.catalogue-chip { background-color: #ffffff; border-radius: 999; padding: 8 12; vertical-align: center; }
.catalogue-chip-text { color: #dc2626; font-size: 11; font-weight: 800; }
.empty-card { background-color: #ffffff; border-radius: 18; padding: 20; }
.empty-title { color: #111827; font-size: 18; font-weight: 800; margin-bottom: 8; }
.empty-text { color: #64748b; font-size: 13; }
.tutorial-card { background-color: #ffffff; border-radius: 18; padding: 16; margin-bottom: 12; shadow-color: #000; shadow-opacity: 0.05; shadow-radius: 8; shadow-offset: 0 2; }
.tutorial-cover { width: 74; height: 96; border-radius: 18; background-color: #1f2937; padding: 10 8; justify-content: space-between; align-items: center; }
.tutorial-cover-badge { color: #ffffff; font-size: 18; font-weight: 800; text-align: center; }
.tutorial-cover-copy { color: #fca5a5; font-size: 10; font-weight: 700; text-transform: uppercase; }
.tutorial-copy { margin-left: 14; margin-right: 12; }
.tutorial-header-row { margin-bottom: 6; }
.mini-kicker { color: #dc2626; font-size: 11; font-weight: 800; }
.rating-copy { color: #64748b; font-size: 11; font-weight: 700; text-align: right; }
.tutorial-title { color: #111827; font-size: 16; font-weight: 800; }
.tutorial-description { color: #64748b; font-size: 13; margin-top: 4; }
.card-action { background-color: #f1f5f9; border-radius: 12; padding: 10 12; vertical-align: top; }
.card-action-text { color: #0f172a; font-size: 12; font-weight: 700; text-align: center; }
.meta-row { margin-top: 12; }
.meta-pill { background-color: #f8fafc; color: #334155; font-size: 11; font-weight: 700; padding: 6 10; border-radius: 999; }
.meta-pill-accent { color: #dc2626; }
.tutorial-footer { margin-top: 14; }
.tutorial-detail { color: #475569; font-size: 12; margin-right: 12; }
.tutorial-preview { color: #111827; font-size: 12; font-weight: 700; text-align: right; }
.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 10 4 4 4; }
.nav-stack { horizontal-align: center; vertical-align: center; height: 60; }
.nav-label { font-size: 12; color: #9ca3af; font-weight: 700; text-align: center; }
.nav-item.active .nav-label { color: #dc2626; }
</style>

<template>
  <Page @loaded="onPageLoaded">
    <ActionBar :title="'Tutoriels Vidéo'" class="bg-red-600">
      <Label text="←" class="text-white text-2xl absolute left-4" @tap="goBack" />
    </ActionBar>

    <GridLayout rows="*,60" class="bg-gray-900">
      <!-- ScrollView for tutorials -->
      <ScrollView row="0" class="bg-gray-900">
        <StackLayout class="px-4 py-4">
          <!-- Search Bar -->
          <GridLayout
            rows="auto"
            columns="*,auto"
            class="bg-gray-800 rounded-lg mb-4 px-3 py-2"
            column-spacing="8"
          >
            <TextField
              col="0"
              v-model="searchQuery"
              hint="🔍 Rechercher un tutoriel..."
              class="bg-gray-800 text-white text-base"
              :hint-color="'#9ca3af'"
              @textChange="performSearch"
            />
            <Label
              col="1"
              text="🔎"
              class="text-xl text-gray-400 vertical-center"
            />
          </GridLayout>

          <!-- Category Tabs -->
          <GridLayout
            rows="auto"
            columns="*"
            class="mb-4"
            column-spacing="6"
            scroll-direction="horizontal"
          >
            <ScrollView
              orientation="horizontal"
              class="bg-gray-900"
            >
              <GridLayout
                rows="auto"
                columns="auto,auto,auto,auto,auto,auto,auto,auto"
                column-spacing="8"
                class="px-0 py-2"
              >
                <!-- All category button -->
                <GridLayout
                  col="0"
                  rows="auto"
                  columns="*"
                  class="rounded-lg px-3 py-2"
                  :class="activeCategory === 'all' ? 'bg-red-600' : 'bg-gray-800'"
                  @tap="filterByCategory('all')"
                >
                  <Label
                    text="Tous"
                    class="font-bold text-center"
                    :class="activeCategory === 'all' ? 'text-white' : 'text-gray-400'"
                  />
                </GridLayout>

                <!-- Category buttons -->
                <GridLayout
                  v-for="(index, category) in categories"
                  :key="category"
                  :col="index + 1"
                  rows="auto"
                  columns="*"
                  class="rounded-lg px-3 py-2"
                  :class="activeCategory === category ? 'bg-red-600' : 'bg-gray-800'"
                  @tap="filterByCategory(category)"
                >
                  <Label
                    :text="`${getCategoryIcon(category)} ${getCategoryShortLabel(category)}`"
                    class="font-bold text-center text-sm"
                    :class="activeCategory === category ? 'text-white' : 'text-gray-400'"
                  />
                </GridLayout>
              </GridLayout>
            </ScrollView>
          </GridLayout>

          <!-- Empty state -->
          <StackLayout v-if="filteredTutorials.length === 0" class="justify-center items-center py-20">
            <Label
              text="📺"
              class="text-6xl text-gray-500 mb-4"
            />
            <Label
              text="Aucun tutoriel trouvé"
              class="text-white text-xl font-bold text-center"
            />
            <Label
              text="Essayez une autre recherche ou catégorie"
              class="text-gray-400 text-center mt-2"
            />
          </StackLayout>

          <!-- Tutorials Grid -->
          <StackLayout v-for="(tutorial, index) in filteredTutorials" :key="index" class="mb-4">
            <!-- Tutorial Card -->
            <GridLayout
              rows="auto,auto,auto,auto"
              columns="*"
              class="bg-gray-800 rounded-lg overflow-hidden"
            >
              <!-- Thumbnail -->
              <Image
                row="0"
                :src="tutorial.thumbnail"
                class="w-full"
                stretch="aspectFill"
                height="200"
              />

              <!-- Play Button Overlay -->
              <GridLayout
                row="0"
                rows="*"
                columns="*"
                class="bg-black bg-opacity-30 items-center justify-center"
              >
                <Label
                  text="▶️"
                  class="text-6xl text-white text-center"
                />
              </GridLayout>

              <!-- Content -->
              <StackLayout row="1" class="p-3">
                <!-- Title -->
                <Label
                  :text="tutorial.title"
                  class="text-white text-lg font-bold mb-1"
                  text-wrap="true"
                />

                <!-- Category & Duration -->
                <GridLayout
                  rows="auto"
                  columns="*,auto"
                  class="mb-2"
                  column-spacing="8"
                >
                  <Label
                    col="0"
                    :text="getCategoryLabel(tutorial.category)"
                    class="text-gray-400 text-sm"
                  />
                  <Label
                    col="1"
                    :text="`⏱️ ${formatDuration(tutorial.duration)}`"
                    class="text-gray-400 text-sm"
                  />
                </GridLayout>

                <!-- Difficulty & Rating -->
                <GridLayout
                  rows="auto"
                  columns="*,auto"
                  class="mb-3"
                  column-spacing="8"
                >
                  <GridLayout
                    col="0"
                    rows="auto"
                    columns="auto,auto"
                    column-spacing="4"
                  >
                    <Label
                      col="0"
                      text="Niveau -"
                      class="text-gray-400 text-sm"
                    />
                    <Label
                      col="1"
                      :text="getDifficultyLabel(tutorial.difficulty)"
                      class="text-yellow-500 text-sm font-bold"
                    />
                  </GridLayout>
                  <GridLayout
                    col="1"
                    rows="auto"
                    columns="auto,auto"
                    column-spacing="4"
                  >
                    <Label
                      col="0"
                      text="⭐"
                      class="text-yellow-400 text-sm"
                    />
                    <Label
                      col="1"
                      :text="tutorial.rating.toFixed(1)"
                      class="text-yellow-400 text-sm font-bold"
                    />
                  </GridLayout>
                </GridLayout>

                <!-- View Count -->
                <Label
                  :text="`👁️ ${formatViews(tutorial.views)} vues`"
                  class="text-gray-500 text-xs mb-3"
                />
              </StackLayout>

              <!-- Watch Button -->
              <GridLayout
                row="2"
                rows="auto"
                columns="*"
                class="bg-red-600 p-3"
                @tap="watchTutorial(tutorial)"
              >
                <Label
                  text="▶️ Voir la Vidéo"
                  class="text-white text-center font-bold"
                />
              </GridLayout>
            </GridLayout>
          </StackLayout>

          <!-- Extra padding -->
          <StackLayout class="py-4" />
        </StackLayout>
      </ScrollView>

      <!-- Bottom navigation -->
      <GridLayout
        row="1"
        columns="*,*,*,*,*"
        class="bg-gray-800 border-t border-gray-700"
      >
        <GridLayout col="0" class="items-center justify-center" @tap="navigateTo('home')">
          <Label text="🏠" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="1" class="items-center justify-center" @tap="navigateTo('reservations')">
          <Label text="📅" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="2" class="items-center justify-center" @tap="navigateTo('tutorials')">
          <Label text="🎓" class="text-2xl text-red-600 font-bold" />
        </GridLayout>
        <GridLayout col="3" class="items-center justify-center" @tap="navigateTo('vehicles')">
          <Label text="🚗" class="text-2xl text-gray-400" />
        </GridLayout>
        <GridLayout col="4" class="items-center justify-center" @tap="navigateTo('profile')">
          <Label text="👤" class="text-2xl text-gray-400" />
        </GridLayout>
      </GridLayout>
    </GridLayout>

    <!-- Tutorial Detail Modal -->
    <GridLayout
      v-if="showDetailModal"
      class="absolute inset-0 bg-black bg-opacity-50 z-50 justify-center items-center"
      @tap="showDetailModal = false"
    >
      <StackLayout class="bg-gray-800 rounded-lg p-4 w-11/12 max-h-3/4" @tap.stop="() => {}">
        <Label
          text="Détails du Tutoriel"
          class="text-white text-lg font-bold mb-3 text-center"
        />

        <ScrollView class="mb-3">
          <StackLayout>
            <!-- Title -->
            <Label
              v-if="selectedTutorial"
              :text="selectedTutorial.title"
              class="text-white text-lg font-bold mb-2"
              text-wrap="true"
            />

            <!-- Description -->
            <Label
              v-if="selectedTutorial"
              :text="selectedTutorial.description"
              class="text-gray-300 text-sm mb-3"
              text-wrap="true"
            />

            <!-- Tools Required -->
            <Label
              v-if="selectedTutorial && selectedTutorial.tools && selectedTutorial.tools.length > 0"
              text="🔧 Outils requis:"
              class="text-white text-sm font-bold mb-2"
            />
            <Label
              v-if="selectedTutorial && selectedTutorial.tools"
              :text="selectedTutorial.tools.join(', ')"
              class="text-gray-400 text-sm mb-3"
              text-wrap="true"
            />

            <!-- Instructions -->
            <Label
              v-if="selectedTutorial"
              text="📋 Étapes:"
              class="text-white text-sm font-bold mb-2"
            />
            <StackLayout v-if="selectedTutorial" class="mb-3">
              <Label
                v-for="(instruction, idx) in selectedTutorial.instructions"
                :key="idx"
                :text="`${(idx as number) + 1}. ${instruction}`"
                class="text-gray-300 text-xs mb-1"
                text-wrap="true"
              />
            </StackLayout>
          </StackLayout>
        </ScrollView>

        <!-- Action Buttons -->
        <GridLayout
          rows="auto"
          columns="*,*"
          column-spacing="10"
        >
          <GridLayout
            col="0"
            rows="auto"
            columns="*"
            class="bg-red-600 rounded-lg p-3"
            @tap="playVideo"
          >
            <Label
              text="▶️ Lire la vidéo"
              class="text-white text-center font-bold text-sm"
            />
          </GridLayout>

          <GridLayout
            col="1"
            rows="auto"
            columns="*"
            class="bg-gray-700 rounded-lg p-3"
            @tap="showDetailModal = false"
          >
            <Label
              text="Fermer"
              class="text-gray-300 text-center font-bold text-sm"
            />
          </GridLayout>
        </GridLayout>
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { ref } from 'nativescript-vue'
import TutorialService from '@/services/TutorialService'
import {
  Tutorial,
  TutorialCategory,
  getCategoryLabel,
  getCategoryIcon,
  getDifficultyLabel,
  formatDuration,
  formatViews,
  TUTORIAL_CATEGORIES
} from '@/types/tutorial'

const tutorials = ref<Tutorial[]>([])
const filteredTutorials = ref<Tutorial[]>([])
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

const onPageLoaded = () => {
  loadTutorials()
}

const loadTutorials = async () => {
  try {
    const data = await TutorialService.getTutorials()
    tutorials.value = data
    filteredTutorials.value = data
  } catch (error) {
    console.error('Error loading tutorials:', error)
  }
}

const filterByCategory = (category: TutorialCategory | 'all') => {
  activeCategory.value = category
  applyFilters()
}

const performSearch = () => {
  applyFilters()
}

const applyFilters = () => {
  let results = tutorials.value

  // Appliquer le filtre de catégorie
  if (activeCategory.value !== 'all') {
    results = results.filter(t => t.category === activeCategory.value)
  }

  // Appliquer la recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    results = results.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    )
  }

  filteredTutorials.value = results
}

const getCategoryShortLabel = (category: TutorialCategory): string => {
  const labels: Record<TutorialCategory, string> = {
    entretien: 'Entretien',
    freins: 'Freins',
    suspension: 'Suspension',
    batterie: 'Batterie',
    diagnostic: 'Diagnostic',
    eclairage: 'Éclairage',
    fluide: 'Fluide',
    mecanique: 'Moteur'
  }
  return labels[category] || ''
}

const watchTutorial = (tutorial: Tutorial) => {
  selectedTutorial.value = tutorial
  showDetailModal.value = true
}

const playVideo = async () => {
  if (selectedTutorial.value) {
    // Incrémenter les vues
    await TutorialService.incrementViews(selectedTutorial.value.id)

    // Ouvrir la vidéo (pour la production: intégrer un lecteur vidéo)
    console.log('Playing video:', selectedTutorial.value.videoUrl)

    // Exemple: rediriger vers YouTube ou un lecteur vidéo
    // En production, vous utiliseriez un composant vidéo natif
  }
}

const navigateTo = (page: string) => {
  console.log('Navigate to:', page)
  // Implémentation navigation
}

const goBack = () => {
  console.log('Go back')
  // this.$navigator.goBack()
}
</script>

<style scoped>
.bg-red-600 {
  background-color: #dc2626;
}

.bg-gray-900 {
  background-color: #111827;
}

.bg-gray-800 {
  background-color: #1f2937;
}

.bg-gray-700 {
  background-color: #374151;
}

.text-white {
  color: #ffffff;
}

.text-gray-300 {
  color: #d1d5db;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-500 {
  color: #6b7280;
}

.text-yellow-400 {
  color: #facc15;
}

.text-yellow-500 {
  color: #eab308;
}

.bg-opacity-30 {
  opacity: 0.3;
}

.bg-opacity-50 {
  opacity: 0.5;
}

.w-11-12 {
  width: 91.666667%;
}

.max-h-3-4 {
  max-height: 75%;
}

.vertical-center {
  vertical-align: center;
}
</style>

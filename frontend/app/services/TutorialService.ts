/**
 * Tutorial Service
 * Lit les tutoriels depuis l'API backend avec fallback lecture uniquement.
 */

import {
  Tutorial,
  CreateTutorialDTO,
  UpdateTutorialDTO,
  TutorialCategory
} from '@/types/tutorial'
import { API_BASE_URL, apiRequest } from '@/utils/api'

const MOCK_TUTORIALS: Tutorial[] = [
  {
    id: '1',
    title: 'Changer Plaquettes de Frein',
    description: 'Guide complet pour remplacer les plaquettes de frein de votre vehicule',
    category: 'freins',
    difficulty: 'moyen',
    duration: 8,
    views: 15420,
    rating: 4.8,
    thumbnail: 'res://logo',
    videoUrl: 'https://example.com/videos/brake-pads',
    instructions: [
      'Levez le vehicule avec un cric',
      'Retirez les roues',
      'Accedez aux plaquettes',
      'Retirez les anciennes plaquettes',
      'Installez les nouvelles plaquettes',
      'Reinstallez les roues',
      'Testez les freins'
    ],
    tools: ['Cric', 'Cle', 'Tournevis', 'Pince'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-10')
  }
]

const TUTORIAL_READ_TIMEOUT_MS = 10000
const PUBLIC_BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')

let tutorialsRequest: Promise<Tutorial[]> | null = null

class TutorialService {
  getFallbackTutorials(): Tutorial[] {
    return MOCK_TUTORIALS.map(tutorial => this.normalize(tutorial))
  }

  async getTutorials(): Promise<Tutorial[]> {
    if (tutorialsRequest) {
      return tutorialsRequest.then(tutorials => tutorials.map(tutorial => this.normalize(tutorial)))
    }

    tutorialsRequest = (async () => {
      try {
        const data = await apiRequest<Tutorial[]>('/tutorials', {
          timeoutMs: TUTORIAL_READ_TIMEOUT_MS
        })
        return data.map(tutorial => this.normalize(tutorial))
      } catch (error) {
        console.warn('Error fetching tutorials:', error)
        return this.getFallbackTutorials()
      } finally {
        tutorialsRequest = null
      }
    })()

    return tutorialsRequest.then(tutorials => tutorials.map(tutorial => this.normalize(tutorial)))
  }

  async getTutorialById(tutorialId: string): Promise<Tutorial> {
    try {
      const tutorial = await apiRequest<Tutorial>(`/tutorials/${tutorialId}`, {
        timeoutMs: TUTORIAL_READ_TIMEOUT_MS
      })
      return this.normalize(tutorial)
    } catch (error) {
      console.warn(`Error fetching tutorial ${tutorialId}:`, error)
      const fallback = MOCK_TUTORIALS.find(t => t.id === tutorialId)
      if (fallback) {
        return this.normalize(fallback)
      }
      throw error
    }
  }

  async getTutorialsByCategory(category: TutorialCategory): Promise<Tutorial[]> {
    try {
      const tutorials = await apiRequest<Tutorial[]>(`/tutorials/category/${category}`, {
        timeoutMs: TUTORIAL_READ_TIMEOUT_MS
      })
      return tutorials.map(tutorial => this.normalize(tutorial))
    } catch (error) {
      console.warn(`Error fetching tutorials for category ${category}:`, error)
      return MOCK_TUTORIALS.filter(t => t.category === category).map(tutorial => this.normalize(tutorial))
    }
  }

  async searchTutorials(query: string): Promise<Tutorial[]> {
    try {
      const results = await apiRequest<Tutorial[]>(`/tutorials/search?q=${encodeURIComponent(query)}`, {
        timeoutMs: TUTORIAL_READ_TIMEOUT_MS
      })
      return results.map(tutorial => this.normalize(tutorial))
    } catch (error) {
      console.warn('Error searching tutorials:', error)
      const lowerQuery = query.toLowerCase()
      return MOCK_TUTORIALS
        .filter(tutorial =>
          tutorial.title.toLowerCase().includes(lowerQuery) ||
          tutorial.description.toLowerCase().includes(lowerQuery)
        )
        .map(tutorial => this.normalize(tutorial))
    }
  }

  async createTutorial(data: CreateTutorialDTO): Promise<Tutorial> {
    const created = await apiRequest<Tutorial>('/tutorials', {
      method: 'POST',
      body: data
    })
    return this.normalize(created)
  }

  async updateTutorial(tutorialId: string, data: UpdateTutorialDTO): Promise<Tutorial> {
    const updated = await apiRequest<Tutorial>(`/tutorials/${tutorialId}`, {
      method: 'PUT',
      body: data
    })
    return this.normalize(updated)
  }

  async deleteTutorial(tutorialId: string): Promise<void> {
    await apiRequest<void>(`/tutorials/${tutorialId}`, { method: 'DELETE' })
  }

  async getPopularTutorials(limit: number = 5): Promise<Tutorial[]> {
    try {
      const data = await apiRequest<Tutorial[]>(`/tutorials/popular?limit=${limit}`, {
        timeoutMs: TUTORIAL_READ_TIMEOUT_MS
      })
      return data.map(tutorial => this.normalize(tutorial))
    } catch (error) {
      console.warn('Error fetching popular tutorials:', error)
      const sorted = [...MOCK_TUTORIALS].sort((a, b) => b.views - a.views)
      return sorted.slice(0, limit).map(tutorial => this.normalize(tutorial))
    }
  }

  async getTopRatedTutorials(limit: number = 5): Promise<Tutorial[]> {
    try {
      const data = await apiRequest<Tutorial[]>(`/tutorials/top-rated?limit=${limit}`, {
        timeoutMs: TUTORIAL_READ_TIMEOUT_MS
      })
      return data.map(tutorial => this.normalize(tutorial))
    } catch (error) {
      console.warn('Error fetching top rated tutorials:', error)
      const sorted = [...MOCK_TUTORIALS].sort((a, b) => b.rating - a.rating)
      return sorted.slice(0, limit).map(tutorial => this.normalize(tutorial))
    }
  }

  async incrementViews(tutorialId: string): Promise<void> {
    try {
      await apiRequest<void>(`/tutorials/${tutorialId}/views`, { method: 'POST' })
    } catch (error) {
      console.error(`Error incrementing views for tutorial ${tutorialId}:`, error)
    }
  }

  async rateTutorial(tutorialId: string, rating: number): Promise<Tutorial> {
    const updated = await apiRequest<Tutorial>(`/tutorials/${tutorialId}/rate`, {
      method: 'POST',
      body: { rating }
    })
    return this.normalize(updated)
  }

  private normalizeMediaUrl(value: string): string {
    const normalized = typeof value === 'string' ? value.trim() : ''

    if (!normalized) {
      return normalized
    }

    if (/^https?:\/\//i.test(normalized)) {
      return normalized
    }

    if (normalized.startsWith('/')) {
      return `${PUBLIC_BACKEND_BASE_URL}${normalized}`
    }

    return `${PUBLIC_BACKEND_BASE_URL}/${normalized.replace(/^\/+/, '')}`
  }

  private normalize(tutorial: Tutorial): Tutorial {
    return {
      ...tutorial,
      videoUrl: this.normalizeMediaUrl(tutorial.videoUrl),
      createdAt: new Date(tutorial.createdAt),
      updatedAt: new Date(tutorial.updatedAt)
    }
  }
}

export default new TutorialService()

/**
 * Tutorial Service
 * Branche le front sur l'API backend avec fallback sur les mocks.
 */

import {
  Tutorial,
  CreateTutorialDTO,
  UpdateTutorialDTO,
  TutorialCategory
} from '@/types/tutorial'
import { apiRequest } from '@/utils/api'

// Mock data conservée en secours
const MOCK_TUTORIALS: Tutorial[] = [
  {
    id: '1',
    title: 'Changer Plaquettes de Frein',
    description: 'Guide complet pour remplacer les plaquettes de frein de votre véhicule',
    category: 'freins',
    difficulty: 'moyen',
    duration: 8,
    views: 15420,
    rating: 4.8,
    thumbnail: 'res://logo',
    videoUrl: 'https://example.com/videos/brake-pads',
    instructions: [
      'Levez le véhicule avec un cric',
      'Retirez les roues',
      'Accédez aux plaquettes',
      'Retirez les anciennes plaquettes',
      'Installez les nouvelles plaquettes',
      'Réinstallez les roues',
      'Testez les freins'
    ],
    tools: ['Cric', 'Clé', 'Tournevis', 'Pince'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-10')
  }
]

class TutorialService {
  getFallbackTutorials(): Tutorial[] {
    return MOCK_TUTORIALS.map(tutorial => this.normalize(tutorial))
  }

  async getTutorials(): Promise<Tutorial[]> {
    try {
      const data = await apiRequest<Tutorial[]>('/tutorials')
      return data.map(this.normalize)
    } catch (error) {
      console.error('Error fetching tutorials:', error)
      return this.getFallbackTutorials()
    }
  }

  async getTutorialById(tutorialId: string): Promise<Tutorial> {
    try {
      const tutorial = await apiRequest<Tutorial>(`/tutorials/${tutorialId}`)
      return this.normalize(tutorial)
    } catch (error) {
      console.error(`Error fetching tutorial ${tutorialId}:`, error)
      const fallback = MOCK_TUTORIALS.find(t => t.id === tutorialId)
      if (fallback) return fallback
      throw error
    }
  }

  async getTutorialsByCategory(category: TutorialCategory): Promise<Tutorial[]> {
    try {
      const tutorials = await apiRequest<Tutorial[]>(`/tutorials/category/${category}`)
      return tutorials.map(this.normalize)
    } catch (error) {
      console.error(`Error fetching tutorials for category ${category}:`, error)
      return MOCK_TUTORIALS.filter(t => t.category === category)
    }
  }

  async searchTutorials(query: string): Promise<Tutorial[]> {
    try {
      const results = await apiRequest<Tutorial[]>(`/tutorials/search?q=${encodeURIComponent(query)}`)
      return results.map(this.normalize)
    } catch (error) {
      console.error('Error searching tutorials:', error)
      const lowerQuery = query.toLowerCase()
      return MOCK_TUTORIALS.filter(t =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
      )
    }
  }

  async createTutorial(data: CreateTutorialDTO): Promise<Tutorial> {
    try {
      const created = await apiRequest<Tutorial>('/tutorials', {
        method: 'POST',
        body: data
      })
      return this.normalize(created)
    } catch (error) {
      console.error('Error creating tutorial:', error)
      const newTutorial: Tutorial = {
        id: (MOCK_TUTORIALS.length + 1).toString(),
        ...data,
        views: 0,
        rating: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      MOCK_TUTORIALS.push(newTutorial)
      return newTutorial
    }
  }

  async updateTutorial(tutorialId: string, data: UpdateTutorialDTO): Promise<Tutorial> {
    try {
      const updated = await apiRequest<Tutorial>(`/tutorials/${tutorialId}`, {
        method: 'PUT',
        body: data
      })
      return this.normalize(updated)
    } catch (error) {
      console.error(`Error updating tutorial ${tutorialId}:`, error)
      const idx = MOCK_TUTORIALS.findIndex(t => t.id === tutorialId)
      if (idx > -1) {
        MOCK_TUTORIALS[idx] = { ...MOCK_TUTORIALS[idx], ...data, id: tutorialId, updatedAt: new Date() }
        return MOCK_TUTORIALS[idx]
      }
      throw error
    }
  }

  async deleteTutorial(tutorialId: string): Promise<void> {
    try {
      await apiRequest<void>(`/tutorials/${tutorialId}`, { method: 'DELETE' })
    } catch (error) {
      console.error(`Error deleting tutorial ${tutorialId}:`, error)
      const idx = MOCK_TUTORIALS.findIndex(t => t.id === tutorialId)
      if (idx > -1) {
        MOCK_TUTORIALS.splice(idx, 1)
        return
      }
      throw error
    }
  }

  async getPopularTutorials(limit: number = 5): Promise<Tutorial[]> {
    try {
      const data = await apiRequest<Tutorial[]>(`/tutorials/popular?limit=${limit}`)
      return data.map(this.normalize)
    } catch (error) {
      console.error('Error fetching popular tutorials:', error)
      const sorted = [...MOCK_TUTORIALS].sort((a, b) => b.views - a.views)
      return sorted.slice(0, limit)
    }
  }

  async getTopRatedTutorials(limit: number = 5): Promise<Tutorial[]> {
    try {
      const data = await apiRequest<Tutorial[]>(`/tutorials/top-rated?limit=${limit}`)
      return data.map(this.normalize)
    } catch (error) {
      console.error('Error fetching top rated tutorials:', error)
      const sorted = [...MOCK_TUTORIALS].sort((a, b) => b.rating - a.rating)
      return sorted.slice(0, limit)
    }
  }

  async incrementViews(tutorialId: string): Promise<void> {
    try {
      await apiRequest<void>(`/tutorials/${tutorialId}/views`, { method: 'POST' })
    } catch (error) {
      console.error(`Error incrementing views for tutorial ${tutorialId}:`, error)
      const tutorial = MOCK_TUTORIALS.find(t => t.id === tutorialId)
      if (tutorial) tutorial.views += 1
    }
  }

  async rateTutorial(tutorialId: string, rating: number): Promise<Tutorial> {
    try {
      const updated = await apiRequest<Tutorial>(`/tutorials/${tutorialId}/rate`, {
        method: 'POST',
        body: { rating }
      })
      return this.normalize(updated)
    } catch (error) {
      console.error(`Error rating tutorial ${tutorialId}:`, error)
      const tutorial = MOCK_TUTORIALS.find(t => t.id === tutorialId)
      if (!tutorial) throw error
      tutorial.rating = Math.min(5, Math.max(0, rating))
      return tutorial
    }
  }

  private normalize(tutorial: Tutorial): Tutorial {
    return {
      ...tutorial,
      createdAt: new Date(tutorial.createdAt),
      updatedAt: new Date(tutorial.updatedAt)
    }
  }
}

export default new TutorialService()

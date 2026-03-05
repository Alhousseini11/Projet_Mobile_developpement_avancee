/**
 * Tutorial Service
 * Gère tous les appels API pour les tutoriels vidéo
 */

import {
  Tutorial,
  CreateTutorialDTO,
  UpdateTutorialDTO,
  TutorialCategory
} from '@/types/tutorial'

// Mock API responses for development
const MOCK_TUTORIALS: Tutorial[] = [
  // Freins
  {
    id: '1',
    title: 'Changer Plaquettes de Frein',
    description: 'Guide complet pour remplacer les plaquettes de frein de votre véhicule',
    category: 'freins',
    difficulty: 'moyen',
    duration: 8,
    views: 15420,
    rating: 4.8,
    thumbnail: 'https://via.placeholder.com/300x200?text=Plaquettes+Frein',
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
  },
  // Batterie
  {
    id: '2',
    title: 'Remplacer la Batterie',
    description: 'Tutoriel pour changer la batterie de votre voiture en toute sécurité',
    category: 'batterie',
    difficulty: 'facile',
    duration: 6,
    views: 28500,
    rating: 4.9,
    thumbnail: 'https://via.placeholder.com/300x200?text=Batterie+Auto',
    videoUrl: 'https://example.com/videos/battery-replace',
    instructions: [
      'Arrêtez le moteur',
      'Débranchez la borne négative',
      'Débranchez la borne positive',
      'Retirez la batterie',
      'Installez la nouvelle batterie',
      'Reconnectez les bornes',
      'Vérifiez le fonctionnement'
    ],
    tools: ['Clé', 'Tournevis', 'Gants'],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-02-12')
  },
  // Mécanique (Moteur)
  {
    id: '3',
    title: 'Vidange Moteur - Guide Complet',
    description: 'Apprenez à faire votre vidange moteur comme un professionnel',
    category: 'mecanique',
    difficulty: 'moyen',
    duration: 12,
    views: 42300,
    rating: 4.7,
    thumbnail: 'https://via.placeholder.com/300x200?text=Vidange+Moteur',
    videoUrl: 'https://example.com/videos/oil-change',
    instructions: [
      'Chauffez le moteur',
      'Levez le véhicule',
      'Localisez le bouchon de vidange',
      'Vidangez l\'huile usagée',
      'Remplacez le filtre à huile',
      'Versez la nouvelle huile',
      'Vérifiez le niveau',
      'Démarrez et testez'
    ],
    tools: ['Cric', 'Récipient', 'Clé', 'Filtre à huile', 'Huile moteur'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15')
  },
  // Suspension
  {
    id: '4',
    title: 'Amortisseurs - Diagnostic et Remplacement',
    description: 'Comment diagnostiquer et remplacer vos amortisseurs',
    category: 'suspension',
    difficulty: 'difficile',
    duration: 15,
    views: 9850,
    rating: 4.6,
    thumbnail: 'https://via.placeholder.com/300x200?text=Amortisseurs',
    videoUrl: 'https://example.com/videos/shock-absorbers',
    instructions: [
      'Inspectez les fuites d\'huile',
      'Testez la suspension',
      'Levez le véhicule',
      'Retirez la roue',
      'Déboulonnez l\'amortisseur',
      'Retirez l\'ancien amortisseur',
      'Installez le nouvel amortisseur',
      'Serrez les boulons',
      'Alignez les roues'
    ],
    tools: ['Cric', 'Clés', 'Compresseur de ressort'],
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-02-11')
  },
  // Éclairage
  {
    id: '5',
    title: 'Changer Ampoules - Phares et Feux',
    description: 'Guide pour remplacer les ampoules de votre véhicule',
    category: 'eclairage',
    difficulty: 'facile',
    duration: 5,
    views: 35200,
    rating: 4.9,
    thumbnail: 'https://via.placeholder.com/300x200?text=Eclairage',
    videoUrl: 'https://example.com/videos/bulb-replacement',
    instructions: [
      'Éteignez les phares',
      'Ouvrez le capot',
      'Localisez l\'ampoule défaillante',
      'Retirez le connecteur',
      'Retirez l\'ampoule',
      'Installez la nouvelle ampoule',
      'Testez les feux'
    ],
    tools: ['Tournevis', 'Ampoules de rechange'],
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-14')
  },
  // Entretien
  {
    id: '6',
    title: 'Entretien de Base - Check-list Mensuelle',
    description: 'Les vérifications essentielles à faire chaque mois',
    category: 'entretien',
    difficulty: 'facile',
    duration: 10,
    views: 18900,
    rating: 4.8,
    thumbnail: 'https://via.placeholder.com/300x200?text=Entretien+Base',
    videoUrl: 'https://example.com/videos/basic-maintenance',
    instructions: [
      'Vérifiez la pression des pneus',
      'Inspectez l\'usure des pneus',
      'Vérifiez le niveau d\'huile',
      'Vérifiez le niveau de coolant',
      'Vérifiez le liquide de frein',
      'Testez les feux',
      'Inspectez les essuie-glaces',
      'Nettoyez les vitres'
    ],
    tools: ['Manomètre', 'Tournevis'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-02-13')
  },
  // Fluides
  {
    id: '7',
    title: 'Changement Liquide Refroidissement',
    description: 'Comment vider et remplir le circuit de refroidissement',
    category: 'fluide',
    difficulty: 'moyen',
    duration: 14,
    views: 12400,
    rating: 4.7,
    thumbnail: 'https://via.placeholder.com/300x200?text=Liquide+Refroid',
    videoUrl: 'https://example.com/videos/coolant-change',
    instructions: [
      'Attendez que le moteur refroidisse',
      'Localisez le bouchon de remplissage',
      'Placez un bac de récupération',
      'Ouvrez le bouchon de vidange',
      'Vidangez le liquide usagé',
      'Refermez le bouchon de vidange',
      'Versez le nouveau liquide',
      'Purgez l\'air du système',
      'Vérifiez le niveau'
    ],
    tools: ['Bac de récupération', 'Tournevis', 'Liquide de refroidissement'],
    createdAt: new Date('2024-02-03'),
    updatedAt: new Date('2024-02-16')
  },
  // Diagnostic
  {
    id: '8',
    title: 'Diagnostic Moteur - Lire les Codes d\'Erreur',
    description: 'Utilisez un outil de diagnostic pour identifier les problèmes',
    category: 'diagnostic',
    difficulty: 'difficile',
    duration: 11,
    views: 7600,
    rating: 4.5,
    thumbnail: 'https://via.placeholder.com/300x200?text=Diagnostic',
    videoUrl: 'https://example.com/videos/engine-diagnostic',
    instructions: [
      'Connectez l\'outil de diagnostic',
      'Accédez au menu diagnostic',
      'Lisez les codes d\'erreur',
      'Interprétez les codes',
      'Effectuez des tests',
      'Effacez les codes',
      'Vérifiez les résultats'
    ],
    tools: ['Outil de diagnostic OBD-II', 'Ordinateur portable'],
    createdAt: new Date('2024-01-30'),
    updatedAt: new Date('2024-02-12')
  }
]

class TutorialService {
  private apiBaseUrl = 'http://localhost:3000/api'

  /**
   * Récupère tous les tutoriels
   */
  async getTutorials(): Promise<Tutorial[]> {
    try {
      // API Call serait ici:
      // const response = await fetch(`${this.apiBaseUrl}/tutorials`, {
      //   headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      // })
      // return await response.json()

      // Mock data for now
      return Promise.resolve(MOCK_TUTORIALS)
    } catch (error) {
      console.error('Error fetching tutorials:', error)
      throw error
    }
  }

  /**
   * Récupère un tutoriel par ID
   */
  async getTutorialById(tutorialId: string): Promise<Tutorial> {
    try {
      const tutorial = MOCK_TUTORIALS.find(t => t.id === tutorialId)
      if (!tutorial) {
        throw new Error(`Tutorial ${tutorialId} not found`)
      }
      return Promise.resolve(tutorial)
    } catch (error) {
      console.error(`Error fetching tutorial ${tutorialId}:`, error)
      throw error
    }
  }

  /**
   * Récupère les tutoriels par catégorie
   */
  async getTutorialsByCategory(category: TutorialCategory): Promise<Tutorial[]> {
    try {
      const tutorials = MOCK_TUTORIALS.filter(t => t.category === category)
      return Promise.resolve(tutorials)
    } catch (error) {
      console.error(`Error fetching tutorials for category ${category}:`, error)
      throw error
    }
  }

  /**
   * Recherche des tutoriels
   */
  async searchTutorials(query: string): Promise<Tutorial[]> {
    try {
      const lowerQuery = query.toLowerCase()
      const results = MOCK_TUTORIALS.filter(t =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
      )
      return Promise.resolve(results)
    } catch (error) {
      console.error('Error searching tutorials:', error)
      throw error
    }
  }

  /**
   * Crée un nouveau tutoriel
   */
  async createTutorial(data: CreateTutorialDTO): Promise<Tutorial> {
    try {
      const newTutorial: Tutorial = {
        id: (MOCK_TUTORIALS.length + 1).toString(),
        ...data,
        views: 0,
        rating: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      MOCK_TUTORIALS.push(newTutorial)
      return Promise.resolve(newTutorial)
    } catch (error) {
      console.error('Error creating tutorial:', error)
      throw error
    }
  }

  /**
   * Met à jour un tutoriel
   */
  async updateTutorial(tutorialId: string, data: UpdateTutorialDTO): Promise<Tutorial> {
    try {
      const tutorialIndex = MOCK_TUTORIALS.findIndex(t => t.id === tutorialId)
      if (tutorialIndex === -1) {
        throw new Error(`Tutorial ${tutorialId} not found`)
      }

      MOCK_TUTORIALS[tutorialIndex] = {
        ...MOCK_TUTORIALS[tutorialIndex],
        ...data,
        id: tutorialId,
        updatedAt: new Date()
      }

      return Promise.resolve(MOCK_TUTORIALS[tutorialIndex])
    } catch (error) {
      console.error(`Error updating tutorial ${tutorialId}:`, error)
      throw error
    }
  }

  /**
   * Supprime un tutoriel
   */
  async deleteTutorial(tutorialId: string): Promise<void> {
    try {
      const tutorialIndex = MOCK_TUTORIALS.findIndex(t => t.id === tutorialId)
      if (tutorialIndex === -1) {
        throw new Error(`Tutorial ${tutorialId} not found`)
      }

      MOCK_TUTORIALS.splice(tutorialIndex, 1)
      return Promise.resolve()
    } catch (error) {
      console.error(`Error deleting tutorial ${tutorialId}:`, error)
      throw error
    }
  }

  /**
   * Récupère les tutoriels populaires
   */
  async getPopularTutorials(limit: number = 5): Promise<Tutorial[]> {
    try {
      const sorted = [...MOCK_TUTORIALS].sort((a, b) => b.views - a.views)
      return Promise.resolve(sorted.slice(0, limit))
    } catch (error) {
      console.error('Error fetching popular tutorials:', error)
      throw error
    }
  }

  /**
   * Récupère les tutoriels les mieux notés
   */
  async getTopRatedTutorials(limit: number = 5): Promise<Tutorial[]> {
    try {
      const sorted = [...MOCK_TUTORIALS].sort((a, b) => b.rating - a.rating)
      return Promise.resolve(sorted.slice(0, limit))
    } catch (error) {
      console.error('Error fetching top rated tutorials:', error)
      throw error
    }
  }

  /**
   * Incrémente le nombre de vues
   */
  async incrementViews(tutorialId: string): Promise<void> {
    try {
      const tutorial = MOCK_TUTORIALS.find(t => t.id === tutorialId)
      if (tutorial) {
        tutorial.views += 1
      }
      return Promise.resolve()
    } catch (error) {
      console.error(`Error incrementing views for tutorial ${tutorialId}:`, error)
      throw error
    }
  }

  /**
   * Ajoute une évaluation
   */
  async rateTutorial(tutorialId: string, rating: number): Promise<Tutorial> {
    try {
      const tutorial = MOCK_TUTORIALS.find(t => t.id === tutorialId)
      if (!tutorial) {
        throw new Error(`Tutorial ${tutorialId} not found`)
      }
      // Simulation: mise à jour simple de la note moyenne
      tutorial.rating = Math.min(5, Math.max(0, rating))
      return Promise.resolve(tutorial)
    } catch (error) {
      console.error(`Error rating tutorial ${tutorialId}:`, error)
      throw error
    }
  }

  private getAuthToken(): string {
    // Récupère le token d'authentification
    return 'mock-token'
  }
}

export default new TutorialService()

/**
 * Tutorial Types & Interfaces
 * Définitions TypeScript pour la gestion des tutoriels vidéo
 */

export type TutorialCategory = 
  | 'entretien'
  | 'freins'
  | 'suspension'
  | 'batterie'
  | 'diagnostic'
  | 'eclairage'
  | 'fluide'
  | 'mecanique'

export type DifficultLevel = 'facile' | 'moyen' | 'difficile'

/**
 * Interface pour un tutoriel vidéo
 */
export interface Tutorial {
  id: string
  title: string
  description: string
  category: TutorialCategory
  difficulty: DifficultLevel
  duration: number // en minutes
  views: number
  rating: number // 0-5
  thumbnail: string // URL de l'image
  videoUrl: string // URL de la vidéo
  instructions: string[]
  tools?: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO pour créer un tutoriel
 */
export interface CreateTutorialDTO {
  title: string
  description: string
  category: TutorialCategory
  difficulty: DifficultLevel
  duration: number
  thumbnail: string
  videoUrl: string
  instructions: string[]
  tools?: string[]
}

/**
 * DTO pour mettre à jour un tutoriel
 */
export interface UpdateTutorialDTO extends Partial<CreateTutorialDTO> {}

/**
 * Interface pour les statistiques d'une catégorie
 */
export interface CategoryStats {
  category: TutorialCategory
  count: number
  icon: string
  label: string
}

/**
 * Énumération des catégories avec labels et icônes
 */
export const TUTORIAL_CATEGORIES: Record<TutorialCategory, { label: string; icon: string }> = {
  entretien: { label: '🔧 Entretien', icon: '🔧' },
  freins: { label: '🛑 Freins', icon: '🛑' },
  suspension: { label: '🚗 Suspension', icon: '🚗' },
  batterie: { label: '🔋 Batterie', icon: '🔋' },
  diagnostic: { label: '📊 Diagnostic', icon: '📊' },
  eclairage: { label: '💡 Éclairage', icon: '💡' },
  fluide: { label: '🧴 Fluides', icon: '🧴' },
  mecanique: { label: '⚙️ Mécanique', icon: '⚙️' }
}

/**
 * Énumération des niveaux de difficulté
 */
export const DIFFICULTY_LEVELS: Record<DifficultLevel, { label: string; color: string }> = {
  facile: { label: 'Facile', color: '#10b981' },
  moyen: { label: 'Moyen', color: '#f59e0b' },
  difficile: { label: 'Difficile', color: '#ef4444' }
}

/**
 * Fonction pour obtenir le label d'une catégorie
 */
export function getCategoryLabel(category: TutorialCategory): string {
  return TUTORIAL_CATEGORIES[category]?.label || 'Catégorie inconnue'
}

/**
 * Fonction pour obtenir l'icône d'une catégorie
 */
export function getCategoryIcon(category: TutorialCategory): string {
  return TUTORIAL_CATEGORIES[category]?.icon || '🎥'
}

/**
 * Fonction pour obtenir le label d'un niveau
 */
export function getDifficultyLabel(difficulty: DifficultLevel): string {
  return DIFFICULTY_LEVELS[difficulty]?.label || 'Inconnu'
}

/**
 * Fonction pour obtenir la couleur d'un niveau
 */
export function getDifficultyColor(difficulty: DifficultLevel): string {
  return DIFFICULTY_LEVELS[difficulty]?.color || '#6b7280'
}

/**
 * Fonction pour formater la durée
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

/**
 * Fonction pour formater le nombre de vues
 */
export function formatViews(views: number): string {
  if (views < 1000) return views.toString()
  if (views < 1000000) return `${(views / 1000).toFixed(1)}K`
  return `${(views / 1000000).toFixed(1)}M`
}

/**
 * Type guard pour vérifier si c'est un Tutorial
 */
export function isTutorial(value: any): value is Tutorial {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.category === 'string' &&
    typeof value.difficulty === 'string'
  )
}

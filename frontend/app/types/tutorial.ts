export type TutorialCategory =
  | 'entretien'
  | 'freins'
  | 'suspension'
  | 'batterie'
  | 'diagnostic'
  | 'eclairage'
  | 'fluide'
  | 'mecanique'

export type TutorialDifficulty = 'facile' | 'moyen' | 'difficile'

export interface Tutorial {
  id: string
  title: string
  description: string
  category: TutorialCategory
  difficulty: TutorialDifficulty
  duration: number
  views: number
  rating: number
  thumbnail?: string
  videoUrl: string
  instructions: string[]
  tools: string[]
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CreateTutorialDTO {
  title: string
  description: string
  category: TutorialCategory
  difficulty: TutorialDifficulty
  duration: number
  thumbnail?: string
  videoUrl: string
  instructions: string[]
  tools: string[]
}

export type UpdateTutorialDTO = Partial<CreateTutorialDTO>

export function formatDuration(durationMinutes: number): string {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return '0m'
  }

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

export function formatViews(views: number): string {
  if (!Number.isFinite(views) || views <= 0) {
    return '0'
  }

  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }

  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  }

  return String(Math.round(views))
}

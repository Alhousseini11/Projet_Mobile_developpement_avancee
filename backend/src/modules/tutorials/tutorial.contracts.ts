export type TutorialCategory =
  | 'entretien'
  | 'freins'
  | 'suspension'
  | 'batterie'
  | 'diagnostic'
  | 'eclairage'
  | 'fluide'
  | 'mecanique';

export type TutorialDifficulty = 'facile' | 'moyen' | 'difficile';

export interface TutorialContract {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: TutorialDifficulty;
  duration: number;
  views: number;
  rating: number;
  thumbnail: string;
  videoUrl: string;
  instructions: string[];
  tools?: string[];
  createdAt: Date;
  updatedAt: Date;
}

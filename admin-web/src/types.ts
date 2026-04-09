export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'CLIENT' | 'ADMIN' | 'MECHANIC';
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type ViewKey =
  | 'dashboard'
  | 'services'
  | 'tutorials'
  | 'users'
  | 'reservations'
  | 'reviews';

export type AdminSummary = {
  metrics: {
    totalUsers: number;
    totalReservations: number;
    upcomingReservations: number;
    pendingReservations: number;
    totalReviews: number;
    activeServices: number;
  };
  recentReservations: Array<{
    id: string;
    serviceLabel: string;
    customerName: string;
    customerEmail: string;
    status: string;
    scheduledAt: string;
    amount: number;
    currency: string;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    serviceLabel: string;
    customerName: string;
    createdAt: string;
  }>;
};

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  vehicleCount: number;
  reservationCount: number;
  reviewCount: number;
  createdAt: string;
};

export type AdminReservation = {
  id: string;
  serviceId: string;
  serviceLabel: string;
  customerName: string;
  customerEmail: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  currency: string;
  notes: string | null;
};

export type AdminService = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  slotTimes: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TutorialItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  views: number;
  rating: number;
  thumbnail: string;
  videoUrl: string;
  instructions: string[];
  tools: string[];
  createdAt: string;
  updatedAt: string;
};

export type ApiErrorPayload = {
  message?: string;
};

export type DashboardData = {
  summary: AdminSummary;
  users: AdminUser[];
  reservations: AdminReservation[];
  services: AdminService[];
  tutorials: TutorialItem[];
};

export interface AuthUser {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string | null
  loginAt: string
  user: AuthUser
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
}

export interface RegisterCredentials {
  fullName: string
  email: string
  phone: string
  password: string
  rememberMe: boolean
}

export interface ForgotPasswordResponse {
  message: string
  resetToken?: string
  resetCode?: string
  expiresAt?: string
}

export interface ResetPasswordPayload {
  token?: string
  email?: string
  code?: string
  newPassword: string
  rememberMe: boolean
}

export interface AuthState {
  initialized: boolean
  isAuthenticated: boolean
  session: AuthSession | null
}

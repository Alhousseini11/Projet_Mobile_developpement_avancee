/**
 * Shared Types for Vehicles Module
 */

/**
 * Vehicle entity representing a user's car
 */
export interface Vehicle {
  id: string
  userId: string
  name: string
  model: string
  year: number
  mileage: number
  type: VehicleType
  licensePlate?: string
  fuelType?: FuelType
  vin?: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Vehicle types enum
 */
export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRUCK = 'truck',
  MINIVAN = 'minivan',
  COUPE = 'coupe',
  OTHER = 'other'
}

/**
 * Fuel types enum
 */
export enum FuelType {
  PETROL = 'Essence',
  DIESEL = 'Diesel',
  HYBRID = 'Hybride',
  ELECTRIC = 'Électrique',
  LPG = 'GPL',
  BIOETHANOL = 'Bioéthanol'
}

/**
 * DTO for creating a vehicle
 */
export interface CreateVehicleDTO {
  name: string
  model: string
  year: number
  mileage: number
  type: VehicleType
  licensePlate?: string
  fuelType?: FuelType
  vin?: string
  color?: string
}

/**
 * DTO for updating a vehicle
 */
export interface UpdateVehicleDTO extends Partial<CreateVehicleDTO> {}

/**
 * Maintenance record for a vehicle
 */
export interface MaintenanceRecord {
  id: string
  vehicleId: string
  type: MaintenanceType
  description: string
  mileage: number
  cost: number
  date: Date
  notes?: string
  nextMaintenanceKm?: number
  nextMaintenanceDate?: Date
  attachments?: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Maintenance types enum
 */
export enum MaintenanceType {
  OIL_CHANGE = 'oil_change',
  TIRE_ROTATION = 'tire_rotation',
  BRAKE_SERVICE = 'brake_service',
  BATTERY_REPLACEMENT = 'battery_replacement',
  FILTER_CHANGE = 'filter_change',
  INSPECTION = 'inspection',
  REPAIR = 'repair',
  OTHER = 'other'
}

/**
 * Document for a vehicle
 */
export interface VehicleDocument {
  id: string
  vehicleId: string
  type: DocumentType
  title: string
  fileUrl: string
  expiryDate?: Date
  uploadedAt: Date
  updatedAt: Date
}

/**
 * Document types enum
 */
export enum DocumentType {
  REGISTRATION = 'registration',
  INSURANCE = 'insurance',
  MOT = 'mot',
  SERVICE_HISTORY = 'service_history',
  WARRANTY = 'warranty',
  INSPECTION = 'inspection',
  OTHER = 'other'
}

/**
 * Insurance information for a vehicle
 */
export interface VehicleInsurance {
  id: string
  vehicleId: string
  provider: string
  policyNumber: string
  startDate: Date
  endDate: Date
  coverage: string
  phoneNumber?: string
  documentUrl?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

/**
 * API Error
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

/**
 * List filter and sort options
 */
export interface ListOptions {
  page?: number
  limit?: number
  sort?: string
  search?: string
  filters?: Record<string, any>
}

/**
 * Vehicle statistics
 */
export interface VehicleStats {
  totalVehicles: number
  averageMileage: number
  totalMaintenanceCost: number
  maintenanceCount: number
  lastMaintenanceDate?: Date
}

/**
 * Form validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Type guards
 */
export function isVehicle(obj: unknown): obj is Vehicle {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'model' in obj &&
    'year' in obj &&
    'mileage' in obj &&
    'type' in obj
  )
}

export function isMaintenanceRecord(obj: unknown): obj is MaintenanceRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'vehicleId' in obj &&
    'type' in obj &&
    'description' in obj
  )
}

export function isVehicleDocument(obj: unknown): obj is VehicleDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'vehicleId' in obj &&
    'type' in obj &&
    'title' in obj
  )
}

/**
 * Constants
 */
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  [VehicleType.SEDAN]: 'Berline',
  [VehicleType.SUV]: 'SUV',
  [VehicleType.TRUCK]: 'Camion',
  [VehicleType.MINIVAN]: 'Monospace',
  [VehicleType.COUPE]: 'Coupé',
  [VehicleType.OTHER]: 'Autre'
}

export const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  [VehicleType.SEDAN]: '🚗',
  [VehicleType.SUV]: '🏎️',
  [VehicleType.TRUCK]: '🚚',
  [VehicleType.MINIVAN]: '🚐',
  [VehicleType.COUPE]: '🏍️',
  [VehicleType.OTHER]: '🚙'
}

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  [FuelType.PETROL]: 'Essence',
  [FuelType.DIESEL]: 'Diesel',
  [FuelType.HYBRID]: 'Hybride',
  [FuelType.ELECTRIC]: 'Électrique',
  [FuelType.LPG]: 'GPL',
  [FuelType.BIOETHANOL]: 'Bioéthanol'
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  [MaintenanceType.OIL_CHANGE]: 'Changement d\'huile',
  [MaintenanceType.TIRE_ROTATION]: 'Rotation des pneus',
  [MaintenanceType.BRAKE_SERVICE]: 'Service des freins',
  [MaintenanceType.BATTERY_REPLACEMENT]: 'Remplacement batterie',
  [MaintenanceType.FILTER_CHANGE]: 'Changement filtre',
  [MaintenanceType.INSPECTION]: 'Inspection',
  [MaintenanceType.REPAIR]: 'Réparation',
  [MaintenanceType.OTHER]: 'Autre'
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.REGISTRATION]: 'Immatriculation',
  [DocumentType.INSURANCE]: 'Assurance',
  [DocumentType.MOT]: 'Contrôle technique',
  [DocumentType.SERVICE_HISTORY]: 'Historique service',
  [DocumentType.WARRANTY]: 'Garantie',
  [DocumentType.INSPECTION]: 'Inspection',
  [DocumentType.OTHER]: 'Autre'
}

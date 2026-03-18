export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRUCK = 'truck',
  MINIVAN = 'minivan',
  COUPE = 'coupe',
  OTHER = 'other'
}

export enum FuelType {
  PETROL = 'Essence',
  DIESEL = 'Diesel',
  ELECTRIC = 'Electrique',
  HYBRID = 'Hybride',
  OTHER = 'Autre'
}

export enum MaintenanceType {
  OIL_CHANGE = 'oil_change',
  BRAKE_SERVICE = 'brake_service',
  TIRE_CHANGE = 'tire_change',
  INSPECTION = 'inspection',
  BATTERY = 'battery',
  OTHER = 'other'
}

export enum DocumentType {
  REGISTRATION = 'registration',
  INSURANCE = 'insurance',
  INSPECTION = 'inspection',
  MAINTENANCE = 'maintenance',
  OTHER = 'other'
}

export interface Vehicle {
  id: string
  userId: string
  name: string
  model: string
  year: number
  mileage: number
  type: VehicleType | `${VehicleType}`
  licensePlate?: string
  fuelType?: FuelType | `${FuelType}`
  color?: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CreateVehicleDTO {
  name: string
  model: string
  year: number
  mileage: number
  type: VehicleType | `${VehicleType}`
  licensePlate?: string
  fuelType?: FuelType | `${FuelType}`
  color?: string
}

export type UpdateVehicleDTO = Partial<CreateVehicleDTO>

export interface MaintenanceRecord {
  id: string
  vehicleId: string
  type: MaintenanceType | `${MaintenanceType}`
  description: string
  mileage: number
  cost: number
  date: Date | string
  nextMaintenanceKm?: number
  createdAt: Date | string
  updatedAt: Date | string
}

export interface VehicleDocument {
  id: string
  vehicleId: string
  type: DocumentType | `${DocumentType}`
  title: string
  fileUrl: string
  uploadedAt: Date | string
  updatedAt: Date | string
}

export interface VehicleInsurance {
  id: string
  vehicleId: string
  provider: string
  policyNumber: string
  startDate: Date | string
  endDate: Date | string
  coverage: string
  phoneNumber?: string
  createdAt: Date | string
  updatedAt: Date | string
}

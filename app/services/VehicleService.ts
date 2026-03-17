/**
 * Vehicle Service
 * Handles all vehicle-related API calls and data management
 */

import {
  CreateVehicleDTO,
  MaintenanceRecord,
  MaintenanceType,
  UpdateVehicleDTO,
  Vehicle,
  VehicleDocument,
  VehicleInsurance,
  VehicleType,
  FuelType,
  DocumentType
} from '@/types/vehicle'
import { apiRequest } from '@/utils/api'

export type {
  Vehicle,
  CreateVehicleDTO,
  UpdateVehicleDTO,
  MaintenanceRecord,
  VehicleDocument,
  VehicleInsurance
} from '@/types/vehicle'

const MOCK_USER_ID = 'demo-user'

// Mock API responses for development
const MOCK_VEHICLES: Vehicle[] = [
  {
    id: '1',
    userId: MOCK_USER_ID,
    name: 'Toyota Corolla',
    model: 'Corolla 2018',
    year: 2018,
    mileage: 75000,
    type: VehicleType.SEDAN,
    licensePlate: 'AB-123-CD',
    fuelType: FuelType.PETROL,
    color: 'Gris',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: '2',
    userId: MOCK_USER_ID,
    name: 'Renault Clio',
    model: 'Clio 2020',
    year: 2020,
    mileage: 45000,
    type: VehicleType.SEDAN,
    licensePlate: 'EF-456-GH',
    fuelType: FuelType.DIESEL,
    color: 'Bleu',
    createdAt: new Date('2023-06-20'),
    updatedAt: new Date('2024-02-15')
  }
]

const MOCK_MAINTENANCE_HISTORY: MaintenanceRecord[] = [
  {
    id: 'm-1',
    vehicleId: '1',
    type: MaintenanceType.OIL_CHANGE,
    description: 'Vidange complete',
    mileage: 70000,
    cost: 89.9,
    date: new Date('2024-01-05'),
    nextMaintenanceKm: 80000,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  }
]

const MOCK_DOCUMENTS: VehicleDocument[] = [
  {
    id: 'd-1',
    vehicleId: '1',
    type: DocumentType.REGISTRATION,
    title: 'Carte grise',
    fileUrl: 'https://example.com/documents/registration.pdf',
    uploadedAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  }
]

const MOCK_INSURANCE: VehicleInsurance[] = [
  {
    id: 'i-1',
    vehicleId: '1',
    provider: 'AssureAuto',
    policyNumber: 'POL-12345',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    coverage: 'Tous risques',
    phoneNumber: '+33 1 23 45 67 89',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

class VehicleService {
  private apiBaseUrl = '' // handled by apiRequest
  
  async getVehicles(): Promise<Vehicle[]> {
    try {
      const data = await apiRequest<Vehicle[]>('/vehicles')
      return data.map(this.normalizeVehicle)
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      return MOCK_VEHICLES
    }
  }

  async getVehicleById(vehicleId: string): Promise<Vehicle> {
    try {
      const vehicle = await apiRequest<Vehicle>(`/vehicles/${vehicleId}`)
      return this.normalizeVehicle(vehicle)
    } catch (error) {
      console.error('Error fetching vehicle:', error)
      const fallback = MOCK_VEHICLES.find(v => v.id === vehicleId)
      if (fallback) return fallback
      throw error
    }
  }

  async createVehicle(data: CreateVehicleDTO): Promise<Vehicle> {
    try {
      const created = await apiRequest<Vehicle>('/vehicles', {
        method: 'POST',
        body: data
      })
      return this.normalizeVehicle(created)
    } catch (error) {
      console.error('Error creating vehicle:', error)
      // fallback local mock creation
      const newVehicle: Vehicle = {
        id: (MOCK_VEHICLES.length + 1).toString(),
        userId: MOCK_USER_ID,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      MOCK_VEHICLES.push(newVehicle)
      return newVehicle
    }
  }

  async updateVehicle(vehicleId: string, data: UpdateVehicleDTO): Promise<Vehicle> {
    try {
      const updated = await apiRequest<Vehicle>(`/vehicles/${vehicleId}`, {
        method: 'PUT',
        body: data
      })
      return this.normalizeVehicle(updated)
    } catch (error) {
      console.error('Error updating vehicle:', error)
      const idx = MOCK_VEHICLES.findIndex(v => v.id === vehicleId)
      if (idx > -1) {
        MOCK_VEHICLES[idx] = { ...MOCK_VEHICLES[idx], ...data, updatedAt: new Date() }
        return MOCK_VEHICLES[idx]
      }
      throw error
    }
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      await apiRequest<void>(`/vehicles/${vehicleId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      // fallback delete mock
      const vehicleIndex = MOCK_VEHICLES.findIndex(v => v.id === vehicleId)
      if (vehicleIndex > -1) {
        MOCK_VEHICLES.splice(vehicleIndex, 1)
        return
      }
      throw error
    }
  }

  async getMaintenanceHistory(vehicleId: string): Promise<MaintenanceRecord[]> {
    try {
      const data = await apiRequest<MaintenanceRecord[]>(`/vehicles/${vehicleId}/maintenance`)
      return data
    } catch (error) {
      console.error('Error fetching maintenance history:', error)
      return MOCK_MAINTENANCE_HISTORY.filter(record => record.vehicleId === vehicleId)
    }
  }

  async getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
    try {
      const data = await apiRequest<VehicleDocument[]>(`/vehicles/${vehicleId}/documents`)
      return data
    } catch (error) {
      console.error('Error fetching documents:', error)
      return MOCK_DOCUMENTS.filter(document => document.vehicleId === vehicleId)
    }
  }

  async getVehicleInsurance(vehicleId: string): Promise<VehicleInsurance | null> {
    try {
      const data = await apiRequest<VehicleInsurance>(`/vehicles/${vehicleId}/insurance`)
      return data ? { ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) } : null
    } catch (error) {
      console.error('Error fetching vehicle insurance:', error)
      const insurance = MOCK_INSURANCE.find(item => item.vehicleId === vehicleId) ?? null
      return insurance
    }
  }

  private getAuthToken(): string {
    return 'mock-token'
  }

  private normalizeVehicle(vehicle: Vehicle): Vehicle {
    return {
      ...vehicle,
      createdAt: new Date(vehicle.createdAt),
      updatedAt: new Date(vehicle.updatedAt)
    }
  }
}

export default new VehicleService()

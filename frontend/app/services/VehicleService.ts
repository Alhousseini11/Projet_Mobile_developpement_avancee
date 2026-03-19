import {
  createDemoMaintenanceHistory,
  createDemoVehicleDocuments,
  createDemoVehicleInsurance,
  createDemoVehicles,
  isCurrentSessionDemoUser
} from '@/config/demo'
import {
  CreateVehicleDTO,
  MaintenanceRecord,
  UpdateVehicleDTO,
  Vehicle,
  VehicleDocument,
  VehicleInsurance
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

const MOCK_VEHICLES: Vehicle[] = createDemoVehicles()
const MOCK_MAINTENANCE_HISTORY: MaintenanceRecord[] = createDemoMaintenanceHistory()
const MOCK_DOCUMENTS: VehicleDocument[] = createDemoVehicleDocuments()
const MOCK_INSURANCE: VehicleInsurance[] = createDemoVehicleInsurance()
const VEHICLE_READ_TIMEOUT_MS = 10000

let vehiclesRequest: Promise<Vehicle[]> | null = null

class VehicleService {
  private getFallbackVehicles() {
    return isCurrentSessionDemoUser()
      ? MOCK_VEHICLES.map(vehicle => this.normalizeVehicle(vehicle))
      : []
  }

  async getVehicles(): Promise<Vehicle[]> {
    if (vehiclesRequest) {
      return vehiclesRequest.then(vehicles => vehicles.map(vehicle => this.normalizeVehicle(vehicle)))
    }

    vehiclesRequest = (async () => {
      try {
        const data = await apiRequest<Vehicle[]>('/vehicles', {
          timeoutMs: VEHICLE_READ_TIMEOUT_MS
        })
        return data.map(vehicle => this.normalizeVehicle(vehicle))
      } catch (error) {
        console.warn('Error fetching vehicles:', error)
        return this.getFallbackVehicles()
      } finally {
        vehiclesRequest = null
      }
    })()

    return vehiclesRequest.then(vehicles => vehicles.map(vehicle => this.normalizeVehicle(vehicle)))
  }

  async getVehicleById(vehicleId: string): Promise<Vehicle> {
    try {
      const vehicle = await apiRequest<Vehicle>(`/vehicles/${vehicleId}`, {
        timeoutMs: VEHICLE_READ_TIMEOUT_MS
      })
      return this.normalizeVehicle(vehicle)
    } catch (error) {
      console.warn('Error fetching vehicle:', error)
      const fallback = this.getFallbackVehicles().find(v => v.id === vehicleId)
      if (fallback) {
        return fallback
      }
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
      throw error
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
      throw error
    }
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      await apiRequest<void>(`/vehicles/${vehicleId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      throw error
    }
  }

  async getMaintenanceHistory(vehicleId: string): Promise<MaintenanceRecord[]> {
    try {
      const data = await apiRequest<MaintenanceRecord[]>(`/vehicles/${vehicleId}/maintenance`, {
        timeoutMs: VEHICLE_READ_TIMEOUT_MS
      })
      return data.map(record => this.normalizeMaintenanceRecord(record))
    } catch (error) {
      console.warn('Error fetching maintenance history:', error)
      if (!isCurrentSessionDemoUser()) {
        return []
      }
      return MOCK_MAINTENANCE_HISTORY
        .filter(record => record.vehicleId === vehicleId)
        .map(record => this.normalizeMaintenanceRecord(record))
    }
  }

  async getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
    try {
      const data = await apiRequest<VehicleDocument[]>(`/vehicles/${vehicleId}/documents`, {
        timeoutMs: VEHICLE_READ_TIMEOUT_MS
      })
      return data.map(document => this.normalizeVehicleDocument(document))
    } catch (error) {
      console.warn('Error fetching documents:', error)
      if (!isCurrentSessionDemoUser()) {
        return []
      }
      return MOCK_DOCUMENTS
        .filter(document => document.vehicleId === vehicleId)
        .map(document => this.normalizeVehicleDocument(document))
    }
  }

  async getVehicleInsurance(vehicleId: string): Promise<VehicleInsurance | null> {
    try {
      const data = await apiRequest<VehicleInsurance>(`/vehicles/${vehicleId}/insurance`, {
        timeoutMs: VEHICLE_READ_TIMEOUT_MS
      })
      return data ? this.normalizeVehicleInsurance(data) : null
    } catch (error) {
      console.warn('Error fetching vehicle insurance:', error)
      if (!isCurrentSessionDemoUser()) {
        return null
      }
      const insurance = MOCK_INSURANCE.find(item => item.vehicleId === vehicleId) ?? null
      return insurance ? this.normalizeVehicleInsurance(insurance) : null
    }
  }

  private normalizeVehicle(vehicle: Vehicle): Vehicle {
    return {
      ...vehicle,
      createdAt: new Date(vehicle.createdAt),
      updatedAt: new Date(vehicle.updatedAt)
    }
  }

  private normalizeMaintenanceRecord(record: MaintenanceRecord): MaintenanceRecord {
    return {
      ...record,
      date: new Date(record.date),
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt)
    }
  }

  private normalizeVehicleDocument(document: VehicleDocument): VehicleDocument {
    return {
      ...document,
      uploadedAt: new Date(document.uploadedAt),
      updatedAt: new Date(document.updatedAt)
    }
  }

  private normalizeVehicleInsurance(insurance: VehicleInsurance): VehicleInsurance {
    return {
      ...insurance,
      startDate: new Date(insurance.startDate),
      endDate: new Date(insurance.endDate),
      createdAt: new Date(insurance.createdAt),
      updatedAt: new Date(insurance.updatedAt)
    }
  }
}

export default new VehicleService()

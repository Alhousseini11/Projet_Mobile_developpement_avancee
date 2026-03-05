/**
 * Vehicle Service
 * Handles all vehicle-related API calls and data management
 */

// Mock API responses for development
const MOCK_VEHICLES: Vehicle[] = [
  {
    id: '1',
    name: 'Toyota Corolla',
    model: 'Corolla 2018',
    year: 2018,
    mileage: 75000,
    type: 'sedan',
    licensePlate: 'AB-123-CD',
    fuelType: 'Essence',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: '2',
    name: 'Renault Clio',
    model: 'Clio 2020',
    year: 2020,
    mileage: 45000,
    type: 'sedan',
    licensePlate: 'EF-456-GH',
    fuelType: 'Diesel',
    createdAt: new Date('2023-06-20'),
    updatedAt: new Date('2024-02-15')
  }
]

export interface Vehicle {
  id: string
  name: string
  model: string
  year: number
  mileage: number
  type: 'sedan' | 'suv' | 'truck' | 'other'
  licensePlate?: string
  fuelType?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateVehicleDTO {
  name: string
  model: string
  year: number
  mileage: number
  type: 'sedan' | 'suv' | 'truck' | 'other'
  licensePlate?: string
  fuelType?: string
}

export interface UpdateVehicleDTO extends Partial<CreateVehicleDTO> {}

class VehicleService {
  private apiBaseUrl = 'http://localhost:3000/api'
  
  /**
   * Get all vehicles for the current user
   */
  async getVehicles(): Promise<Vehicle[]> {
    try {
      // Replace with actual API call when backend is ready
      // const response = await fetch(`${this.apiBaseUrl}/vehicles`, {
      //   method: 'GET',
      //   headers: {
      //     'Authorization': `Bearer ${this.getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // return await response.json()
      
      // Mock data for now
      return Promise.resolve(MOCK_VEHICLES)
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      throw error
    }
  }

  /**
   * Get a single vehicle by ID
   */
  async getVehicleById(vehicleId: string): Promise<Vehicle> {
    try {
      // const response = await fetch(`${this.apiBaseUrl}/vehicles/${vehicleId}`, {
      //   method: 'GET',
      //   headers: {
      //     'Authorization': `Bearer ${this.getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // return await response.json()
      
      const vehicle = MOCK_VEHICLES.find(v => v.id === vehicleId)
      if (!vehicle) {
        throw new Error(`Vehicle with ID ${vehicleId} not found`)
      }
      return Promise.resolve(vehicle)
    } catch (error) {
      console.error('Error fetching vehicle:', error)
      throw error
    }
  }

  /**
   * Create a new vehicle
   */
  async createVehicle(data: CreateVehicleDTO): Promise<Vehicle> {
    try {
      // const response = await fetch(`${this.apiBaseUrl}/vehicles`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(data)
      // })
      // return await response.json()

      const newVehicle: Vehicle = {
        id: (MOCK_VEHICLES.length + 1).toString(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      MOCK_VEHICLES.push(newVehicle)
      return Promise.resolve(newVehicle)
    } catch (error) {
      console.error('Error creating vehicle:', error)
      throw error
    }
  }

  /**
   * Update an existing vehicle
   */
  async updateVehicle(vehicleId: string, data: UpdateVehicleDTO): Promise<Vehicle> {
    try {
      // const response = await fetch(`${this.apiBaseUrl}/vehicles/${vehicleId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${this.getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(data)
      // })
      // return await response.json()

      const vehicleIndex = MOCK_VEHICLES.findIndex(v => v.id === vehicleId)
      if (vehicleIndex === -1) {
        throw new Error(`Vehicle with ID ${vehicleId} not found`)
      }
      
      MOCK_VEHICLES[vehicleIndex] = {
        ...MOCK_VEHICLES[vehicleIndex],
        ...data,
        updatedAt: new Date()
      }
      
      return Promise.resolve(MOCK_VEHICLES[vehicleIndex])
    } catch (error) {
      console.error('Error updating vehicle:', error)
      throw error
    }
  }

  /**
   * Delete a vehicle
   */
  async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      // const response = await fetch(`${this.apiBaseUrl}/vehicles/${vehicleId}`, {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${this.getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // if (!response.ok) throw new Error('Failed to delete vehicle')

      const vehicleIndex = MOCK_VEHICLES.findIndex(v => v.id === vehicleId)
      if (vehicleIndex === -1) {
        throw new Error(`Vehicle with ID ${vehicleId} not found`)
      }
      MOCK_VEHICLES.splice(vehicleIndex, 1)
      return Promise.resolve()
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      throw error
    }
  }

  /**
   * Get maintenance history for a vehicle
   */
  async getMaintenanceHistory(vehicleId: string): Promise<any[]> {
    try {
      // const response = await fetch(`${this.apiBaseUrl}/vehicles/${vehicleId}/maintenance`, {
      //   method: 'GET',
      //   headers: {
      //     'Authorization': `Bearer ${this.getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // return await response.json()
      
      return Promise.resolve([])
    } catch (error) {
      console.error('Error fetching maintenance history:', error)
      throw error
    }
  }

  /**
   * Get documents for a vehicle
   */
  async getVehicleDocuments(vehicleId: string): Promise<any[]> {
    try {
      // const response = await fetch(`${this.apiBaseUrl}/vehicles/${vehicleId}/documents`, {
      //   method: 'GET',
      //   headers: {
      //     'Authorization': `Bearer ${this.getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      // return await response.json()
      
      return Promise.resolve([])
    } catch (error) {
      console.error('Error fetching documents:', error)
      throw error
    }
  }

  /**
   * Helper method to get auth token
   */
  private getAuthToken(): string {
    // Get from secure storage or session
    return 'mock-token'
  }
}

// Export singleton instance
export default new VehicleService()

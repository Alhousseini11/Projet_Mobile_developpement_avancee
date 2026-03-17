export type VehicleType = 'sedan' | 'suv' | 'truck' | 'minivan' | 'coupe' | 'other';
export type FuelType = 'Essence' | 'Diesel' | 'Hybride' | 'Électrique' | 'GPL' | 'Bioéthanol';
export type MaintenanceType =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_service'
  | 'battery_replacement'
  | 'filter_change'
  | 'inspection'
  | 'repair'
  | 'other';
export type DocumentType =
  | 'registration'
  | 'insurance'
  | 'mot'
  | 'service_history'
  | 'warranty'
  | 'inspection'
  | 'other';

export interface VehicleContract {
  id: string;
  userId: string;
  name: string;
  model: string;
  year: number;
  mileage: number;
  type: VehicleType;
  licensePlate?: string;
  fuelType?: FuelType;
  vin?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceRecordContract {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  mileage: number;
  cost: number;
  date: Date;
  notes?: string;
  nextMaintenanceKm?: number;
  nextMaintenanceDate?: Date;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDocumentContract {
  id: string;
  vehicleId: string;
  type: DocumentType;
  title: string;
  fileUrl: string;
  expiryDate?: Date;
  uploadedAt: Date;
  updatedAt: Date;
}

export interface VehicleInsuranceContract {
  id: string;
  vehicleId: string;
  provider: string;
  policyNumber: string;
  startDate: Date;
  endDate: Date;
  coverage: string;
  phoneNumber?: string;
  documentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfilePayload {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  membershipLabel: string;
  verified: boolean;
  memberSince: string;
  preferredGarage: string;
  defaultVehicleLabel: string;
  appointmentCount: number;
  vehicleCount: number;
  loyaltyPoints: number;
  addressLine: string;
  city: string;
  notes: string;
}

export interface PaymentCardPayload {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface PaymentMethodPayload {
  provider: 'stripe';
  status: 'not_configured' | 'pending' | 'ready';
  backendReachable: boolean;
  stripeConfigured: boolean;
  customerId: string | null;
  card: PaymentCardPayload | null;
  lastCheckoutSessionId: string | null;
  lastSyncAt: string | null;
  message: string;
}

export interface InvoiceLineItemPayload {
  label: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoicePayload {
  id: string;
  number: string;
  serviceLabel: string;
  issuedAt: string;
  appointmentDate: string;
  vehicleLabel: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: 'paid' | 'pending';
  paymentLabel: string;
  lineItems: InvoiceLineItemPayload[];
}

export interface ReservationServiceOption {
  id: string;
  label: string;
  durationMinutes: number;
  price: number;
}

const TAX_RATE = 0.15;

export const RESERVATION_SERVICES: ReservationServiceOption[] = [
  {
    id: 'oil-change',
    label: 'Vidange',
    durationMinutes: 45,
    price: 79
  },
  {
    id: 'brakes',
    label: 'Freins',
    durationMinutes: 90,
    price: 149
  },
  {
    id: 'battery',
    label: 'Batterie',
    durationMinutes: 30,
    price: 99
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic',
    durationMinutes: 60,
    price: 59
  }
];

export const SLOT_BY_SERVICE: Record<string, string[]> = {
  'oil-change': ['08:30', '10:00', '13:30', '15:00'],
  brakes: ['09:00', '11:30', '14:00', '16:30'],
  battery: ['08:00', '10:30', '13:00', '17:00'],
  diagnostic: ['09:30', '12:00', '15:30', '18:00']
};

export function findReservationService(serviceId: string) {
  return RESERVATION_SERVICES.find(service => service.id === serviceId) ?? null;
}

export function getReservationServiceLabel(serviceId: string) {
  return findReservationService(serviceId)?.label ?? serviceId;
}

export function calculateReservationPricingFromSubtotal(subtotalAmount: number) {
  const subtotal = Number(subtotalAmount.toFixed(2));
  const taxAmount = Number((subtotal * TAX_RATE).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  return {
    subtotalAmount: subtotal,
    taxAmount,
    totalAmount
  };
}

export function calculateReservationPricing(serviceId: string) {
  const service = findReservationService(serviceId);
  const subtotalAmount = service?.price ?? 0;
  return calculateReservationPricingFromSubtotal(subtotalAmount);
}

export interface ReservationServiceOption {
  id: string;
  label: string;
  durationMinutes: number;
  price: number;
  reviewAverage: number;
  reviewCount: number;
}

export interface ReservationServiceSeedDefinition {
  id: string;
  label: string;
  description: string;
  durationMinutes: number;
  price: number;
  slotTimes: string[];
}

const TAX_RATE = 0.15;

export const DEFAULT_RESERVATION_SERVICE_DEFINITIONS: ReservationServiceSeedDefinition[] = [
  {
    id: 'oil-change',
    label: 'Vidange',
    description: 'Entretien regulier avec remplacement huile et filtre.',
    durationMinutes: 45,
    price: 79,
    slotTimes: ['08:30', '10:00', '13:30', '15:00']
  },
  {
    id: 'brakes',
    label: 'Freins',
    description: 'Inspection et entretien des freins.',
    durationMinutes: 90,
    price: 149,
    slotTimes: ['09:00', '11:30', '14:00', '16:30']
  },
  {
    id: 'battery',
    label: 'Batterie',
    description: 'Controle ou remplacement de batterie.',
    durationMinutes: 30,
    price: 99,
    slotTimes: ['08:00', '10:30', '13:00', '17:00']
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic',
    description: 'Lecture des codes et diagnostic general.',
    durationMinutes: 60,
    price: 59,
    slotTimes: ['09:30', '12:00', '15:30', '18:00']
  }
];

export const RESERVATION_SERVICES: ReservationServiceOption[] =
  DEFAULT_RESERVATION_SERVICE_DEFINITIONS.map(service => ({
    id: service.id,
    label: service.label,
    durationMinutes: service.durationMinutes,
    price: service.price,
    reviewAverage: 0,
    reviewCount: 0
  }));

export const SLOT_BY_SERVICE: Record<string, string[]> = Object.fromEntries(
  DEFAULT_RESERVATION_SERVICE_DEFINITIONS.map(service => [service.id, service.slotTimes])
);

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

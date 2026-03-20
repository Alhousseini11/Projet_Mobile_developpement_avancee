import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOT_BY_SERVICE,
  calculateReservationPricing,
  calculateReservationPricingFromSubtotal,
  findReservationService,
  getReservationServiceLabel
} from '../src/modules/reservations/reservationCatalog';

test('findReservationService returns the configured service definition', () => {
  const service = findReservationService('oil-change');

  assert.deepEqual(service, {
    id: 'oil-change',
    label: 'Vidange',
    durationMinutes: 45,
    price: 79,
    reviewAverage: 0,
    reviewCount: 0
  });
});

test('getReservationServiceLabel falls back to the raw identifier when the service is unknown', () => {
  assert.equal(getReservationServiceLabel('diagnostic'), 'Diagnostic');
  assert.equal(getReservationServiceLabel('custom-service'), 'custom-service');
});

test('calculateReservationPricing applies the backend tax rate consistently', () => {
  assert.deepEqual(calculateReservationPricing('brakes'), {
    subtotalAmount: 149,
    taxAmount: 22.35,
    totalAmount: 171.35
  });
});

test('calculateReservationPricingFromSubtotal rounds subtotal, taxes and total to cents', () => {
  assert.deepEqual(calculateReservationPricingFromSubtotal(10.555), {
    subtotalAmount: 10.55,
    taxAmount: 1.58,
    totalAmount: 12.13
  });
});

test('service slot catalog exposes the expected slots for oil changes', () => {
  assert.deepEqual(SLOT_BY_SERVICE['oil-change'], ['08:30', '10:00', '13:30', '15:00']);
});

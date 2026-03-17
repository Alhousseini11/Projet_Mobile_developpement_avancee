import { createPlaceholderHandler } from '../_shared/createPlaceholderHandler';

export const listReservations = createPlaceholderHandler('reservations', 'list');
export const createReservation = createPlaceholderHandler('reservations', 'create');
export const getReservationById = createPlaceholderHandler('reservations', 'getById');
export const updateReservation = createPlaceholderHandler('reservations', 'update');
export const uploadReservationPhoto = createPlaceholderHandler('reservations', 'uploadPhoto');
export const payReservation = createPlaceholderHandler('reservations', 'pay');

import { Router } from 'express';
import { authGuard } from '../../core/http/middleware/authGuard';
import * as billingController from './profile.billing';
import * as paymentController from './profile.payments';
import * as profileController from './profile.controller';

const router = Router();

router.use(authGuard);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.get('/invoices', billingController.listInvoices);
router.get('/invoices/:invoiceId/pdf', billingController.downloadInvoicePdf);
router.get('/payment-method', paymentController.getPaymentMethod);
router.post('/payment-method/checkout-session', paymentController.createPaymentCheckoutSession);
router.post('/payment-method/sync', paymentController.syncPaymentMethod);

export default router;

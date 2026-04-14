import { Router } from 'express';
import { authGuard } from '../../core/http/middleware/authGuard';
import * as controller from './profile.controller';

const router = Router();

router.use(authGuard);

router.get('/', controller.getProfile);
router.put('/', controller.updateProfile);
router.get('/invoices', controller.listInvoices);
router.get('/invoices/:invoiceId/pdf', controller.downloadInvoicePdf);
router.get('/payment-method', controller.getPaymentMethod);
router.post('/payment-method/checkout-session', controller.createPaymentCheckoutSession);
router.post('/payment-method/sync', controller.syncPaymentMethod);

export default router;

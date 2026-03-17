import { Router } from 'express';
import * as controller from './vehicles.controller';
import { authGuard } from '../../core/http/middleware/authGuard';

const router = Router();

router.use(authGuard);
router.get('/', controller.listVehicles);
router.post('/', controller.createVehicle);
router.get('/:id', controller.getVehicleById);
router.put('/:id', controller.updateVehicle);
router.delete('/:id', controller.deleteVehicle);
router.get('/:id/maintenance', controller.getMaintenanceHistory);
router.get('/:id/documents', controller.getVehicleDocuments);
router.get('/:id/insurance', controller.getVehicleInsurance);

export default router;

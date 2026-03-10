import { Router } from 'express';
import { listVehicles, createVehicle, getVehicle, updateVehicle } from '../controllers/vehicles.controller';

const router = Router();
router.get('/', listVehicles);
router.post('/', createVehicle);
router.get('/:id', getVehicle);
router.patch('/:id', updateVehicle);

export default router;

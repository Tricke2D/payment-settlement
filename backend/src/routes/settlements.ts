import { Router } from 'express';
import * as settlementController from '../controllers/settlement.controller';

const router = Router();

// POST /api/settlements/initiate
router.post('/initiate', settlementController.initiate);

// POST /api/settlements/:settlementId/phase1-lock
router.post('/:settlementId/phase1-lock', settlementController.phase1Lock);

// POST /api/settlements/:settlementId/phase2-commit
router.post('/:settlementId/phase2-commit', settlementController.phase2Commit);

// GET /api/settlements/:settlementId
router.get('/:settlementId', settlementController.getSettlement);

// GET /api/settlements/:settlementId/audit-trail
router.get('/:settlementId/audit-trail', settlementController.getAuditTrail);

export default router;
// src/routes/history.routes.ts
import { Router } from 'express';
import { getMatchHistory } from '../controllers/history.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(getMatchHistory));

export default router;
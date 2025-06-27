import express from 'express';
import {
    register,
    login,
    logout
} from '../controllers/auth.controller';

const router = express.Router();

const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/logout', logout);

export default router;
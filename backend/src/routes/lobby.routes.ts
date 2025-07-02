import { Router } from 'express';
import { createLobby, getLobbys, getLobbyByCode, updateLobbySize, updateLobbyDuration, getGameModes, deleteLobby } from '../controllers/lobby.controller';

const router = Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/', asyncHandler(createLobby));
router.get('/', asyncHandler(getLobbys));
router.get('/:code', asyncHandler(getLobbyByCode));
router.patch('/:id/size', asyncHandler(updateLobbySize));
router.patch('/:id/duration', asyncHandler(updateLobbyDuration));
router.get('/modes/all', asyncHandler(getGameModes));
router.delete("/:id", asyncHandler(deleteLobby));

export default router;

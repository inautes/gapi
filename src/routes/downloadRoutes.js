import express from 'express';
import { getHash } from '../controllers/downloadController.js';

const router = express.Router();

router.post('/gethash', getHash);

export default router;

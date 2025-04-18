import express from 'express';
import { getUploadPolicy, registerHash } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/policy', getUploadPolicy);

router.post('/hashin', registerHash);

export default router;

import express from 'express';
import { 
  getUploadPolicy, 
  getUploadAddress, 
  startUploadProcess, 
  endUploadProcess, 
  registerHash 
} from '../controllers/uploadController.js';

const router = express.Router();

router.post('/policy', getUploadPolicy);
router.post('/hashin', registerHash);

router.get('/address', getUploadAddress);
router.post('/start_process', startUploadProcess);
router.post('/end_process', endUploadProcess);

export default router;

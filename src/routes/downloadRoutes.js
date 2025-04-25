import express from 'express';
import { 
  getHash, 
  getDownloadAddress, 
  getDownloadInfo, 
  updateDownloadStats 
} from '../controllers/downloadController.js';

const router = express.Router();

router.post('/gethash', getHash);
router.get('/address', getDownloadAddress);
router.post('/info', getDownloadInfo);
router.post('/update_stats', updateDownloadStats);

export default router;

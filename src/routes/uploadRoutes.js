import express from 'express';
import { 
  getUploadPolicy, 
  getUploadAddress, 
  startUploadProcess, 
  endUploadProcess, 
  // registerHash,
  enrollmentFileinfo,
  enrollmentFiltering,
  enrollmentComplete
} from '../controllers/uploadController.js';

const router = express.Router();

router.post('/policy', getUploadPolicy);
// router.post('/hashin', registerHash);
router.get('/address', getUploadAddress);
router.post('/start_process', startUploadProcess);
router.post('/end_process', endUploadProcess);

router.post('/enrollment_fileinfo', enrollmentFileinfo);
router.post('/enrollment_filtering', enrollmentFiltering);
router.post('/enrollment_complete', enrollmentComplete);

export default router;

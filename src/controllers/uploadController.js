import { User, File, Category } from '../models/index.js';

const getUploadPolicy = async (req, res) => {
  try {
    return res.status(200).json({
      result: 'success',
      upload_policy: ['001']
    });
  } catch (error) {
    console.error('Error in getUploadPolicy controller:', error);
    return res.status(500).json({
      result: 'error',
      message: 'Internal server error'
    });
  }
};

const registerHash = async (req, res) => {
  try {
    return res.status(200).json({
      result: 'success',
      message: 'All inserted'
    });
  } catch (error) {
    console.error('Error in registerHash controller:', error);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error'
    });
  }
};

export { getUploadPolicy, registerHash };

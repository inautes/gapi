import { User, File, Category } from '../models/index.js';

const getUploadPolicy = async (req, res) => {
  try {
    const { userid } = req.body;
    
    if (!userid) {
      return res.status(400).json({
        result: 'error',
        message: 'User ID is required'
      });
    }
    
    const user = await User.findOne({
      where: { userid }
    });
    
    if (!user) {
      return res.status(404).json({
        result: 'error',
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      result: 'success',
      upload_policy: user.upload_policy || []
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
    const { info } = req.body;
    
    if (!info || !Array.isArray(info) && !info.cont_id) {
      return res.status(400).json({
        result: 'error',
        message: 'Invalid request format'
      });
    }
    
    const fileInfos = Array.isArray(info) ? info : [info];
    
    const promises = fileInfos.map(async (fileInfo) => {
      const { cont_id, seq_id, hash, cloud_yn, category_code } = fileInfo;
      
      if (!cont_id || !hash) {
        throw new Error('Content ID and hash are required');
      }
      
      return File.create({
        cont_id,
        seq_id: seq_id || null,
        hash,
        cloud_yn: cloud_yn === 'y' || cloud_yn === true,
        category_code: category_code || null
      });
    });
    
    await Promise.all(promises);
    
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

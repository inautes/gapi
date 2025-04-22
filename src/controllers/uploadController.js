import { User, File, Category } from '../models/index.js';

const getUploadPolicy = async (req, res) => {
  try {
    const { userid } = req.body;
    
    let user = null;
    if (userid) {
      user = await User.findOne({ where: { userid } });
    }
    
    const policy = user ? user.upload_policy : ['01'];
    
    return res.status(200).json({
      result: 'success',
      upload_policy: policy
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
    
    if (!info) {
      return res.status(400).json({
        result: 'error',
        message: 'Missing file information'
      });
    }
    
    const fileInfos = Array.isArray(info) ? info : [info];
    
    const savedFiles = await Promise.all(
      fileInfos.map(async (fileInfo) => {
        return await File.create({
          cont_id: fileInfo.cont_id,
          seq_id: fileInfo.seq_id,
          hash: fileInfo.hash,
          cloud_yn: fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true,
          category_code: fileInfo.category_code || '01' // 기본값은 영화 카테고리
        });
      })
    );
    
    console.log(`${savedFiles.length} files saved to database`);
    
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

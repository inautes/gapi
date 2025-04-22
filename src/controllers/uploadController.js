import { User, File, Category } from '../models/index.js';
import { Op } from 'sequelize';

const getUploadPolicy = async (req, res) => {
  try {
    const { userid } = req.body;
    
    const cloudCategories = await Category.findAll({
      where: {
        cloud_yn: 'Y'
      },
      attributes: ['code']
    });
    
    const cloudCategoryCodes = cloudCategories.map(category => category.code);
    console.log(`클라우드 카테고리 코드: ${JSON.stringify(cloudCategoryCodes)}`);
    
    let user = null;
    if (userid) {
      user = await User.findOne({ where: { userid } });
      console.log(`사용자 조회 결과: ${JSON.stringify(user)}`);
    }
    
    let policy = [];
    if (user) {
      policy = user.upload_policy.filter(code => cloudCategoryCodes.includes(code));
      if (policy.length === 0) {
        policy = cloudCategoryCodes;
      }
    } else {
      policy = cloudCategoryCodes;
    }
    
    console.log(`반환할 정책: ${JSON.stringify(policy)}`);
    
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
    
    try {
      const savedFiles = await Promise.all(
        fileInfos.map(async (fileInfo) => {
          let category_code = fileInfo.category_code || '01'; // 기본값은 영화 카테고리
          
          const categoryExists = await Category.findOne({
            where: { code: category_code }
          });
          
          if (!categoryExists) {
            throw new Error(`카테고리 코드 "${category_code}"가 데이터베이스에 존재하지 않습니다`);
          }
          
          return await File.create({
            cont_id: fileInfo.cont_id,
            seq_id: fileInfo.seq_id, // 빈 문자열("")도 허용
            hash: fileInfo.hash,
            cloud_yn: fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true,
            category_code: category_code,
            company_code: fileInfo.company_code || 'WEDISK' // 기본값 'WEDISK' 명시적 설정
          });
        })
      );
      
      console.log(`${savedFiles.length} files saved to database`);
      
      return res.status(200).json({
        result: 'success',
        message: 'All inserted'
      });
    } catch (error) {
      console.error('Error in file creation:', error);
      let errorMessage = error.message;
      if (errorMessage.includes('SQLITE_CONSTRAINT')) {
        if (errorMessage.includes('FOREIGN KEY')) {
          errorMessage = 'DB 제약 조건 오류: 외래 키 제약 조건이 실패했습니다';
        } else {
          errorMessage = 'DB 제약 조건 오류가 발생했습니다';
        }
      }
      return res.status(400).json({
        result: 'error',
        message: errorMessage
      });
    }
  } catch (error) {
    console.error('Error in registerHash controller:', error);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error'
    });
  }
};

export { getUploadPolicy, registerHash };

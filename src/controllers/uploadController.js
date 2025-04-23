import { User, File, Category, Company } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { sequelize, cprSequelize, logSequelize } from '../config/database.js';

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
      console.error(`에러 상세 정보: ${JSON.stringify(fileInfos)}`);
      
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

const getUploadAddress = async (req, res) => {
  try {
    return res.status(200).json({
      result: 'success',
      ftp_upload_server: 'wedisk-ftpupload.dadamcloud.com',
      download_server: 'https://wedisk-down.dadamcloud.com/fdown.php'
    });
  } catch (error) {
    console.error('Error in getUploadAddress controller:', error);
    return res.status(500).json({
      result: 'error',
      message: 'Internal server error'
    });
  }
};

const startUploadProcess = async (req, res) => {
  try {
    const { 
      user_id, 
      file_name, 
      file_size, 
      sect_code = '01', 
      sect_sub = '', 
      title = '', 
      descript = '', 
      default_hash = '', 
      audio_hash = '', 
      video_hash = '',
      copyright_yn = 'N',
      adult_yn = 'N'
    } = req.body;

    if (!user_id || !file_name || !file_size) {
      return res.status(400).json({
        result: 'error',
        message: '필수 파라미터가 누락되었습니다'
      });
    }

    const user = await User.findOne({ where: { userid: user_id } });
    if (!user) {
      return res.status(404).json({
        result: 'error',
        message: '사용자를 찾을 수 없습니다'
      });
    }

    const category = await Category.findOne({ where: { code: sect_code } });
    if (!category) {
      return res.status(404).json({
        result: 'error',
        message: '유효하지 않은 카테고리 코드입니다'
      });
    }

    if (user.upload_policy && !user.upload_policy.includes(sect_code)) {
      return res.status(403).json({
        result: 'error',
        message: '해당 카테고리에 업로드할 권한이 없습니다'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      const temp_id = Date.now();
      const seq_no = 1; // 기본값, 실제로는 파일 수에 따라 증가
      const reg_date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const reg_time = new Date().toISOString().slice(11, 19).replace(/:/g, '');

      await sequelize.query(
        `INSERT INTO T_CONTENTS_TEMP (
          id, title, descript, descript2, descript3, keyword,
          sect_code, sect_sub, adult_yn, share_meth, price_amt, won_mega,
          reg_user, reg_date, reg_time, disp_end_date, disp_end_time, item_bold_yn,
          item_color, req_id, editor_type
        ) VALUES (
          ?, ?, ?, '', '', '',
          ?, ?, ?, 'N', 0, 0,
          ?, ?, ?, '', '', 'N',
          'N', 0, 0
        )`,
        {
          replacements: [
            temp_id.toString(),
            title,
            descript,
            sect_code,
            sect_sub,
            adult_yn,
            user_id,
            reg_date,
            reg_time
          ],
          transaction
        }
      );

      await sequelize.query(
        `INSERT INTO T_CONTENTS_TEMPLIST (
          id, file_name, file_size, file_type, file_ext, file_path,
          reg_date, reg_time, copyright_yn, mobservice_yn
        ) VALUES (
          ?, ?, ?, 0, ?, '',
          ?, ?, ?, 'Y'
        )`,
        {
          replacements: [
            temp_id.toString(),
            file_name,
            file_size,
            file_name.split('.').pop() || '',
            reg_date,
            reg_time,
            copyright_yn
          ],
          transaction
        }
      );

      await sequelize.query(
        `INSERT INTO T_CONTENTS_TEMPLIST_SUB (
          id, seq_no, file_name, file_size, file_type, file_ext,
          default_hash, audio_hash, video_hash, comp_cd, chi_id, price_amt,
          mob_price_amt, reg_date, reg_time
        ) VALUES (
          ?, ?, ?, ?, 0, ?,
          ?, ?, ?, 'WEDISK', 0, 0,
          0, ?, ?
        )`,
        {
          replacements: [
            temp_id.toString(),
            seq_no.toString(),
            file_name,
            file_size,
            file_name.split('.').pop() || '',
            default_hash,
            audio_hash,
            video_hash,
            reg_date,
            reg_time
          ],
          transaction
        }
      );

      await transaction.commit();

      return res.status(200).json({
        result: 'success',
        temp_id: temp_id,
        seq_no: seq_no,
        message: '업로드 프로세스가 시작되었습니다',
        metadata: {
          user_id,
          file_name,
          file_size,
          sect_code,
          sect_sub,
          title,
          descript,
          reg_date,
          reg_time,
          default_hash,
          audio_hash,
          video_hash,
          copyright_yn,
          adult_yn
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error in startUploadProcess transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in startUploadProcess controller:', error);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error'
    });
  }
};

const endUploadProcess = async (req, res) => {
  try {
    const { 
      temp_id, 
      user_id,
      sect_code = '01',
      sect_sub = '',
      adult_yn = 'N',
      copyright_yn = 'N',
      mobservice_yn = 'Y'
    } = req.body;

    if (!temp_id || !user_id) {
      return res.status(400).json({
        result: 'error',
        message: '필수 파라미터가 누락되었습니다'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      const [tempFiles] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_TEMPLIST WHERE id = ?`,
        {
          replacements: [temp_id.toString()],
          transaction
        }
      );

      if (tempFiles.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          result: 'error',
          message: '임시 파일 정보를 찾을 수 없습니다'
        });
      }

      const [tempFileSubs] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
        {
          replacements: [temp_id.toString()],
          transaction
        }
      );

      if (tempFileSubs.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          result: 'error',
          message: '임시 파일 세부 정보를 찾을 수 없습니다'
        });
      }

      const [tempContents] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_TEMP WHERE id = ?`,
        {
          replacements: [temp_id.toString()],
          transaction
        }
      );

      if (tempContents.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          result: 'error',
          message: '임시 컨텐츠 정보를 찾을 수 없습니다'
        });
      }

      const cont_id = Date.now();
      const reg_date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const reg_time = new Date().toISOString().slice(11, 19).replace(/:/g, '');

      await sequelize.query(
        `INSERT INTO T_CONTENTS_INFO (
          id, title, descript, descript2, descript3, keyword,
          sect_code, sect_sub, adult_yn, share_meth, price_amt, won_mega,
          reg_user, reg_date, reg_time, disp_end_date, disp_end_time, item_bold_yn,
          item_color, bomul_id, bomul_stat, req_id, editor_type, nmnt_cnt, disp_cnt_inc
        ) SELECT 
          ?, title, descript, descript2, descript3, keyword,
          ?, ?, ?, share_meth, price_amt, won_mega,
          reg_user, ?, ?, disp_end_date, disp_end_time, item_bold_yn,
          item_color, 0, 0, req_id, editor_type, 0, 0
        FROM T_CONTENTS_TEMP
        WHERE id = ?`,
        {
          replacements: [
            cont_id.toString(),
            sect_code,
            sect_sub,
            adult_yn,
            reg_date,
            reg_time,
            temp_id.toString()
          ],
          transaction
        }
      );

      for (const tempFileSub of tempFileSubs) {
        await sequelize.query(
          `INSERT INTO T_CONTENTS_FILELIST (
            cont_id, seq_no, default_hash, file_name, cloud_yn, sect_code, company_code,
            reg_date, updatedAt
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, datetime('now')
          )`,
          {
            replacements: [
              cont_id.toString(),
              tempFileSub.seq_no,
              tempFileSub.default_hash,
              tempFileSub.file_name,
              copyright_yn === 'Y' ? 'Y' : 'N',
              sect_code,
              tempFileSub.comp_cd || 'WEDISK'
            ],
            transaction
          }
        );
      }

      await sequelize.query(
        `INSERT INTO T_CONTENTS_UPDN (
          id, cont_gu, copyright_yn, mobservice_yn, reg_date, reg_time
        ) VALUES (
          ?, 'UP', ?, ?, ?, ?
        )`,
        {
          replacements: [
            cont_id.toString(),
            copyright_yn,
            mobservice_yn,
            reg_date,
            reg_time
          ],
          transaction
        }
      );

      await sequelize.query(
        `DELETE FROM T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
        {
          replacements: [temp_id.toString()],
          transaction
        }
      );

      await sequelize.query(
        `DELETE FROM T_CONTENTS_TEMPLIST WHERE id = ?`,
        {
          replacements: [temp_id.toString()],
          transaction
        }
      );

      await sequelize.query(
        `DELETE FROM T_CONTENTS_TEMP WHERE id = ?`,
        {
          replacements: [temp_id.toString()],
          transaction
        }
      );

      await transaction.commit();

      return res.status(200).json({
        result: 'success',
        cont_id: cont_id,
        message: '업로드 프로세스가 완료되었습니다',
        metadata: {
          user_id,
          sect_code,
          sect_sub,
          adult_yn,
          copyright_yn,
          mobservice_yn,
          reg_date,
          reg_time
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error in endUploadProcess transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in endUploadProcess controller:', error);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error'
    });
  }
};

export { getUploadPolicy, getUploadAddress, startUploadProcess, endUploadProcess, registerHash };

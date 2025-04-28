import { User, File, Category, Company, WebhardHash } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { localSequelize, sequelize, cprSequelize, logSequelize } from '../config/database.js';
import iconv from 'iconv-lite';
import fs from 'fs';
import path from 'path';

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
    
    if (cloudCategoryCodes.length === 0) {
      console.log('클라우드 카테고리가 없습니다. 기본 카테고리 코드 "01"을 사용합니다.');
      cloudCategoryCodes.push('01');
    }
    
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

/**
 * 웹하드 해시 등록 (hashin)
 * 웹하드 해시 정보를 T_CONT_DADAM_FILE_MAP 테이블에 저장하는 API
 */
const registerHash = async (req, res) => {
  try {
    const { info } = req.body;
    
    if (!info) {
      return res.status(400).json({
        result: 'error',
        message: '파일 정보가 누락되었습니다'
      });
    }
    
    const fileInfos = Array.isArray(info) ? info : [info];
    const transaction = await sequelize.transaction(); // 원격 MySQL DB 트랜잭션
    
    try {
      const results = [];
      
      for (const fileInfo of fileInfos) {
        if (!fileInfo.cont_id || !fileInfo.filename || !fileInfo.webhard_hash) {
          throw new Error('필수 파라미터가 누락되었습니다: cont_id, filename, webhard_hash');
        }
        
        const [fileListRows] = await sequelize.query(
          `SELECT seq_no FROM T_CONTENTS_FILELIST WHERE id = ? AND file_name = ?`,
          {
            replacements: [fileInfo.cont_id.toString(), fileInfo.filename],
            transaction
          }
        );
        
        let seq_id = 1; // 기본값
        
        if (fileListRows.length > 0) {
          seq_id = fileListRows[0].seq_no;
          console.log(`T_CONTENTS_FILELIST에서 seq_id를 찾았습니다: ${seq_id}`);
        } else {
          console.log(`T_CONTENTS_FILELIST에서 seq_id를 찾을 수 없습니다. 기본값 1을 사용합니다.`);
        }
        
        const now = new Date();
        const reg_date = now.toISOString().slice(0, 10).replace(/-/g, '');
        const reg_time = now.toISOString().slice(11, 19).replace(/:/g, '');
        
        const existingHash = await WebhardHash.findOne({
          where: { 
            seq_no: seq_id,
            id: fileInfo.cont_id
          },
          transaction
        });
        
        if (existingHash) {
          await existingHash.update({
            cld_hash: fileInfo.webhard_hash,
            cloud_yn: fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true ? 'Y' : 'N',
            reg_date,
            reg_time
          }, { transaction });
          
          console.log(`기존 웹하드 해시 정보를 업데이트했습니다: cont_id=${fileInfo.cont_id}, seq_id=${seq_id}`);
        } else {
          await WebhardHash.create({
            seq_no: seq_id,
            cld_hash: fileInfo.webhard_hash,
            id: fileInfo.cont_id,
            cloud_yn: fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true ? 'Y' : 'N',
            reg_date,
            reg_time
          }, { transaction });
          
          console.log(`새 웹하드 해시 정보를 생성했습니다: cont_id=${fileInfo.cont_id}, seq_id=${seq_id}`);
        }
        
        await sequelize.query(
          `INSERT INTO T_CONT_DADAM_FILE_MAP (
            seq_no, cld_hash, id, cloud_yn, reg_date, reg_time
          ) VALUES (
            ?, ?, ?, ?, ?, ?
          ) ON DUPLICATE KEY UPDATE
            cld_hash = VALUES(cld_hash),
            cloud_yn = VALUES(cloud_yn),
            reg_date = VALUES(reg_date),
            reg_time = VALUES(reg_time)`,
          {
            replacements: [
              seq_id,
              fileInfo.webhard_hash,
              fileInfo.cont_id.toString(),
              fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true ? 'Y' : 'N',
              reg_date,
              reg_time
            ],
            transaction
          }
        ).catch(error => {
          console.log('ON DUPLICATE KEY UPDATE가 지원되지 않습니다. 삭제 후 다시 삽입합니다.');
          return sequelize.query(
            `DELETE FROM T_CONT_DADAM_FILE_MAP WHERE seq_no = ? AND id = ?`,
            {
              replacements: [seq_id, fileInfo.cont_id.toString()],
              transaction
            }
          ).then(() => {
            return sequelize.query(
              `INSERT INTO T_CONT_DADAM_FILE_MAP (
                seq_no, cld_hash, id, cloud_yn, reg_date, reg_time
              ) VALUES (
                ?, ?, ?, ?, ?, ?
              )`,
              {
                replacements: [
                  seq_id,
                  fileInfo.webhard_hash,
                  fileInfo.cont_id.toString(),
                  fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true ? 'Y' : 'N',
                  reg_date,
                  reg_time
                ],
                transaction
              }
            );
          });
        });
        
        results.push({
          cont_id: fileInfo.cont_id,
          seq_id: seq_id,
          filename: fileInfo.filename,
          webhard_hash: fileInfo.webhard_hash
        });
      }
      
      await transaction.commit();
      console.log(`${results.length} 파일의 웹하드 해시 정보가 저장되었습니다`);
      
      return res.status(200).json({
        result: 'success',
        message: '모든 웹하드 해시 정보가 저장되었습니다',
        files: results
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error in registerHash transaction:', error);
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

    const transaction = await sequelize.transaction(); // 원격 MySQL DB 트랜잭션

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

    const transaction = await sequelize.transaction(); // 원격 MySQL DB 트랜잭션

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

/**
 * 파일 정보 등록 (enrollment_fileinfo)
 * 업로드할 파일의 기본 정보를 등록하는 API
 */
const LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logError = (message, error = null, details = null) => {
  const now = new Date();
  let logMessage = `[${now.toISOString()}] ${message}\n`;
  
  if (error) {
    logMessage += `에러 메시지: ${error.message}\n`;
    logMessage += `에러 스택: ${error.stack}\n`;
  }
  
  if (details) {
    logMessage += `상세 정보: ${JSON.stringify(details, null, 2)}\n`;
  }
  
  logMessage += '='.repeat(80) + '\n';
  
  fs.appendFileSync(ERROR_LOG_FILE, logMessage);
  console.error(message);
  
  if (error) console.error(error);
  if (details) console.error('상세 정보:', details);
};

const encodeKoreanFilename = (filename) => {
  try {
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(filename);
    
    if (!hasKorean) {
      return filename; // 한글이 없으면 그대로 반환
    }
    
    console.log(`한글 파일명 감지: "${filename}"`);
    
    const encodedBuffer = iconv.encode(filename, 'euc-kr');
    
    console.log(`원본 파일명 (UTF-8): "${filename}"`);
    console.log(`인코딩된 파일명 (EUC-KR): 바이너리 데이터 (${encodedBuffer.length} 바이트)`);
    
    const decodedFilename = iconv.decode(encodedBuffer, 'euc-kr');
    console.log(`디코딩된 파일명 (UTF-8): "${decodedFilename}"`);
    
    return decodedFilename;
  } catch (error) {
    console.error(`파일명 인코딩 중 오류 발생: ${error.message}`);
    logError('파일명 인코딩 중 오류 발생', error, { filename });
    return filename; // 오류 발생 시 원본 반환
  }
};

const enrollmentFileinfo = async (req, res) => {
  try {
    const { user_id, files } = req.body;
    
    const file_info = req.body.file_info || files;

    if (!user_id || !file_info) {
      return res.status(400).json({
        result: 'error',
        message: '필수 파라미터가 누락되었습니다'
      });
    }

    const fileInfos = Array.isArray(file_info) ? file_info : [file_info];
    
    console.log(`enrollmentFileinfo 요청 데이터: user_id=${user_id}, 파일 수=${fileInfos.length}`);
    
    let user = await User.findOne({ where: { userid: user_id } });
    if (!user) {
      console.log(`사용자 '${user_id}'가 존재하지 않습니다. 자동으로 생성합니다.`);
      try {
        user = await User.create({
          userid: user_id,
          upload_policy: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']
        });
        console.log(`사용자 '${user_id}'가 성공적으로 생성되었습니다.`);
      } catch (error) {
        console.error(`사용자 생성 중 오류 발생: ${error.message}`);
        logError('사용자 생성 중 오류 발생', error, { user_id });
        return res.status(500).json({
          result: 'error',
          message: '사용자 생성 중 오류가 발생했습니다'
        });
      }
    }

    let transaction;
    let isLocalTransaction = false;
    let db;
    
    try {
      try {
        transaction = await sequelize.transaction(); // 원격 MySQL DB 트랜잭션
        db = sequelize;
        console.log('원격 MySQL 트랜잭션이 성공적으로 생성되었습니다.');
      } catch (error) {
        console.log('원격 MySQL 트랜잭션 생성 실패, 로컬 SQLite 트랜잭션을 사용합니다:', error.message);
        logError('원격 MySQL 트랜잭션 생성 실패', error);
        transaction = await localSequelize.transaction(); // 로컬 SQLite DB 트랜잭션
        db = localSequelize;
        isLocalTransaction = true;
      }
      
      const results = [];
      
      for (const info of fileInfos) {
        try {
          const { 
            file_name: originalFileName, 
            file_size, 
            sect_code = '01', 
            sect_sub = '', 
            title = '', 
            descript = '', 
            default_hash = '', 
            audio_hash = '', 
            video_hash = '',
            copyright_yn = 'N',
            adult_yn = 'N',
            webhard_hash = ''
          } = info;
          
          const file_name = encodeKoreanFilename(originalFileName);

          if (!file_name || !file_size) {
            await transaction.rollback();
            return res.status(400).json({
              result: 'error',
              message: '파일 정보에 필수 파라미터가 누락되었습니다'
            });
          }

          const category = await Category.findOne({ 
            where: { code: sect_code },
            transaction: isLocalTransaction ? null : transaction
          });
          
          if (!category) {
            await transaction.rollback();
            logError('유효하지 않은 카테고리 코드', null, { sect_code, user_id });
            return res.status(404).json({
              result: 'error',
              message: `유효하지 않은 카테고리 코드입니다: ${sect_code}`
            });
          }

          if (user.upload_policy && !user.upload_policy.includes(sect_code)) {
            await transaction.rollback();
            logError('카테고리 업로드 권한 없음', null, { user_id, sect_code, upload_policy: user.upload_policy });
            return res.status(403).json({
              result: 'error',
              message: `해당 카테고리에 업로드할 권한이 없습니다: ${sect_code}`
            });
          }

          const temp_id = Date.now() + Math.floor(Math.random() * 1000);
          const seq_no = 1; // 기본값, 실제로는 파일 수에 따라 증가
          const reg_date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const reg_time = new Date().toISOString().slice(11, 19).replace(/:/g, '');

          if (!isLocalTransaction) {
            try {
              await db.query(
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
              console.log(`T_CONTENTS_TEMP 테이블에 데이터 삽입 성공 (temp_id: ${temp_id})`);
            } catch (error) {
              console.error(`T_CONTENTS_TEMP 테이블 삽입 중 오류 발생: ${error.message}`);
              logError('T_CONTENTS_TEMP 테이블 삽입 중 오류 발생', error, { temp_id, user_id });
              throw error;
            }
          } else {
            console.log(`로컬 SQLite 모드: T_CONTENTS_TEMP 테이블 삽입 건너뜀 (temp_id: ${temp_id})`);
          }

          if (!isLocalTransaction) {
            try {
              await db.query(
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
              console.log(`T_CONTENTS_TEMPLIST 테이블에 데이터 삽입 성공 (temp_id: ${temp_id})`);
            } catch (error) {
              console.error(`T_CONTENTS_TEMPLIST 테이블 삽입 중 오류 발생: ${error.message}`);
              logError('T_CONTENTS_TEMPLIST 테이블 삽입 중 오류 발생', error, { temp_id, file_name });
              throw error;
            }
          } else {
            console.log(`로컬 SQLite 모드: T_CONTENTS_TEMPLIST 테이블 삽입 건너뜀 (temp_id: ${temp_id})`);
          }

          if (!isLocalTransaction) {
            try {
              await db.query(
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
              console.log(`T_CONTENTS_TEMPLIST_SUB 테이블에 데이터 삽입 성공 (temp_id: ${temp_id})`);
            } catch (error) {
              console.error(`T_CONTENTS_TEMPLIST_SUB 테이블 삽입 중 오류 발생: ${error.message}`);
              logError('T_CONTENTS_TEMPLIST_SUB 테이블 삽입 중 오류 발생', error, { temp_id, file_name });
              throw error;
            }
          } else {
            console.log(`로컬 SQLite 모드: T_CONTENTS_TEMPLIST_SUB 테이블 삽입 건너뜀 (temp_id: ${temp_id})`);
          }

          if (webhard_hash) {
            try {
              if (isLocalTransaction) {
                await WebhardHash.local.create({
                  seq_no,
                  cld_hash: webhard_hash,
                  id: temp_id,
                  cloud_yn: 'Y',
                  reg_date,
                  reg_time
                }, { transaction });
                console.log(`로컬 SQLite에 WebhardHash 생성 완료 (temp_id: ${temp_id})`);
              } else {
                await WebhardHash.create({
                  seq_no,
                  cld_hash: webhard_hash,
                  id: temp_id,
                  cloud_yn: 'Y',
                  reg_date,
                  reg_time
                }, { transaction });
                console.log(`WebhardHash 생성 완료 (temp_id: ${temp_id})`);
              }
            } catch (error) {
              console.error(`WebhardHash 생성 중 오류 발생: ${error.message}`);
              logError('WebhardHash 생성 중 오류 발생', error, { temp_id, webhard_hash });
            }
          }

          results.push({
            temp_id,
            seq_no,
            file_name,
            sect_code
          });
        } catch (error) {
          console.error(`파일 정보 처리 중 오류 발생: ${error.message}`);
          logError('파일 정보 처리 중 오류 발생', error, info);
          throw error;
        }
      }

      await transaction.commit();
      console.log(`트랜잭션 커밋 성공: ${results.length}개 파일 정보 등록 완료`);

      return res.status(200).json({
        result: 'success',
        message: '파일 정보가 등록되었습니다',
        files: results
      });
    } catch (error) {
      try {
        await transaction.rollback();
        console.log('트랜잭션 롤백 완료');
      } catch (rollbackError) {
        console.error('트랜잭션 롤백 중 오류 발생:', rollbackError.message);
        logError('트랜잭션 롤백 중 오류 발생', rollbackError);
      }
      console.error('Error in enrollmentFileinfo transaction:', error);
      logError('enrollmentFileinfo 트랜잭션 오류', error, { user_id, files_count: fileInfos.length });
      throw error;
    }
  } catch (error) {
    console.error('Error in enrollmentFileinfo controller:', error);
    logError('enrollmentFileinfo 컨트롤러 오류', error, req.body);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error',
      error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * 파일 필터링 (enrollment_filtering)
 * 업로드된 파일의 저작권, 뮤레카 검사 등을 수행하는 API
 */
const enrollmentFiltering = async (req, res) => {
  try {
    const { 
      temp_id, 
      user_id,
      mureka_info = null,
      copyright_info = null
    } = req.body;

    if (!temp_id || !user_id) {
      return res.status(400).json({
        result: 'error',
        message: '필수 파라미터가 누락되었습니다'
      });
    }

    console.log(`enrollmentFiltering 요청 데이터: user_id=${user_id}, temp_id=${temp_id}`);
    if (mureka_info) console.log(`뮤레카 정보: ${JSON.stringify(mureka_info)}`);
    if (copyright_info) console.log(`저작권 정보: ${JSON.stringify(copyright_info)}`);

    let transaction;
    let isLocalTransaction = false;
    let db;
    
    try {
      try {
        transaction = await sequelize.transaction(); // 원격 MySQL DB 트랜잭션
        db = sequelize;
        console.log('원격 MySQL 트랜잭션이 성공적으로 생성되었습니다.');
      } catch (error) {
        console.log('원격 MySQL 트랜잭션 생성 실패, 로컬 SQLite 트랜잭션을 사용합니다:', error.message);
        logError('원격 MySQL 트랜잭션 생성 실패', error, { temp_id, user_id });
        transaction = await localSequelize.transaction(); // 로컬 SQLite DB 트랜잭션
        db = localSequelize;
        isLocalTransaction = true;
      }
      
      if (isLocalTransaction) {
        console.log(`로컬 SQLite 모드: 필터링 작업 건너뜀 (temp_id: ${temp_id})`);
        await transaction.commit();
        return res.status(200).json({
          result: 'success',
          message: '필터링 작업이 완료되었습니다 (로컬 모드)'
        });
      }
      
      try {
        const [tempFiles] = await db.query(
          `SELECT * FROM T_CONTENTS_TEMPLIST WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );

        if (tempFiles.length === 0) {
          await transaction.rollback();
          logError('임시 파일 정보를 찾을 수 없음', null, { temp_id, user_id });
          return res.status(404).json({
            result: 'error',
            message: '임시 파일 정보를 찾을 수 없습니다'
          });
        }

        console.log(`임시 파일 정보 조회 성공: ${tempFiles.length}개 파일 (temp_id: ${temp_id})`);

        if (mureka_info) {
          const { 
            mureka_yn = 'N', 
            mureka_id = '', 
            mureka_name = '',
            mureka_album = '',
            mureka_artist = ''
          } = mureka_info;

          try {
            await db.query(
              `UPDATE T_CONTENTS_TEMPLIST SET
                mureka_yn = ?,
                mureka_id = ?,
                mureka_name = ?,
                mureka_album = ?,
                mureka_artist = ?
              WHERE id = ?`,
              {
                replacements: [
                  mureka_yn,
                  mureka_id,
                  mureka_name,
                  mureka_album,
                  mureka_artist,
                  temp_id.toString()
                ],
                transaction
              }
            );
            console.log(`뮤레카 정보 업데이트 성공 (temp_id: ${temp_id})`);
          } catch (error) {
            console.error(`뮤레카 정보 업데이트 중 오류 발생: ${error.message}`);
            logError('뮤레카 정보 업데이트 중 오류 발생', error, { temp_id, mureka_info });
            throw error;
          }
        }

        if (copyright_info) {
          const { 
            copyright_yn = 'N', 
            copyright_id = '', 
            copyright_name = ''
          } = copyright_info;

          try {
            await db.query(
              `UPDATE T_CONTENTS_TEMPLIST SET
                copyright_yn = ?,
                copyright_id = ?,
                copyright_name = ?
              WHERE id = ?`,
              {
                replacements: [
                  copyright_yn,
                  copyright_id,
                  copyright_name,
                  temp_id.toString()
                ],
                transaction
              }
            );
            console.log(`저작권 정보 업데이트 성공 (temp_id: ${temp_id})`);
          } catch (error) {
            console.error(`저작권 정보 업데이트 중 오류 발생: ${error.message}`);
            logError('저작권 정보 업데이트 중 오류 발생', error, { temp_id, copyright_info });
            throw error;
          }
        }

        await transaction.commit();
        console.log(`트랜잭션 커밋 성공: 파일 필터링 완료 (temp_id: ${temp_id})`);

        return res.status(200).json({
          result: 'success',
          temp_id,
          message: '파일 필터링이 완료되었습니다',
          filtering_result: {
            mureka_status: mureka_info ? 'completed' : 'skipped',
            copyright_status: copyright_info ? 'completed' : 'skipped'
          }
        });
      } catch (error) {
        console.error(`데이터베이스 쿼리 중 오류 발생: ${error.message}`);
        logError('데이터베이스 쿼리 중 오류 발생', error, { temp_id, user_id });
        throw error;
      }
    } catch (error) {
      try {
        await transaction.rollback();
        console.log('트랜잭션 롤백 완료');
      } catch (rollbackError) {
        console.error('트랜잭션 롤백 중 오류 발생:', rollbackError.message);
        logError('트랜잭션 롤백 중 오류 발생', rollbackError);
      }
      console.error('Error in enrollmentFiltering transaction:', error);
      logError('enrollmentFiltering 트랜잭션 오류', error, { temp_id, user_id });
      throw error;
    }
  } catch (error) {
    console.error('Error in enrollmentFiltering controller:', error);
    logError('enrollmentFiltering 컨트롤러 오류', error, req.body);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error',
      error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * 업로드 완료 (enrollment_complete)
 * 업로드 프로세스를 완료하고 임시 데이터를 실제 테이블로 이동하는 API
 */
const enrollmentComplete = async (req, res) => {
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

    console.log(`enrollmentComplete 요청 데이터: user_id=${user_id}, temp_id=${temp_id}`);

    let transaction;
    let isLocalTransaction = false;
    let db;
    
    try {
      try {
        transaction = await sequelize.transaction(); // 원격 MySQL DB 트랜잭션
        db = sequelize;
        console.log('원격 MySQL 트랜잭션이 성공적으로 생성되었습니다.');
      } catch (error) {
        console.log('원격 MySQL 트랜잭션 생성 실패, 로컬 SQLite 트랜잭션을 사용합니다:', error.message);
        logError('원격 MySQL 트랜잭션 생성 실패', error, { temp_id, user_id });
        transaction = await localSequelize.transaction(); // 로컬 SQLite DB 트랜잭션
        db = localSequelize;
        isLocalTransaction = true;
      }
      
      if (isLocalTransaction) {
        console.log(`로컬 SQLite 모드: 업로드 완료 작업 건너뜀 (temp_id: ${temp_id})`);
        await transaction.commit();
        return res.status(200).json({
          result: 'success',
          message: '업로드 완료 작업이 완료되었습니다 (로컬 모드)'
        });
      }

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
          logError('임시 파일 정보를 찾을 수 없음', null, { temp_id, user_id });
          return res.status(404).json({
            result: 'error',
            message: '임시 파일 정보를 찾을 수 없습니다'
          });
        }

        console.log(`임시 파일 정보 조회 성공: ${tempFiles.length}개 파일 (temp_id: ${temp_id})`);

        const [tempFileSubs] = await sequelize.query(
          `SELECT * FROM T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );

        if (tempFileSubs.length === 0) {
          await transaction.rollback();
          logError('임시 파일 세부 정보를 찾을 수 없음', null, { temp_id, user_id });
          return res.status(404).json({
            result: 'error',
            message: '임시 파일 세부 정보를 찾을 수 없습니다'
          });
        }

        console.log(`임시 파일 세부 정보 조회 성공: ${tempFileSubs.length}개 파일 (temp_id: ${temp_id})`);

        const [tempContents] = await sequelize.query(
          `SELECT * FROM T_CONTENTS_TEMP WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );

        if (tempContents.length === 0) {
          await transaction.rollback();
          logError('임시 컨텐츠 정보를 찾을 수 없음', null, { temp_id, user_id });
          return res.status(404).json({
            result: 'error',
            message: '임시 컨텐츠 정보를 찾을 수 없습니다'
          });
        }

        console.log(`임시 컨텐츠 정보 조회 성공 (temp_id: ${temp_id})`);

        const webhardHashes = await WebhardHash.findAll({
          where: { id: temp_id.toString() },
          transaction
        });

        console.log(`웹하드 해시 정보 조회 성공: ${webhardHashes.length}개 (temp_id: ${temp_id})`);

        const cont_id = Date.now();
        const reg_date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reg_time = new Date().toISOString().slice(11, 19).replace(/:/g, '');

        try {
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
          console.log(`T_CONTENTS_INFO 테이블에 데이터 삽입 성공 (cont_id: ${cont_id})`);
        } catch (error) {
          console.error(`T_CONTENTS_INFO 테이블 삽입 중 오류 발생: ${error.message}`);
          logError('T_CONTENTS_INFO 테이블 삽입 중 오류 발생', error, { temp_id, cont_id });
          throw error;
        }

        for (const tempFileSub of tempFileSubs) {
          try {
            const originalFileName = tempFileSub.file_name;
            const encodedFileName = encodeKoreanFilename(originalFileName);
            
            await sequelize.query(
              `INSERT INTO T_CONTENTS_FILELIST (
                id, seq_no, file_name, file_size, file_type, file_ext,
                default_hash, audio_hash, video_hash, comp_cd, chi_id, price_amt,
                mob_price_amt, reg_date, reg_time
              ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?
              )`,
              {
                replacements: [
                  cont_id.toString(),
                  tempFileSub.seq_no,
                  encodedFileName,
                  tempFileSub.file_size,
                  tempFileSub.file_type || 0,
                  tempFileSub.file_ext || '',
                  tempFileSub.default_hash || '',
                  tempFileSub.audio_hash || '',
                  tempFileSub.video_hash || '',
                  tempFileSub.comp_cd || 'WEDISK',
                  tempFileSub.chi_id || 0,
                  tempFileSub.price_amt || 0,
                  tempFileSub.mob_price_amt || 0,
                  reg_date,
                  reg_time
                ],
                transaction
              }
            );
            console.log(`T_CONTENTS_FILELIST 테이블에 데이터 삽입 성공 (cont_id: ${cont_id}, seq_no: ${tempFileSub.seq_no})`);

            const webhardHash = webhardHashes.find(hash => hash.seq_no === parseInt(tempFileSub.seq_no));
            if (webhardHash) {
              try {
                await sequelize.query(
                  `INSERT INTO T_CONT_DADAM_FILE_MAP (
                    seq_no, cld_hash, id, cloud_yn, reg_date, reg_time
                  ) VALUES (
                    ?, ?, ?, ?, ?, ?
                  )`,
                  {
                    replacements: [
                      tempFileSub.seq_no,
                      webhardHash.cld_hash,
                      cont_id.toString(),
                      webhardHash.cloud_yn,
                      reg_date,
                      reg_time
                    ],
                    transaction
                  }
                );
                console.log(`T_CONT_DADAM_FILE_MAP 테이블에 데이터 삽입 성공 (cont_id: ${cont_id}, seq_no: ${tempFileSub.seq_no})`);
              } catch (error) {
                console.error(`T_CONT_DADAM_FILE_MAP 테이블 삽입 중 오류 발생: ${error.message}`);
                logError('T_CONT_DADAM_FILE_MAP 테이블 삽입 중 오류 발생', error, { 
                  cont_id, 
                  seq_no: tempFileSub.seq_no,
                  cld_hash: webhardHash.cld_hash
                });
              }
            }
          } catch (error) {
            console.error(`파일 정보 처리 중 오류 발생: ${error.message}`);
            logError('파일 정보 처리 중 오류 발생', error, { 
              cont_id, 
              temp_id,
              file_name: tempFileSub.file_name
            });
            throw error;
          }
        }

        try {
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
          console.log(`T_CONTENTS_UPDN 테이블에 데이터 삽입 성공 (cont_id: ${cont_id})`);
        } catch (error) {
          console.error(`T_CONTENTS_UPDN 테이블 삽입 중 오류 발생: ${error.message}`);
          logError('T_CONTENTS_UPDN 테이블 삽입 중 오류 발생', error, { cont_id });
          throw error;
        }

        try {
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
          
          await WebhardHash.destroy({
            where: { id: temp_id.toString() },
            transaction
          });
          
          console.log(`임시 데이터 삭제 완료 (temp_id: ${temp_id})`);
        } catch (error) {
          console.error(`임시 데이터 삭제 중 오류 발생: ${error.message}`);
          logError('임시 데이터 삭제 중 오류 발생', error, { temp_id });
        }

        await transaction.commit();
        console.log(`트랜잭션 커밋 성공: 업로드 완료 작업 완료 (cont_id: ${cont_id})`);

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
        console.error('Error in enrollmentComplete transaction:', error);
        logError('enrollmentComplete 트랜잭션 오류', error, { temp_id, user_id });
        throw error;
      }
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback().catch(err => {
          console.error('트랜잭션 롤백 중 오류 발생:', err.message);
          logError('트랜잭션 롤백 중 오류 발생', err);
        });
      }
      console.error('Error in enrollmentComplete database operation:', error);
      logError('enrollmentComplete 데이터베이스 작업 오류', error, { temp_id, user_id });
      throw error;
    }
  } catch (error) {
    console.error('Error in enrollmentComplete controller:', error);
    logError('enrollmentComplete 컨트롤러 오류', error, req.body);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error',
      error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export { 
  getUploadPolicy, 
  getUploadAddress, 
  startUploadProcess, 
  endUploadProcess, 
  registerHash,
  enrollmentFileinfo,
  enrollmentFiltering,
  enrollmentComplete
};

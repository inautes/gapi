import { User, File, Company, WebhardHash } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { sequelize, cprSequelize, logSequelize } from '../config/database.js';
import { generateContentId } from '../utils/idGenerator.js';
import { formatIpForDatabase } from '../utils/ipUtils.js';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

/**
 * 한글 파일명을 URL 디코딩하는 함수
 * URL 인코딩된 데이터를 감지하고 EUC-KR 방식으로 디코딩, 이미 디코딩된 경우 원본 반환
 */
const decodeKoreanFilename = (text) => {
  if (!text) return '';
  
  const isEncoded = /%[0-9A-Fa-f]{2}/.test(text);
  
  if (isEncoded) {
    try {
      console.log(`[uploadController.js:decodeKoreanFilename] URL 인코딩된 데이터 감지됨: ${text}`);
      
      const bytes = [];
      let i = 0;
      
      while (i < text.length) {
        if (text[i] === '%') {
          if (i + 2 < text.length) {
            const hexValue = text.substring(i + 1, i + 3);
            const byteValue = parseInt(hexValue, 16);
            bytes.push(byteValue);
            i += 3; // %xx 건너뛰기
          } else {
            i++;
          }
        } else if (text[i] === '+') {
          bytes.push(32); // 공백 문자의 ASCII 코드
          i++;
        } else {
          bytes.push(text.charCodeAt(i));
          i++;
        }
      }
      
      const buffer = Buffer.from(bytes);
      const result = iconv.decode(buffer, 'euc-kr');
      
      console.log(`[uploadController.js:decodeKoreanFilename] EUC-KR URL 디코딩 완료: ${result}`);
      return result;
    } catch (error) {
      console.error(`[uploadController.js:decodeKoreanFilename] EUC-KR URL 디코딩 중 오류 발생: ${error.message}`);
      return text; // 오류 발생 시 원본 반환
    }
  }
  
  return text; // 이미 디코딩된 경우 원본 반환
};

const getUploadPolicy = async (req, res) => {
  try {
    console.log(`[uploadController.js:getUploadPolicy] 업로드 정책 조회 시작`);
    
    let categories = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'];
    let upload_policy = ['01', '02'];
    
    try {
      const categoriesPath = path.resolve(process.cwd(), 'src', 'config', 'categories.inf');
      const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
      
      if (categoriesData.upload_policy) {
        upload_policy = categoriesData.upload_policy;
        console.log(`[uploadController.js:getUploadPolicy] categories.inf에서 읽은 업로드 정책: ${JSON.stringify(upload_policy)}`);
      }
      
      if (categoriesData.category_info) {
        const categoryInfo = categoriesData.category_info;
        categories = Object.keys(categoryInfo);
        console.log(`[uploadController.js:getUploadPolicy] categories.inf에서 읽은 카테고리 목록: ${JSON.stringify(categories)}`);
      }
    } catch (err) {
      console.error(`[uploadController.js:getUploadPolicy] categories.inf 파일 읽기 중 오류 발생: ${err.message}`);
      console.error(`[uploadController.js:getUploadPolicy] 스택 트레이스: ${err.stack}`);
      console.log(`[uploadController.js:getUploadPolicy] 기본 업로드 정책 및 카테고리 목록을 사용합니다.`);
    }
    
    try {
      const [minorCodes] = await sequelize.query(
        `SELECT minor_code FROM zangsi.T_MINOR_CODE WHERE major_code = '01'`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (minorCodes && minorCodes.length > 0) {
        categories = minorCodes.map(code => code.minor_code);
        console.log(`[uploadController.js:getUploadPolicy] T_MINOR_CODE에서 조회한 카테고리 코드: ${JSON.stringify(categories)}`);
      }
    } catch (err) {
      console.error(`[uploadController.js:getUploadPolicy] 카테고리 코드 조회 중 오류 발생: ${err.message}`);
      console.error(`[uploadController.js:getUploadPolicy] 스택 트레이스: ${err.stack}`);
      console.log(`[uploadController.js:getUploadPolicy] 기본 카테고리 코드를 사용합니다.`);
    }
    
    
    console.log(`[uploadController.js:getUploadPolicy] 반환할 정책: ${JSON.stringify(upload_policy)}`);
    
    return res.status(200).json({
      result: 'success',
      upload_policy: upload_policy
    });
  } catch (error) {
    console.error(`[uploadController.js:getUploadPolicy] 컨트롤러 오류: ${error.message}`);
    console.error(`[uploadController.js:getUploadPolicy] 스택 트레이스: ${error.stack}`);
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
// const registerHash = async (req, res) => {
//   try {
//     const { info } = req.body;
    
//     if (!info) {
//       return res.status(400).json({
//         result: 'error',
//         message: '파일 정보가 누락되었습니다'
//       });
//     }
    
//     const fileInfos = Array.isArray(info) ? info : [info];
//     const transaction = await sequelize.transaction(); // 원격 MySQL DB 트랜잭션
    
//     try {
//       const results = [];
      
//       for (const fileInfo of fileInfos) {
//         if (!fileInfo.cont_id || !fileInfo.filename || !fileInfo.webhard_hash) {
//           throw new Error('필수 파라미터가 누락되었습니다: cont_id, filename, webhard_hash');
//         }
        
//         const [fileListRows] = await sequelize.query(
//           `SELECT seq_no FROM T_CONTENTS_FILELIST WHERE id = ? AND file_name = ?`,
//           {
//             replacements: [fileInfo.cont_id.toString(), fileInfo.filename],
//             transaction
//           }
//         );
        
//         let seq_id = 1; // 기본값
        
//         if (fileListRows.length > 0) {
//           seq_id = fileListRows[0].seq_no;
//           console.log(`T_CONTENTS_FILELIST에서 seq_id를 찾았습니다: ${seq_id}`);
//         } else {
//           console.log(`T_CONTENTS_FILELIST에서 seq_id를 찾을 수 없습니다. 기본값 1을 사용합니다.`);
//         }
        
//         const now = new Date();
//         const reg_date = now.toISOString().slice(0, 10).replace(/-/g, '');
//         const reg_time = now.toISOString().slice(11, 19).replace(/:/g, '');
        
//         const existingHash = await WebhardHash.findOne({
//           where: { 
//             seq_no: seq_id,
//             id: fileInfo.cont_id
//           },
//           transaction
//         });
        
//         if (existingHash) {
//           await existingHash.update({
//             cld_hash: fileInfo.webhard_hash,
//             cloud_yn: fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true ? 'Y' : 'N',
//             reg_date,
//             reg_time
//           }, { transaction });
          
//           console.log(`기존 웹하드 해시 정보를 업데이트했습니다: cont_id=${fileInfo.cont_id}, seq_id=${seq_id}`);
//         } else {
//           await WebhardHash.create({
//             seq_no: seq_id,
//             cld_hash: fileInfo.webhard_hash,
//             id: fileInfo.cont_id,
//             cloud_yn: fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true ? 'Y' : 'N',
//             reg_date,
//             reg_time
//           }, { transaction });
          
//           console.log(`새 웹하드 해시 정보를 생성했습니다: cont_id=${fileInfo.cont_id}, seq_id=${seq_id}`);
//         }
        
//         await sequelize.query(
//           `INSERT INTO T_CONT_DADAM_FILE_MAP (
//             seq_no, cld_hash, id, cloud_yn, reg_date, reg_time
//           ) VALUES (
//             ?, ?, ?, ?, ?, ?
//           ) ON DUPLICATE KEY UPDATE
//             cld_hash = VALUES(cld_hash),
//             cloud_yn = VALUES(cloud_yn),
//             reg_date = VALUES(reg_date),
//             reg_time = VALUES(reg_time)`,
//           {
//             replacements: [
//               seq_id,
//               fileInfo.webhard_hash,
//               fileInfo.cont_id.toString(),
//               fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true ? 'Y' : 'N',
//               reg_date,
//               reg_time
//             ],
//             transaction
//           }
//         ).catch(error => {
//           console.log('ON DUPLICATE KEY UPDATE가 지원되지 않습니다. 삭제 후 다시 삽입합니다.');
//           return sequelize.query(
//             `DELETE FROM T_CONT_DADAM_FILE_MAP WHERE seq_no = ? AND id = ?`,
//             {
//               replacements: [seq_id, fileInfo.cont_id.toString()],
//               transaction
//             }
//           ).then(() => {
//             return sequelize.query(
//               `INSERT INTO zangsi.T_CONT_DADAM_FILE_MAP (
//                 seq_no, cld_hash, id, cloud_yn, reg_date, reg_time
//               ) VALUES (
//                 ?, ?, ?, ?, ?, ?
//               )`,
//               {
//                 replacements: [
//                   seq_id,
//                   fileInfo.webhard_hash,
//                   fileInfo.cont_id.toString(),
//                   fileInfo.cloud_yn === 'y' || fileInfo.cloud_yn === true ? 'Y' : 'N',
//                   reg_date,
//                   reg_time
//                 ],
//                 transaction
//               }
//             );
//           });
//         });
        
//         results.push({
//           cont_id: fileInfo.cont_id,
//           seq_id: seq_id,
//           filename: fileInfo.filename,
//           webhard_hash: fileInfo.webhard_hash
//         });
//       }
      
//       await transaction.commit();
//       console.log(`${results.length} 파일의 웹하드 해시 정보가 저장되었습니다`);
      
//       return res.status(200).json({
//         result: 'success',
//         message: '모든 웹하드 해시 정보가 저장되었습니다',
//         files: results
//       });
//     } catch (error) {
//       await transaction.rollback();
//       console.error('Error in registerHash transaction:', error);
//       let errorMessage = error.message;
//       if (errorMessage.includes('ER_NO_REFERENCED_ROW') || errorMessage.includes('ER_ROW_IS_REFERENCED')) {
//         errorMessage = 'DB 제약 조건 오류: 외래 키 제약 조건이 실패했습니다';
//       } else if (errorMessage.includes('ER_DUP_ENTRY')) {
//         errorMessage = 'DB 제약 조건 오류: 중복된 항목이 존재합니다';
//       }
//       console.error(`에러 상세 정보: ${JSON.stringify(fileInfos)}`);
      
//       return res.status(400).json({
//         result: 'error',
//         message: errorMessage
//       });
//     }
//   } catch (error) {
//     console.error('Error in registerHash controller:', error);
//     return res.status(500).json({
//       result: 'error',
//       message: error.message || 'Internal server error'
//     });
//   }
// };

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
const enrollmentFileinfo = async (req, res) => {
  try {
    console.log(`[uploadController.js:enrollmentFileinfo] 파일 정보 등록 시작`);
    const { user_id, files } = req.body;
    
    const file_info = req.body.file_info || files;

    if (!user_id || !file_info) {
      console.error(`[uploadController.js:enrollmentFileinfo] 필수 파라미터 누락: user_id=${user_id}, file_info=${!!file_info}`);
      return res.status(400).json({
        result: 'error',
        message: '필수 파라미터가 누락되었습니다'
      });
    }

    const fileInfos = Array.isArray(file_info) ? file_info : [file_info];
    
    let responseTemp_id;
    
    try {
      console.log(`[uploadController.js:enrollmentFileinfo] 사용자 '${user_id}' 권한 확인 중`);
      const [userResults] = await sequelize.query(
        `SELECT user_id FROM zangsi.T_PERM_UPLOAD_AUTH 
         WHERE user_id = ? LIMIT 1`,
        {
          replacements: [user_id]
        }
      );
      
      if (!(userResults && userResults.length > 0)) {
        console.error(`[uploadController.js:enrollmentFileinfo] 사용자 '${user_id}' 권한 없음`);
        return res.status(404).json({
          result: 'error',
          message: `사용자 '${user_id}'를 찾을 수 없습니다. 업로드 권한이 없습니다.`
        });
      }
    } catch (error) {
      console.error(`[uploadController.js:enrollmentFileinfo] 사용자 조회 중 오류 발생: ${error.message}`);
      console.error(`[uploadController.js:enrollmentFileinfo] 스택 트레이스: ${error.stack}`);
      return res.status(500).json({
        result: 'error',
        message: '사용자 정보 조회 중 오류가 발생했습니다'
      });
    }

    let transaction;
    try {
      transaction = await sequelize.transaction();
      console.log('원격 MySQL 트랜잭션이 성공적으로 생성되었습니다.');
      
      const results = [];
      
      for (const info of fileInfos) {
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
          webhard_hash = '',
          content_number,
          content_info = {}
        } = info;
        

        const file_name = decodeKoreanFilename(originalFileName);
        console.log(`[uploadController.js:enrollmentFileinfo] 원본 파일명: ${originalFileName}, 디코딩된 파일명: ${file_name}`);

        
        const {
          folder_yn = 'N',
          file_path: originalFilePath = '',
          file_name1: originalFileName1 = '',
          file_name2: originalFileName2 = originalFileName, // 원본 파일명 사용
          file_type = '',
          file_reso_x = 0,
          file_reso_y = 0,
          dsp_file_cnt = 0,
          down_cnt = 0,
          price_amt = 0,
          won_mega = 0,
          share_meth = 'N',
          // disp_end_date = '',
          // disp_end_time = '',
          // disp_stat = '',
          // file_del_yn = 'N',
          server_id = 'CLOUD',
          // up_st_date와 up_st_time은 T_CONTENTS_TEMP 테이블에 존재하지 않으므로 SQL 쿼리에서 제외
          // up_st_date = reg_date,
          // up_st_time = reg_time,
          keyword = '',
          comp_cd = 'WEDISK', // T_CONTENTS_TEMPLIST_SUB 테이블에 필요한 변수 (SQL 쿼리에서는 제외)
          chi_id = 0 // T_CONTENTS_TEMPLIST_SUB 테이블에 필요한 변수
        } = content_info || {};
        

        const file_path = decodeKoreanFilename(originalFilePath);
        const file_name1 = decodeKoreanFilename(originalFileName1);
        const file_name2 = decodeKoreanFilename(originalFileName2);

        
        console.log(`[uploadController.js:enrollmentFileinfo] 파일 경로: 원본=${originalFilePath}, 디코딩=${file_path}`);
        console.log(`[uploadController.js:enrollmentFileinfo] 파일명1: 원본=${originalFileName1}, 디코딩=${file_name1}`);
        console.log(`[uploadController.js:enrollmentFileinfo] 파일명2: 원본=${originalFileName2}, 디코딩=${file_name2}`);

        if (!file_name || !file_size) {
          await transaction.rollback();
          return res.status(400).json({
            result: 'error',
            message: '파일 정보에 필수 파라미터가 누락되었습니다'
          });
        }



        let temp_id;
        let tempContents = [];
        
        if (content_number) {
          temp_id = content_number;
          responseTemp_id = content_number; // 응답용 temp_id 변수 업데이트
          
          try {
            const [queryResults] = await sequelize.query(
              `SELECT id FROM zangsi.T_CONTENTS_TEMP WHERE id = ? LIMIT 1`,
              {
                replacements: [content_number.toString()],
                transaction
              }
            );
            
            tempContents = queryResults;
            
            if (tempContents.length === 0) {
              console.log(`[uploadController.js:enrollmentFileinfo] 컨텐츠 ID ${content_number}에 대한 T_CONTENTS_TEMP 레코드가 존재하지 않습니다. 새로 생성합니다.`);
            } else {
              console.log(`[uploadController.js:enrollmentFileinfo] 컨텐츠 ID ${content_number}에 대한 T_CONTENTS_TEMP 레코드가 존재합니다.`);
            }
          } catch (error) {
            console.error(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMP 확인 중 오류 발생: ${error.message}`);
            console.error(`[uploadController.js:enrollmentFileinfo] 스택 트레이스: ${error.stack}`);
          }
        } else {
          temp_id = Date.now() + Math.floor(Math.random() * 1000);
          responseTemp_id = temp_id; // 응답용 temp_id 변수 업데이트
        }
        
        let seq_no = 1; // 기본값, 실제로는 파일 수에 따라 증가
        const reg_date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reg_time = new Date().toISOString().slice(11, 19).replace(/:/g, '');
        

        if (tempContents.length === 0) {
          console.log(`[uploadController.js:enrollmentFileinfo] 컨텐츠 ID ${temp_id}에 대한 T_CONTENTS_TEMP 레코드 생성`);
          await sequelize.query(
            `INSERT INTO zangsi.T_CONTENTS_TEMP (
              id, title, descript, descript2, descript3, keyword,
              sect_code, sect_sub, adult_yn, share_meth, price_amt, won_mega,
              reg_user, reg_date, reg_time, item_bold_yn,
              item_color, req_id, editor_type, server_id
            ) VALUES (
              ?, ?, ?, '', '', ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, 'N',
              'N', 0, 0, ?
            )`,
            {
              replacements: [
                temp_id.toString(),
                title,
                descript,
                keyword,
                sect_code,
                sect_sub,
                adult_yn,
                share_meth,
                price_amt,
                won_mega,
                user_id,
                reg_date,
                reg_time,
                server_id
              ],
              transaction
            }
          );
        } else {
          console.log(`[uploadController.js:enrollmentFileinfo] 컨텐츠 ID ${temp_id}에 대한 T_CONTENTS_TEMP 레코드 업데이트`);
          await sequelize.query(
            `UPDATE zangsi.T_CONTENTS_TEMP SET
              title = ?,
              descript = ?,
              keyword = ?,
              sect_code = ?,
              sect_sub = ?,
              adult_yn = ?,
              share_meth = ?,
              price_amt = ?,
              won_mega = ?,
              server_id = ?
            WHERE id = ?`,
            {
              replacements: [
                title,
                descript,
                keyword,
                sect_code,
                sect_sub,
                adult_yn,
                share_meth,
                price_amt,
                won_mega,
                server_id,
                temp_id.toString()
              ],
              transaction
            }
          );
        }

        try {
          console.log(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST에 데이터 저장/업데이트 중: id=${temp_id}`);
          
          const [tempListExists] = await sequelize.query(
            `SELECT id, seq_no FROM zangsi.T_CONTENTS_TEMPLIST 
             WHERE id = ? AND seq_no = ? LIMIT 1`,
            {
              replacements: [temp_id.toString(), seq_no.toString()],
              transaction
            }
          );
          
          if (tempListExists.length === 0) {
            console.log(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST에 새 레코드 생성: id=${temp_id}, seq_no=${seq_no}, file_name=${file_name}`);
            
            await sequelize.query(
              `INSERT INTO zangsi.T_CONTENTS_TEMPLIST (
                id, seq_no, folder_yn, file_name, file_size, file_type,
                reg_user, reg_date, reg_time, default_hash, audio_hash, video_hash,
                copyright_yn, server_group_id
              ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?
              )`,
              {
                replacements: [
                  temp_id.toString(),
                  seq_no.toString(),
                  folder_yn,
                  file_name,
                  file_size,
                  file_type || '2',
                  user_id,
                  reg_date,
                  reg_time,
                  default_hash || '',
                  audio_hash || '',
                  video_hash || '',
                  copyright_yn,
                  server_id
                ],
                transaction
              }
            );
          } else {
            console.log(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST 기존 레코드 업데이트: id=${temp_id}, seq_no=${seq_no}, file_name=${file_name}`);
            
            await sequelize.query(
              `UPDATE zangsi.T_CONTENTS_TEMPLIST SET
                folder_yn = ?,
                file_name = ?,
                file_size = ?,
                file_type = ?,
                reg_user = ?,
                reg_date = ?,
                reg_time = ?,
                default_hash = ?,
                audio_hash = ?,
                video_hash = ?,
                copyright_yn = ?,
                server_group_id = ?
              WHERE id = ? AND seq_no = ?`,
              {
                replacements: [
                  folder_yn,
                  file_name,
                  file_size,
                  file_type || '2',
                  user_id,
                  reg_date,
                  reg_time,
                  default_hash || '',
                  audio_hash || '',
                  video_hash || '',
                  copyright_yn,
                  server_id,
                  temp_id.toString(),
                  seq_no.toString()
                ],
                transaction
              }
            );
          }
          
          console.log(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST 처리 완료: id=${temp_id}, seq_no=${seq_no}`);
        } catch (error) {
          console.error(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST 처리 중 오류 발생: ${error.message}`);
          console.error(`[uploadController.js:enrollmentFileinfo] 스택 트레이스: ${error.stack}`);
          throw new Error(`T_CONTENTS_TEMPLIST 처리 중 오류 발생: ${error.message}`);
        }

        try {
          const [maxSeqNoResult] = await sequelize.query(
            `SELECT MAX(seq_no) as max_seq_no FROM zangsi.T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
            {
              replacements: [temp_id.toString()],
              transaction
            }
          );
          
          let next_seq_no = 48130241;
          if (maxSeqNoResult.length > 0 && maxSeqNoResult[0].max_seq_no) {
            next_seq_no = parseInt(maxSeqNoResult[0].max_seq_no, 10) + 1;
            console.log(`[uploadController.js:enrollmentFileinfo] 컨텐츠 ID ${temp_id}에 대한 최대 seq_no: ${maxSeqNoResult[0].max_seq_no}, 다음 seq_no: ${next_seq_no}`);
          } else {
            console.log(`[uploadController.js:enrollmentFileinfo] 컨텐츠 ID ${temp_id}에 대한 seq_no가 없습니다. 기본값 ${next_seq_no}을 사용합니다.`);
          }
          
          const [tempListSubExists] = await sequelize.query(
            `SELECT seq_no FROM zangsi.T_CONTENTS_TEMPLIST_SUB 
             WHERE id = ? AND file_size = ? AND default_hash = ? LIMIT 1`,
            {
              replacements: [temp_id.toString(), file_size, default_hash],
              transaction
            }
          );
          
          if (tempListSubExists.length === 0) {
            console.log(`[uploadController.js:enrollmentFileinfo] 컨텐츠 ID ${temp_id}에 대한 T_CONTENTS_TEMPLIST_SUB 레코드가 존재하지 않습니다. 새로 생성합니다.`);
            
            const insertParams = [
              temp_id.toString(), 
              folder_yn, 
              file_path, 
              file_name,
              file_size, 
              file_type || '2', 
            ];
            
            console.log(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST_SUB SQL 파라미터: ${JSON.stringify(insertParams)}`);
            
            const sqlParams = [
              user_id || '', 
              reg_date || '', 
              reg_time || '', 
              default_hash || '', 
              audio_hash || '', 
              video_hash || '', 
              copyright_yn || 'N', 
              server_id || ''
            ];
            console.log(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST_SUB SQL 파라미터 2: ${JSON.stringify(sqlParams)}`);
            
            try {
              await sequelize.query(
                `INSERT INTO zangsi.T_CONTENTS_TEMPLIST_SUB (
                  id, depth, folder_yn, folder_path, 
                  file_name, file_size, file_type, reg_user, 
                  reg_date, reg_time, default_hash, audio_hash, 
                  video_hash, copyright_yn, file_id, server_group_id
                ) VALUES (
                  ?, 0, ?, ?,
                  ?, ?, ?, ?,
                  ?, ?, ?, ?,
                  ?, ?, NULL, ?
                )`,
                {
                  replacements: [
                    temp_id.toString(),        // id: 문자열로 변환
                    folder_yn || 'N',          // folder_yn: 기본값 'N'
                    file_path || '',           // folder_path: 빈 문자열 기본값 설정
                    file_name || '',           // file_name: 빈 문자열 기본값 설정
                    typeof file_size === 'number' ? file_size : parseInt(file_size, 10) || 0,  // file_size: 숫자 타입 보장
                    file_type || '2',          // file_type: 기본값 '2'
                    user_id || '',             // reg_user: 빈 문자열 기본값 설정
                    reg_date || '',            // reg_date: 빈 문자열 기본값 설정
                    reg_time || '',            // reg_time: 빈 문자열 기본값 설정
                    default_hash || '',        // default_hash: 빈 문자열 기본값 설정
                    audio_hash || '',          // audio_hash: 빈 문자열 기본값 설정
                    video_hash || '',          // video_hash: 빈 문자열 기본값 설정
                    copyright_yn || 'N',       // copyright_yn: 기본값 'N'
                    server_id || ''            // server_group_id: 빈 문자열 기본값 설정
                  ],
                  transaction
                }
              );
              
              const [insertedRecord] = await sequelize.query(
                `SELECT seq_no FROM zangsi.T_CONTENTS_TEMPLIST_SUB 
                 WHERE id = ? AND file_size = ? AND default_hash = ? 
                 ORDER BY seq_no DESC LIMIT 1`,
                {
                  replacements: [temp_id.toString(), file_size, default_hash],
                  transaction
                }
              );
              
              if (insertedRecord.length > 0) {
                seq_no = insertedRecord[0].seq_no;
                console.log(`[uploadController.js:enrollmentFileinfo] 자동 생성된 seq_no: ${seq_no}`);
              } else {
                console.error(`[uploadController.js:enrollmentFileinfo] 자동 생성된 seq_no를 조회할 수 없습니다.`);
              }
            } catch (error) {
              console.error(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST_SUB 삽입 중 오류 발생: ${error.message}`);
              console.error(`[uploadController.js:enrollmentFileinfo] 스택 트레이스: ${error.stack}`);
              
              if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
                console.error(`[uploadController.js:enrollmentFileinfo] 유효성 검사 오류 유형: ${error.name}`);
                if (error.errors && error.errors.length > 0) {
                  error.errors.forEach((e, i) => {
                    console.error(`[uploadController.js:enrollmentFileinfo] 오류 ${i+1}: 필드=${e.path}, 값=${e.value}, 이유=${e.message}`);
                  });
                }
              }
              
              throw error;
            }
          } else {
            console.log(`[uploadController.js:enrollmentFileinfo] 컨텐츠 ID ${temp_id}에 대한 T_CONTENTS_TEMPLIST_SUB 레코드가 존재합니다. 업데이트합니다.`);
            
            const updateParams = [
              file_name,
              file_path,
              default_hash,
              audio_hash,
              video_hash,
              copyright_yn,
              reg_date,
              reg_time,
              server_id,
              temp_id.toString(),
              tempListSubExists[0].seq_no.toString()
            ];
            console.log(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST_SUB 업데이트 파라미터: ${JSON.stringify(updateParams)}`);
            
            try {
              await sequelize.query(
                `UPDATE zangsi.T_CONTENTS_TEMPLIST_SUB SET
                  file_name = ?,
                  file_type = '2',
                  folder_path = ?,
                  default_hash = ?,
                  audio_hash = ?,
                  video_hash = ?,
                  copyright_yn = ?,
                  reg_date = ?,
                  reg_time = ?,
                  server_group_id = ?
                WHERE id = ? AND seq_no = ?`,
                {
                  replacements: [
                    file_name || '',           // file_name: 빈 문자열 기본값 설정
                    file_path || '',           // folder_path: 빈 문자열 기본값 설정
                    default_hash || '',        // default_hash: 빈 문자열 기본값 설정
                    audio_hash || '',          // audio_hash: 빈 문자열 기본값 설정
                    video_hash || '',          // video_hash: 빈 문자열 기본값 설정
                    copyright_yn || 'N',       // copyright_yn: 기본값 'N'
                    reg_date || '',            // reg_date: 빈 문자열 기본값 설정
                    reg_time || '',            // reg_time: 빈 문자열 기본값 설정
                    server_id || '',           // server_group_id: 빈 문자열 기본값 설정
                    temp_id.toString(),        // id: 문자열로 변환
                    tempListSubExists[0].seq_no.toString() // seq_no: 문자열로 변환
                  ],
                  transaction
                }
              );
            } catch (error) {
              console.error(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST_SUB 업데이트 중 오류 발생: ${error.message}`);
              console.error(`[uploadController.js:enrollmentFileinfo] 스택 트레이스: ${error.stack}`);
              
              if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
                console.error(`[uploadController.js:enrollmentFileinfo] 유효성 검사 오류 유형: ${error.name}`);
                if (error.errors && error.errors.length > 0) {
                  error.errors.forEach((e, i) => {
                    console.error(`[uploadController.js:enrollmentFileinfo] 오류 ${i+1}: 필드=${e.path}, 값=${e.value}, 이유=${e.message}`);
                  });
                }
              }
              
              throw error;
            }
          }
        } catch (error) {
          console.error(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST_SUB 확인 중 오류 발생: ${error.message}`);
          console.error(`[uploadController.js:enrollmentFileinfo] 스택 트레이스: ${error.stack}`);
          throw new Error(`T_CONTENTS_TEMPLIST_SUB 처리 중 오류 발생: ${error.message}`);
        }

        let actual_seq_no = seq_no;
        try {
          const [tempListResult] = await sequelize.query(
            `SELECT seq_no FROM zangsi.T_CONTENTS_TEMPLIST WHERE id = ? LIMIT 1`,
            {
              replacements: [temp_id.toString()],
              transaction
            }
          );
          
          if (tempListResult.length > 0) {
            actual_seq_no = tempListResult[0].seq_no;
          }
        } catch (error) {
          console.error('seq_no 조회 중 오류 발생:', error.message);
        }

        results.push({
          seq_no: actual_seq_no,
          default_hash: default_hash || '',
          webhard_hash: webhard_hash || '',
          server_id: server_id || 'CLOUD',
          server_path: file_path || `/raid/fdata/wedisk/${reg_date.substring(0, 4)}/${reg_date.substring(4, 6)}/${reg_date.substring(6, 8)}/${reg_time ? reg_time.substring(0, 2) : '00'}/temp${temp_id}`
        });
      }

      await transaction.commit();

      const responseJson = {
        result: 'success',
        message: 'File information has been successfully registered',
        temp_id: responseTemp_id,
        data: results
      };
      
      console.log(`[uploadController.js:enrollmentFileinfo] Response JSON: ${JSON.stringify(responseJson, null, 2)}`);
      
      return res.status(200).json(responseJson);
    } catch (error) {
      try {
        if (transaction) await transaction.rollback();
      } catch (rollbackError) {
        console.error('트랜잭션 롤백 중 오류 발생:', rollbackError.message);
      }
      console.error('Error in enrollmentFileinfo transaction:', error);
      return res.status(500).json({
        result: 'error',
        message: error.message || 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Error in enrollmentFileinfo controller:', error);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error'
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
      copyright_info = null,
      filtering_results = null
    } = req.body;

    if (!temp_id || !user_id) {
      return res.status(400).json({
        result: 'error',
        message: '필수 파라미터가 누락되었습니다'
      });
    }

    let transaction;
    
    try {
      try {
        transaction = await sequelize.transaction();
        console.log('[uploadController.js:enrollmentFiltering] 트랜잭션이 성공적으로 생성되었습니다.');
      } catch (error) {
        console.error('[uploadController.js:enrollmentFiltering] 트랜잭션 생성 실패:', error.message);
        console.error('[uploadController.js:enrollmentFiltering] 스택 트레이스:', error.stack);
        return res.status(500).json({
          result: 'error',
          message: '데이터베이스 연결 오류가 발생했습니다'
        });
      }
      
      const [tempFiles] = await sequelize.query(
        `SELECT * FROM zangsi.T_CONTENTS_TEMPLIST WHERE id = ?`,
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

      if (filtering_results && Array.isArray(filtering_results) && filtering_results.length > 0) {
        console.log(`[uploadController.js:enrollmentFiltering] Processing filtering results: ${filtering_results.length} items`);
        
        const [tempListSubs] = await sequelize.query(
          `SELECT seq_no, file_name, file_size, default_hash FROM zangsi.T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );
        
        const existingSeqNos = new Map();
        if (tempListSubs && tempListSubs.length > 0) {
          for (const sub of tempListSubs) {
            existingSeqNos.set(sub.seq_no.toString(), sub);
          }
        }
        
        const [existingMurekaRecords] = await sequelize.query(
          `SELECT seq_no FROM zangsi.T_CONTENTS_TEMPLIST_MUREKA WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );
        
        const existingMurekaSeqNos = new Set();
        if (existingMurekaRecords && existingMurekaRecords.length > 0) {
          for (const record of existingMurekaRecords) {
            existingMurekaSeqNos.add(record.seq_no.toString());
          }
        }
        
        // Store video_status in T_CONTENTS_TEMP for later use in enrollmentComplete
        if (filtering_results.length > 0) {
          const firstResult = filtering_results[0];
          const video_status = firstResult.video_status || '';
          
          console.log(`[uploadController.js:enrollmentFiltering] video_status 값을 T_CONTENTS_TEMP에 저장: ${video_status}`);
          
          await sequelize.query(
            `UPDATE zangsi.T_CONTENTS_TEMP SET video_status = ? WHERE id = ?`,
            {
              replacements: [video_status, temp_id.toString()],
              transaction
            }
          );
        }

        for (const filterResult of filtering_results) {
          const { 
            seq_no = 0, 
            file_name = '', 
            mureka_hash = '',
            result_code = 0,
            file_gubun = 2,
            video_id = '',
            video_title = '',
            video_right_name = '',
            video_right_content_id = '',
            video_grade = '',
            video_price = '',
            video_cha = '',
            video_osp_jibun = '',
            video_osp_etc = '',
            video_onair_date = '',
            video_right_id = '',
            video_status = '',
            video_jejak_year = ''
          } = filterResult;
          
          const decoded_file_name = decodeKoreanFilename(file_name);
          const decoded_video_title = decodeKoreanFilename(video_title);
          const decoded_video_right_name = decodeKoreanFilename(video_right_name);
          
          console.log(`[uploadController.js:enrollmentFiltering] Processing filtering result: seq_no=${seq_no}, file_name=${decoded_file_name}`);
          
          let actual_seq_no = seq_no;
          const tempListSub = existingSeqNos.get(seq_no.toString());
          if (!tempListSub) {
            const [maxSeqNoResult] = await sequelize.query(
              `SELECT MAX(seq_no) as max_seq_no FROM zangsi.T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
              {
                replacements: [temp_id.toString()],
                transaction
              }
            );
            
            if (maxSeqNoResult.length > 0 && maxSeqNoResult[0].max_seq_no) {
              actual_seq_no = parseInt(maxSeqNoResult[0].max_seq_no, 10) + 1;
              console.log(`[uploadController.js:enrollmentFiltering] 컨텐츠 ID ${temp_id}에 대한 최대 seq_no: ${maxSeqNoResult[0].max_seq_no}, 다음 seq_no: ${actual_seq_no}`);
            } else {
              actual_seq_no = 48130450;
              console.log(`[uploadController.js:enrollmentFiltering] 컨텐츠 ID ${temp_id}에 대한 seq_no가 없습니다. 기본값 ${actual_seq_no}을 사용합니다.`);
            }
          }
          
          if (existingMurekaSeqNos.has(actual_seq_no.toString())) {
            await sequelize.query(
              `UPDATE zangsi.T_CONTENTS_TEMPLIST_MUREKA SET
                file_gubun = ?,
                result_code = ?,
                video_status = ?,
                video_id = ?,
                video_title = ?,
                video_jejak_year = ?,
                video_right_name = ?,
                video_right_content_id = ?,
                video_grade = ?,
                video_price = ?,
                video_cha = ?,
                video_osp_jibun = ?,
                video_osp_etc = ?,
                video_onair_date = ?,
                video_right_id = ?,
                mureka_hash = ?,
                file_name = ?
              WHERE id = ? AND seq_no = ?`,
              {
                replacements: [
                  file_gubun,
                  result_code,
                  video_status,
                  video_id,
                  decoded_video_title,
                  video_jejak_year,
                  decoded_video_right_name,
                  video_right_content_id,
                  video_grade,
                  video_price,
                  video_cha,
                  video_osp_jibun,
                  video_osp_etc,
                  video_onair_date,
                  video_right_id,
                  mureka_hash,
                  decoded_file_name,
                  temp_id.toString(),
                  actual_seq_no.toString()
                ],
                transaction
              }
            );
          } else {
            await sequelize.query(
              `INSERT INTO zangsi.T_CONTENTS_TEMPLIST_MUREKA (
                seq_no, id, file_gubun, result_code, video_status, video_id, 
                video_title, video_jejak_year, video_right_name, video_right_content_id,
                video_grade, video_price, video_cha, video_osp_jibun, video_osp_etc,
                video_onair_date, video_right_id, mureka_hash, file_name
              ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?
              )`,
              {
                replacements: [
                  actual_seq_no.toString(),
                  temp_id.toString(),
                  file_gubun,
                  result_code,
                  video_status,
                  video_id,
                  decoded_video_title,
                  video_jejak_year,
                  decoded_video_right_name,
                  video_right_content_id,
                  video_grade,
                  video_price,
                  video_cha,
                  video_osp_jibun,
                  video_osp_etc,
                  video_onair_date,
                  video_right_id,
                  mureka_hash,
                  decoded_file_name
                ],
                transaction
              }
            );
            existingMurekaSeqNos.add(actual_seq_no.toString());
          }
        }
        
        console.log(`[uploadController.js:enrollmentFiltering] Filtering results have been processed successfully for temp_id: ${temp_id}`);
      }

      if (mureka_info) {
        const { 
          mureka_yn = 'N', 
          mureka_id = '', 
          mureka_name = '',
          mureka_album = '',
          mureka_artist = ''
        } = mureka_info;
        
        const decoded_mureka_name = decodeKoreanFilename(mureka_name);
        const decoded_mureka_artist = decodeKoreanFilename(mureka_artist);
        const decoded_mureka_album = decodeKoreanFilename(mureka_album);
        
        console.log(`[uploadController.js:enrollmentFiltering] 디코딩된 mureka_name: ${decoded_mureka_name}`);
        console.log(`[uploadController.js:enrollmentFiltering] 디코딩된 mureka_artist: ${decoded_mureka_artist}`);
        console.log(`[uploadController.js:enrollmentFiltering] 디코딩된 mureka_album: ${decoded_mureka_album}`);

        // copyright_yn 컬럼만 업데이트
        await sequelize.query(
          `UPDATE zangsi.T_CONTENTS_TEMPLIST SET
            copyright_yn = ?
          WHERE id = ?`,
          {
            replacements: [
              mureka_yn,
              temp_id.toString()
            ],
            transaction
          }
        );
        
        const [existingMurekaRecords] = await sequelize.query(
          `SELECT seq_no FROM zangsi.T_CONTENTS_TEMPLIST_MUREKA WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );
        
        for (const tempFile of tempFiles) {
          const seq_no = tempFile.seq_no;
          const file_name = tempFile.file_name || '';
          const mureka_hash = tempFile.default_hash || '';
          
          const existingRecord = existingMurekaRecords.find(record => record.seq_no === seq_no);
          
          if (existingRecord) {
            await sequelize.query(
              `UPDATE zangsi.T_CONTENTS_TEMPLIST_MUREKA SET
                file_gubun = ?,
                result_code = ?,
                video_id = ?,
                video_title = ?,
                video_right_name = ?,
                mureka_hash = ?,
                file_name = ?
              WHERE id = ? AND seq_no = ?`,
              {
                replacements: [
                  1, // file_gubun
                  0, // result_code
                  mureka_id,
                  decoded_mureka_name,
                  decoded_mureka_artist,
                  mureka_hash,
                  file_name,
                  temp_id.toString(),
                  seq_no
                ],
                transaction
              }
            );
          } else {
            await sequelize.query(
              `INSERT INTO zangsi.T_CONTENTS_TEMPLIST_MUREKA (
                seq_no, id, file_gubun, result_code, 
                video_id, video_title, video_right_name,
                mureka_hash, file_name
              ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?
              )`,
              {
                replacements: [
                  seq_no,
                  temp_id.toString(),
                  1, // file_gubun
                  0, // result_code
                  mureka_id,
                  decoded_mureka_name,
                  decoded_mureka_artist,
                  mureka_hash,
                  decodeKoreanFilename(file_name)
                ],
                transaction
              }
            );
          }
        }
        
        console.log(`[uploadController.js:enrollmentFiltering] Mureka 정보가 T_CONTENTS_TEMPLIST_MUREKA 테이블에 저장되었습니다. ID: ${temp_id}`);
      }

      if (copyright_info) {
        const { 
          copyright_yn = 'N', 
          copyright_id = '', 
          copyright_name = ''
        } = copyright_info;
        
        const decoded_copyright_name = decodeKoreanFilename(copyright_name);
        
        console.log(`[uploadController.js:enrollmentFiltering] 디코딩된 copyright_name: ${decoded_copyright_name}`);

        // copyright_yn 컬럼만 업데이트
        await sequelize.query(
          `UPDATE zangsi.T_CONTENTS_TEMPLIST SET
            copyright_yn = ?
          WHERE id = ?`,
          {
            replacements: [
              copyright_yn,
              temp_id.toString()
            ],
            transaction
          }
        );
      }

      await transaction.commit();

      return res.status(200).json({
        result: 'success',
        temp_id,
        message: 'File filtering has been completed',
        filtering_result: {
          mureka_status: mureka_info ? 'completed' : 'skipped',
          copyright_status: copyright_info ? 'completed' : 'skipped',
          video_status: filtering_results && filtering_results.length > 0 ? 'completed' : 'skipped'
        }
      });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[uploadController.js:enrollmentFiltering] 트랜잭션 롤백 중 오류 발생:', rollbackError.message);
        console.error('[uploadController.js:enrollmentFiltering] 롤백 스택 트레이스:', rollbackError.stack);
      }
      console.error('[uploadController.js:enrollmentFiltering] 트랜잭션 오류:', error.message);
      console.error('[uploadController.js:enrollmentFiltering] 스택 트레이스:', error.stack);
      throw error;
    }
  } catch (error) {
    console.error('[uploadController.js:enrollmentFiltering] 컨트롤러 오류:', error.message);
    console.error('[uploadController.js:enrollmentFiltering] 스택 트레이스:', error.stack);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error'
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
      files = []
    } = req.body;

    const firstFile = files[0] || {};
    const {
      sect_code = '01',
      sect_sub = '',
      adult_yn = 'N',
      copyright_yn = 'N',
      mobservice_yn = 'Y',
      webhard_hash = ''
    } = firstFile;

    if (!temp_id || !user_id) {
      return res.status(400).json({
        result: 'error',
        message: '필수 파라미터가 누락되었습니다'
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        result: 'error',
        message: 'files 배열이 누락되었거나 비어있습니다'
      });
    }

    console.log(`[uploadController.js:enrollmentComplete] 추출된 메타데이터: sect_code=${sect_code}, sect_sub=${sect_sub}, adult_yn=${adult_yn}, copyright_yn=${copyright_yn}`);

    let transaction;
    
    try {
      try {
        transaction = await sequelize.transaction();
        console.log('[uploadController.js:enrollmentComplete] 트랜잭션이 성공적으로 생성되었습니다.');
      } catch (error) {
        console.error('[uploadController.js:enrollmentComplete] 트랜잭션 생성 실패:', error.message);
        console.error('[uploadController.js:enrollmentComplete] 스택 트레이스:', error.stack);
        return res.status(500).json({
          result: 'error',
          message: '데이터베이스 연결 오류가 발생했습니다'
        });
      }

      try {
        const [tempFiles] = await sequelize.query(
          `SELECT * FROM zangsi.T_CONTENTS_TEMPLIST WHERE id = ?`,
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
          `SELECT * FROM zangsi.T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
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
          `SELECT *, video_status FROM zangsi.T_CONTENTS_TEMP WHERE id = ?`,
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
        
        const [tempMurekaRecords] = await sequelize.query(
          `SELECT * FROM zangsi.T_CONTENTS_TEMPLIST_MUREKA WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );
        
        console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_TEMPLIST_MUREKA 테이블에서 ${tempMurekaRecords.length}개의 레코드를 조회했습니다.`);

        const cont_id = await generateContentId(transaction);
        
        console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_ID 테이블에서 생성된 cont_id: ${cont_id}`);
        
        const MAX_INT_UNSIGNED = 4294967295;
        if (cont_id <= 0 || cont_id > MAX_INT_UNSIGNED) {
          throw new Error(`생성된 ID(${cont_id})가 unsigned int(11) 범위(0-${MAX_INT_UNSIGNED})를 벗어났습니다.`);
        }

        const reg_date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reg_time = new Date().toISOString().slice(11, 19).replace(/:/g, '');

        await sequelize.query(
          `INSERT INTO zangsi.T_CONTENTS_INFO (
            id, title, descript, descript2, descript3, keyword,
            sect_code, sect_sub, adult_yn, share_meth, price_amt, won_mega,
            reg_user, reg_date, reg_time, disp_end_date, disp_end_time, item_bold_yn,
            item_color, bomul_id, bomul_stat, req_id, editor_type, nmnt_cnt, disp_cnt_inc
          ) SELECT 
            ?, title, descript, descript2, descript3, keyword,
            ?, ?, ?, share_meth, price_amt, won_mega,
            reg_user, ?, ?, '', '', item_bold_yn,
            item_color, 0, 0, req_id, editor_type, 0, 0
          FROM zangsi.T_CONTENTS_TEMP
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
        
        console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_FILE 데이터 저장 중: id=${cont_id}`);
        
        // video_status를 file_type으로 매핑하는 함수 (2자리 형식)
        const mapVideoStatusToFileType = (video_status) => {
          if (!video_status) return '02'; // 기본값
          
          switch (video_status.toString()) {
            case '01': return '01'; // 비디오
            case '02': return '02'; // 오디오
            case '03': return '03'; // 이미지
            case '04': return '04'; // 문서
            case '05': return '05'; // 기타
            case '1': return '01'; // 비디오
            case '2': return '02'; // 오디오
            case '3': return '03'; // 이미지
            case '4': return '04'; // 문서
            case '5': return '05'; // 기타
            default: return '02'; // 기본값
          }
        };
        
        if (tempContents.length > 0) {
          const video_status = tempContents[0].video_status || '';
          const file_type = mapVideoStatusToFileType(video_status);
          
          console.log(`[uploadController.js:enrollmentComplete] video_status=${video_status}를 file_type=${file_type}으로 매핑`);
          
          await sequelize.query(
            `INSERT INTO zangsi.T_CONTENTS_FILE (
              id, folder_yn, server_id, file_path, file_name1, file_name2, 
              file_size, file_type, file_resoX, file_resoY, qury_cnt, down_cnt, 
              fix_down_cnt, up_st_date, up_st_time, explan_type, dsp_file_cnt, 
              reg_user, reg_date, reg_time
            ) VALUES (
              ?, 'N', 'CLOUD', '', '', ?, 
              ?, ?, 0, 0, 0, 0, 
              0, ?, ?, '', 0,
              ?, ?, ?
            )`,
            {
              replacements: [
                cont_id.toString(),
                tempContents[0].file_name2 || '',
                tempContents[0].file_size || 0,
                file_type,
                reg_date,
                reg_time,
                tempContents[0].reg_user || 'uploadtest',
                reg_date,
                reg_time
              ],
              transaction
            }
          );
        } else {
          console.log(`[uploadController.js:enrollmentComplete] 경고: T_CONTENTS_TEMP에 레코드가 없어 기본값으로 T_CONTENTS_FILE에 저장합니다.`);
          
          await sequelize.query(
            `INSERT INTO zangsi.T_CONTENTS_FILE (
              id, folder_yn, server_id, file_path, file_name1, file_name2, 
              file_size, file_type, file_resoX, file_resoY, qury_cnt, down_cnt, 
              fix_down_cnt, up_st_date, up_st_time, explan_type, dsp_file_cnt, 
              reg_user, reg_date, reg_time
            ) VALUES (
              ?, 'N', 'CLOUD', '', '', '',
              0, '02', 0, 0, 0, 0,
              0, ?, ?, '', 0,
              'uploadtest', ?, ?
            )`,
            {
              replacements: [
                cont_id.toString(),
                reg_date,
                reg_time,
                reg_date,
                reg_time
              ],
              transaction
            }
          );
        }
        
        console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_FILE 데이터 저장 완료: id=${cont_id}`);

        // video_status 기반 file_type 매핑 (T_CONTENTS_FILELIST용)
        const video_status = tempContents.length > 0 ? tempContents[0].video_status || '' : '';
        const mapped_file_type = mapVideoStatusToFileType(video_status);
        
        let sequentialSeqNo = 0;
        for (const tempFileSub of tempFileSubs) {
          console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_FILELIST REPLACE INTO: id=${cont_id}, 원본_seq_no=${tempFileSub.seq_no}, 순차_seq_no=${sequentialSeqNo}, file_name=${tempFileSub.file_name}, file_size=${tempFileSub.file_size}, hash=${tempFileSub.default_hash || ''}, video_status=${video_status}, file_type=${mapped_file_type}`);
          await sequelize.query(
            `REPLACE INTO zangsi.T_CONTENTS_FILELIST (
              id, seq_no, folder_yn, file_name, file_size, file_type,
              default_hash, audio_hash, video_hash, copyright_yn,
              reg_user, reg_date, reg_time, server_group_id, hdfs_status
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?
            )`,
            {
              replacements: [
                cont_id.toString(),
                sequentialSeqNo,
                tempFileSub.folder_yn || 'N',
                tempFileSub.file_name,
                tempFileSub.file_size,
                mapped_file_type,  // video_status 기반 동적 file_type
                tempFileSub.default_hash || '',
                tempFileSub.audio_hash || '',
                tempFileSub.video_hash || '',
                tempFileSub.copyright_yn || 'N',
                tempFileSub.reg_user || 'uploadtest',
                reg_date,
                reg_time,
                tempFileSub.server_group_id || 'WD171',
                'C'  // hdfs_status 기본값
              ],
              transaction
            }
          );
          sequentialSeqNo++; // 다음 파일을 위해 seq_no 증가
          
          console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_FILELIST_SUB 데이터 저장 중: id=${cont_id}, seq_no=${tempFileSub.seq_no}`);
          await sequelize.query(
            `INSERT INTO zangsi.T_CONTENTS_FILELIST_SUB (
              id, depth, folder_yn, folder_path, file_name, file_size,
              file_type, default_hash, audio_hash, video_hash, copyright_yn,
              reg_user, reg_date, reg_time, server_group_id, hdfs_status
            ) VALUES (
              ?, 0, ?, '', ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?
            )`,
            {
              replacements: [
                cont_id.toString(),
                tempFileSub.folder_yn || 'N',
                tempFileSub.file_name,
                tempFileSub.file_size,
                '2',  // file_type을 2로 설정
                tempFileSub.default_hash || '',
                tempFileSub.audio_hash || '',
                tempFileSub.video_hash || '',
                tempFileSub.copyright_yn || 'N',
                tempFileSub.reg_user || 'uploadtest',
                reg_date,
                reg_time,
                tempFileSub.server_group_id || 'WD171',
                'C'  // hdfs_status 기본값
              ],
              transaction
            }
          );
          console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_FILELIST_SUB 데이터 저장 완료: id=${cont_id}, seq_no=${tempFileSub.seq_no}`);
          
          console.log(`[uploadController.js:enrollmentComplete] T_CONT_FILELIST_HASH 데이터 저장 중: id=${cont_id}, default_hash=${tempFileSub.default_hash || ''}`);
          await sequelize.query(
            `INSERT INTO zangsi.T_CONT_FILELIST_HASH (
              id, depth, default_hash, file_size, hash_1m,
              reg_date, reg_time
            ) VALUES (
              ?, 0, ?, ?, ?,
              ?, ?
            )`,
            {
              replacements: [
                cont_id.toString(),
                tempFileSub.default_hash || '',
                tempFileSub.file_size,
                tempFileSub.default_hash || '',  // hash_1m은 default_hash와 동일하게 설정
                reg_date,
                reg_time
              ],
              transaction
            }
          );
          console.log(`[uploadController.js:enrollmentComplete] T_CONT_FILELIST_HASH 데이터 저장 완료: id=${cont_id}, default_hash=${tempFileSub.default_hash || ''}`);

          // webhard_hash 파라미터가 있는 경우에만 T_CONT_DADAM_FILE_MAP에 저장
          if (webhard_hash) {
            await sequelize.query(
              `INSERT INTO zangsi.T_CONT_DADAM_FILE_MAP (
                seq_no, cld_hash, id, cloud_yn, reg_date, reg_time
              ) VALUES (
                ?, ?, ?, ?, ?, ?
              )`,
              {
                replacements: [
                  tempFileSub.seq_no,
                  webhard_hash,
                  cont_id.toString(),
                  'Y',
                  reg_date,
                  reg_time
                ],
                transaction
              }
            );
          }
        }

        console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_UPDN 데이터 저장 중: id=${cont_id}`);
        const [existingUpdn] = await sequelize.query(
          `SELECT * FROM zangsi.T_CONTENTS_UPDN WHERE user_id = ? AND updn_flag = 'UP'`,
          {
            replacements: [user_id],
            transaction
          }
        );
        
        if (existingUpdn && existingUpdn.length > 0) {
          console.log(`[uploadController.js:enrollmentComplete] 기존 T_CONTENTS_UPDN 레코드 업데이트: user_id=${user_id}, updn_flag=UP`);
          await sequelize.query(
            `UPDATE zangsi.T_CONTENTS_UPDN SET
              id = ?, cont_gu = 'WE', server_id = 'CLOUD', conn_ip = ?, reg_date = ?, reg_time = ?
            WHERE user_id = ? AND updn_flag = 'UP'`,
            {
              replacements: [
                cont_id.toString(),
                formatIpForDatabase(req.ip),
                reg_date,
                reg_time,
                user_id
              ],
              transaction
            }
          );
        } else {
          console.log(`[uploadController.js:enrollmentComplete] 새 T_CONTENTS_UPDN 레코드 생성: user_id=${user_id}, updn_flag=UP`);
          await sequelize.query(
            `INSERT INTO zangsi.T_CONTENTS_UPDN (
              id, updn_flag, user_id, cont_gu, server_id, conn_ip, reg_date, reg_time
            ) VALUES (
              ?, 'UP', ?, 'WE', 'CLOUD', ?, ?, ?
            )`,
            {
              replacements: [
                cont_id.toString(),
                user_id,
                formatIpForDatabase(req.ip),
                reg_date,
                reg_time
              ],
              transaction
            }
          );
        }

        if (tempMurekaRecords && tempMurekaRecords.length > 0) {
          console.log(`[uploadController.js:enrollmentComplete] ${tempMurekaRecords.length}개의 mureka 레코드를 T_CONTENTS_FILELIST_MUREKA 테이블로 이동합니다.`);
          
          for (const murekaRecord of tempMurekaRecords) {
            try {
              await sequelize.query(
                `INSERT INTO zangsi.T_CONTENTS_FILELIST_MUREKA (
                  seq_no, id, file_gubun, result_code, video_status, video_id, 
                  video_title, video_jejak_year, video_right_name, video_right_content_id,
                  video_grade, video_price, video_cha, video_osp_jibun, video_osp_etc,
                  video_onair_date, video_right_id, virus_type, virus_name,
                  mureka_hash, file_name, tmp_id
                ) VALUES (
                  NULL, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?,
                  ?, ?, ?, ?, ?,
                  ?, ?, ?, ?,
                  ?, ?, ?
                )`,
                {
                  replacements: [
                    cont_id.toString(),
                    murekaRecord.file_gubun || 1,
                    murekaRecord.result_code || 0,
                    murekaRecord.video_status || '',
                    murekaRecord.video_id || '',
                    murekaRecord.video_title || '',
                    murekaRecord.video_jejak_year || '',
                    murekaRecord.video_right_name || '',
                    murekaRecord.video_right_content_id || '',
                    murekaRecord.video_grade || '',
                    murekaRecord.video_price || '',
                    murekaRecord.video_cha || '',
                    murekaRecord.video_osp_jibun || '',
                    murekaRecord.video_osp_etc || '',
                    murekaRecord.video_onair_date || '',
                    murekaRecord.video_right_id || '',
                    murekaRecord.virus_type || '',
                    murekaRecord.virus_name || '',
                    murekaRecord.mureka_hash || '',
                    murekaRecord.file_name || '',
                    temp_id.toString()
                  ],
                  transaction
                }
              );
              console.log(`[uploadController.js:enrollmentComplete] Mureka 레코드 저장 성공: id=${cont_id}, mureka_hash=${murekaRecord.mureka_hash || ''}`);
            } catch (insertError) {
              console.error(`[uploadController.js:enrollmentComplete] Mureka 레코드 저장 중 오류 발생:`, insertError.message);
              
              if (insertError.message.includes('Validation error') || insertError.message.includes('Duplicate entry')) {
                console.error(`[uploadController.js:enrollmentComplete] 중복 키 또는 유효성 검사 오류. 기존 레코드를 업데이트합니다.`);
                
                try {
                  await sequelize.query(
                    `UPDATE zangsi.T_CONTENTS_FILELIST_MUREKA SET
                      id = ?, file_gubun = ?, result_code = ?, video_status = ?, video_id = ?,
                      video_title = ?, video_jejak_year = ?, video_right_name = ?, video_right_content_id = ?,
                      video_grade = ?, video_price = ?, video_cha = ?, video_osp_jibun = ?, video_osp_etc = ?,
                      video_onair_date = ?, video_right_id = ?, virus_type = ?, virus_name = ?,
                      mureka_hash = ?, file_name = ?, tmp_id = ?
                    WHERE mureka_hash = ? OR (file_name = ? AND id = ?)`,
                    {
                      replacements: [
                        cont_id.toString(),
                        murekaRecord.file_gubun || 1,
                        murekaRecord.result_code || 0,
                        murekaRecord.video_status || '',
                        murekaRecord.video_id || '',
                        murekaRecord.video_title || '',
                        murekaRecord.video_jejak_year || '',
                        murekaRecord.video_right_name || '',
                        murekaRecord.video_right_content_id || '',
                        murekaRecord.video_grade || '',
                        murekaRecord.video_price || '',
                        murekaRecord.video_cha || '',
                        murekaRecord.video_osp_jibun || '',
                        murekaRecord.video_osp_etc || '',
                        murekaRecord.video_onair_date || '',
                        murekaRecord.video_right_id || '',
                        murekaRecord.virus_type || '',
                        murekaRecord.virus_name || '',
                        murekaRecord.mureka_hash || '',
                        murekaRecord.file_name || '',
                        temp_id.toString(),
                        murekaRecord.mureka_hash || '',
                        murekaRecord.file_name || '',
                        temp_id.toString()
                      ],
                      transaction
                    }
                  );
                  console.log(`[uploadController.js:enrollmentComplete] Mureka 레코드 업데이트 성공: mureka_hash=${murekaRecord.mureka_hash || ''}`);
                } catch (updateError) {
                  console.error(`[uploadController.js:enrollmentComplete] Mureka 레코드 업데이트 중 오류 발생:`, updateError.message);
                }
              } else {
                throw insertError;
              }
            }
          }
        }

        console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_VIR_ID 테이블에 데이터 저장 중: id=${cont_id}`);
        
        try {
          await sequelize.query(
            `INSERT INTO zangsi.T_CONTENTS_VIR_ID (
              id, sect_code, sect_sub, adult_yn, copyright_yn, del_yn, 
              mob_service_yn, mobile_chk
            ) VALUES (
              ?, ?, ?, ?, ?, 'N',
              ?, 'N'
            )`,
            {
              replacements: [
                cont_id.toString(),
                sect_code,
                sect_sub,
                adult_yn,
                copyright_yn,
                mobservice_yn
              ],
              transaction
            }
          );
          
          console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_VIR_ID 데이터 저장 완료: id=${cont_id}`);
          
          console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_VIR_ID2 백업 테이블에 데이터 저장 중: id=${cont_id}`);
          
          await sequelize.query(
            `INSERT INTO zangsi.T_CONTENTS_VIR_ID2 (
              id, sect_code, sect_sub, adult_yn, copyright_yn, del_yn, 
              mob_service_yn, mobile_chk
            ) VALUES (
              ?, ?, ?, ?, ?, 'N',
              ?, 'N'
            )`,
            {
              replacements: [
                cont_id.toString(),
                sect_code,
                sect_sub,
                adult_yn,
                copyright_yn,
                mobservice_yn
              ],
              transaction
            }
          );
          
          console.log(`[uploadController.js:enrollmentComplete] T_CONTENTS_VIR_ID2 백업 데이터 저장 완료: id=${cont_id}`);
          
        } catch (virIdError) {
          console.error(`[uploadController.js:enrollmentComplete] T_CONTENTS_VIR_ID 테이블 저장 중 오류 발생: ${virIdError.message}`);
          console.error(`[uploadController.js:enrollmentComplete] VIR_ID 오류 스택 트레이스: ${virIdError.stack}`);
          throw new Error(`T_CONTENTS_VIR_ID 테이블 처리 중 오류 발생: ${virIdError.message}`);
        }

        await sequelize.query(
          `DELETE FROM zangsi.T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );

        await sequelize.query(
          `DELETE FROM zangsi.T_CONTENTS_TEMPLIST WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );
        
        await sequelize.query(
          `DELETE FROM zangsi.T_CONTENTS_TEMPLIST_MUREKA WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );

        await sequelize.query(
          `DELETE FROM zangsi.T_CONTENTS_TEMP WHERE id = ?`,
          {
            replacements: [temp_id.toString()],
            transaction
          }
        );


        await transaction.commit();

        return res.status(200).json({
          result: 'success',
          cont_id: cont_id,
          message: 'File upload process has been completed successfully',
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
        console.error('[uploadController.js:enrollmentComplete] 트랜잭션 오류:', error.message);
        console.error('[uploadController.js:enrollmentComplete] 스택 트레이스:', error.stack);
        
        if (error.sql) {
          console.error('[uploadController.js:enrollmentComplete] 오류 발생 쿼리:', error.sql);
          console.error('[uploadController.js:enrollmentComplete] 쿼리 파라미터:', error.parameters || '없음');
        }
        
        if (error.message.includes('Unknown column')) {
          const match = error.message.match(/Unknown column '([^']+)' in '([^']+)'/);
          if (match) {
            const columnName = match[1] || 'unknown';
            const context = match[2] || 'unknown';
            console.error(`[uploadController.js:enrollmentComplete] 스키마 불일치 오류: 컬럼=${columnName}, 컨텍스트=${context}`);
          }
        }
        
        if (error.message.includes('Out of range value for column')) {
          const match = error.message.match(/Out of range value for column '([^']+)'/);
          const columnName = match ? match[1] : 'unknown';
          console.error(`[uploadController.js:enrollmentComplete] 범위 초과 오류: 컬럼=${columnName}, 테이블=T_CONTENTS_INFO`);
          console.error(`[uploadController.js:enrollmentComplete] 범위 초과 값: cont_id=${cont_id}, 원본 타임스탬프=${Date.now()}`);
        }
        
        throw error;
      }
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback().catch(err => {
          console.error('[uploadController.js:enrollmentComplete] 트랜잭션 롤백 중 오류 발생:', err.message);
          console.error('[uploadController.js:enrollmentComplete] 롤백 스택 트레이스:', err.stack);
        });
      }
      console.error('[uploadController.js:enrollmentComplete] 데이터베이스 작업 오류:', error.message);
      console.error('[uploadController.js:enrollmentComplete] 스택 트레이스:', error.stack);
      throw error;
    }
  } catch (error) {
    console.error('[uploadController.js:enrollmentComplete] 컨트롤러 오류:', error.message);
    console.error('[uploadController.js:enrollmentComplete] 스택 트레이스:', error.stack);
    return res.status(500).json({
      result: 'error',
      message: error.message || 'Internal server error'
    });
  }
};

export { 
  getUploadPolicy, 
  getUploadAddress, 
  startUploadProcess, 
  endUploadProcess, 
  // registerHash,
  enrollmentFileinfo,
  enrollmentFiltering,
  enrollmentComplete
};

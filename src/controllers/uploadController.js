import { User, File, Company, WebhardHash } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { sequelize, cprSequelize, logSequelize } from '../config/database.js';
import fs from 'fs';
import path from 'path';

const getUploadPolicy = async (req, res) => {
  try {
    console.log(`[uploadController.js:getUploadPolicy] 업로드 정책 조회 시작`);
    const { userid } = req.body;
    
    // categories.inf 파일에서 upload_policy 읽기
    let policy = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'];
    
    try {
      const configPath = path.join(process.cwd(), 'src', 'config', 'categories.inf');
      const configData = fs.readFileSync(configPath, 'utf8');
      const configJson = JSON.parse(configData);
      
      if (configJson && configJson.upload_policy && Array.isArray(configJson.upload_policy)) {
        policy = configJson.upload_policy;
        console.log(`[uploadController.js:getUploadPolicy] categories.inf에서 읽은 정책: ${JSON.stringify(policy)}`);
      } else {
        console.log(`[uploadController.js:getUploadPolicy] categories.inf에서 유효한 upload_policy를 찾을 수 없어 기본값 사용`);
      }
    } catch (err) {
      console.error(`[uploadController.js:getUploadPolicy] categories.inf 파일 읽기 중 오류 발생: ${err.message}`);
      console.error(`[uploadController.js:getUploadPolicy] 스택 트레이스: ${err.stack}`);
      console.log(`[uploadController.js:getUploadPolicy] 기본 정책을 사용합니다.`);
    }
    
    if (userid) {
      try {
        const [users] = await sequelize.query(
          `SELECT user_id FROM zangsi.T_PERM_UPLOAD_AUTH WHERE user_id = ? LIMIT 1`,
          {
            replacements: [userid],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (users && users.length > 0) {
          console.log(`[uploadController.js:getUploadPolicy] 사용자 인증 성공: ${userid}`);
        } else {
          console.log(`[uploadController.js:getUploadPolicy] 사용자 인증 실패: ${userid}`);
        }
      } catch (err) {
        console.error(`[uploadController.js:getUploadPolicy] 사용자 조회 중 오류 발생: ${err.message}`);
        console.error(`[uploadController.js:getUploadPolicy] 스택 트레이스: ${err.stack}`);
      }
    }
    
    console.log(`[uploadController.js:getUploadPolicy] 반환할 정책: ${JSON.stringify(policy)}`);
    
    return res.status(200).json({
      result: 'success',
      upload_policy: policy
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
          adult_yn = 'N',
          webhard_hash = '',
          content_number,
          content_info = {}
        } = info;
        
        const {
          folder_yn = 'N',
          file_path = '',
          file_name1 = '',
          file_name2 = file_name,
          file_type = '',
          file_reso_x = 0,
          file_reso_y = 0,
          dsp_file_cnt = 0,
          down_cnt = 0,
          price_amt = 0,
          won_mega = 0,
          share_meth = 'N',
          disp_end_date = '',
          disp_end_time = '',
          disp_stat = '',
          file_del_yn = 'N',
          server_id = 'WD001',
          up_st_date = reg_date,
          up_st_time = reg_time,
          keyword = ''
        } = content_info || {};

        if (!file_name || !file_size) {
          await transaction.rollback();
          return res.status(400).json({
            result: 'error',
            message: '파일 정보에 필수 파라미터가 누락되었습니다'
          });
        }



        let temp_id;
        if (content_number) {
          temp_id = content_number;
          
          try {
            const [tempContents] = await sequelize.query(
              `SELECT id FROM zangsi.T_CONTENTS_TEMP WHERE id = ? LIMIT 1`,
              {
                replacements: [content_number.toString()],
                transaction
              }
            );
            
            if (tempContents.length === 0) {
              console.log(`컨텐츠 ID ${content_number}에 대한 T_CONTENTS_TEMP 레코드가 존재하지 않습니다. 새로 생성합니다.`);
            } else {
              console.log(`컨텐츠 ID ${content_number}에 대한 T_CONTENTS_TEMP 레코드가 존재합니다.`);
            }
          } catch (error) {
            console.error(`T_CONTENTS_TEMP 확인 중 오류 발생: ${error.message}`);
          }
        } else {
          temp_id = Date.now() + Math.floor(Math.random() * 1000);
        }
        
        const seq_no = 1; // 기본값, 실제로는 파일 수에 따라 증가
        const reg_date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reg_time = new Date().toISOString().slice(11, 19).replace(/:/g, '');
        
        if (default_hash && file_size) {
          try {
            console.log(`[uploadController.js:enrollmentFileinfo] 중복 파일 확인 중: size=${file_size}, hash=${default_hash}`);
            const [duplicateFiles] = await sequelize.query(
              `SELECT seq_no FROM zangsi.T_CONTENTS_TEMPLIST_SUB 
               WHERE file_size = ? AND default_hash = ? LIMIT 1`,
              {
                replacements: [file_size, default_hash],
                transaction
              }
            );
            
            if (duplicateFiles.length > 0) {
              console.log(`[uploadController.js:enrollmentFileinfo] 중복 파일 발견: size=${file_size}, hash=${default_hash}`);
            }
          } catch (error) {
            console.error(`[uploadController.js:enrollmentFileinfo] 중복 파일 확인 중 오류 발생: ${error.message}`);
            console.error(`[uploadController.js:enrollmentFileinfo] 스택 트레이스: ${error.stack}`);
            console.error('중복 파일 확인 중 오류 발생:', error.message);
          }
        }

        await sequelize.query(
          `INSERT INTO zangsi.T_CONTENTS_TEMP (
            id, title, descript, descript2, descript3, keyword,
            sect_code, sect_sub, adult_yn, share_meth, price_amt, won_mega,
            reg_user, reg_date, reg_time, disp_end_date, disp_end_time, item_bold_yn,
            item_color, req_id, editor_type, up_st_date, up_st_time, disp_stat, 
            file_del_yn
          ) VALUES (
            ?, ?, ?, '', '', ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, 'N',
            'N', 0, 0, ?, ?, ?,
            ?
          ) ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            descript = VALUES(descript),
            keyword = VALUES(keyword),
            sect_code = VALUES(sect_code),
            sect_sub = VALUES(sect_sub),
            adult_yn = VALUES(adult_yn),
            share_meth = VALUES(share_meth),
            price_amt = VALUES(price_amt),
            won_mega = VALUES(won_mega),
            disp_end_date = VALUES(disp_end_date),
            disp_end_time = VALUES(disp_end_time),
            up_st_date = VALUES(up_st_date),
            up_st_time = VALUES(up_st_time),
            disp_stat = VALUES(disp_stat),
            file_del_yn = VALUES(file_del_yn)`,
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
              disp_end_date,
              disp_end_time,
              up_st_date,
              up_st_time,
              disp_stat,
              file_del_yn
            ],
            transaction
          }
        );

        if (folder_yn === 'Y') {
          try {
            const [tempListExists] = await sequelize.query(
              `SELECT id FROM zangsi.T_CONTENTS_TEMPLIST WHERE id = ? LIMIT 1`,
              {
                replacements: [temp_id.toString()],
                transaction
              }
            );
            
            if (tempListExists.length === 0) {
              console.log(`컨텐츠 ID ${temp_id}에 대한 T_CONTENTS_TEMPLIST 레코드가 존재하지 않습니다. 새로 생성합니다.`);
            } else {
              console.log(`컨텐츠 ID ${temp_id}에 대한 T_CONTENTS_TEMPLIST 레코드가 존재합니다. 업데이트합니다.`);
            }
          } catch (error) {
            console.error(`T_CONTENTS_TEMPLIST 확인 중 오류 발생: ${error.message}`);
          }
        }

        console.log(`[uploadController.js:enrollmentFileinfo] T_CONTENTS_TEMPLIST 데이터 저장 중: id=${temp_id}`);
        await sequelize.query(
          `REPLACE INTO zangsi.T_CONTENTS_TEMPLIST (
            id, file_name, file_size, file_type, file_ext, file_path,
            reg_date, reg_time, copyright_yn, mobservice_yn, reg_user,
            folder_yn, server_id
          ) VALUES (
            ?, ?, ?, '2', ?, ?,
            ?, ?, ?, 'Y', ?,
            ?, ?
          )`,
          {
            replacements: [
              temp_id.toString(),
              file_name,
              file_size,
              file_name.split('.').pop() || '',
              file_path,
              reg_date,
              reg_time,
              copyright_yn,
              user_id,
              folder_yn,
              server_id
            ],
            transaction
          }
        );

        await sequelize.query(
          `INSERT INTO zangsi.T_CONTENTS_TEMPLIST_SUB (
            id, seq_no, file_name, file_size, file_type, file_ext,
            default_hash, audio_hash, video_hash, comp_cd, chi_id, price_amt,
            mob_price_amt, reg_date, reg_time, file_reso_x, file_reso_y
          ) VALUES (
            ?, ?, ?, ?, '2', ?,
            ?, ?, ?, ?, ?, ?,
            0, ?, ?, ?, ?
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
              comp_cd,
              chi_id,
              price_amt,
              reg_date,
              reg_time,
              file_reso_x,
              file_reso_y
            ],
            transaction
          }
        );

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
          temp_id,
          seq_no: actual_seq_no,
          file_name,
          default_hash: default_hash || '',
          webhard_hash: webhard_hash || '',
          server_id: server_id || 'WD001',
          server_path: file_path || `/raid/fdata/wedisk/${reg_date.substring(0, 4)}/${reg_date.substring(4, 6)}/${reg_date.substring(6, 8)}/temp${temp_id}`,
          folder_yn
        });
      }

      await transaction.commit();

      return res.status(200).json({
        result: 'success',
        message: '파일 정보가 성공적으로 등록되었습니다',
        data: results
      });
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
      copyright_info = null
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
        console.log('트랜잭션이 성공적으로 생성되었습니다.');
      } catch (error) {
        console.error('트랜잭션 생성 실패:', error.message);
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

      if (mureka_info) {
        const { 
          mureka_yn = 'N', 
          mureka_id = '', 
          mureka_name = '',
          mureka_album = '',
          mureka_artist = ''
        } = mureka_info;

        await sequelize.query(
          `UPDATE zangsi.T_CONTENTS_TEMPLIST SET
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
      }

      if (copyright_info) {
        const { 
          copyright_yn = 'N', 
          copyright_id = '', 
          copyright_name = ''
        } = copyright_info;

        await sequelize.query(
          `UPDATE zangsi.T_CONTENTS_TEMPLIST SET
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
      }

      await transaction.commit();

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
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('트랜잭션 롤백 중 오류 발생:', rollbackError.message);
      }
      console.error('Error in enrollmentFiltering transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in enrollmentFiltering controller:', error);
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
      sect_code = '01',
      sect_sub = '',
      adult_yn = 'N',
      copyright_yn = 'N',
      mobservice_yn = 'Y',
      webhard_hash = ''
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
          `SELECT * FROM zangsi.T_CONTENTS_TEMP WHERE id = ?`,
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
          `INSERT INTO zangsi.T_CONTENTS_INFO (
            id, title, descript, descript2, descript3, keyword,
            sect_code, sect_sub, adult_yn, share_meth, price_amt, won_mega,
            reg_user, reg_date, reg_time, disp_end_date, disp_end_time, item_bold_yn,
            item_color, bomul_id, bomul_stat, req_id, editor_type, nmnt_cnt, disp_cnt_inc
          ) SELECT 
            ?, title, descript, descript2, descript3, keyword,
            ?, ?, ?, share_meth, price_amt, won_mega,
            reg_user, ?, ?, disp_end_date, disp_end_time, item_bold_yn,
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

        for (const tempFileSub of tempFileSubs) {
          await sequelize.query(
            `INSERT INTO zangsi.T_CONTENTS_FILELIST (
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
                tempFileSub.file_name,
                tempFileSub.file_size,
                '2',  // file_type을 2로 변경
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
        await sequelize.query(
          `INSERT INTO zangsi.T_CONTENTS_UPDN (
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
        console.error('[uploadController.js:enrollmentComplete] 트랜잭션 오류:', error.message);
        console.error('[uploadController.js:enrollmentComplete] 스택 트레이스:', error.stack);
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

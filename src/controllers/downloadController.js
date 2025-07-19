import { File, Company, User, WebhardHash, sequelize } from '../models/index.js';


const getContentsWithDeal = async (req, res) => {
  try {
    const { cont_id, dwdeal_no } = req.body;
    
    console.log(`[downloadController.js:getContentsWithDeal] 요청 받은 파라미터: cont_id=${cont_id}`);
    
    if (!cont_id && !dwdeal_no) {
      return res.status(400).json({
        result: 'error',
        message: 'cont_id parameter is required'
      });
    }

    let webhardHashes = null;

    if(cont_id) {
      webhardHashes = await WebhardHash.findAll({
        where: { id: cont_id },
        attributes: ['seq_no', 'cld_hash', 'id', 'cloud_yn', 'option1', 'value1'],
        order: [['seq_no', 'ASC']]
      });
    }

    if(dwdeal_no) {
      const dealinfo = await Dealinfo.findOne({
        where: { deal_no: dwdeal_no },
        attributes: ['id']
      });

      if(dealinfo) {
        console.log(`[downloadController.js:getContents2] 거래정보 조회 결과: ${dealinfo.id}`);

        webhardHashes = await WebhardHash.findAll({
          where: { id: dealinfo.id },
          attributes: ['seq_no', 'cld_hash', 'id', 'cloud_yn', 'option1', 'value1'],
          order: [['seq_no', 'ASC']]
        });
      }
          
    }

    
    // const webhardHashes = await WebhardHash.findAll({
    //   where: { id: cont_id },
    //   attributes: ['seq_no', 'cld_hash', 'id', 'cloud_yn', 'option1', 'value1'],
    //   order: [['seq_no', 'ASC']]
    // });
    
    if (!webhardHashes || webhardHashes.length === 0) {
      return res.status(404).json({
        result: 'error',
        message: 'No data found for the provided cont_id'
      });
    }
    
    const cloud_yn = webhardHashes[0].cloud_yn || 'N';
    
    const fileData = webhardHashes.map(hash => ({
      seq_no: hash.seq_no,
      cld_hash: hash.cld_hash,
      option1: hash.option1,
      value1: hash.value1
    }));
    
    console.log(`[downloadController.js:getContents] 조회 결과: ${webhardHashes.length}개 레코드, cloud_yn=${cloud_yn}`);
    
    return res.status(200).json({
      result: 'success',
      id: cont_id,
      cloud_yn: cloud_yn,
      files: fileData
    });
  } catch (error) {
    console.error('[downloadController.js:getContents] Error:', error);
    return res.status(500).json({
      result: 'error',
      message: 'Internal server error'
    });
  }
};





/**
 * 파일 해시 정보 조회
 */
const getHash = async (req, res) => {
  try {
    const { filename, cont_no, seq_no } = req.body;
    
    console.log(`요청 받은 파라미터: filename=${filename}, cont_no=${cont_no}, seq_no=${seq_no}`);
    
    let file = null;
    if (cont_no) {
      const whereClause = { cont_id: cont_no };
      if (seq_no) {
        whereClause.seq_id = seq_no;
      }
      
      console.log(`조회 조건: ${JSON.stringify(whereClause)}`);
      
      file = await File.findOne({ where: whereClause });
      console.log(`조회된 파일: ${file ? JSON.stringify(file) : '없음'}`);
    }
    
    if (file) {
      const company = await Company.findOne({ where: { code: file.company_code || 'WEDISK' } });
      const companyInfo = company || { code: 'WEDISK', domain: 'gapi.wedisk.co.kr' };
      
      console.log(`반환할 정보: hash=${file.hash}, domain=${companyInfo.domain}, code=${companyInfo.code}`);
      
      return res.status(200).json({
        result: 'success',
        hash_code: file.hash,
        upload_server_domain: companyInfo.domain,
        company_code: companyInfo.code
      });
    } else {
      console.log('파일을 찾을 수 없어 기본 정보 반환');
      
      return res.status(200).json({
        result: 'success',
        hash_code: 'a1b2c3d4e5f6g7h8i9j0',
        upload_server_domain: 'gapi.wedisk.co.kr',
        company_code: 'WEDISK'
      });
    }
  } catch (error) {
    console.error('Error in getHash controller:', error);
    return res.status(500).json({
      result: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * 다운로드 서버 주소 조회
 */
const getDownloadAddress = async (req, res) => {
  try {
    return res.status(200).json({
      result: 'success',
      download_server: 'wedisk-down.dadamcloud.com',
      download_port: 8080
    });
  } catch (error) {
    console.error('Error in getDownloadAddress controller:', error);
    return res.status(500).json({
      result: 'error',
      message: '서버 주소 조회 실패'
    });
  }
};

/**
 * 다운로드 정보 조회
 */
const getDownloadInfo = async (req, res) => {
  try {
    const { cont_id, seq_id, user_id, client_ip, client_port } = req.body;

    if (!cont_id || !user_id) {
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

    const whereClause = { cont_id };
    if (seq_id) {
      whereClause.seq_id = seq_id;
    }

    const file = await File.findOne({ where: whereClause });
    if (!file) {
      return res.status(404).json({
        result: 'error',
        message: '파일 정보를 찾을 수 없습니다'
      });
    }

    const company = await Company.findOne({ where: { code: file.company_code || 'WEDISK' } });
    const companyInfo = company || { code: 'WEDISK', domain: 'gapi.wedisk.co.kr' };

    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10).replace(/-/g, '');
    const currentTime = now.toISOString().slice(11, 19).replace(/:/g, '');

    console.log(`다운로드 정보 조회: cont_id=${cont_id}, seq_id=${seq_id}, user_id=${user_id}, client_ip=${client_ip}, client_port=${client_port}`);

    return res.status(200).json({
      result: 'success',
      file_info: {
        cont_id: file.cont_id,
        seq_id: file.seq_id || 1,
        file_name: file.filename || 'unknown.file',
        file_size: file.filesize || 0,
        hash_code: file.hash,
        upload_server_domain: companyInfo.domain,
        company_code: companyInfo.code,
        sect_code: file.sect_code || '00',
        sect_sub: '',
        reg_date: file.createdAt ? file.createdAt.toISOString().slice(0, 10).replace(/-/g, '') : currentDate,
        reg_time: file.createdAt ? file.createdAt.toISOString().slice(11, 19).replace(/:/g, '') : currentTime,
        download_count: file.download_count || 0,
        last_download_date: file.last_download_date || ''
      }
    });
  } catch (error) {
    console.error('Error in getDownloadInfo controller:', error);
    return res.status(500).json({
      result: 'error',
      message: 'Internal server error'
    });
  }
};



/**
 * 다운로드 통계 업데이트
 */
const updateDownloadStats = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { 
      cont_id, 
      seq_id, 
      user_id, 
      server_id, 
      download_size, 
      download_status, 
      client_ip, 
      client_port 
    } = req.body;

    if (!cont_id || !user_id) {
      return res.status(400).json({
        result: 'error',
        message: '필수 파라미터가 누락되었습니다'
      });
    }

    const whereClause = { cont_id };
    if (seq_id) {
      whereClause.seq_id = seq_id;
    }

    const file = await File.findOne({ 
      where: whereClause,
      transaction
    });

    if (!file) {
      await transaction.rollback();
      return res.status(404).json({
        result: 'error',
        message: '파일 정보를 찾을 수 없습니다'
      });
    }

    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10).replace(/-/g, '');

    const downloadCount = (file.download_count || 0) + 1;
    
    await file.update({
      download_count: downloadCount,
      last_download_date: currentDate
    }, { transaction });

    console.log(`다운로드 통계 업데이트: cont_id=${cont_id}, seq_id=${seq_id}, user_id=${user_id}, download_status=${download_status}, client_ip=${client_ip}`);

    await transaction.commit();

    return res.status(200).json({
      result: 'success',
      message: '다운로드 통계가 업데이트되었습니다',
      download_count: downloadCount
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in updateDownloadStats controller:', error);
    return res.status(500).json({
      result: 'error',
      message: '다운로드 통계 업데이트 실패'
    });
  }
};

/**
 * 컨텐츠 ID로 클라우드 해시 정보 조회
 */
const getContents = async (req, res) => {
  try {
    const { cont_id } = req.body;
    
    console.log(`[downloadController.js:getContents] 요청 받은 파라미터: cont_id=${cont_id}`);
    
    if (!cont_id) {
      return res.status(400).json({
        result: 'error',
        message: 'cont_id parameter is required'
      });
    }
    
    const webhardHashes = await WebhardHash.findAll({
      where: { id: cont_id },
      attributes: ['seq_no', 'cld_hash', 'id', 'cloud_yn', 'option1', 'value1'],
      order: [['seq_no', 'ASC']]
    });
    
    if (!webhardHashes || webhardHashes.length === 0) {
      return res.status(404).json({
        result: 'error',
        message: 'No data found for the provided cont_id'
      });
    }
    
    const cloud_yn = webhardHashes[0].cloud_yn || 'N';
    
    const fileData = webhardHashes.map(hash => ({
      seq_no: hash.seq_no,
      cld_hash: hash.cld_hash,
      option1: hash.option1,
      value1: hash.value1
    }));
    
    console.log(`[downloadController.js:getContents] 조회 결과: ${webhardHashes.length}개 레코드, cloud_yn=${cloud_yn}`);
    
    return res.status(200).json({
      result: 'success',
      id: cont_id,
      cloud_yn: cloud_yn,
      files: fileData
    });
  } catch (error) {
    console.error('[downloadController.js:getContents] Error:', error);
    return res.status(500).json({
      result: 'error',
      message: 'Internal server error'
    });
  }
};

export { getHash, getDownloadAddress, getDownloadInfo, updateDownloadStats, getContents, getContentsWithDeal };

import { File, Company } from '../models/index.js';

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

export { getHash };

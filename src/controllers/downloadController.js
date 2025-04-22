import { File, Company } from '../models/index.js';

const getHash = async (req, res) => {
  try {
    const { filename, cont_no, seq_no } = req.body;
    
    let file = null;
    if (cont_no) {
      const whereClause = { cont_id: cont_no };
      if (seq_no) {
        whereClause.seq_id = seq_no;
      }
      
      file = await File.findOne({ 
        where: whereClause,
        include: [{
          model: Company,
          attributes: ['code', 'domain']
        }]
      });
    }
    
    if (file) {
      const company = file.Company || { code: 'WEDISK', domain: 'gapi.wedisk.co.kr' };
      
      return res.status(200).json({
        result: 'success',
        hash_code: file.hash,
        upload_server_domain: company.domain,
        company_code: company.code
      });
    } else {
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

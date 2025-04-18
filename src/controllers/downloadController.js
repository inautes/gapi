import { File, Company } from '../models/index.js';

const getHash = async (req, res) => {
  try {
    const { filename, cont_no, seq_no } = req.body;
    
    if (!cont_no) {
      return res.status(400).json({
        result: 'error',
        message: 'Content number is required'
      });
    }
    
    const query = {
      where: {
        cont_id: cont_no
      }
    };
    
    if (seq_no) {
      query.where.seq_id = seq_no;
    }
    
    const file = await File.findOne(query);
    
    if (!file) {
      return res.status(404).json({
        result: 'error',
        message: 'File not found'
      });
    }
    
    const company = await Company.findOne({
      where: {
        is_cloud: file.cloud_yn
      }
    });
    
    if (!company) {
      return res.status(500).json({
        result: 'error',
        message: 'Server configuration error'
      });
    }
    
    return res.status(200).json({
      result: 'success',
      hash_code: file.hash,
      upload_server_domain: company.domain,
      company_code: company.code
    });
  } catch (error) {
    console.error('Error in getHash controller:', error);
    return res.status(500).json({
      result: 'error',
      message: 'Internal server error'
    });
  }
};

export { getHash };

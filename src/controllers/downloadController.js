import { File, Company } from '../models/index.js';

const getHash = async (req, res) => {
  try {
    const { filename, cont_no, seq_no } = req.body;
    
    return res.status(200).json({
      result: 'success',
      hash_code: 'a1b2c3d4e5f6g7h8i9j0',
      upload_server_domain: 'gapi.wedisk.co.kr',
      company_code: 'WEDISK'
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

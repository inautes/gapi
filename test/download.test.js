import request from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/config/database.js';
import { File } from '../src/models/index.js';

describe('Download API Endpoints', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /download/gethash', () => {
    it('should return hash information for a valid content ID', async () => {
      const testFile = await File.create({
        cont_id: 9999999,
        seq_id: 1,
        hash: 'testhash123456',
        company_code: 'WEDISK',
        category_code: '001'
      });

      const res = await request(app)
        .post('/download/gethash')
        .send({
          cont_no: 9999999,
          seq_no: 1
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.hash_code).toBe('testhash123456');
      expect(res.body.company_code).toBe('WEDISK');

      await testFile.destroy();
    });

    it('should return default values when content ID is not found', async () => {
      const res = await request(app)
        .post('/download/gethash')
        .send({
          cont_no: 8888888,
          seq_no: 1
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.hash_code).toBe('a1b2c3d4e5f6g7h8i9j0');
      expect(res.body.upload_server_domain).toBe('gapi.wedisk.co.kr');
      expect(res.body.company_code).toBe('WEDISK');
    });
  });

  describe('GET /download/address', () => {
    it('should return download server address', async () => {
      const res = await request(app)
        .get('/download/address')
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.download_server).toBe('wedisk-down.dadamcloud.com');
      expect(res.body.download_port).toBe(8080);
    });
  });

  describe('POST /download/info', () => {
    it('should return error for missing required parameters', async () => {
      const res = await request(app)
        .post('/download/info')
        .send({})
        .expect(400);
      
      expect(res.body.result).toBe('error');
    });

    it('should return file information for valid content ID', async () => {
      const testFile = await File.create({
        cont_id: 7777777,
        seq_id: 1,
        hash: 'testhash7777777',
        company_code: 'WEDISK',
        category_code: '001',
        filename: 'test.mp4',
        filesize: 1024000,
        download_count: 3,
        last_download_date: '20250420'
      });

      const res = await request(app)
        .post('/download/info')
        .send({
          cont_id: 7777777,
          seq_id: 1,
          user_id: 'testuser'
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.file_info.cont_id).toBe(7777777);
      expect(res.body.file_info.seq_id).toBe(1);
      expect(res.body.file_info.file_name).toBe('test.mp4');
      expect(res.body.file_info.hash_code).toBe('testhash7777777');
      expect(res.body.file_info.download_count).toBe(3);

      await testFile.destroy();
    });
  });

  describe('POST /download/update_stats', () => {
    it('should return error for missing required parameters', async () => {
      const res = await request(app)
        .post('/download/update_stats')
        .send({})
        .expect(400);
      
      expect(res.body.result).toBe('error');
    });

    it('should update download statistics for valid content ID', async () => {
      const testFile = await File.create({
        cont_id: 6666666,
        seq_id: 1,
        hash: 'testhash6666666',
        company_code: 'WEDISK',
        category_code: '001',
        filename: 'test.mp4',
        filesize: 1024000,
        download_count: 5
      });

      const res = await request(app)
        .post('/download/update_stats')
        .send({
          cont_id: 6666666,
          seq_id: 1,
          user_id: 'testuser',
          download_status: 'completed'
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.download_count).toBe(6);

      const updatedFile = await File.findOne({
        where: {
          cont_id: 6666666,
          seq_id: 1
        }
      });
      
      expect(updatedFile.download_count).toBe(6);

      await testFile.destroy();
    });
  });
});

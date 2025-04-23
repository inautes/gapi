import request from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/config/database.js';

describe('Upload API Endpoints', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /upload/address', () => {
    it('should return upload server addresses', async () => {
      const res = await request(app)
        .get('/upload/address')
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.ftp_upload_server).toBe('wedisk-ftpupload.dadamcloud.com');
      expect(res.body.download_server).toBe('https://wedisk-down.dadamcloud.com/fdown.php');
    });
  });

  describe('POST /upload/start_process', () => {
    it('should return error for missing required parameters', async () => {
      const res = await request(app)
        .post('/upload/start_process')
        .send({})
        .expect(400);
      
      expect(res.body.result).toBe('error');
    });

    it('should start upload process with valid parameters', async () => {
      const res = await request(app)
        .post('/upload/start_process')
        .send({
          user_id: 'testuser',
          file_name: 'test.mp4',
          file_size: 1024,
          sect_code: '01',
          sect_sub: '',
          title: 'Test Video',
          descript: 'Test Description',
          default_hash: 'abcdef123456',
          audio_hash: '',
          video_hash: '',
          copyright_yn: 'N'
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.temp_id).toBeDefined();
      expect(res.body.seq_no).toBeDefined();
    });
  });

  describe('POST /upload/end_process', () => {
    it('should return error for missing required parameters', async () => {
      const res = await request(app)
        .post('/upload/end_process')
        .send({})
        .expect(400);
      
      expect(res.body.result).toBe('error');
    });

    it('should return error for invalid temp_id', async () => {
      const res = await request(app)
        .post('/upload/end_process')
        .send({
          temp_id: '999999999',
          user_id: 'testuser'
        })
        .expect(404);
      
      expect(res.body.result).toBe('error');
    });

  });
});

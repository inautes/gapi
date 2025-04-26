import request from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/config/database.js';
import { File, WebhardHash } from '../src/models/index.js';

describe('Hashin API Endpoint', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS T_CONTENTS_FILELIST (
        id INTEGER,
        seq_no INTEGER,
        file_name TEXT,
        PRIMARY KEY (id, seq_no)
      )
    `);
    
    await sequelize.query(`
      INSERT INTO T_CONTENTS_FILELIST (id, seq_no, file_name)
      VALUES (1234567, 2, 'test_file.mp4')
    `);
  });

  afterEach(async () => {
    await sequelize.query('DROP TABLE IF EXISTS T_CONTENTS_FILELIST');
    await WebhardHash.destroy({ where: {} });
    await File.destroy({ where: {} });
  });

  describe('POST /upload/hashin', () => {
    it('should return error for missing file information', async () => {
      const res = await request(app)
        .post('/upload/hashin')
        .send({})
        .expect(400);
      
      expect(res.body.result).toBe('error');
      expect(res.body.message).toBe('파일 정보가 누락되었습니다');
    });

    it('should return error for missing required parameters', async () => {
      const res = await request(app)
        .post('/upload/hashin')
        .send({
          info: {
            cont_id: 1234567
          }
        })
        .expect(400);
      
      expect(res.body.result).toBe('error');
      expect(res.body.message).toContain('필수 파라미터가 누락되었습니다');
    });

    it('should create webhard hash entry with seq_id from T_CONTENTS_FILELIST', async () => {
      const res = await request(app)
        .post('/upload/hashin')
        .send({
          info: {
            cont_id: 1234567,
            filename: 'test_file.mp4',
            webhard_hash: 'test_webhard_hash_123',
            cloud_yn: 'y',
            category_code: '001'
          }
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.files).toHaveLength(1);
      expect(res.body.files[0].cont_id).toBe(1234567);
      expect(res.body.files[0].seq_id).toBe(2); // seq_id from T_CONTENTS_FILELIST
      expect(res.body.files[0].webhard_hash).toBe('test_webhard_hash_123');
      
      const webhardHash = await WebhardHash.findOne({
        where: {
          id: 1234567,
          seq_no: 2
        }
      });
      
      expect(webhardHash).not.toBeNull();
      expect(webhardHash.cld_hash).toBe('test_webhard_hash_123');
      expect(webhardHash.cloud_yn).toBe('Y');
    });

    it('should use default seq_id 1 when file not found in T_CONTENTS_FILELIST', async () => {
      const res = await request(app)
        .post('/upload/hashin')
        .send({
          info: {
            cont_id: 9999999, // 존재하지 않는 cont_id
            filename: 'nonexistent_file.mp4',
            webhard_hash: 'test_webhard_hash_456',
            cloud_yn: 'n'
          }
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.files).toHaveLength(1);
      expect(res.body.files[0].cont_id).toBe(9999999);
      expect(res.body.files[0].seq_id).toBe(1); // 기본값 1 사용
      
      const webhardHash = await WebhardHash.findOne({
        where: {
          id: 9999999,
          seq_no: 1
        }
      });
      
      expect(webhardHash).not.toBeNull();
      expect(webhardHash.cld_hash).toBe('test_webhard_hash_456');
      expect(webhardHash.cloud_yn).toBe('N');
    });

    it('should handle multiple file entries', async () => {
      const res = await request(app)
        .post('/upload/hashin')
        .send({
          info: [
            {
              cont_id: 1234567,
              filename: 'test_file.mp4',
              webhard_hash: 'test_webhard_hash_123',
              cloud_yn: 'y'
            },
            {
              cont_id: 9999999,
              filename: 'nonexistent_file.mp4',
              webhard_hash: 'test_webhard_hash_456',
              cloud_yn: 'n'
            }
          ]
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.files).toHaveLength(2);
      
      const webhardHash1 = await WebhardHash.findOne({
        where: {
          id: 1234567,
          seq_no: 2
        }
      });
      
      expect(webhardHash1).not.toBeNull();
      expect(webhardHash1.cld_hash).toBe('test_webhard_hash_123');
      
      const webhardHash2 = await WebhardHash.findOne({
        where: {
          id: 9999999,
          seq_no: 1
        }
      });
      
      expect(webhardHash2).not.toBeNull();
      expect(webhardHash2.cld_hash).toBe('test_webhard_hash_456');
    });

    it('should update existing webhard hash entry', async () => {
      await WebhardHash.create({
        seq_no: 2,
        id: 1234567,
        cld_hash: 'old_hash',
        cloud_yn: 'N',
        reg_date: '20250101',
        reg_time: '120000'
      });
      
      const res = await request(app)
        .post('/upload/hashin')
        .send({
          info: {
            cont_id: 1234567,
            filename: 'test_file.mp4',
            webhard_hash: 'updated_hash',
            cloud_yn: 'y'
          }
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      
      const webhardHash = await WebhardHash.findOne({
        where: {
          id: 1234567,
          seq_no: 2
        }
      });
      
      expect(webhardHash).not.toBeNull();
      expect(webhardHash.cld_hash).toBe('updated_hash');
      expect(webhardHash.cloud_yn).toBe('Y');
    });
  });
});

import request from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/config/database.js';
import { WebhardHash } from '../src/models/index.js';

describe('JSON Upload API Endpoints', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS T_CONTENTS_TEMP (
        id VARCHAR(20) PRIMARY KEY,
        title VARCHAR(255),
        descript TEXT,
        descript2 TEXT,
        descript3 TEXT,
        keyword TEXT,
        sect_code VARCHAR(10),
        sect_sub VARCHAR(10),
        adult_yn CHAR(1),
        share_meth CHAR(1),
        price_amt INTEGER,
        won_mega INTEGER,
        reg_user VARCHAR(20),
        reg_date VARCHAR(8),
        reg_time VARCHAR(6),
        disp_end_date VARCHAR(8),
        disp_end_time VARCHAR(6),
        item_bold_yn CHAR(1),
        item_color CHAR(1),
        req_id INTEGER,
        editor_type INTEGER
      )
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS T_CONTENTS_TEMPLIST (
        id VARCHAR(20) PRIMARY KEY,
        file_name VARCHAR(255),
        file_size BIGINT,
        file_type INTEGER,
        file_ext VARCHAR(10),
        file_path VARCHAR(255),
        reg_date VARCHAR(8),
        reg_time VARCHAR(6),
        copyright_yn CHAR(1),
        mobservice_yn CHAR(1),
        mureka_yn CHAR(1),
        mureka_id VARCHAR(50),
        mureka_name VARCHAR(255),
        mureka_album VARCHAR(255),
        mureka_artist VARCHAR(255),
        copyright_id VARCHAR(50),
        copyright_name VARCHAR(255)
      )
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS T_CONTENTS_TEMPLIST_SUB (
        id VARCHAR(20),
        seq_no INTEGER,
        file_name VARCHAR(255),
        file_size BIGINT,
        file_type INTEGER,
        file_ext VARCHAR(10),
        default_hash VARCHAR(128),
        audio_hash VARCHAR(128),
        video_hash VARCHAR(128),
        comp_cd VARCHAR(10),
        chi_id INTEGER,
        price_amt INTEGER,
        mob_price_amt INTEGER,
        reg_date VARCHAR(8),
        reg_time VARCHAR(6),
        PRIMARY KEY (id, seq_no)
      )
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS T_CONTENTS_INFO (
        id VARCHAR(20) PRIMARY KEY,
        title VARCHAR(255),
        descript TEXT,
        descript2 TEXT,
        descript3 TEXT,
        keyword TEXT,
        sect_code VARCHAR(10),
        sect_sub VARCHAR(10),
        adult_yn CHAR(1),
        share_meth CHAR(1),
        price_amt INTEGER,
        won_mega INTEGER,
        reg_user VARCHAR(20),
        reg_date VARCHAR(8),
        reg_time VARCHAR(6),
        disp_end_date VARCHAR(8),
        disp_end_time VARCHAR(6),
        item_bold_yn CHAR(1),
        item_color CHAR(1),
        bomul_id INTEGER,
        bomul_stat INTEGER,
        req_id INTEGER,
        editor_type INTEGER,
        nmnt_cnt INTEGER,
        disp_cnt_inc INTEGER
      )
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS T_CONTENTS_FILELIST (
        id VARCHAR(20),
        seq_no INTEGER,
        file_name VARCHAR(255),
        file_size BIGINT,
        file_type INTEGER,
        file_ext VARCHAR(10),
        default_hash VARCHAR(128),
        audio_hash VARCHAR(128),
        video_hash VARCHAR(128),
        comp_cd VARCHAR(10),
        chi_id INTEGER,
        price_amt INTEGER,
        mob_price_amt INTEGER,
        reg_date VARCHAR(8),
        reg_time VARCHAR(6),
        PRIMARY KEY (id, seq_no)
      )
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS T_CONTENTS_UPDN (
        id VARCHAR(20) PRIMARY KEY,
        cont_gu VARCHAR(2),
        copyright_yn CHAR(1),
        mobservice_yn CHAR(1),
        reg_date VARCHAR(8),
        reg_time VARCHAR(6)
      )
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS T_CONT_DADAM_FILE_MAP (
        seq_no INTEGER,
        cld_hash VARCHAR(128),
        id VARCHAR(20),
        cloud_yn CHAR(1),
        reg_date VARCHAR(8),
        reg_time VARCHAR(6),
        PRIMARY KEY (seq_no, id)
      )
    `);
  });

  afterAll(async () => {
    await sequelize.query('DROP TABLE IF EXISTS T_CONTENTS_TEMP');
    await sequelize.query('DROP TABLE IF EXISTS T_CONTENTS_TEMPLIST');
    await sequelize.query('DROP TABLE IF EXISTS T_CONTENTS_TEMPLIST_SUB');
    await sequelize.query('DROP TABLE IF EXISTS T_CONTENTS_INFO');
    await sequelize.query('DROP TABLE IF EXISTS T_CONTENTS_FILELIST');
    await sequelize.query('DROP TABLE IF EXISTS T_CONTENTS_UPDN');
    await sequelize.query('DROP TABLE IF EXISTS T_CONT_DADAM_FILE_MAP');
    
    await sequelize.close();
  });

  describe('POST /upload/enrollment_fileinfo', () => {
    it('should return error for missing required parameters', async () => {
      const res = await request(app)
        .post('/upload/enrollment_fileinfo')
        .send({})
        .expect(400);
      
      expect(res.body.result).toBe('error');
    });

    it('should register file information with valid parameters', async () => {
      const res = await request(app)
        .post('/upload/enrollment_fileinfo')
        .send({
          user_id: 'testuser',
          file_info: {
            file_name: 'test.mp4',
            file_size: 1024000,
            sect_code: '01',
            sect_sub: '',
            title: 'Test Video',
            descript: 'Test Description',
            default_hash: 'abcdef123456',
            audio_hash: '',
            video_hash: '',
            copyright_yn: 'N',
            adult_yn: 'N',
            webhard_hash: 'cloud_hash_123456'
          }
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.files).toHaveLength(1);
      expect(res.body.files[0].temp_id).toBeDefined();
      expect(res.body.files[0].seq_no).toBe(1);
      
      const webhardHash = await WebhardHash.findOne({
        where: {
          id: res.body.files[0].temp_id.toString(),
          seq_no: 1
        }
      });
      
      expect(webhardHash).not.toBeNull();
      expect(webhardHash.cld_hash).toBe('cloud_hash_123456');
    });

    it('should support multiple file uploads', async () => {
      const res = await request(app)
        .post('/upload/enrollment_fileinfo')
        .send({
          user_id: 'testuser',
          file_info: [
            {
              file_name: 'test1.mp4',
              file_size: 1024000,
              sect_code: '01',
              title: 'Test Video 1',
              webhard_hash: 'cloud_hash_1'
            },
            {
              file_name: 'test2.mp4',
              file_size: 2048000,
              sect_code: '02',
              title: 'Test Video 2',
              webhard_hash: 'cloud_hash_2'
            }
          ]
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.files).toHaveLength(2);
    });
  });

  describe('POST /upload/enrollment_filtering', () => {
    let temp_id;
    
    beforeEach(async () => {
      const fileInfoRes = await request(app)
        .post('/upload/enrollment_fileinfo')
        .send({
          user_id: 'testuser',
          file_info: {
            file_name: 'filtering_test.mp4',
            file_size: 1024000,
            sect_code: '01'
          }
        });
      
      temp_id = fileInfoRes.body.files[0].temp_id;
    });
    
    it('should return error for missing required parameters', async () => {
      const res = await request(app)
        .post('/upload/enrollment_filtering')
        .send({})
        .expect(400);
      
      expect(res.body.result).toBe('error');
    });

    it('should update mureka information', async () => {
      const res = await request(app)
        .post('/upload/enrollment_filtering')
        .send({
          temp_id,
          user_id: 'testuser',
          mureka_info: {
            mureka_yn: 'Y',
            mureka_id: 'MRK12345',
            mureka_name: '테스트 곡',
            mureka_album: '테스트 앨범',
            mureka_artist: '테스트 아티스트'
          }
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.temp_id).toBe(temp_id);
      expect(res.body.filtering_result.mureka_status).toBe('completed');
      
      const [tempFiles] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_TEMPLIST WHERE id = ?`,
        {
          replacements: [temp_id.toString()]
        }
      );
      
      expect(tempFiles).toHaveLength(1);
      expect(tempFiles[0].mureka_yn).toBe('Y');
      expect(tempFiles[0].mureka_id).toBe('MRK12345');
    });

    it('should update copyright information', async () => {
      const res = await request(app)
        .post('/upload/enrollment_filtering')
        .send({
          temp_id,
          user_id: 'testuser',
          copyright_info: {
            copyright_yn: 'Y',
            copyright_id: 'CPR12345',
            copyright_name: '저작권 보유자'
          }
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.filtering_result.copyright_status).toBe('completed');
      
      const [tempFiles] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_TEMPLIST WHERE id = ?`,
        {
          replacements: [temp_id.toString()]
        }
      );
      
      expect(tempFiles).toHaveLength(1);
      expect(tempFiles[0].copyright_yn).toBe('Y');
      expect(tempFiles[0].copyright_id).toBe('CPR12345');
    });
  });

  describe('POST /upload/enrollment_complete', () => {
    let temp_id;
    
    beforeEach(async () => {
      const fileInfoRes = await request(app)
        .post('/upload/enrollment_fileinfo')
        .send({
          user_id: 'testuser',
          file_info: {
            file_name: 'complete_test.mp4',
            file_size: 1024000,
            sect_code: '01',
            webhard_hash: 'complete_hash_123'
          }
        });
      
      temp_id = fileInfoRes.body.files[0].temp_id;
      
      await request(app)
        .post('/upload/enrollment_filtering')
        .send({
          temp_id,
          user_id: 'testuser',
          copyright_info: {
            copyright_yn: 'Y'
          }
        });
    });
    
    it('should return error for missing required parameters', async () => {
      const res = await request(app)
        .post('/upload/enrollment_complete')
        .send({})
        .expect(400);
      
      expect(res.body.result).toBe('error');
    });

    it('should complete upload process with valid parameters', async () => {
      const res = await request(app)
        .post('/upload/enrollment_complete')
        .send({
          temp_id,
          user_id: 'testuser',
          sect_code: '01',
          adult_yn: 'N',
          copyright_yn: 'Y',
          mobservice_yn: 'Y'
        })
        .expect(200);
      
      expect(res.body.result).toBe('success');
      expect(res.body.cont_id).toBeDefined();
      
      const [contentInfo] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_INFO WHERE id = ?`,
        {
          replacements: [res.body.cont_id.toString()]
        }
      );
      
      expect(contentInfo).toHaveLength(1);
      
      const [contentFiles] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_FILELIST WHERE id = ?`,
        {
          replacements: [res.body.cont_id.toString()]
        }
      );
      
      expect(contentFiles).toHaveLength(1);
      
      const [contentUpdn] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_UPDN WHERE id = ?`,
        {
          replacements: [res.body.cont_id.toString()]
        }
      );
      
      expect(contentUpdn).toHaveLength(1);
      expect(contentUpdn[0].copyright_yn).toBe('Y');
      
      const [webhardHash] = await sequelize.query(
        `SELECT * FROM T_CONT_DADAM_FILE_MAP WHERE id = ?`,
        {
          replacements: [res.body.cont_id.toString()]
        }
      );
      
      expect(webhardHash).toHaveLength(1);
      expect(webhardHash[0].cld_hash).toBe('complete_hash_123');
      
      const [tempFiles] = await sequelize.query(
        `SELECT * FROM T_CONTENTS_TEMPLIST WHERE id = ?`,
        {
          replacements: [temp_id.toString()]
        }
      );
      
      expect(tempFiles).toHaveLength(0);
    });
  });
});

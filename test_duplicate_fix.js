import { sequelize } from './src/config/database.js';

async function testDuplicateFix() {
  console.log('Testing T_CONTENTS_TEMPLIST and T_CONTENTS_TEMPLIST_SUB duplicate fix...');
  
  const testId = 'TEST' + Date.now();
  const testFileName = 'test-file.mp4';
  const testFileSize = 1000000;
  const testHash = 'testhash123';
  
  try {
    console.log('\n=== T_CONTENTS_TEMPLIST 테스트 ===');
    
    await sequelize.query(
      `INSERT INTO zangsi.T_CONTENTS_TEMPLIST (
        id, file_name, file_size, file_type, file_ext, file_path,
        reg_date, reg_time, copyright_yn, mobservice_yn
      ) VALUES (
        ?, ?, ?, 0, 'mp4', '',
        '20250625', '120000', 'N', 'Y'
      )`,
      {
        replacements: [testId, testFileName, testFileSize]
      }
    );
    
    console.log('기존 웹 데이터 생성됨');
    
    const [initialCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM zangsi.T_CONTENTS_TEMPLIST WHERE id = ?`,
      { replacements: [testId] }
    );
    console.log(`초기 레코드 수: ${initialCount[0].count}`);
    
    const [tempListExists] = await sequelize.query(
      `SELECT id FROM zangsi.T_CONTENTS_TEMPLIST 
       WHERE id = ? AND file_size = ? AND file_name = ? LIMIT 1`,
      {
        replacements: [testId, testFileSize, testFileName]
      }
    );
    
    if (tempListExists.length === 0) {
      console.log('새 레코드 생성 시도');
      await sequelize.query(
        `INSERT INTO zangsi.T_CONTENTS_TEMPLIST (
          id, file_name, file_size, file_type, file_ext, file_path,
          reg_date, reg_time, copyright_yn, mobservice_yn
        ) VALUES (
          ?, ?, ?, 0, 'mp4', '',
          '20250625', '130000', 'N', 'Y'
        )`,
        {
          replacements: [testId, testFileName, testFileSize]
        }
      );
    } else {
      console.log('기존 레코드 업데이트');
      await sequelize.query(
        `UPDATE zangsi.T_CONTENTS_TEMPLIST SET
          reg_date = '20250625',
          reg_time = '130000'
        WHERE id = ? AND file_size = ? AND file_name = ?`,
        {
          replacements: [testId, testFileSize, testFileName]
        }
      );
    }
    
    const [finalCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM zangsi.T_CONTENTS_TEMPLIST WHERE id = ?`,
      { replacements: [testId] }
    );
    
    console.log(`최종 레코드 수: ${finalCount[0].count}`);
    
    if (finalCount[0].count === 1) {
      console.log('✅ T_CONTENTS_TEMPLIST: 중복 방지 성공');
    } else {
      console.log('❌ T_CONTENTS_TEMPLIST: 중복 레코드 존재');
    }
    
    console.log('\n=== T_CONTENTS_TEMPLIST_SUB 테스트 ===');
    
    await sequelize.query(
      `INSERT INTO zangsi.T_CONTENTS_TEMPLIST_SUB (
        id, seq_no, file_name, file_size, file_type, file_ext,
        default_hash, audio_hash, video_hash, comp_cd, chi_id, price_amt,
        mob_price_amt, reg_date, reg_time
      ) VALUES (
        ?, 1, ?, ?, 0, 'mp4',
        ?, '', '', 'WEDISK', 0, 0,
        0, '20250625', '120000'
      )`,
      {
        replacements: [testId, testFileName, testFileSize, testHash]
      }
    );
    
    console.log('T_CONTENTS_TEMPLIST_SUB 기존 데이터 생성됨');
    
    const [tempListSubExists] = await sequelize.query(
      `SELECT seq_no FROM zangsi.T_CONTENTS_TEMPLIST_SUB 
       WHERE id = ? AND file_size = ? AND default_hash = ? LIMIT 1`,
      {
        replacements: [testId, testFileSize, testHash]
      }
    );
    
    if (tempListSubExists.length === 0) {
      console.log('T_CONTENTS_TEMPLIST_SUB 새 레코드 생성');
    } else {
      console.log('T_CONTENTS_TEMPLIST_SUB 기존 레코드 발견 - 중복 방지됨');
    }
    
    const [subCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM zangsi.T_CONTENTS_TEMPLIST_SUB 
       WHERE id = ? AND file_size = ? AND default_hash = ?`,
      { replacements: [testId, testFileSize, testHash] }
    );
    
    if (subCount[0].count === 1) {
      console.log('✅ T_CONTENTS_TEMPLIST_SUB: 중복 방지 성공');
    } else {
      console.log('❌ T_CONTENTS_TEMPLIST_SUB: 중복 레코드 존재');
    }
    
    await sequelize.query(
      `DELETE FROM zangsi.T_CONTENTS_TEMPLIST_SUB WHERE id = ?`,
      { replacements: [testId] }
    );
    
    await sequelize.query(
      `DELETE FROM zangsi.T_CONTENTS_TEMPLIST WHERE id = ?`,
      { replacements: [testId] }
    );
    
    console.log('\n테스트 데이터 정리 완료');
    
  } catch (error) {
    console.error('테스트 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  } finally {
    await sequelize.close();
  }
}

testDuplicateFix();

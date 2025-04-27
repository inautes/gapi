import { sequelize, cprSequelize, logSequelize } from '../src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ENV = process.env.NODE_ENV || 'REAL';

async function generateQueries() {
  try {
    console.log('='.repeat(50));
    console.log(`현재 환경: ${ENV}`);
    console.log(`메인 데이터베이스: ${process.env[`MAIN_DB_HOST_${ENV}`]}`);
    console.log('='.repeat(50));
    
    const [tables] = await sequelize.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      { replacements: [process.env.MAIN_DB_NAME || 'zangsi'] }
    );
    
    console.log('\n사용 가능한 테이블 목록:');
    console.log('='.repeat(50));
    tables.forEach(table => {
      console.log(`- ${table.TABLE_NAME}`);
    });
    
    console.log('\n샘플 쿼리:');
    console.log('='.repeat(50));
    
    console.log('\n-- T_CONTENTS_FILELIST 최근 10개 조회:');
    console.log(`SELECT * FROM T_CONTENTS_FILELIST ORDER BY reg_date DESC LIMIT 10;`);
    
    console.log('\n-- T_PERM_UPLOAD_AUTH 최근 10개 조회:');
    console.log(`SELECT * FROM T_PERM_UPLOAD_AUTH ORDER BY reg_date DESC LIMIT 10;`);
    
    console.log('\n-- T_SERVER_INFO 전체 조회:');
    console.log(`SELECT * FROM T_SERVER_INFO;`);
    
    console.log('\n-- T_CONTENTS_SECT 전체 조회:');
    console.log(`SELECT * FROM T_CONTENTS_SECT;`);
    
    console.log('\n-- 특정 콘텐츠 ID와 시퀀스 ID로 파일 해시 조회:');
    console.log(`SELECT default_hash FROM T_CONTENTS_FILELIST WHERE cont_id = '1024000' AND seq_no = '321043';`);
    
    console.log('\n-- 카테고리별 파일 수 조회:');
    console.log(`SELECT t2.sect_code, COUNT(*) as file_count 
FROM T_CONTENTS_FILELIST t1 
JOIN T_CONTENTS_SECT t2 ON t1.sect_code = t2.sect_code 
GROUP BY t2.sect_code;`);
    
    console.log('\n저작권 데이터베이스 샘플 쿼리:');
    console.log('='.repeat(50));
    
    try {
      const [cprTables] = await cprSequelize.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
        { replacements: [process.env.CPR_DB_NAME || 'zangsi_cpr'] }
      );
      
      console.log('\n사용 가능한 저작권 데이터베이스 테이블:');
      cprTables.forEach(table => {
        console.log(`- ${table.TABLE_NAME}`);
      });
    } catch (error) {
      console.error('\n저작권 데이터베이스 테이블 조회 실패:', error.message);
    }
    
    console.log('\n로그 데이터베이스 샘플 쿼리:');
    console.log('='.repeat(50));
    
    try {
      const [logTables] = await logSequelize.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
        { replacements: [process.env.LOG_DB_NAME || 'zangsi_log'] }
      );
      
      console.log('\n사용 가능한 로그 데이터베이스 테이블:');
      logTables.forEach(table => {
        console.log(`- ${table.TABLE_NAME}`);
      });
    } catch (error) {
      console.error('\n로그 데이터베이스 테이블 조회 실패:', error.message);
    }
    
    console.log('\n='.repeat(50));
    console.log('쿼리 생성이 완료되었습니다.');
    console.log('='.repeat(50));
    
    await sequelize.close();
    await cprSequelize.close();
    await logSequelize.close();
    
    process.exit(0);
  } catch (error) {
    console.error('쿼리 생성 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

generateQueries();

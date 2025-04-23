import { testConnection } from '../src/config/database.js';

async function testDatabaseConnection() {
  try {
    console.log('='.repeat(50));
    console.log('데이터베이스 연결 테스트 시작...');
    console.log('='.repeat(50));
    
    await testConnection();
    
    console.log('='.repeat(50));
    console.log('모든 데이터베이스 연결이 성공적으로 테스트되었습니다!');
    console.log('='.repeat(50));
    process.exit(0);
  } catch (error) {
    console.error('='.repeat(50));
    console.error('데이터베이스 연결 테스트 실패:');
    console.error(error);
    console.error('='.repeat(50));
    process.exit(1);
  }
}

testDatabaseConnection();

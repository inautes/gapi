import app from './app.js';
import { testConnection, sequelize, cprSequelize, logSequelize } from './config/database.js';
import { syncDatabase } from './models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8000;
const ENV = process.env.NODE_ENV || 'REAL';

const startServer = async () => {
  try {
    console.log('='.repeat(50));
    console.log(`GAPI 서버 시작 중... (환경: ${ENV})`);
    console.log('='.repeat(50));
    
    await testConnection();
    
    await syncDatabase();
    
    const server = app.listen(PORT, () => {
      console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`현재 환경: ${ENV}`);
      console.log(`메인 데이터베이스: ${process.env[`MAIN_DB_HOST_${ENV}`]}`);
      console.log(`저작권 데이터베이스: ${process.env[`CPR_DB_HOST_${ENV}`]}`);
      console.log(`로그 데이터베이스: ${process.env[`LOG_DB_HOST_${ENV}`]}`);
      console.log('='.repeat(50));
    });
    
    process.on('SIGINT', async () => {
      console.log('서버를 종료합니다...');
      server.close(async () => {
        console.log('HTTP 서버가 종료되었습니다.');
        
        try {
          await sequelize.close();
          console.log('메인 데이터베이스 연결이 종료되었습니다.');
          
          await cprSequelize.close();
          console.log('저작권 데이터베이스 연결이 종료되었습니다.');
          
          await logSequelize.close();
          console.log('로그 데이터베이스 연결이 종료되었습니다.');
        } catch (error) {
          console.error('데이터베이스 연결 종료 중 오류 발생:', error);
        }
        
        console.log('모든 리소스가 정상적으로 해제되었습니다.');
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error('서버가 10초 내에 종료되지 않아 강제 종료합니다.');
        process.exit(1);
      }, 10000);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('처리되지 않은 예외 발생:', error);
      server.close(() => {
        process.exit(1);
      });
      
      setTimeout(() => {
        process.exit(1);
      }, 5000);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('처리되지 않은 프로미스 거부:', reason);
    });
    
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
};

startServer();

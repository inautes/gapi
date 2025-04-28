import app from './app.js';
import { initializeConnections, sequelize, cprSequelize, logSequelize, localSequelize } from './config/database.js';
import { syncDatabase, getConnectionStatus } from './models/index.js';
import fs from 'fs';
import path from 'path';

const PORT = 8000;
let dbMonitoringInterval = null;
let serverStartTime = null;
const LOG_DIR = path.join(process.cwd(), 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const SERVER_LOG_FILE = path.join(LOG_DIR, 'server_restart.log');

const logServerStart = (isRestart = false) => {
  const now = new Date();
  const logMessage = `[${now.toISOString()}] 서버 ${isRestart ? '재시작' : '시작'}\n`;
  
  fs.appendFileSync(SERVER_LOG_FILE, logMessage);
  
  console.log('='.repeat(50));
  console.log(`GAPI 서버 ${isRestart ? '재시작' : '시작'} 중... (${now.toISOString()})`);
  console.log('='.repeat(50));
  
  return now;
};

const startServer = async () => {
  try {
    let isRestart = false;
    try {
      if (fs.existsSync(SERVER_LOG_FILE)) {
        const lastLog = fs.readFileSync(SERVER_LOG_FILE, 'utf8').trim().split('\n').pop();
        if (lastLog) {
          isRestart = true;
          console.log(`이전 서버 로그: ${lastLog}`);
        }
      }
    } catch (error) {
      console.warn('서버 로그 파일 읽기 실패:', error.message);
    }
    
    serverStartTime = logServerStart(isRestart);
    
    await initializeConnections();
    
    const syncResult = await syncDatabase();
    
    if (syncResult && syncResult.monitoringInterval) {
      dbMonitoringInterval = syncResult.monitoringInterval;
    }
    
    const server = app.listen(PORT, () => {
      const startupTime = new Date() - serverStartTime;
      console.log(`서버가 포트 ${PORT}에서 실행 중입니다. (시작 소요 시간: ${startupTime}ms)`);
      console.log('='.repeat(50));
      
      const connectionStatus = getConnectionStatus();
      console.log('데이터베이스 연결 상태:');
      console.log(`- 로컬 SQLite: ${connectionStatus.localSynced ? '연결됨' : '연결 실패'}`);
      console.log(`- 원격 MySQL: ${connectionStatus.remoteSynced ? '연결됨' : '연결 실패'}`);
      console.log('='.repeat(50));
    });
    
    process.on('SIGINT', async () => {
      console.log('서버를 종료합니다...');
      server.close(async () => {
        console.log('HTTP 서버가 종료되었습니다.');
        
        try {
          if (dbMonitoringInterval) {
            clearInterval(dbMonitoringInterval);
            console.log('데이터베이스 연결 모니터링이 중지되었습니다.');
          }
          
          await localSequelize.close();
          console.log('로컬 SQLite 데이터베이스 연결이 종료되었습니다.');
          
          try {
            await sequelize.close();
            console.log('메인 데이터베이스 연결이 종료되었습니다.');
          } catch (error) {
            console.warn('메인 데이터베이스 연결 종료 실패:', error.message);
          }
          
          try {
            await cprSequelize.close();
            console.log('저작권 데이터베이스 연결이 종료되었습니다.');
          } catch (error) {
            console.warn('저작권 데이터베이스 연결 종료 실패:', error.message);
          }
          
          try {
            await logSequelize.close();
            console.log('로그 데이터베이스 연결이 종료되었습니다.');
          } catch (error) {
            console.warn('로그 데이터베이스 연결 종료 실패:', error.message);
          }
        } catch (error) {
          console.error('데이터베이스 연결 종료 중 오류 발생:', error.message);
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
      
      if (dbMonitoringInterval) {
        clearInterval(dbMonitoringInterval);
      }
      
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
    console.error('서버 시작 실패:', error.message);
    process.exit(1);
  }
};

startServer();

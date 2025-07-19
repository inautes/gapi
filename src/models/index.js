import User from './User.js';
import File from './File.js';
import Company from './Company.js';
import ContentsId from './ContentsId.js';
import { sequelize, monitorConnections, checkConnectionStatus, initializeConnections } from '../config/database.js';
import WebhardHash from './WebhardHash.js';
import DealInfo from './DealInfo.js';



let dbConnectionStatus = {
  remoteSynced: false};

const startConnectionMonitoring = () => {
  console.log('데이터베이스 연결 상태 모니터링 시작 (30초 간격, 상태 변경 시에만 로그 출력)');

  let lastStatus = {
    mainConnected: dbConnectionStatus.remoteSynced
  };

  const monitoringInterval = setInterval(async () => {
    try {
      const status = await checkConnectionStatus();
      let statusChanged = false;
      
      if (status.mainConnected !== lastStatus.mainConnected) {
        statusChanged = true;
        if (status.mainConnected) {
          console.log('[연결 상태 변경] MySQL 데이터베이스 연결이 복구되었습니다.');
          console.log('모든 기능이 정상적으로 작동합니다.');
        } else {
          console.error('[연결 상태 변경] MySQL 데이터베이스 연결이 끊어졌습니다.');
          console.error('데이터베이스 연결 없이는 애플리케이션이 제대로 작동하지 않습니다.');
          console.error('데이터베이스 연결을 확인하고 서버를 다시 시작하세요.');
        }
      }
      
      dbConnectionStatus.remoteSynced = status.mainConnected;
      
      lastStatus = {
        mainConnected: status.mainConnected
      };
      
      if (statusChanged) {
        console.log(`[${new Date().toISOString()}] 데이터베이스 연결 상태 변경됨`);
      }
    } catch (error) {
      console.error('[연결 모니터링 오류] 데이터베이스 연결 모니터링 중 오류 발생:', error.message);
    }
  }, 30000); // 30초마다 실행
  
  return monitoringInterval;
};

const syncDatabase = async () => {
  try {
    try {
      const connectPromise = sequelize.authenticate();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MySQL 연결 타임아웃 (5초)')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log('MySQL 데이터베이스에 연결되었습니다. 테이블 생성을 시도하지 않습니다.');
      dbConnectionStatus.remoteSynced = true;
      
      const monitoringInterval = startConnectionMonitoring();
      
      return { 
        remoteSynced: dbConnectionStatus.remoteSynced,
        monitoringInterval
      };
    } catch (error) {
      console.error('MySQL 데이터베이스 연결 실패:', error.message);
      console.error('MySQL 데이터베이스 연결 실패로 애플리케이션이 제대로 작동하지 않을 수 있습니다.');
      throw new Error('MySQL 데이터베이스 연결 실패');
    }
  } catch (error) {
    console.error('데이터베이스 연결 실패:', error.message);
    throw new Error('데이터베이스 연결 실패로 애플리케이션을 시작할 수 없습니다.');
  }
};

const getConnectionStatus = () => {
  return { ...dbConnectionStatus };
};

export {
  User,
  File,
  Company,
  ContentsId,
  WebhardHash,
  DealInfo,
  syncDatabase,
  getConnectionStatus,
  sequelize
};

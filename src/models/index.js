import Category from './Category.js';
import User from './User.js';
import File from './File.js';
import Company from './Company.js';
import { sequelize, localSequelize, monitorConnections, checkConnectionStatus, initializeConnections } from '../config/database.js';
import WebhardHash from './WebhardHash.js';

let dbConnectionStatus = {
  localSynced: false,
  remoteSynced: false
};

const startConnectionMonitoring = () => {
  initializeConnections()
    .then(status => {
      console.log('데이터베이스 연결 상태 모니터링 시작');
    })
    .catch(error => {
      console.error('데이터베이스 연결 모니터링 시작 실패:', error.message);
    });

  const monitoringInterval = setInterval(async () => {
    try {
      const status = await checkConnectionStatus();
      
      if (status.mainConnected !== dbConnectionStatus.remoteSynced) {
        if (status.mainConnected) {
          console.log('원격 MySQL 데이터베이스 연결이 복구되었습니다.');
          console.log('모든 기능이 정상적으로 작동합니다.');
        } else {
          console.warn('원격 MySQL 데이터베이스 연결이 끊어졌습니다.');
          console.warn('로컬 SQLite 데이터베이스만 사용하여 계속 진행합니다.');
          console.warn('원격 데이터베이스가 필요한 기능은 제한됩니다.');
        }
      }
      
      dbConnectionStatus.remoteSynced = status.mainConnected;
      dbConnectionStatus.localSynced = status.localConnected;
    } catch (error) {
      console.error('데이터베이스 연결 모니터링 중 오류 발생:', error.message);
    }
  }, 30000); // 30초마다 실행
  
  return monitoringInterval;
};

const syncDatabase = async () => {
  try {
    await localSequelize.sync({ force: false, alter: false });
    console.log('로컬 SQLite 모델이 성공적으로 동기화되었습니다.');
    dbConnectionStatus.localSynced = true;
    
    try {
      const connectPromise = sequelize.authenticate();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('원격 MySQL 연결 타임아웃 (5초)')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      await sequelize.sync({ force: false, alter: false });
      console.log('원격 MySQL 모델이 성공적으로 동기화되었습니다.');
      dbConnectionStatus.remoteSynced = true;
      
      const monitoringInterval = startConnectionMonitoring();
      
      return { 
        localSynced: true, 
        remoteSynced: true,
        monitoringInterval
      };
    } catch (error) {
      console.error('원격 MySQL 모델 동기화 실패:', error.message);
      console.warn('원격 MySQL 데이터베이스 연결 실패로 인해 WebhardHash 모델은 동기화되지 않았습니다.');
      console.warn('로컬 SQLite 데이터베이스만 사용하여 계속 진행합니다.');
      console.warn('원격 데이터베이스가 필요한 기능은 제한됩니다.');
      dbConnectionStatus.remoteSynced = false;
      
      const monitoringInterval = startConnectionMonitoring();
      
      return { 
        localSynced: true, 
        remoteSynced: false,
        monitoringInterval
      };
    }
  } catch (error) {
    console.error('데이터베이스 동기화 실패:', error.message);
    throw new Error('데이터베이스 동기화 실패로 애플리케이션을 시작할 수 없습니다.');
  }
};

const getConnectionStatus = () => {
  return { ...dbConnectionStatus };
};

export {
  Category,
  User,
  File,
  Company,
  WebhardHash,
  syncDatabase,
  getConnectionStatus,
  sequelize,
  localSequelize
};

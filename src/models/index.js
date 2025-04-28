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
  console.log('데이터베이스 연결 상태 모니터링 시작 (30초 간격, 상태 변경 시에만 로그 출력)');

  let lastStatus = {
    mainConnected: dbConnectionStatus.remoteSynced,
    localConnected: dbConnectionStatus.localSynced
  };

  const monitoringInterval = setInterval(async () => {
    try {
      const status = await checkConnectionStatus();
      let statusChanged = false;
      
      if (status.mainConnected !== lastStatus.mainConnected) {
        statusChanged = true;
        if (status.mainConnected) {
          console.log('[연결 상태 변경] 원격 MySQL 데이터베이스 연결이 복구되었습니다.');
          console.log('모든 기능이 정상적으로 작동합니다.');
        } else {
          console.warn('[연결 상태 변경] 원격 MySQL 데이터베이스 연결이 끊어졌습니다.');
          console.warn('로컬 SQLite 데이터베이스만 사용하여 계속 진행합니다.');
          console.warn('원격 데이터베이스가 필요한 기능은 제한됩니다.');
        }
      }
      
      if (status.localConnected !== lastStatus.localConnected) {
        statusChanged = true;
        if (status.localConnected) {
          console.log('[연결 상태 변경] 로컬 SQLite 데이터베이스 연결이 복구되었습니다.');
        } else {
          console.error('[연결 상태 변경] 로컬 SQLite 데이터베이스 연결이 끊어졌습니다.');
          console.error('기본 기능이 제한됩니다. 서버를 재시작해야 할 수 있습니다.');
        }
      }
      
      dbConnectionStatus.remoteSynced = status.mainConnected;
      dbConnectionStatus.localSynced = status.localConnected;
      
      lastStatus = {
        mainConnected: status.mainConnected,
        localConnected: status.localConnected
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
    await localSequelize.sync({ force: false, alter: false });
    console.log('로컬 SQLite 모델이 성공적으로 동기화되었습니다.');
    dbConnectionStatus.localSynced = true;
    
    try {
      const connectPromise = sequelize.authenticate();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('원격 MySQL 연결 타임아웃 (5초)')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      try {
        await sequelize.sync({ force: false, alter: false });
        console.log('원격 MySQL 모델이 성공적으로 동기화되었습니다.');
        dbConnectionStatus.remoteSynced = true;
      } catch (syncError) {
        console.error('원격 MySQL 모델 동기화 실패:', syncError.message);
        
        if (syncError.message.includes('T_CONT_DADAM_FILE_MAP') || 
            syncError.message.includes('CREATE command denied')) {
          console.warn('T_CONT_DADAM_FILE_MAP 테이블에 대한 CREATE 권한이 없습니다.');
          console.warn('WebhardHash 모델을 로컬 SQLite에 생성합니다.');
          
          try {
            // WebhardHash 모델을 로컬 SQLite에 동기화
            await WebhardHash.local.sync({ force: false, alter: false });
            console.log('WebhardHash 모델이 로컬 SQLite에 성공적으로 동기화되었습니다.');
          } catch (localSyncError) {
            console.error('WebhardHash 모델의 로컬 SQLite 동기화 실패:', localSyncError.message);
          }
        } else {
          console.warn('원격 MySQL 데이터베이스 연결 실패로 인해 일부 모델이 동기화되지 않았습니다.');
        }
        
        console.warn('로컬 SQLite 데이터베이스를 사용하여 계속 진행합니다.');
        console.warn('원격 데이터베이스가 필요한 기능은 제한됩니다.');
      }
      
      const monitoringInterval = startConnectionMonitoring();
      
      return { 
        localSynced: true, 
        remoteSynced: dbConnectionStatus.remoteSynced,
        monitoringInterval
      };
    } catch (error) {
      console.error('원격 MySQL 모델 동기화 실패:', error.message);
      console.warn('원격 MySQL 데이터베이스 연결 실패로 인해 WebhardHash 모델은 동기화되지 않았습니다.');
      console.warn('WebhardHash 모델을 로컬 SQLite에 생성합니다.');
      
      try {
        // WebhardHash 모델을 로컬 SQLite에 동기화
        await WebhardHash.local.sync({ force: false, alter: false });
        console.log('WebhardHash 모델이 로컬 SQLite에 성공적으로 동기화되었습니다.');
        
        const categoryExists = await Category.findOne({ where: { code: '01' } });
        if (!categoryExists) {
          await Category.create({
            code: '01',
            name: '영화',
            description: '영화 카테고리',
            cloud_yn: 'Y'
          });
          console.log('카테고리 코드 "01"이 로컬 SQLite에 성공적으로 추가되었습니다.');
        }
      } catch (localSyncError) {
        console.error('로컬 SQLite 동기화 실패:', localSyncError.message);
      }
      
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

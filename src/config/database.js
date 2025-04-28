import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';

try {
  dotenv.config();
  console.log('환경 변수 로드 완료');
} catch (error) {
  console.warn('환경 변수 로드 중 오류 발생:', error.message);
}

console.log('=== 데이터베이스 연결 설정 ===');
console.log('단일 모드로 설정됨');

const ENV = process.env.NODE_ENV || 'REAL';
console.log(`현재 환경 모드: ${ENV}`);

const DB_CONFIG = {
  MAIN: {
    HOST: process.env[`MAIN_DB_HOST_${ENV}`] || '49.236.131.20',
    PORT: parseInt(process.env.MAIN_DB_PORT || '3306', 10),
    NAME: process.env.MAIN_DB_NAME || 'zangsi',
    USER: process.env.MAIN_DB_USER || 'dmondcmd',
    PASSWORD: process.env.MAIN_DB_PASSWORD || 'password'
  },
  CPR: {
    HOST: process.env[`CPR_DB_HOST_${ENV}`] || '49.236.131.28',
    PORT: parseInt(process.env.CPR_DB_PORT || '3306', 10),
    NAME: process.env.CPR_DB_NAME || 'zangsi_cpr',
    USER: process.env.CPR_DB_USER || 'dmondcmd',
    PASSWORD: process.env.CPR_DB_PASSWORD || 'password'
  },
  LOG: {
    HOST: process.env[`LOG_DB_HOST_${ENV}`] || '49.236.131.33',
    PORT: parseInt(process.env.LOG_DB_PORT || '3306', 10),
    NAME: process.env.LOG_DB_NAME || 'zangsi',
    USER: process.env.LOG_DB_USER || 'dmondcmd',
    PASSWORD: process.env.LOG_DB_PASSWORD || 'password'
  }
};

console.log('=== 데이터베이스 연결 정보 ===');
console.log(`메인 DB 호스트: ${DB_CONFIG.MAIN.HOST}`);
console.log(`메인 DB 사용자: ${DB_CONFIG.MAIN.USER}`);
console.log(`저작권 DB 호스트: ${DB_CONFIG.CPR.HOST}`);
console.log(`로그 DB 호스트: ${DB_CONFIG.LOG.HOST}`);
console.log('=== 데이터베이스 연결 정보 끝 ===');

const localSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(process.cwd(), 'database.sqlite'),
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const remoteSequelize = new Sequelize({
  dialect: 'mysql',
  host: DB_CONFIG.MAIN.HOST,
  port: DB_CONFIG.MAIN.PORT,
  database: DB_CONFIG.MAIN.NAME,
  username: DB_CONFIG.MAIN.USER,
  password: DB_CONFIG.MAIN.PASSWORD,
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 10000, // 10초 내에 연결 획득
    idle: 10000
  },
  dialectOptions: {
    connectTimeout: 5000, // 5초 내에 연결 시도
    host: DB_CONFIG.MAIN.HOST
  }
});

const cprSequelize = new Sequelize({
  dialect: 'mysql',
  host: DB_CONFIG.CPR.HOST,
  port: DB_CONFIG.CPR.PORT,
  database: DB_CONFIG.CPR.NAME,
  username: DB_CONFIG.CPR.USER,
  password: DB_CONFIG.CPR.PASSWORD,
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 10000,
    idle: 10000
  },
  dialectOptions: {
    connectTimeout: 5000,
    host: DB_CONFIG.CPR.HOST
  }
});

const logSequelize = new Sequelize({
  dialect: 'mysql',
  host: DB_CONFIG.LOG.HOST,
  port: DB_CONFIG.LOG.PORT,
  database: DB_CONFIG.LOG.NAME,
  username: DB_CONFIG.LOG.USER,
  password: DB_CONFIG.LOG.PASSWORD,
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 10000,
    idle: 10000
  },
  dialectOptions: {
    connectTimeout: 5000,
    host: DB_CONFIG.LOG.HOST
  }
});

const testConnection = async () => {
  let localDbConnected = false;
  let mainDbConnected = false;
  let cprDbConnected = false;
  let logDbConnected = false;
  
  console.log('==================================================');
  console.log('GAPI 서버 시작 중...');
  console.log('==================================================');
  
  try {
    try {
      await localSequelize.authenticate();
      console.log('로컬 SQLite 데이터베이스 연결이 성공적으로 설정되었습니다.');
      localDbConnected = true;
    } catch (error) {
      console.error('로컬 SQLite 데이터베이스 연결 실패:', error.message);
      throw new Error('로컬 SQLite 데이터베이스 연결 실패. 애플리케이션을 시작할 수 없습니다.');
    }
    
    try {
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`메인 MySQL 데이터베이스 연결 시도 ${retryCount + 1}/${maxRetries}...`);
          
          const connectPromise = remoteSequelize.authenticate();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('원격 MySQL 연결 타임아웃 (5초)')), 5000)
          );
          
          await Promise.race([connectPromise, timeoutPromise]);
          
          console.log('메인 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
          console.log(`연결 정보: ${DB_CONFIG.MAIN.HOST}:${DB_CONFIG.MAIN.PORT}`);
          mainDbConnected = true;
          break; // 연결 성공 시 루프 종료
        } catch (err) {
          lastError = err;
          console.error(`메인 MySQL 데이터베이스 연결 시도 ${retryCount + 1}/${maxRetries} 실패:`, err.message);
          retryCount++;
          
          if (retryCount < maxRetries) {
            console.log(`2초 후 재시도합니다...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 후 재시도
          }
        }
      }
      
      if (!mainDbConnected) {
        console.warn(`메인 MySQL 데이터베이스 연결이 ${maxRetries}번 시도 후 실패했습니다.`);
        console.warn('메인 MySQL 데이터베이스 연결 실패로 인해 일부 기능이 제한됩니다.');
        console.warn('로컬 SQLite 데이터베이스를 사용하여 계속 진행합니다.');
        
        if (lastError && lastError.message.includes('222.121.76.217')) {
          console.error('클라이언트 IP 주소(222.121.76.217)가 MySQL 서버에 접근할 수 없습니다.');
          console.error('MySQL 서버에 해당 IP에 대한 접근 권한을 추가하거나 다른 연결 방법을 사용하세요.');
        }
      }
    } catch (error) {
      console.error('메인 MySQL 데이터베이스 연결 처리 중 오류 발생:', error.message);
      console.warn('메인 MySQL 데이터베이스 연결 실패로 인해 일부 기능이 제한됩니다.');
      console.warn('로컬 SQLite 데이터베이스를 사용하여 계속 진행합니다.');
    }
    
    try {
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`저작권 MySQL 데이터베이스 연결 시도 ${retryCount + 1}/${maxRetries}...`);
          
          const connectPromise = cprSequelize.authenticate();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('저작권 MySQL 연결 타임아웃 (5초)')), 5000)
          );
          
          await Promise.race([connectPromise, timeoutPromise]);
          
          console.log('저작권 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
          console.log(`연결 정보: ${DB_CONFIG.CPR.HOST}:${DB_CONFIG.CPR.PORT}`);
          cprDbConnected = true;
          break; // 연결 성공 시 루프 종료
        } catch (err) {
          lastError = err;
          console.error(`저작권 MySQL 데이터베이스 연결 시도 ${retryCount + 1}/${maxRetries} 실패:`, err.message);
          retryCount++;
          
          if (retryCount < maxRetries) {
            console.log(`2초 후 재시도합니다...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 후 재시도
          }
        }
      }
      
      if (!cprDbConnected) {
        console.warn(`저작권 MySQL 데이터베이스 연결이 ${maxRetries}번 시도 후 실패했습니다.`);
        console.warn('저작권 MySQL 데이터베이스 연결 실패로 인해 일부 기능이 제한됩니다.');
        
        if (lastError && lastError.message.includes('222.121.76.217')) {
          console.error('클라이언트 IP 주소(222.121.76.217)가 MySQL 서버에 접근할 수 없습니다.');
          console.error('MySQL 서버에 해당 IP에 대한 접근 권한을 추가하거나 다른 연결 방법을 사용하세요.');
        }
      }
    } catch (error) {
      console.error('저작권 MySQL 데이터베이스 연결 처리 중 오류 발생:', error.message);
      console.warn('저작권 MySQL 데이터베이스 연결 실패로 인해 일부 기능이 제한됩니다.');
    }
    
    try {
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`로그 MySQL 데이터베이스 연결 시도 ${retryCount + 1}/${maxRetries}...`);
          
          const connectPromise = logSequelize.authenticate();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('로그 MySQL 연결 타임아웃 (5초)')), 5000)
          );
          
          await Promise.race([connectPromise, timeoutPromise]);
          
          console.log('로그 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
          console.log(`연결 정보: ${DB_CONFIG.LOG.HOST}:${DB_CONFIG.LOG.PORT}`);
          logDbConnected = true;
          break; // 연결 성공 시 루프 종료
        } catch (err) {
          lastError = err;
          console.error(`로그 MySQL 데이터베이스 연결 시도 ${retryCount + 1}/${maxRetries} 실패:`, err.message);
          retryCount++;
          
          if (retryCount < maxRetries) {
            console.log(`2초 후 재시도합니다...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 후 재시도
          }
        }
      }
      
      if (!logDbConnected) {
        console.warn(`로그 MySQL 데이터베이스 연결이 ${maxRetries}번 시도 후 실패했습니다.`);
        console.warn('로그 MySQL 데이터베이스 연결 실패로 인해 일부 기능이 제한됩니다.');
        
        if (lastError && lastError.message.includes('222.121.76.217')) {
          console.error('클라이언트 IP 주소(222.121.76.217)가 MySQL 서버에 접근할 수 없습니다.');
          console.error('MySQL 서버에 해당 IP에 대한 접근 권한을 추가하거나 다른 연결 방법을 사용하세요.');
        }
      }
    } catch (error) {
      console.error('로그 MySQL 데이터베이스 연결 처리 중 오류 발생:', error.message);
      console.warn('로그 MySQL 데이터베이스 연결 실패로 인해 일부 기능이 제한됩니다.');
    }
    
    if (!mainDbConnected && !cprDbConnected && !logDbConnected) {
      console.warn('모든 원격 MySQL 데이터베이스 연결에 실패했습니다.');
      console.warn('로컬 SQLite 데이터베이스만 사용하여 계속 진행합니다.');
      console.warn('원격 데이터베이스가 필요한 기능은 제한됩니다.');
    } else {
      console.log('일부 또는 모든 MySQL 데이터베이스에 연결되었습니다.');
      if (mainDbConnected) {
        console.log('- 메인 DB: 연결됨');
      } else {
        console.log('- 메인 DB: 연결 실패');
      }
      
      if (cprDbConnected) {
        console.log('- 저작권 DB: 연결됨');
      } else {
        console.log('- 저작권 DB: 연결 실패');
      }
      
      if (logDbConnected) {
        console.log('- 로그 DB: 연결됨');
      } else {
        console.log('- 로그 DB: 연결 실패');
      }
    }
    
    return { 
      localConnected: localDbConnected, 
      mainConnected: mainDbConnected,
      cprConnected: cprDbConnected,
      logConnected: logDbConnected
    };
  } catch (error) {
    console.error('데이터베이스 연결 테스트 중 오류 발생:', error.message);
    throw error;
  }
};

const monitorConnections = async () => {
  try {
    const status = await testConnection();
    return status;
  } catch (error) {
    console.error('데이터베이스 연결 모니터링 중 오류 발생:', error.message);
    return {
      localConnected: false,
      mainConnected: false,
      cprConnected: false,
      logConnected: false
    };
  }
};

export { 
  localSequelize,
  remoteSequelize as sequelize, 
  cprSequelize, 
  logSequelize, 
  testConnection,
  monitorConnections
};

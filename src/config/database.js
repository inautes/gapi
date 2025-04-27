import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = process.env.NODE_ENV || 'REAL';
console.log(`현재 환경: ${env}`);

console.log('=== 환경 변수 디버깅 ===');
console.log(`MAIN_DB_HOST_${env}: ${process.env[`MAIN_DB_HOST_${env}`]}`);
console.log(`MAIN_DB_USER: ${process.env.MAIN_DB_USER}`);
console.log(`MAIN_DB_PASSWORD: ${process.env.MAIN_DB_PASSWORD ? '설정됨' : '설정되지 않음'}`);
console.log('=== 환경 변수 디버깅 끝 ===');

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
  host: env === 'REAL' ? process.env.MAIN_DB_HOST_REAL : process.env.MAIN_DB_HOST_QC,
  port: process.env.MAIN_DB_PORT || 3306,
  database: process.env.MAIN_DB_NAME || 'zangsi',
  username: process.env.MAIN_DB_USER,
  password: process.env.MAIN_DB_PASSWORD,
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
    connectTimeout: 5000 // 5초 내에 연결 시도
  }
});

const cprSequelize = new Sequelize({
  dialect: 'mysql',
  host: env === 'REAL' ? process.env.CPR_DB_HOST_REAL : process.env.CPR_DB_HOST_QC,
  port: process.env.CPR_DB_PORT || 3306,
  database: process.env.CPR_DB_NAME || 'zangsi_cpr',
  username: process.env.CPR_DB_USER,
  password: process.env.CPR_DB_PASSWORD,
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
    connectTimeout: 5000
  }
});

const logSequelize = new Sequelize({
  dialect: 'mysql',
  host: env === 'REAL' ? process.env.LOG_DB_HOST_REAL : process.env.LOG_DB_HOST_QC,
  port: process.env.LOG_DB_PORT || 3306,
  database: process.env.LOG_DB_NAME || 'zangsi',
  username: process.env.LOG_DB_USER,
  password: process.env.LOG_DB_PASSWORD,
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
    connectTimeout: 5000
  }
});

const testConnection = async () => {
  let localDbConnected = false;
  let mainDbConnected = false;
  let cprDbConnected = false;
  let logDbConnected = false;
  
  console.log('==================================================');
  console.log(`GAPI 서버 시작 중... (환경: ${env})`);
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
      const connectPromise = remoteSequelize.authenticate();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('원격 MySQL 연결 타임아웃 (5초)')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log('메인 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
      console.log(`연결 정보: ${process.env[`MAIN_DB_HOST_${env}`]}:${process.env.MAIN_DB_PORT || 3306}`);
      mainDbConnected = true;
    } catch (error) {
      console.error('메인 MySQL 데이터베이스 연결 실패:', error.message);
      console.warn('메인 MySQL 데이터베이스 연결 실패로 인해 일부 기능이 제한됩니다.');
      console.warn('로컬 SQLite 데이터베이스를 사용하여 계속 진행합니다.');
    }
    
    try {
      const connectPromise = cprSequelize.authenticate();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('저작권 MySQL 연결 타임아웃 (5초)')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log('저작권 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
      console.log(`연결 정보: ${process.env[`CPR_DB_HOST_${env}`]}:${process.env.CPR_DB_PORT || 3306}`);
      cprDbConnected = true;
    } catch (error) {
      console.error('저작권 MySQL 데이터베이스 연결 실패:', error.message);
      console.warn('저작권 MySQL 데이터베이스 연결 실패로 인해 일부 기능이 제한됩니다.');
    }
    
    try {
      const connectPromise = logSequelize.authenticate();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('로그 MySQL 연결 타임아웃 (5초)')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log('로그 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
      console.log(`연결 정보: ${process.env[`LOG_DB_HOST_${env}`]}:${process.env.LOG_DB_PORT || 3306}`);
      logDbConnected = true;
    } catch (error) {
      console.error('로그 MySQL 데이터베이스 연결 실패:', error.message);
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

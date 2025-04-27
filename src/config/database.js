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
  host: env === 'REAL' ? '49.236.131.20' : '192.168.0.38',
  port: 3306,
  database: 'zangsi',
  username: 'dmondcmd',
  password: 'fnehfvm)*^',
  logging: console.log,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const cprSequelize = new Sequelize({
  dialect: 'mysql',
  host: env === 'REAL' ? '49.236.131.28' : '192.168.0.129',
  port: 3306,
  database: 'zangsi_cpr',
  username: 'dmondcmd',
  password: 'fnehfvm)*^',
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const logSequelize = new Sequelize({
  dialect: 'mysql',
  host: env === 'REAL' ? '49.236.131.33' : '49.236.131.33',
  port: 3306,
  database: 'zangsi',
  username: 'dmondcmd',
  password: 'fnehfvm)*^',
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
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
      console.error('로컬 SQLite 데이터베이스 연결 실패:', error);
      throw new Error('로컬 SQLite 데이터베이스 연결 실패. 애플리케이션을 시작할 수 없습니다.');
    }
    
    try {
      await remoteSequelize.authenticate();
      console.log('메인 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
      console.log(`연결 정보: ${env === 'REAL' ? '49.236.131.20' : '192.168.0.38'}:3306`);
      mainDbConnected = true;
    } catch (error) {
      console.error('메인 MySQL 데이터베이스 연결 실패:', error);
    }
    
    try {
      await cprSequelize.authenticate();
      console.log('저작권 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
      console.log(`연결 정보: ${env === 'REAL' ? '49.236.131.28' : '192.168.0.129'}:3306`);
      cprDbConnected = true;
    } catch (error) {
      console.error('저작권 MySQL 데이터베이스 연결 실패:', error);
    }
    
    try {
      await logSequelize.authenticate();
      console.log('로그 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
      console.log(`연결 정보: ${env === 'REAL' ? '49.236.131.33' : '49.236.131.33'}:3306`);
      logDbConnected = true;
    } catch (error) {
      console.error('로그 MySQL 데이터베이스 연결 실패:', error);
    }
    
    if (!mainDbConnected && !cprDbConnected && !logDbConnected) {
      console.warn('모든 원격 MySQL 데이터베이스 연결에 실패했습니다.');
      console.warn('로컬 SQLite 데이터베이스만 사용하여 계속 진행합니다.');
      console.warn('원격 데이터베이스가 필요한 기능은 제한됩니다.');
    } else {
      console.log('일부 또는 모든 MySQL 데이터베이스에 연결되었습니다.');
      console.log('사용 가능한 모든 기능이 활성화됩니다.');
    }
    
    return { 
      localConnected: localDbConnected, 
      mainConnected: mainDbConnected,
      cprConnected: cprDbConnected,
      logConnected: logDbConnected
    };
  } catch (error) {
    console.error('데이터베이스 연결 테스트 중 오류 발생:', error);
    throw error;
  }
};

export { 
  localSequelize,
  remoteSequelize as sequelize, 
  cprSequelize, 
  logSequelize, 
  testConnection 
};

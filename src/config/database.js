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
  host: process.env[`MAIN_DB_HOST_${env}`],
  port: process.env.MAIN_DB_PORT || 3306,
  database: process.env.MAIN_DB_NAME || 'zangsi',
  username: process.env.MAIN_DB_USER,
  password: process.env.MAIN_DB_PASSWORD,
  logging: console.log,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const cprSequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env[`CPR_DB_HOST_${env}`],
  port: process.env.CPR_DB_PORT || 3306,
  database: process.env.CPR_DB_NAME || 'zangsi_cpr',
  username: process.env.CPR_DB_USER,
  password: process.env.CPR_DB_PASSWORD,
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const logSequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env[`LOG_DB_HOST_${env}`],
  port: process.env.LOG_DB_PORT || 3306,
  database: process.env.LOG_DB_NAME || 'zangsi_log',
  username: process.env.LOG_DB_USER,
  password: process.env.LOG_DB_PASSWORD,
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const testConnection = async () => {
  let remoteDbConnected = false;
  
  try {
    try {
      await localSequelize.authenticate();
      console.log('로컬 SQLite 데이터베이스 연결이 성공적으로 설정되었습니다.');
    } catch (error) {
      console.error('로컬 SQLite 데이터베이스 연결 실패:', error);
      throw new Error('로컬 SQLite 데이터베이스 연결 실패. 애플리케이션을 시작할 수 없습니다.');
    }
    
    try {
      await remoteSequelize.authenticate();
      console.log('원격 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
      console.log(`연결 정보: ${process.env[`MAIN_DB_HOST_${env}`]}:${process.env.MAIN_DB_PORT || 3306}`);
      remoteDbConnected = true;
    } catch (error) {
      console.error('원격 MySQL 데이터베이스 연결 실패:', error);
      console.warn('원격 MySQL 데이터베이스 없이 로컬 모드로 실행합니다.');
      console.warn('일부 기능이 제한될 수 있습니다.');
    }
    
    if (remoteDbConnected) {
      try {
        await cprSequelize.authenticate();
        console.log('저작권 데이터베이스 연결이 성공적으로 설정되었습니다.');
      } catch (error) {
        console.error('저작권 데이터베이스 연결 실패:', error);
      }
      
      try {
        await logSequelize.authenticate();
        console.log('로그 데이터베이스 연결이 성공적으로 설정되었습니다.');
      } catch (error) {
        console.error('로그 데이터베이스 연결 실패:', error);
      }
    }
    
    return { localConnected: true, remoteConnected: remoteDbConnected };
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

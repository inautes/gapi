import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const env = process.env.NODE_ENV || 'REAL';
console.log(`현재 환경: ${env}`);

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
  host: process.env[`MAIN_DB_HOST_${env}`] || '49.236.131.20',
  port: process.env.MAIN_DB_PORT || 3306,
  database: process.env.MAIN_DB_NAME || 'zangsi',
  username: process.env.MAIN_DB_USER || 'dmondcmd',
  password: process.env.MAIN_DB_PASSWORD || 'fnehfvm)*^',
  logging: console.log,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const cprSequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env[`CPR_DB_HOST_${env}`] || '49.236.131.20',
  port: process.env.CPR_DB_PORT || 3306,
  database: process.env.CPR_DB_NAME || 'zangsi_cpr',
  username: process.env.CPR_DB_USER || 'dmondcmd',
  password: process.env.CPR_DB_PASSWORD || 'fnehfvm)*^',
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const logSequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env[`LOG_DB_HOST_${env}`] || '49.236.131.20',
  port: process.env.LOG_DB_PORT || 3306,
  database: process.env.LOG_DB_NAME || 'zangsi_log',
  username: process.env.LOG_DB_USER || 'dmondcmd',
  password: process.env.LOG_DB_PASSWORD || 'fnehfvm)*^',
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true
  }
});

const testConnection = async () => {
  try {
    try {
      await localSequelize.authenticate();
      console.log('로컬 SQLite 데이터베이스 연결이 성공적으로 설정되었습니다.');
    } catch (error) {
      console.error('로컬 SQLite 데이터베이스 연결 실패:', error);
    }
    
    try {
      await remoteSequelize.authenticate();
      console.log('원격 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
    } catch (error) {
      console.error('원격 MySQL 데이터베이스 연결 실패:', error);
    }
    
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

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'REAL';
console.log(`현재 환경: ${env}`);

const mainSequelize = new Sequelize({
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
  try {
    await mainSequelize.authenticate();
    console.log('메인 데이터베이스 연결이 성공적으로 설정되었습니다.');
    
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
    console.error('메인 데이터베이스 연결 실패:', error);
    throw error;
  }
};

export { mainSequelize as sequelize, cprSequelize, logSequelize, testConnection };

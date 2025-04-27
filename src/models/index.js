import Category from './Category.js';
import User from './User.js';
import File from './File.js';
import Company from './Company.js';
import { sequelize, localSequelize } from '../config/database.js';


const syncDatabase = async () => {
  try {
    await localSequelize.sync({ force: false, alter: false });
    console.log('로컬 SQLite 모델이 성공적으로 동기화되었습니다.');
    
    try {
      await sequelize.sync({ force: false, alter: false });
      console.log('원격 MySQL 모델이 성공적으로 동기화되었습니다.');
    } catch (error) {
      console.error('원격 MySQL 모델 동기화 실패:', error);
      console.log('원격 MySQL 데이터베이스 연결 실패로 인해 WebhardHash 모델은 동기화되지 않았습니다.');
      console.log('로컬 SQLite 데이터베이스만 사용하여 계속 진행합니다.');
    }
  } catch (error) {
    console.error('데이터베이스 동기화 실패:', error);
  }
};

import WebhardHash from './WebhardHash.js';

export {
  Category,
  User,
  File,
  Company,
  WebhardHash,
  syncDatabase,
  sequelize,
  localSequelize
};

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
      const connectPromise = sequelize.authenticate();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('원격 MySQL 연결 타임아웃')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      await sequelize.sync({ force: false, alter: false });
      console.log('원격 MySQL 모델이 성공적으로 동기화되었습니다.');
      return { localSynced: true, remoteSynced: true };
    } catch (error) {
      console.error('원격 MySQL 모델 동기화 실패:', error.message);
      console.warn('원격 MySQL 데이터베이스 연결 실패로 인해 WebhardHash 모델은 동기화되지 않았습니다.');
      console.warn('로컬 SQLite 데이터베이스만 사용하여 계속 진행합니다.');
      console.warn('원격 데이터베이스가 필요한 기능은 제한됩니다.');
      return { localSynced: true, remoteSynced: false };
    }
  } catch (error) {
    console.error('데이터베이스 동기화 실패:', error);
    throw new Error('데이터베이스 동기화 실패로 애플리케이션을 시작할 수 없습니다.');
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

import { sequelize } from '../config/database.js';
import ContentsId from '../models/ContentsId.js';

/**
 * T_CONTENTS_ID 테이블을 사용하여 순차적인 컨텐츠 ID를 생성합니다.
 * 이 함수는 C 소스의 T_CONTENTS_ID INSERT 후 mysql_insert_id() 방식을 대체합니다.
 * 
 * @param {Object} transaction - Sequelize 트랜잭션 객체 (선택사항)
 * @returns {Promise<number>} 생성된 컨텐츠 ID
 * @throws {Error} ID 생성 실패 시 에러 발생
 */
export const generateContentId = async (transaction = null) => {
  try {
    console.log('[idGenerator.js:generateContentId] T_CONTENTS_ID 테이블을 사용하여 새 컨텐츠 ID 생성 시작');
    
    const transactionOptions = transaction ? { transaction } : {};
    
    const newRecord = await ContentsId.create({}, transactionOptions);
    
    const generatedId = newRecord.id;
    console.log(`[idGenerator.js:generateContentId] 생성된 컨텐츠 ID: ${generatedId}`);
    
    const MIN_ID = 1000000000;
    const MAX_ID = 2000000000;
    
    if (generatedId < MIN_ID) {
      console.warn(`[idGenerator.js:generateContentId] 생성된 ID ${generatedId}가 최소 범위 ${MIN_ID}보다 작습니다.`);
    }
    
    if (generatedId > MAX_ID) {
      console.warn(`[idGenerator.js:generateContentId] 생성된 ID ${generatedId}가 최대 범위 ${MAX_ID}를 초과했습니다.`);
    }
    
    return generatedId;
  } catch (error) {
    console.error('[idGenerator.js:generateContentId] 컨텐츠 ID 생성 중 오류 발생:', error.message);
    console.error('[idGenerator.js:generateContentId] 스택 트레이스:', error.stack);
    throw new Error(`컨텐츠 ID 생성 실패: ${error.message}`);
  }
};

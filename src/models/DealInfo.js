// 웹하드 해시 모델 (Dealinfo)
// 거래정보를 이용하여 hash 추출
// 클라우드 스토리지의 파일 해시 정보를 관리하는 Sequelize 모델입니다.
// 웹하드 서비스와 클라우드 스토리지 간의 파일 매핑을 담당합니다.
// By James
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Dealinfo = sequelize.define('Dealinfo', {
  deal_no: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    comment: '파일번호(PK): WEDISK의 deal_no 값'
  },

  id : {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '위디스크 컨텐츠번호: T_CONTENTS_FILELIST_SUB.id (위), T_CONTENTS_FILELIST.id (파)의 값'
  },
},{
    tableName: 'T_DEAL_INFO', // 실제 테이블명
    timestamps: false, // 생성/수정 시간 자동 관리 비활성화
    comment: '거래정보 매핑 테이블'
  });

export default DealInfo;
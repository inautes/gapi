import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const WebhardHash = sequelize.define('WebhardHash', {
  seq_no: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    comment: '파일번호(PK): T_CONTENTS_FILELIST_SUB.seq_no (위), T_CONTENTS_FILELIST.seq_no (파)의 값'
  },
  cld_hash: {
    type: DataTypes.STRING(128),
    allowNull: false,
    comment: '클라우드 해시: 클라우드 업체 해시값'
  },
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '위디스크 컨텐츠번호: T_CONTENTS_FILELIST_SUB.id (위), T_CONTENTS_FILELIST.id (파)의 값'
  },
  cloud_yn: {
    type: DataTypes.CHAR(1),
    allowNull: false,
    defaultValue: 'N',
    comment: '클라우드 스토리지 저장여부 Y 또는 N'
  },
  reg_date: {
    type: DataTypes.STRING(8),
    allowNull: false,
    comment: '등록날짜: 년월일'
  },
  reg_time: {
    type: DataTypes.STRING(6),
    allowNull: false,
    comment: '등록시간: 시분초'
  }
}, {
  tableName: 'T_CONT_DADAM_FILE_MAP',
  timestamps: false,
  comment: '웹하드 해시 매핑 테이블'
});

export default WebhardHash;

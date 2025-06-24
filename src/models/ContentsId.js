import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ContentsId = sequelize.define('ContentsId', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    field: 'id'
  }
}, {
  timestamps: false,
  tableName: 'T_CONTENTS_ID',
  charset: 'utf8',
  collate: 'utf8_general_ci'
});

export default ContentsId;

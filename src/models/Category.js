import { DataTypes } from 'sequelize';
import { localSequelize } from '../config/database.js';

const Category = localSequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'sect_code'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cloud_yn: {
    type: DataTypes.CHAR(1),
    allowNull: false,
    defaultValue: 'N'
  }
}, {
  timestamps: false,
  tableName: 'T_CONTENTS_SECT'
});

export default Category;

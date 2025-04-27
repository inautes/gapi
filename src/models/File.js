import { DataTypes } from 'sequelize';
import { localSequelize } from '../config/database.js';
import Category from './Category.js';
import Company from './Company.js';

const File = localSequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cont_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'cont_id'
  },
  seq_id: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'seq_no'
  },
  hash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'default_hash'
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'file_name'
  },
  cloud_yn: {
    type: DataTypes.CHAR(1),
    allowNull: false,
    defaultValue: 'N'
  },
  category_code: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: Category,
      key: 'code'
    },
    field: 'sect_code'
  },
  company_code: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: Company,
      key: 'code'
    },
    defaultValue: 'WEDISK'
  }
}, {
  timestamps: true,
  tableName: 'T_CONTENTS_FILELIST',
  createdAt: 'reg_date',
  updatedAt: false
});

File.belongsTo(Category, { foreignKey: 'category_code', targetKey: 'code' });
File.belongsTo(Company, { foreignKey: 'company_code', targetKey: 'code' });

export default File;

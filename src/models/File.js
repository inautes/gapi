import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Category from './Category.js';
import Company from './Company.js';

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cont_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  seq_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cloud_yn: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  category_code: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: Category,
      key: 'code'
    }
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
  timestamps: true
});

File.belongsTo(Category, { foreignKey: 'category_code', targetKey: 'code' });
File.belongsTo(Company, { foreignKey: 'company_code', targetKey: 'code' });

export default File;

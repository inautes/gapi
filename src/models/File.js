import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Category from './Category.js';

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
  }
}, {
  timestamps: true
});

File.belongsTo(Category, { foreignKey: 'category_code', targetKey: 'code' });

export default File;

import { DataTypes } from 'sequelize';
import { localSequelize } from '../config/database.js';

const Company = localSequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'server_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'server_name'
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'server_ip'
  },
  is_cloud: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: false,
  tableName: 'T_SERVER_INFO'
});

export default Company;

import { DataTypes } from 'sequelize';
import { localSequelize } from '../config/database.js';

const User = localSequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id'
  },
  userid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'user_id'
  },
  upload_policy: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('upload_policy');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('upload_policy', JSON.stringify(value));
    }
  }
}, {
  timestamps: true,
  tableName: 'T_PERM_UPLOAD_AUTH',
  createdAt: 'reg_date',
  updatedAt: false
});

export default User;

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
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
  timestamps: true
});

export default User;

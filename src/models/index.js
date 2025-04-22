import Category from './Category.js';
import User from './User.js';
import File from './File.js';
import Company from './Company.js';
import { sequelize } from '../config/database.js';


const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false });
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Unable to synchronize the database:', error);
  }
};

export {
  Category,
  User,
  File,
  Company,
  syncDatabase
};

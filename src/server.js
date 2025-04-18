import app from './app.js';
import { testConnection, sequelize } from './config/database.js';
import { syncDatabase } from './models/index.js';

const PORT = process.env.PORT || 7000;

const startServer = async () => {
  try {
    await testConnection();
    
    await syncDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

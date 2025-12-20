const mongoose = require('mongoose');
require('dotenv').config();

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear all collections
    await mongoose.connection.db.dropDatabase();
    
    console.log('Database cleared successfully');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
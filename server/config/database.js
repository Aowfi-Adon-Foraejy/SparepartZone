const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    
    // Try local MongoDB as fallback
    try {
      console.log('🔄 Attempting to connect to local MongoDB...');
      const localConn = await mongoose.connect('mongodb://localhost:27017/sparepartzone');
      console.log(`✅ Local MongoDB Connected: ${localConn.connection.host}`);
    } catch (localError) {
      console.error('❌ Local MongoDB also failed:', localError.message);
      console.log('\n⚠️  Server will continue in DEMO MODE without database');
      console.log('📋 To fix MongoDB connection:');
      console.log('   1. Check MongoDB Atlas credentials');
      console.log('   2. Whitelist your IP in Atlas Network Access');
      console.log('   3. Ensure database user has correct permissions');
      console.log('   4. Or install local MongoDB: https://www.mongodb.com/try/download/community');
    }
    
    // Set strict query to handle case sensitivity issues
    mongoose.set('strictQuery', false);
  }
};

module.exports = connectDB;
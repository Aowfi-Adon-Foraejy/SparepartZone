const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing MongoDB connections...\n');
  
  // Test Atlas connection
  console.log('1️⃣ Testing MongoDB Atlas...');
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Atlas Connection Successful!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    await mongoose.disconnect();
    console.log('✅ Disconnected from Atlas\n');
    return true;
  } catch (error) {
    console.log('❌ Atlas Connection Failed:');
    console.log(`   Error: ${error.message}`);
    
    // Test local connection
    console.log('\n2️⃣ Testing Local MongoDB...');
    try {
      const localConn = await mongoose.connect('mongodb://localhost:27017/sparepartzone');
      console.log('✅ Local MongoDB Connection Successful!');
      console.log(`   Host: ${localConn.connection.host}`);
      console.log(`   Database: ${localConn.connection.name}`);
      await mongoose.disconnect();
      console.log('✅ Disconnected from Local MongoDB\n');
      return true;
    } catch (localError) {
      console.log('❌ Local MongoDB Connection Failed:');
      console.log(`   Error: ${localError.message}`);
      console.log('\n📋 MongoDB Installation Required:');
      console.log('   • For Atlas: Check credentials and IP whitelist');
      console.log('   • For Local: Install MongoDB Community Server');
      console.log('   • Download: https://www.mongodb.com/try/download/community');
      return false;
    }
  }
}

testConnection();
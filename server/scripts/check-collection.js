const mongoose = require('mongoose');
require('dotenv').config();

const checkCollection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Database connected');
    
    // Get the users collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections();
    
    console.log('Collections:', collections.map(c => c.collectionName));
    
    // Check indexes on users collection
    const usersCollection = db.collection('users');
    const indexes = await usersCollection.indexInformation();
    
    console.log('Users collection indexes:', indexes);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkCollection();
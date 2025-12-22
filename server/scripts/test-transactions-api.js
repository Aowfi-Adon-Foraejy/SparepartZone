const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to ensure they're registered
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

async function testTransactionsAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Test the same query that the API would make
    const page = 1;
    const limit = 15;
    const filters = {};
    
    const result = await Transaction.find(filters)
      .populate('customer', 'name email')
      .populate('supplier', 'name email')
      .populate('reference')
      .populate('createdBy', 'username')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    console.log(`\n📊 Found ${result.length} transactions (API simulation):`);
    console.log('=' .repeat(50));
    
    result.forEach((t, index) => {
      console.log(`\n${index + 1}. ${t.description}`);
      console.log(`   Type: ${t.type}`);
      console.log(`   Category: ${t.category}`);
      console.log(`   Amount: ৳${t.amount.toLocaleString()}`);
      console.log(`   Date: ${new Date(t.date).toLocaleDateString()}`);
      console.log(`   Customer: ${t.customer?.name || 'N/A'}`);
      console.log(`   Supplier: ${t.supplier?.name || 'N/A'}`);
      console.log(`   Account: ${t.account}`);
    });

    // Also test with just payment types
    console.log(`\n🔍 Testing payment type filter:`);
    const paymentResult = await Transaction.find({
      type: { $in: ['payment_received', 'payment_made'] }
    })
    .populate('customer', 'name email')
    .populate('supplier', 'name email')
    .populate('createdBy', 'username')
    .sort({ date: -1, createdAt: -1 })
    .limit(5);
    
    console.log(`Found ${paymentResult.length} payment transactions with filter`);
    paymentResult.forEach((t, index) => {
      console.log(`\n${index + 1}. ${t.description}`);
      console.log(`   Type: ${t.type}`);
      console.log(`   Customer: ${t.customer?.name || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testTransactionsAPI();
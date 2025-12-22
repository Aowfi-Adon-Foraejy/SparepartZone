const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to ensure they're registered
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Transaction = require('../models/Transaction');

async function checkPaymentTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Check all payment transactions
    const payments = await Transaction.find({
      type: { $in: ['payment_received', 'payment_made'] }
    })
    .populate('customer', 'name')
    .populate('supplier', 'name')
    .sort({ date: -1 })
    .limit(20);
    
    console.log(`\n📊 Found ${payments.length} payment transactions:`);
    console.log('=' .repeat(50));
    
    payments.forEach((t, index) => {
      console.log(`\n${index + 1}. ${t.description}`);
      console.log(`   Type: ${t.type}`);
      console.log(`   Amount: ৳${t.amount.toLocaleString()}`);
      console.log(`   Date: ${new Date(t.date).toLocaleDateString()}`);
      console.log(`   Customer: ${t.customer?.name || 'N/A'}`);
      console.log(`   Supplier: ${t.supplier?.name || 'N/A'}`);
      console.log(`   Account: ${t.account}`);
      console.log(`   Balance Before: ৳${t.balanceBefore?.toLocaleString() || 'N/A'}`);
      console.log(`   Balance After: ৳${t.balanceAfter?.toLocaleString() || 'N/A'}`);
      console.log(`   Created: ${new Date(t.createdAt).toLocaleString()}`);
    });

    // Check for any transactions missing balance fields
    const missingBalance = await Transaction.countDocuments({
      type: { $in: ['payment_received', 'payment_made'] },
      $or: [
        { balanceBefore: { $exists: false } },
        { balanceAfter: { $exists: false } },
        { balanceBefore: null },
        { balanceAfter: null }
      ]
    });

    if (missingBalance > 0) {
      console.log(`\n⚠️  Found ${missingBalance} payment transactions with missing balance fields`);
    } else {
      console.log(`\n✅ All payment transactions have balance fields`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkPaymentTransactions();
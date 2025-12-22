const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Transaction = require('../models/Transaction');

async function fixMissingBalanceFields() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Find all transactions missing balanceBefore or balanceAfter
    const transactionsToFix = await Transaction.find({
      $or: [
        { balanceBefore: { $exists: false } },
        { balanceAfter: { $exists: false } },
        { balanceBefore: null },
        { balanceAfter: null }
      ]
    }).sort({ date: 1, createdAt: 1 });

    console.log(`Found ${transactionsToFix.length} transactions to fix`);

    // Group by account and fix in order
    const accounts = [...new Set(transactionsToFix.map(t => t.account))];
    
    for (const account of accounts) {
      console.log(`\n📊 Processing account: ${account}`);
      
      const accountTransactions = transactionsToFix.filter(t => t.account === account);
      
      // Get all transactions for this account to calculate proper balances
      const allAccountTransactions = await Transaction.find({ account })
        .sort({ date: 1, createdAt: 1 });
      
      let runningBalance = 0;
      
      for (const transaction of allAccountTransactions) {
        if (!transaction.balanceBefore || !transaction.balanceAfter) {
          transaction.balanceBefore = runningBalance;
          
          // Calculate balanceAfter based on category
          switch (transaction.category) {
            case 'income':
            case 'asset':
              runningBalance += transaction.amount;
              break;
            case 'expense':
              runningBalance -= transaction.amount;
              break;
            case 'liability':
              runningBalance += transaction.amount;
              break;
          }
          
          transaction.balanceAfter = runningBalance;
          
          await transaction.save();
          console.log(`  ✅ Fixed transaction ${transaction._id}: ${transaction.description} (${transaction.balanceBefore} → ${transaction.balanceAfter})`);
        } else {
          // Update running balance from existing transaction
          runningBalance = transaction.balanceAfter;
        }
      }
    }

    console.log('\n✅ Successfully fixed all transactions with missing balance fields');

    // Verify no more transactions have missing balance fields
    const remainingIssues = await Transaction.countDocuments({
      $or: [
        { balanceBefore: { $exists: false } },
        { balanceAfter: { $exists: false } },
        { balanceBefore: null },
        { balanceAfter: null }
      ]
    });

    if (remainingIssues === 0) {
      console.log('✅ Verification passed: All transactions now have balance fields');
    } else {
      console.log(`⚠️  Warning: ${remainingIssues} transactions still have missing balance fields`);
    }

  } catch (error) {
    console.error('❌ Error fixing balance fields:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixMissingBalanceFields();
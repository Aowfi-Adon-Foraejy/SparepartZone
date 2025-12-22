const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const Transaction = require('../models/Transaction');

async function fixPaymentTransactions() {
  try {
    console.log('Finding invalid payment transactions...');
    
    // Find all transactions with invalid type 'payment'
    const invalidTransactions = await Transaction.find({ type: 'payment' });
    
    console.log(`Found ${invalidTransactions.length} invalid transactions`);
    
    for (const transaction of invalidTransactions) {
      console.log(`Fixing transaction: ${transaction._id} - ${transaction.description}`);
      
      // Determine correct type based on category
      const correctType = transaction.category === 'income' ? 'payment_received' : 'payment_made';
      
      // Update the transaction
      await Transaction.findByIdAndUpdate(
        transaction._id,
        { 
          $set: { 
            type: correctType,
            // Ensure account matches schema enum
            account: ['cash', 'bank_account', 'mobile_money', 'receivables', 'payables'].includes(transaction.account) 
              ? transaction.account 
              : 'cash'
          }
        }
      );
      
      console.log(`Updated transaction ${transaction._id} to type: ${correctType}`);
    }
    
    console.log('Payment transactions fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing payment transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixPaymentTransactions();
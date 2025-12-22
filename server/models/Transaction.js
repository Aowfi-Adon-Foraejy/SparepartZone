const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['sale', 'purchase', 'payment_received', 'payment_made', 'adjustment', 'opening_balance'],
    required: true
  },
  category: {
    type: String,
    enum: ['income', 'expense', 'asset', 'liability'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Invoice', 'Customer', 'Supplier', 'Product', 'User']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'cheque', 'mobile_money', 'adjustment'],
    required: function() {
      return ['payment_received', 'payment_made'].includes(this.type);
    }
  },
  account: {
    type: String,
    enum: ['cash', 'bank_account', 'mobile_money', 'receivables', 'payables'],
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  tags: [String],
  notes: String,
  isManual: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ category: 1, date: -1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ customer: 1, date: -1 });
transactionSchema.index({ supplier: 1, date: -1 });
transactionSchema.index({ account: 1, date: -1 });
transactionSchema.index({ isManual: 1 });

transactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    await this.setBalanceFields();
  }
  next();
});

transactionSchema.methods.setBalanceFields = async function() {
  const lastTransaction = await this.constructor
    .findOne({ account: this.account })
    .sort({ date: -1, createdAt: -1 });
  
  this.balanceBefore = lastTransaction ? lastTransaction.balanceAfter : 0;
  
  switch (this.category) {
    case 'income':
      this.balanceAfter = this.balanceBefore + this.amount;
      break;
    case 'expense':
      this.balanceAfter = this.balanceBefore - this.amount;
      break;
    case 'asset':
      this.balanceAfter = this.balanceBefore + this.amount;
      break;
    case 'liability':
      this.balanceAfter = this.balanceBefore + this.amount;
      break;
  }
};

transactionSchema.statics.createTransaction = async function(transactionData) {
  const transaction = new this(transactionData);
  await transaction.save();
  return transaction;
};

transactionSchema.statics.getAccountBalance = function(account, date = null) {
  const query = { account: account };
  if (date) {
    query.date = { $lte: date };
  }
  
  return this.findOne(query)
    .sort({ date: -1, createdAt: -1 })
    .select('balanceAfter');
};

transactionSchema.statics.getTransactionsByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    date: {
      $gte: startDate,
      $lte: endDate
    },
    ...filters
  };
  
  return this.find(query)
    .populate('customer', 'name email')
    .populate('supplier', 'name email')
    .populate('createdBy', 'username')
    .sort({ date: -1, createdAt: -1 });
};

transactionSchema.statics.getFinancialSummary = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

transactionSchema.statics.getSalesSummary = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        type: 'sale',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        },
        totalSales: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
    }
  ]);
};

transactionSchema.statics.getPurchaseSummary = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        type: 'purchase',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        },
        totalPurchases: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
    }
  ]);
};

transactionSchema.statics.searchTransactions = function(query, filters = {}) {
  const searchQuery = {
    ...filters
  };
  
  if (query) {
    searchQuery.$or = [
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
      { paymentMethod: { $regex: query, $options: 'i' } }
    ];
  }
  
  return this.find(searchQuery)
    .populate('customer', 'name email')
    .populate('supplier', 'name email')
    .populate('createdBy', 'username')
    .sort({ date: -1, createdAt: -1 });
};

module.exports = mongoose.model('Transaction', transactionSchema);
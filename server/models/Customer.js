const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Nigeria'
    }
  },
  type: {
    type: String,
    enum: ['individual', 'business', 'walk-in'],
    default: 'individual'
  },
  businessInfo: {
    companyName: String,
    registrationNumber: String,
    taxId: String,
    contactPerson: String
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit', 'mixed'],
    default: 'cash'
  },
  creditDays: {
    type: Number,
    default: 0
  },
  loyalty: {
    points: {
      type: Number,
      default: 0
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    visitCount: {
      type: Number,
      default: 0
    }
  },
  financials: {
    totalBilled: {
      type: Number,
      default: 0
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    outstandingDue: {
      type: Number,
      default: 0
    },
    lastPaymentDate: Date,
    averageOrderValue: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  notes: String,
  lastPurchaseDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ 'financials.outstandingDue': 1 });
customerSchema.index({ isActive: 1, isBlacklisted: 1 });

customerSchema.methods.updateFinancials = async function(invoiceAmount, paymentAmount = 0) {
  this.financials.totalBilled += invoiceAmount;
  this.financials.totalPaid += paymentAmount;
  this.financials.outstandingDue = Math.max(0, this.financials.totalBilled - this.financials.totalPaid);
  
  if (paymentAmount > 0) {
    this.financials.lastPaymentDate = new Date();
  }
  
  if (invoiceAmount > 0) {
    this.lastPurchaseDate = new Date();
    this.loyalty.totalSpent += invoiceAmount;
    this.loyalty.visitCount += 1;
    
    this.loyalty.tier = this.calculateLoyaltyTier();
  }
  
  return this.save();
};

customerSchema.methods.calculateLoyaltyTier = function() {
  const totalSpent = this.loyalty.totalSpent;
  
  if (totalSpent >= 1000000) return 'platinum';
  if (totalSpent >= 500000) return 'gold';
  if (totalSpent >= 100000) return 'silver';
  return 'bronze';
};

customerSchema.methods.canMakePurchase = function(amount) {
  if (this.isBlacklisted) return false;
  
  if (this.paymentTerms === 'cash') return true;
  
  const availableCredit = this.creditLimit - this.financials.outstandingDue;
  return amount <= availableCredit;
};

customerSchema.methods.getDueStatus = function() {
  const overdueDays = this.getOverdueDays();
  
  if (this.financials.outstandingDue <= 0) return 'paid';
  if (overdueDays <= 0) return 'current';
  if (overdueDays <= 30) return 'overdue-30';
  if (overdueDays <= 60) return 'overdue-60';
  return 'overdue-90+';
};

customerSchema.methods.getOverdueDays = function() {
  if (this.financials.outstandingDue <= 0) return 0;
  
  const creditDays = this.creditDays || 0;
  const dueDate = new Date(this.lastPurchaseDate);
  dueDate.setDate(dueDate.getDate() + creditDays);
  
  const today = new Date();
  const diffTime = today - dueDate;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

customerSchema.statics.findOverdueCustomers = function() {
  return this.find({
    isActive: true,
    isBlacklisted: false,
    'financials.outstandingDue': { $gt: 0 }
  });
};

customerSchema.statics.searchCustomers = function(query) {
  if (!query) return this.find({ isActive: true, isBlacklisted: false });
  
  return this.find({
    isActive: true,
    isBlacklisted: false,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { 'businessInfo.companyName': { $regex: query, $options: 'i' } }
    ]
  });
};

module.exports = mongoose.model('Customer', customerSchema);
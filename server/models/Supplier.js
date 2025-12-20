const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
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
      default: 'Bangladesh'
    }
  },
  businessInfo: {
    companyName: {
      type: String,
      required: true
    },
    registrationNumber: String,
    taxId: String,
    website: String
  },
  contactPerson: {
    name: {
      type: String,
      required: true
    },
    designation: String,
    email: String,
    phone: String
  },
  categories: [{
    type: String,
    trim: true
  }],
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net15', 'net30', 'net60', 'net90'],
    default: 'net30'
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  financials: {
    totalPurchased: {
      type: Number,
      default: 0
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    outstandingPayable: {
      type: Number,
      default: 0
    },
    lastPaymentDate: Date,
    averagePurchaseValue: {
      type: Number,
      default: 0
    }
  },
  performance: {
    reliability: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    quality: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    deliveryTime: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    lastRatingUpdate: Date
  },
  bankDetails: {
    bankName: String,
    accountName: String,
    accountNumber: String,
    sortCode: String
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

supplierSchema.index({ phone: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ 'financials.outstandingPayable': 1 });
supplierSchema.index({ isActive: 1, isBlacklisted: 1 });

supplierSchema.methods.updateFinancials = async function(purchaseAmount, paymentAmount = 0) {
  this.financials.totalPurchased += purchaseAmount;
  this.financials.totalPaid += paymentAmount;
  this.financials.outstandingPayable = Math.max(0, this.financials.totalPurchased - this.financials.totalPaid);
  
  if (paymentAmount > 0) {
    this.financials.lastPaymentDate = new Date();
  }
  
  if (purchaseAmount > 0) {
    this.lastPurchaseDate = new Date();
  }
  
  return this.save();
};

supplierSchema.methods.updatePerformance = async function(ratings) {
  if (ratings.reliability !== undefined) this.performance.reliability = ratings.reliability;
  if (ratings.quality !== undefined) this.performance.quality = ratings.quality;
  if (ratings.deliveryTime !== undefined) this.performance.deliveryTime = ratings.deliveryTime;
  
  this.performance.lastRatingUpdate = new Date();
  return this.save();
};

supplierSchema.methods.getPayableStatus = function() {
  const overdueDays = this.getOverdueDays();
  
  if (this.financials.outstandingPayable <= 0) return 'paid';
  if (overdueDays <= 0) return 'current';
  if (overdueDays <= 15) return 'due-soon';
  return 'overdue';
};

supplierSchema.methods.getOverdueDays = function() {
  if (this.financials.outstandingPayable <= 0) return 0;
  
  let creditDays = 30;
  switch (this.paymentTerms) {
    case 'immediate': creditDays = 0; break;
    case 'net15': creditDays = 15; break;
    case 'net30': creditDays = 30; break;
    case 'net60': creditDays = 60; break;
    case 'net90': creditDays = 90; break;
  }
  
  const dueDate = new Date(this.lastPurchaseDate);
  dueDate.setDate(dueDate.getDate() + creditDays);
  
  const today = new Date();
  const diffTime = today - dueDate;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

supplierSchema.methods.getOverallRating = function() {
  const reliability = this.performance.reliability || 3;
  const quality = this.performance.quality || 3;
  const deliveryTime = this.performance.deliveryTime || 3;
  
  return ((reliability + quality + deliveryTime) / 3).toFixed(1);
};

supplierSchema.statics.findOverdueSuppliers = function() {
  return this.find({
    isActive: true,
    isBlacklisted: false,
    'financials.outstandingPayable': { $gt: 0 }
  });
};

supplierSchema.statics.searchSuppliers = function(query) {
  if (!query) return this.find({ isActive: true, isBlacklisted: false });
  
  return this.find({
    isActive: true,
    isBlacklisted: false,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { 'businessInfo.companyName': { $regex: query, $options: 'i' } },
      { categories: { $in: [new RegExp(query, 'i')] } }
    ]
  });
};

supplierSchema.statics.getTopSuppliers = function(limit = 10) {
  return this.find({ isActive: true, isBlacklisted: false })
    .sort({ 'financials.totalPurchased': -1 })
    .limit(limit);
};

module.exports = mongoose.model('Supplier', supplierSchema);
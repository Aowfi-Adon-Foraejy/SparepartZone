const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  description: String
});

const invoiceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['sale', 'purchase', 'quick'],
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: function() {
      return this.type === 'sale' || this.type === 'quick';
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: function() {
      return this.type === 'purchase';
    }
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'received'],
    default: 'draft'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'fully_paid'],
    default: 'unpaid'
  },
  payments: [{
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
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'cheque', 'mobile_money'],
      required: true
    },
    reference: String,
    notes: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  dueDate: Date,
  notes: String,
  terms: {
    type: String,
    default: 'Payment due within 30 days'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  pdfPath: String,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date
}, {
  timestamps: true
});

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ type: 1, date: -1 });
invoiceSchema.index({ customer: 1, date: -1 });
invoiceSchema.index({ supplier: 1, date: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ paymentStatus: 1 });

invoiceSchema.pre('save', function(next) {
  if (this.isNew && !this.invoiceNumber) {
    let prefix;
    if (this.type === 'sale') prefix = 'INV';
    else if (this.type === 'purchase') prefix = 'PUR';
    else if (this.type === 'quick') prefix = 'QIK';
    
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.invoiceNumber = `${prefix}${year}${month}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  }
  
  if (!this.dueDate && this.type !== 'quick') {
    const dueDate = new Date(this.date);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate;
  }
  
  next();
});

invoiceSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.total = this.subtotal - this.discount + this.tax;
  return this;
};

invoiceSchema.methods.addPayment = function(paymentAmount, method, recordedBy, reference = '', notes = '') {
  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const newTotalPaid = totalPaid + paymentAmount;
  
  this.payments.push({
    amount: paymentAmount,
    method: method,
    recordedBy: recordedBy,
    reference: reference,
    notes: notes
  });
  
  if (newTotalPaid >= this.total) {
    this.paymentStatus = 'fully_paid';
    this.status = 'paid';
  } else {
    this.paymentStatus = 'partially_paid';
    this.status = 'partially_paid';
  }
  
  return this.save();
};

invoiceSchema.methods.getAmountPaid = function() {
  return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
};

invoiceSchema.methods.getAmountDue = function() {
  return this.total - this.getAmountPaid();
};

invoiceSchema.methods.getDaysOverdue = function() {
  if (this.paymentStatus === 'fully_paid') return 0;
  
  const today = new Date();
  const diffTime = today - this.dueDate;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

invoiceSchema.methods.updateStatus = function() {
  const amountPaid = this.getAmountPaid();
  const amountDue = this.getAmountDue();
  const daysOverdue = this.getDaysOverdue();
  
  if (amountDue <= 0) {
    this.paymentStatus = 'fully_paid';
    this.status = 'paid';
  } else if (amountPaid > 0) {
    this.paymentStatus = 'partially_paid';
    this.status = 'partially_paid';
  } else {
    this.paymentStatus = 'unpaid';
    if (daysOverdue > 0) {
      this.status = 'overdue';
    } else {
      this.status = 'sent';
    }
  }
  
  return this.save();
};

invoiceSchema.statics.getSalesInvoices = function(filters = {}) {
  return this.find({ type: 'sale', ...filters })
    .populate('customer', 'name email phone')
    .populate('items.product', 'name brand sku')
    .populate('createdBy', 'username')
    .sort({ date: -1 });
};

invoiceSchema.statics.getPurchaseInvoices = function(filters = {}) {
  return this.find({ type: 'purchase', ...filters })
    .populate('supplier', 'name email phone')
    .populate('items.product', 'name brand sku')
    .populate('createdBy', 'username')
    .sort({ date: -1 });
};

invoiceSchema.statics.getOverdueInvoices = function() {
  return this.find({
    paymentStatus: { $ne: 'fully_paid' },
    dueDate: { $lt: new Date() }
  })
    .populate('customer', 'name email phone')
    .populate('supplier', 'name email phone')
    .sort({ dueDate: 1 });
};

module.exports = mongoose.model('Invoice', invoiceSchema);
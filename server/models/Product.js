const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    current: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reorderThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 10
    },
    minStock: {
      type: Number,
      required: true,
      min: 0,
      default: 5
    }
  },
  unit: {
    type: String,
    required: true,
    default: 'pieces',
    enum: ['pieces', 'boxes', 'sets', 'kits', 'liters', 'kg', 'meters']
  },
  location: {
    warehouse: {
      type: String,
      default: 'Main'
    },
    aisle: String,
    shelf: String,
    bin: String
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  images: [{
    url: String,
    filename: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  specifications: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    material: String,
    color: String,
    warranty: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  lastRestocked: Date,
  activityLog: [{
    type: {
      type: String,
      enum: ['stock_in', 'stock_out', 'adjustment', 'sale', 'purchase'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referenceModel'
    },
    referenceModel: {
      type: String,
      enum: ['Invoice', 'Purchase', 'Adjustment']
    },
    reason: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    stockBefore: Number,
    stockAfter: Number
  }]
}, {
  timestamps: true
});

productSchema.index({ name: 1, brand: 1, category: 1 });
productSchema.index({ 'stock.current': 1 });

productSchema.methods.updateStock = async function(quantity, type, referenceId, referenceModel, userId, reason) {
  const stockBefore = this.stock.current;
  
  switch (type) {
    case 'stock_in':
    case 'purchase':
      this.stock.current += Math.abs(quantity);
      break;
    case 'stock_out':
    case 'sale':
      this.stock.current = Math.max(0, this.stock.current - Math.abs(quantity));
      break;
    case 'adjustment':
      this.stock.current = Math.max(0, quantity);
      break;
  }
  
  const stockAfter = this.stock.current;
  
  this.activityLog.push({
    type: type,
    quantity: Math.abs(quantity),
    reference: referenceId,
    referenceModel: referenceModel,
    reason: reason,
    user: userId,
    stockBefore: stockBefore,
    stockAfter: stockAfter
  });
  
  if (type === 'purchase' || type === 'stock_in') {
    this.lastRestocked = new Date();
  }
  
  return this.save();
};

productSchema.methods.isLowStock = function() {
  return this.stock.current <= this.stock.reorderThreshold;
};

productSchema.methods.isCriticalStock = function() {
  return this.stock.current <= this.stock.minStock;
};

productSchema.statics.findLowStock = function() {
  return this.find({
    isActive: true,
    isArchived: false,
    $expr: { $lte: ['$stock.current', '$stock.reorderThreshold'] }
  });
};

productSchema.statics.searchProducts = function(query, filters = {}) {
  const searchQuery = {
    isActive: true,
    isArchived: false,
    ...filters
  };
  
  if (query) {
    searchQuery.$or = [
      { name: { $regex: query, $options: 'i' } },
      { brand: { $regex: query, $options: 'i' } },
      { category: { $regex: query, $options: 'i' } },
      { sku: { $regex: query, $options: 'i' } }
    ];
  }
  
  return this.find(searchQuery);
};

module.exports = mongoose.model('Product', productSchema);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  salary: {
    base: {
      type: Number,
      default: 0
    },
    bonuses: [{
      amount: Number,
      reason: String,
      date: {
        type: Date,
        default: Date.now
      }
    }],
    paymentHistory: [{
      amount: Number,
      paymentDate: Date,
      paymentMethod: String,
      notes: String
    }]
  },
  activity: {
    invoicesCreated: {
      type: Number,
      default: 0
    },
    salesHandled: {
      type: Number,
      default: 0
    },
    inventoryActions: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateActivity = async function(actionType) {
  switch (actionType) {
    case 'invoice':
      this.activity.invoicesCreated += 1;
      break;
    case 'sale':
      this.activity.salesHandled += 1;
      break;
    case 'inventory':
      this.activity.inventoryActions += 1;
      break;
  }
  this.activity.lastActive = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
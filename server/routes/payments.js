const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { auth, adminOrStaff } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/quick', adminOrStaff, [
  body('amount').isNumeric({ min: 0 }).withMessage('Payment amount is required'),
  body('method').isIn(['cash', 'bank_transfer', 'card', 'mobile_money']).withMessage('Invalid payment method'),
  body('reference').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, method, reference, notes, type } = req.body;

    // Create a transaction record for the quick payment
    const transaction = new Transaction({
      type: type === 'walkin' ? 'payment_received' : 'payment_made',
      category: type === 'walkin' ? 'income' : 'expense',
      amount: parseFloat(amount),
      description: notes || `Quick payment - ${method}`,
      reference,
      paymentMethod: method,
      account: 'cash',
      createdBy: req.user._id
    });

    await transaction.save();
    
    await req.user.updateActivity('payment');
    
    res.status(201).json({
      message: 'Quick payment recorded successfully',
      transaction
    });
  } catch (error) {
    console.error('Quick payment error:', error);
    res.status(500).json({ message: 'Server error during quick payment recording' });
  }
});

module.exports = router;
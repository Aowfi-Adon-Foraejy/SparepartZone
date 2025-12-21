const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { auth, adminOrStaff } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/', adminOrStaff, [
  body('name').notEmpty().withMessage('Customer name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('type').optional().isIn(['individual', 'business', 'walk-in']).withMessage('Invalid customer type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, email, phone, address, type, businessInfo,
      creditLimit, paymentTerms, creditDays, notes
    } = req.body;

    const existingCustomer = await Customer.findOne({
      $or: [{ phone }, { email: email }]
    });

    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer with this phone or email already exists' });
    }

    const customer = new Customer({
      name,
      email,
      phone,
      address,
      type: type || 'individual',
      businessInfo,
      creditLimit: creditLimit || 0,
      paymentTerms: paymentTerms || 'cash',
      creditDays: creditDays || 0,
      notes,
      createdBy: req.user._id
    });

    await customer.save();

    const populatedCustomer = await Customer.findById(customer._id)
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Customer created successfully',
      customer: populatedCustomer
    });
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({ message: 'Server error during customer creation' });
  }
});

router.get('/', adminOrStaff, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('type').optional().isString(),
  query('status').optional().isIn(['active', 'overdue', 'all'])
], async (req, res) => {
  // Only log when there are actual params to reduce noise
  if (req.query.page || req.query.search || req.query.type || req.query.status) {
    console.log('Customers route hit with params:', req.query);
  }
  
  try {
    const errors = validationResult(req);
    console.log('Validation errors:', errors.array());
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = parseInt(req.query.page) || 1,
      limit = parseInt(req.query.limit) || 20,
      search,
      type,
      status = 'active'
    } = req.query;
    
    let customerQuery;

    if (search) {
      customerQuery = Customer.searchCustomers(search);
    } else {
      customerQuery = Customer.find({ isActive: true, isBlacklisted: false });
    }

    if (type) {
      customerQuery = customerQuery.where('type').equals(type);
    }
    
    if (status === 'overdue') {
      customerQuery = customerQuery.where('financials.outstandingDue').gt(0);
    }

    // Build base query with filters
    let baseQuery = Customer.find({ isActive: true, isBlacklisted: false });
    
    if (search) {
      baseQuery = Customer.searchCustomers(search);
    }
    if (type) {
      baseQuery = baseQuery.where('type').equals(type);
    }
    if (status === 'overdue') {
      baseQuery = baseQuery.where('financials.outstandingDue').gt(0);
    }
    
    const customers = await baseQuery
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Customer.countDocuments(
      search ? 
        { 
          isActive: true, 
          isBlacklisted: false,
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ] 
        } : 
        { isActive: true, isBlacklisted: false }
    );

    res.json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        overdueCount: 0,
        totalDues: 0
      }
    });
  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching customers' });
  }
});

router.get('/overdue', adminOrStaff, async (req, res) => {
  try {
    const overdueCustomers = await Customer.findOverdueCustomers()
      .sort({ 'financials.outstandingDue': -1 });

    const customerDetails = await Promise.all(
      overdueCustomers.map(async (customer) => {
        const recentInvoices = await Invoice.find({
          customer: customer._id,
          paymentStatus: { $ne: 'fully_paid' }
        })
          .select('invoiceNumber date total paymentStatus')
          .sort({ date: -1 })
          .limit(3);

        return {
          ...customer.toObject(),
          recentInvoices,
          overdueDays: customer.getOverdueDays(),
          dueStatus: customer.getDueStatus()
        };
      })
    );

    res.json({
      overdueCustomers: customerDetails,
      totalOverdueAmount: customerDetails.reduce((sum, cust) => sum + cust.financials.outstandingDue, 0)
    });
  } catch (error) {
    console.error('Overdue customers fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching overdue customers' });
  }
});

// Simple endpoint for dropdowns - no pagination required
router.get('/list', adminOrStaff, async (req, res) => {
  try {
    const customers = await Customer.find({ 
      isActive: true, 
      isBlacklisted: false 
    }).select('name phone _id').limit(100);
    
    res.json({ customers });
  } catch (error) {
    console.error('Customers list fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching customers list' });
  }
});

router.get('/:id', adminOrStaff, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customerInvoices = await Invoice.find({ customer: customer._id })
      .populate('items.product', 'name brand sku')
      .sort({ date: -1 })
      .limit(10);

    const customerStats = {
      totalInvoices: await Invoice.countDocuments({ customer: customer._id }),
      paidInvoices: await Invoice.countDocuments({ 
        customer: customer._id, 
        paymentStatus: 'fully_paid' 
      }),
      overdueInvoices: await Invoice.find({
        customer: customer._id,
        paymentStatus: { $ne: 'fully_paid' },
        dueDate: { $lt: new Date() }
      }).countDocuments()
    };

    res.json({
      customer: {
        ...customer.toObject(),
        dueStatus: customer.getDueStatus(),
        overdueDays: customer.getOverdueDays()
      },
      recentInvoices: customerInvoices,
      stats: customerStats
    });
  } catch (error) {
    console.error('Customer fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching customer' });
  }
});

router.put('/:id', adminOrStaff, [
  body('name').optional().notEmpty().withMessage('Customer name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const {
      name, email, phone, address, type, businessInfo,
      creditLimit, paymentTerms, creditDays, notes
    } = req.body;

    if (email && email !== customer.email) {
      const existingCustomer = await Customer.findOne({ 
        email, 
        _id: { $ne: customer._id } 
      });
      
      if (existingCustomer) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    if (phone && phone !== customer.phone) {
      const existingCustomer = await Customer.findOne({ 
        phone, 
        _id: { $ne: customer._id } 
      });
      
      if (existingCustomer) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = { ...customer.address, ...address };
    if (type) updateData.type = type;
    if (businessInfo) updateData.businessInfo = { ...customer.businessInfo, ...businessInfo };
    if (creditLimit !== undefined) updateData.creditLimit = creditLimit;
    if (paymentTerms) updateData.paymentTerms = paymentTerms;
    if (creditDays !== undefined) updateData.creditDays = creditDays;
    if (notes !== undefined) updateData.notes = notes;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      { $set: updateData },
      { new: true }
    ).populate('createdBy', 'username');

    res.json({
      message: 'Customer updated successfully',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Customer update error:', error);
    res.status(500).json({ message: 'Server error during customer update' });
  }
});

router.post('/:id/blacklist', adminOrStaff, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    customer.isBlacklisted = true;
    customer.isActive = false;
    await customer.save();

    res.json({ message: 'Customer blacklisted successfully' });
  } catch (error) {
    console.error('Customer blacklist error:', error);
    res.status(500).json({ message: 'Server error during customer blacklist' });
  }
});

router.post('/:id/unblacklist', adminOrStaff, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    customer.isBlacklisted = false;
    customer.isActive = true;
    await customer.save();

    res.json({ message: 'Customer unblacklisted successfully' });
  } catch (error) {
    console.error('Customer unblacklist error:', error);
    res.status(500).json({ message: 'Server error during customer unblacklist' });
  }
});

router.get('/:id/invoices', adminOrStaff, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['paid', 'partially_paid', 'overdue', 'all'])
], async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const filters = { customer: customer._id };
    if (status && status !== 'all') {
      filters.paymentStatus = status;
    }

    const invoices = await Invoice.find(filters)
      .populate('items.product', 'name brand sku')
      .populate('createdBy', 'username')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(filters);

    const invoiceStats = await Invoice.aggregate([
      { $match: { customer: customer._id } },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$total' },
          totalPaid: { 
            $sum: { 
              $reduce: {
                input: '$payments',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.amount'] }
              }
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      invoices: invoices.map(invoice => ({
        ...invoice.toObject(),
        amountPaid: invoice.getAmountPaid(),
        amountDue: invoice.getAmountDue(),
        daysOverdue: invoice.getDaysOverdue()
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: invoiceStats[0] || { totalBilled: 0, totalPaid: 0, count: 0 }
    });
  } catch (error) {
    console.error('Customer invoices fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching customer invoices' });
  }
});

router.post('/:id/invoices', adminOrStaff, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isNumeric({ min: 0 }).withMessage('Unit price must be positive'),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'card', 'cheque', 'mobile_money'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.isBlacklisted) {
      return res.status(400).json({ message: 'Cannot create invoice for blacklisted customer' });
    }

    const { items, discount = 0, tax = 0, notes, paymentAmount = 0, paymentMethod } = req.body;

    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.product}` });
      }

      if (!product.isActive || product.isArchived) {
        return res.status(400).json({ message: `Product not available: ${product.name}` });
      }

      if (product.stock.current < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock.current}, Required: ${item.quantity}` 
        });
      }

      const itemTotal = item.quantity * item.unitPrice;
      const discountAmount = (item.discount || 0) / 100 * itemTotal;
      const finalItemTotal = itemTotal - discountAmount;

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
        discount: item.discount || 0,
        tax: item.tax || 0,
        description: item.description
      });

      subtotal += finalItemTotal;
    }

    const total = subtotal - discount + tax;

    if (!customer.canMakePurchase(total)) {
      return res.status(400).json({ 
        message: 'Purchase amount exceeds customer credit limit or account restrictions' 
      });
    }

    const invoice = new Invoice({
      type: 'sale',
      customer: customer._id,
      items: processedItems,
      subtotal,
      discount,
      tax,
      total,
      status: paymentAmount >= total ? 'paid' : 'sent',
      paymentStatus: paymentAmount >= total ? 'fully_paid' : 
                     paymentAmount > 0 ? 'partially_paid' : 'unpaid',
      notes,
      createdBy: req.user._id
    });

    if (paymentAmount > 0 && paymentMethod) {
      invoice.payments.push({
        amount: paymentAmount,
        method: paymentMethod,
        recordedBy: req.user._id
      });
    }

    await invoice.save();

    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'stock.current': -item.quantity }
      });

      const product = await Product.findById(item.product);
      await product.updateStock(
        item.quantity,
        'sale',
        invoice._id,
        'Invoice',
        req.user._id,
        `Invoice: ${invoice.invoiceNumber}`
      );
    }

    await customer.updateFinancials(total, paymentAmount);

    await Transaction.createTransaction({
      type: 'sale',
      category: 'income',
      amount: total,
      description: `Sale invoice: ${invoice.invoiceNumber}`,
      reference: invoice._id,
      referenceModel: 'Invoice',
      customer: customer._id,
      paymentMethod: paymentMethod || 'cash',
      account: 'receivables',
      balanceBefore: 0,
      balanceAfter: total,
      createdBy: req.user._id
    });

    await req.user.updateActivity('sale');
    await req.user.updateActivity('invoice');

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name brand sku')
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(500).json({ message: 'Server error during invoice creation' });
  }
});

module.exports = router;
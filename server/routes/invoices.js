const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require('path');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { auth, adminOrStaff } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/sales', adminOrStaff, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate, search } = req.query;
    
    const filters = { type: 'sale' };
    if (status && status !== 'all') filters.status = status;
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    // Add search functionality
    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { 'customer.name': { $regex: search, $options: 'i' } },
          { 'customer.phone': { $regex: search, $options: 'i' } }
        ]
      };
    }

    const combinedFilters = { ...filters, ...searchFilter };

    const invoices = await Invoice.getSalesInvoices(combinedFilters)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(combinedFilters);

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
      }
    });
  } catch (error) {
    console.error('Sales invoices fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching sales invoices' });
  }
});

router.get('/purchases', adminOrStaff, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate, search } = req.query;
    
    const filters = { type: 'purchase' };
    if (status && status !== 'all') filters.status = status;
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    // Add search functionality
    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { 'supplier.name': { $regex: search, $options: 'i' } },
          { 'supplier.phone': { $regex: search, $options: 'i' } }
        ]
      };
    }

    const combinedFilters = { ...filters, ...searchFilter };

    const invoices = await Invoice.getPurchaseInvoices(combinedFilters)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(combinedFilters);

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
      }
    });
  } catch (error) {
    console.error('Purchase invoices fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching purchase invoices' });
  }
});

router.get('/quick', adminOrStaff, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate, search } = req.query;
    
    const filters = { type: 'quick' };
    if (status && status !== 'all') filters.status = status;
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    // Add search functionality
    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { 'customer.name': { $regex: search, $options: 'i' } },
          { 'customer.phone': { $regex: search, $options: 'i' } }
        ]
      };
    }

    const combinedFilters = { ...filters, ...searchFilter };

    const invoices = await Invoice.find(combinedFilters)
      .populate('customer', 'name phone')
      .populate('items.product', 'name brand sku')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(combinedFilters);

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
      }
    });
  } catch (error) {
    console.error('Quick invoices fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching quick invoices' });
  }
});

router.get('/overdue', adminOrStaff, async (req, res) => {
  try {
    const overdueInvoices = await Invoice.getOverdueInvoices();

    res.json({
      overdueInvoices: overdueInvoices.map(invoice => ({
        ...invoice.toObject(),
        amountPaid: invoice.getAmountPaid(),
        amountDue: invoice.getAmountDue(),
        daysOverdue: invoice.getDaysOverdue()
      })),
      totalOverdueAmount: overdueInvoices.reduce((sum, invoice) => sum + invoice.getAmountDue(), 0)
    });
  } catch (error) {
    console.error('Overdue invoices fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching overdue invoices' });
  }
});

router.get('/:id/pdf', adminOrStaff, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('items.product', 'name brand sku')
      .populate('customer')
      .populate('supplier')
      .populate('createdBy', 'username');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const pdfResult = await generateInvoicePDF(
      invoice,
      invoice.customer,
      invoice.supplier
    );

    if (pdfResult.buffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.filename}"`);
      res.send(pdfResult.buffer);
    } else {
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Server error while generating PDF' });
  }
});

// Create Sales Invoice
router.post('/sales', adminOrStaff, [
  body('isNewCustomer').optional().isBoolean().withMessage('isNewCustomer must be boolean'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isNumeric({ min: 0 }).withMessage('Unit price must be positive'),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'card', 'cheque', 'mobile_money'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({ errors: errors.array(), message: 'Validation failed' });
    }

    console.log('Sales invoice request body:', req.body);
    const { 
      customer, 
      isNewCustomer = false, 
      customerInfo, 
      items, 
      discount = 0, 
      tax = 0, 
      notes, 
      paymentAmount = 0, 
      paymentMethod,
      // Ignore frontend totals to prevent any calculation issues
      // subtotal: frontendSubtotal = 0,
      // total: frontendTotal = 0
    } = req.body;

    // Custom validation for customer/customerInfo
    if (isNewCustomer) {
      if (!customerInfo || !customerInfo.name || !customerInfo.phone) {
        return res.status(400).json({ 
          message: 'Customer name and phone are required for new customer',
          errors: [{ msg: 'Customer name and phone are required for new customer' }]
        });
      }
    } else {
      if (!customer) {
        return res.status(400).json({ 
          message: 'Customer ID is required for existing customer',
          errors: [{ msg: 'Customer ID is required for existing customer' }]
        });
      }
    }

    // Handle customer (existing or new)
    let customerDoc;
    if (isNewCustomer && customerInfo) {
      // Create new customer
      customerDoc = new Customer({
        ...customerInfo,
        createdBy: req.user._id
      });
      await customerDoc.save();
    } else if (customer) {
      // Use existing customer
      customerDoc = await Customer.findById(customer);
      if (!customerDoc) {
        return res.status(404).json({ message: 'Customer not found' });
      }
    } else {
      return res.status(400).json({ message: 'Either customer ID or new customer information is required' });
    }

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      try {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ message: `Product not found: ${item.product}` });
        }

        if (product.stock.current < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.name}. Available: ${product.stock.current}, Required: ${item.quantity}` 
          });
        }

        const itemTotal = item.quantity * item.unitPrice;
        
        processedItems.push({
          product: product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          discount: item.discount || 0,
          tax: item.tax || 0,
          description: item.description
        });

        subtotal += itemTotal;
      } catch (error) {
        console.error('Error processing sales invoice item:', error);
        return res.status(500).json({ message: 'Error processing invoice item', error: error.message });
      }
    }

    const calculatedTotal = subtotal - discount + tax;

    // Generate invoice number manually
    const prefix = 'INV';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const invoiceNumber = `${prefix}${year}${month}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const initialPaymentStatus = paymentAmount >= calculatedTotal ? 'fully_paid' : 
                                paymentAmount > 0 ? 'partially_paid' : 'unpaid';
    const initialStatus = paymentAmount >= calculatedTotal ? 'paid' : 'sent';

    const invoice = new Invoice({
      invoiceNumber,
      type: 'sale',
      customer: customerDoc._id,
      items: processedItems,
      subtotal,
      discount,
      tax,
      total: calculatedTotal,
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
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
    
    // Ensure payment status is correct after payment is added
    if (paymentAmount > 0) {
      await invoice.updateStatus();
    }

    // Update product stock (after invoice is saved so invoiceNumber is available)
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'stock.current': -item.quantity }
      });

      const product = await Product.findById(item.product);
      await product.updateStock(
        -item.quantity,
        'sale',
        invoice._id,
        'Invoice',
        req.user._id,
        `Sale: ${invoice.invoiceNumber}`
      );
    }

    // Update customer financials
    try {
      await customerDoc.updateFinancials(calculatedTotal, paymentAmount);
      await req.user.updateActivity('sales');
    } catch (error) {
      console.error('Error updating customer financials:', error);
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name brand sku')
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Sales invoice created successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Sales invoice creation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body was:', req.body);
    res.status(500).json({ message: 'Server error during sales invoice creation', error: error.message });
  }
});

// Add Payment to Invoice
router.post('/:id/payments', adminOrStaff, [
  body('amount').isFloat({ min: 0 }).withMessage('Payment amount must be positive'),
  body('method').isIn(['cash', 'bank_transfer', 'card', 'cheque', 'mobile_money']).withMessage('Invalid payment method')
], async (req, res) => {
  console.log('=== Add Payment Request ===');
  console.log('Invoice ID:', req.params.id);
  console.log('Request body:', req.body);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('supplier');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const { amount, method, reference = '', notes = '' } = req.body;

    if (amount > invoice.getAmountDue()) {
      console.log('Payment amount validation failed:', { amount, dueAmount: invoice.getAmountDue() });
      return res.status(400).json({ message: 'Payment amount exceeds due amount' });
    }

    await invoice.addPayment(amount, method, req.user._id, reference, notes);

    // Update customer/supplier financials
    if (invoice.customer) {
      await invoice.customer.updateFinancials(0, amount);
    } else if (invoice.supplier) {
      await invoice.supplier.updateFinancials(0, amount);
    }

    // Create transaction
    await Transaction.createTransaction({
      type: invoice.type === 'sale' ? 'payment' : 'payment',
      category: invoice.type === 'sale' ? 'income' : 'expense',
      amount: amount,
      description: `Payment for ${invoice.invoiceNumber}`,
      reference: invoice._id,
      referenceModel: 'Invoice',
      customer: invoice.customer?._id,
      supplier: invoice.supplier?._id,
      paymentMethod: method,
      account: invoice.type === 'sale' ? 'cash' : 'payables',
      balanceBefore: 0,
      balanceAfter: amount,
      createdBy: req.user._id
    });

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name email phone')
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'username');

    res.json({
      message: 'Payment added successfully',
      invoice: {
        ...updatedInvoice.toObject(),
        amountPaid: updatedInvoice.getAmountPaid(),
        amountDue: updatedInvoice.getAmountDue()
      }
    });
  } catch (error) {
    console.error('Payment addition error:', error);
    res.status(500).json({ message: 'Server error during payment addition' });
  }
});

// Get Customer Invoices
router.get('/customer/:customerId', adminOrStaff, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const invoices = await Invoice.find({ 
      customer: customerId,
      type: { $in: ['sale', 'quick'] }
    })
      .populate('items.product', 'name brand sku')
      .populate('createdBy', 'username')
      .sort({ date: -1 });

    res.json({
      invoices: invoices.map(invoice => ({
        ...invoice.toObject(),
        amountPaid: invoice.getAmountPaid(),
        amountDue: invoice.getAmountDue(),
        daysOverdue: invoice.getDaysOverdue()
      }))
    });
  } catch (error) {
    console.error('Customer invoices fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching customer invoices' });
  }
});

// Update Invoice
router.put('/:id', adminOrStaff, [
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('date').optional().isISO8601().withMessage('Date must be a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const { notes, date } = req.body;

    // Update allowed fields only
    if (notes !== undefined) invoice.notes = notes;
    if (date) invoice.date = new Date(date);

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name email phone')
      .populate('supplier', 'name email phone businessInfo')
      .populate('items.product', 'name brand sku')
      .populate('createdBy', 'username');

    res.json({
      message: 'Invoice updated successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Invoice update error:', error);
    res.status(500).json({ message: 'Server error during invoice update' });
  }
});

// Get Single Invoice
router.get('/:id', adminOrStaff, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name brand sku description')
      .populate('payments.recordedBy', 'username')
      .populate('createdBy', 'username');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({
      invoice: {
        ...invoice.toObject(),
        amountPaid: invoice.getAmountPaid(),
        amountDue: invoice.getAmountDue(),
        daysOverdue: invoice.getDaysOverdue()
      }
    });
  } catch (error) {
    console.error('Invoice fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching invoice' });
  }
});

// Create Purchase Invoice
router.post('/purchases', adminOrStaff, [
  body('supplier').optional().notEmpty().withMessage('Supplier ID is required for existing suppliers'),
  body('supplierInfo').optional().isObject().withMessage('Supplier information must be an object'),
  body('isNewSupplier').optional().isBoolean().withMessage('isNewSupplier must be boolean'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').optional().notEmpty().withMessage('Product ID is required for existing products'),
  body('items.*.newProductInfo').optional().isObject().withMessage('New product info must be an object'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isNumeric({ min: 0 }).withMessage('Unit price must be positive'),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'card', 'cheque', 'mobile_money'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array(), message: 'Validation failed' });
    }

    console.log('Purchase invoice request body:', req.body);
    const { 
      supplier, 
      isNewSupplier = false, 
      supplierInfo, 
      items, 
      discount = 0, 
      tax = 0, 
      notes, 
      paymentAmount = 0, 
      paymentMethod, 
      total 
    } = req.body;

    // Handle supplier (existing or new)
    let supplierDoc;
    if (isNewSupplier && supplierInfo) {
      // Create new supplier
      supplierDoc = new Supplier({
        ...supplierInfo,
        createdBy: req.user._id
      });
      await supplierDoc.save();
    } else if (supplier) {
      // Use existing supplier
      supplierDoc = await Supplier.findById(supplier);
      if (!supplierDoc) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
    } else {
      return res.status(400).json({ message: 'Either supplier ID or new supplier information is required' });
    }

    const processedItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      try {
        let product;
        
        if (item.newProductInfo) {
          // Create new product
          product = new Product({
            ...item.newProductInfo,
            stock: {
              current: item.quantity,
              reorderThreshold: 10,
              minStock: 5
            },
            supplier: supplierDoc._id,
            createdBy: req.user._id
          });
          await product.save();
          
          // Set stock directly for new products since they start with purchase quantity
          await product.updateStock(
            0, // Don't double count stock
            'purchase',
            null, // We'll update with invoice ID after creation
            'Purchase',
            req.user._id,
            `Purchase from ${supplierDoc.businessInfo.companyName}`
          );
        } else {
          // Use existing product
          product = await Product.findById(item.product);
          if (!product) {
            return res.status(404).json({ message: `Product not found: ${item.product}` });
          }
          
          await product.updateStock(
            item.quantity,
            'purchase',
            null, // We'll update with invoice ID after creation
            'Purchase',
            req.user._id,
            `Purchase from ${supplierDoc.businessInfo.companyName}`
          );
        }

        const itemTotal = item.quantity * item.unitPrice;
        calculatedSubtotal += itemTotal;
        processedItems.push({
          product: product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          discount: item.discount || 0,
          tax: item.tax || 0,
          description: item.description
        });
      } catch (error) {
        console.error('Error processing purchase invoice item:', error);
        return res.status(500).json({ message: 'Error processing invoice item', error: error.message });
      }
    }

    // Calculate total
    const calculatedTotal = calculatedSubtotal - discount + tax;

    // Generate invoice number manually
    const prefix = 'PUR';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const invoiceNumber = `${prefix}${year}${month}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const invoice = new Invoice({
      invoiceNumber,
      type: 'purchase',
      supplier: supplierDoc._id,
      items: processedItems,
      subtotal: calculatedSubtotal,
      discount,
      tax,
      total: calculatedTotal,
      status: paymentAmount >= calculatedTotal ? 'paid' : 'received',
      paymentStatus: paymentAmount >= calculatedTotal ? 'fully_paid' : 
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

    // Update product references with invoice ID for new products
    for (const [index, item] of processedItems.entries()) {
      if (items[index].newProductInfo) {
        const product = await Product.findById(item.product);
        await product.updateStock(
          items[index].quantity,
          'purchase',
          invoice._id,
          'Invoice',
          req.user._id,
          `Purchase: ${invoice.invoiceNumber}`
        );
      }
    }

    // Update supplier financials
    await supplierDoc.updateFinancials(calculatedTotal, paymentAmount);

    // Create transaction
    await Transaction.createTransaction({
      type: 'purchase',
      category: 'expense',
      amount: calculatedTotal,
      description: `Purchase invoice: ${invoice.invoiceNumber}`,
      reference: invoice._id,
      referenceModel: 'Invoice',
      supplier: supplierDoc._id,
      paymentMethod: paymentMethod || 'bank_transfer',
      account: 'payables',
      balanceBefore: 0,
      balanceAfter: calculatedTotal,
      createdBy: req.user._id
    });

    await req.user.updateActivity('purchases');

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('supplier', 'name email phone businessInfo')
      .populate('items.product', 'name brand sku')
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Purchase invoice created successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Purchase invoice creation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body was:', req.body);
    res.status(500).json({ message: 'Server error during purchase invoice creation', error: error.message });
  }
});

// Create Quick Invoice
router.post('/quick', adminOrStaff, [
  body('customerInfo').optional().isObject().withMessage('Customer information must be an object'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isNumeric({ min: 0 }).withMessage('Unit price must be positive'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array(), message: 'Validation failed' });
    }

    console.log('Quick invoice request body:', req.body);
    const { 
      customerInfo, 
      items, 
      notes, 
      total,
      paymentAmount = total,
      paymentMethod = 'cash'
    } = req.body;

    console.log('Processing quick invoice with customerInfo:', customerInfo);

    // Create or find walk-in customer
    let customerDoc;
    if (customerInfo && (customerInfo.name || customerInfo.phone)) {
      // Try to find existing customer by phone
      if (customerInfo.phone) {
        customerDoc = await Customer.findOne({ phone: customerInfo.phone });
      }
      
      if (!customerDoc) {
        // Create new walk-in customer
        console.log('Creating new quick invoice customer:', customerInfo);
        try {
          customerDoc = new Customer({
            name: customerInfo.name || 'Walk-in Customer',
            phone: customerInfo.phone || '',
            email: customerInfo.email || '',
            type: 'walk-in',
            paymentTerms: 'cash',
            creditDays: 0,
            createdBy: req.user._id
          });
          await customerDoc.save();
          console.log('Customer created successfully');
        } catch (customerError) {
          console.error('Error creating customer:', customerError);
          return res.status(500).json({ 
            message: 'Error creating customer', 
            error: customerError.message 
          });
        }
      } else {
        console.log('Using existing customer:', customerDoc.name);
      }
    } else {
      // Use default walk-in customer
      customerDoc = await Customer.findOne({ 
        name: 'Walk-in Customer', 
        type: 'walk-in' 
      });
      
      if (!customerDoc) {
        customerDoc = new Customer({
          name: 'Walk-in Customer',
          phone: '',
          email: '',
          type: 'walk-in',
          paymentTerms: 'cash',
          creditDays: 0,
          createdBy: req.user._id
        });
        await customerDoc.save();
      }
    }

    const processedItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      try {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ message: `Product not found: ${item.product}` });
        }

        if (product.stock.current < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.name}. Available: ${product.stock.current}, Required: ${item.quantity}` 
          });
        }

        const itemTotal = item.quantity * item.unitPrice;
        calculatedSubtotal += itemTotal;
        processedItems.push({
          product: product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          discount: item.discount || 0,
          tax: item.tax || 0,
          description: item.description
        });
      } catch (error) {
        console.error('Error processing item:', error);
        return res.status(500).json({ message: 'Error processing invoice item', error: error.message });
      }
    }

    // Generate invoice number manually
    const prefix = 'QIK';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const invoiceNumber = `${prefix}${year}${month}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const invoice = new Invoice({
      invoiceNumber,
      type: 'quick',
      customer: customerDoc._id,
      items: processedItems,
      subtotal: calculatedSubtotal,
      discount: 0,
      tax: 0,
      total: calculatedSubtotal,
      status: 'paid',
      paymentStatus: 'fully_paid',
      notes,
      createdBy: req.user._id
    });

    invoice.payments.push({
      amount: paymentAmount,
      method: paymentMethod,
      recordedBy: req.user._id
    });

    await invoice.save();

    // Update product stock (after invoice is saved so invoiceNumber is available)
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'stock.current': -item.quantity }
      });

      const product = await Product.findById(item.product);
      await product.updateStock(
        -item.quantity,
        'sale',
        invoice._id,
        'Invoice',
        req.user._id,
        `Quick sale: ${invoice.invoiceNumber}`
      );
    }

    // Update customer financials
    await customerDoc.updateFinancials(calculatedSubtotal, paymentAmount);

    // Create transaction
    await Transaction.createTransaction({
      type: 'sale',
      category: 'income',
      amount: calculatedSubtotal,
      description: `Quick invoice: ${invoice.invoiceNumber}`,
      reference: invoice._id,
      referenceModel: 'Invoice',
      customer: customerDoc._id,
      paymentMethod: paymentMethod,
      account: 'cash',
      balanceBefore: 0,
      balanceAfter: calculatedSubtotal,
      createdBy: req.user._id
    });

    try {
      await req.user.updateActivity('sales');
    } catch (error) {
      console.error('Error updating user activity (sales):', error);
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name brand sku')
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Quick invoice created successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Quick invoice creation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body was:', req.body);
    res.status(500).json({ message: 'Server error during quick invoice creation', error: error.message });
  }
});

module.exports = router;
const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Supplier = require('../models/Supplier');
const { auth, adminOrStaff } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/', adminOrStaff, [
  body('name').notEmpty().withMessage('Supplier name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('categories').isArray().withMessage('Categories must be an array'),
  body('paymentTerms').optional().isIn(['immediate', 'net15', 'net30', 'net60', 'net90']).withMessage('Invalid payment terms'),
  body('creditLimit').optional().isNumeric({ min: 0 }).withMessage('Credit limit must be positive')
], async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, email, phone, address, businessInfo, categories,
      paymentTerms, creditLimit, bankDetails, notes
    } = req.body;

    const existingSupplier = await Supplier.findOne({
      $or: [{ phone }, ...(email ? [{ email }] : [])]
    });

    if (existingSupplier) {
      return res.status(400).json({ message: 'Supplier with this phone or email already exists' });
    }

    const supplier = new Supplier({
      name,
      email,
      phone,
      address,
      businessInfo: {
        companyName: businessInfo?.companyName || name,
        registrationNumber: businessInfo?.registrationNumber,
        taxId: businessInfo?.taxId,
        website: businessInfo?.website
      },
      contactPerson: {
        name: req.body.contactPerson?.name || name,
        designation: req.body.contactPerson?.designation,
        email: req.body.contactPerson?.email,
        phone: req.body.contactPerson?.phone || phone
      },
      categories,
      paymentTerms: paymentTerms || 'net30',
      creditLimit: creditLimit || 0,
      bankDetails,
      notes,
      createdBy: req.user._id
    });

    await supplier.save();

    const populatedSupplier = await Supplier.findById(supplier._id)
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Supplier created successfully',
      supplier: populatedSupplier
    });
  } catch (error) {
    console.error('Supplier creation error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ message: 'Server error during supplier creation', error: error.message });
  }
});

router.get('/', adminOrStaff, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const suppliers = await Supplier.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Supplier.countDocuments(query);
    const totalPayables = await Supplier.aggregate([
      { $group: { _id: null, total: { $sum: '$creditLimit' } } }
    ]);

    res.json({
      suppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        overdueCount: 0,
        totalPayables: totalPayables[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Server error while fetching suppliers' });
  }
});

router.get('/overdue', adminOrStaff, async (req, res) => {
  try {
    const overdueSuppliers = await Supplier.find({
      paymentTerms: 'credit',
      creditLimit: { $gt: 0 }
    }).populate('createdBy', 'username');

    res.json({
      suppliers: overdueSuppliers,
      count: overdueSuppliers.length
    });
  } catch (error) {
    console.error('Error fetching overdue suppliers:', error);
    res.status(500).json({ message: 'Server error while fetching overdue suppliers' });
  }
});

module.exports = router;
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

router.put('/:id', adminOrStaff, [
  body('name').optional().notEmpty().withMessage('Supplier name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('categories').optional().isArray().withMessage('Categories must be an array'),
  body('paymentTerms').optional().isIn(['immediate', 'net15', 'net30', 'net60', 'net90']).withMessage('Invalid payment terms'),
  body('creditLimit').optional().isNumeric({ min: 0 }).withMessage('Credit limit must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const {
      name, email, phone, address, businessInfo, categories,
      paymentTerms, creditLimit, bankDetails, notes, contactPerson
    } = req.body;

    if (email && email !== supplier.email) {
      const existingSupplier = await Supplier.findOne({ 
        email, 
        _id: { $ne: supplier._id } 
      });
      
      if (existingSupplier) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    if (phone && phone !== supplier.phone) {
      const existingSupplier = await Supplier.findOne({ 
        phone, 
        _id: { $ne: supplier._id } 
      });
      
      if (existingSupplier) {
        return res.status(400).json({ message: 'Phone number already exists' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = { ...supplier.address, ...address };
    if (businessInfo) updateData.businessInfo = { ...supplier.businessInfo, ...businessInfo };
    if (contactPerson) updateData.contactPerson = { ...supplier.contactPerson, ...contactPerson };
    if (categories) updateData.categories = categories;
    if (paymentTerms) updateData.paymentTerms = paymentTerms;
    if (creditLimit !== undefined) updateData.creditLimit = creditLimit;
    if (bankDetails) updateData.bankDetails = { ...supplier.bankDetails, ...bankDetails };
    if (notes !== undefined) updateData.notes = notes;

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      supplier._id,
      { $set: updateData },
      { new: true }
    ).populate('createdBy', 'username');

    res.json({
      message: 'Supplier updated successfully',
      supplier: updatedSupplier
    });
  } catch (error) {
    console.error('Supplier update error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ message: 'Server error during supplier update', error: error.message });
  }
});

router.delete('/:id', adminOrStaff, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    await Supplier.findByIdAndDelete(req.params.id);

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Supplier deletion error:', error);
    res.status(500).json({ message: 'Server error during supplier deletion' });
  }
});

module.exports = router;
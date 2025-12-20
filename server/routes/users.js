const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const { auth, adminOnly, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', adminOnly, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['admin', 'staff']),
  query('status').optional().isIn(['active', 'inactive', 'pending', 'all']),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      role,
      status = 'all',
      search
    } = req.query;

    let filters = {};
    
    if (role) filters.role = role;
    
    switch (status) {
      case 'active':
        filters.isActive = true;
        filters.isApproved = true;
        break;
      case 'inactive':
        filters.isActive = false;
        break;
      case 'pending':
        filters.isApproved = false;
        filters.role = 'staff';
        break;
    }

    if (search) {
      filters.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filters)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filters);

    const userStats = await Promise.all([
      User.countDocuments({ role: 'admin', isActive: true, isApproved: true }),
      User.countDocuments({ role: 'staff', isActive: true, isApproved: true }),
      User.countDocuments({ isApproved: false, role: 'staff' }),
      User.countDocuments({ isActive: false })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        activeAdmins: userStats[0],
        activeStaff: userStats[1],
        pendingStaff: userStats[2],
        inactiveUsers: userStats[3]
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

router.get('/pending', adminOnly, async (req, res) => {
  try {
    const pendingUsers = await User.find({
      role: 'staff',
      isApproved: false
    })
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 });

    res.json({
      pendingUsers,
      count: pendingUsers.length
    });
  } catch (error) {
    console.error('Pending users fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching pending users' });
  }
});

router.get('/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens')
      .populate('salary.paymentHistory.recordedBy', 'username');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userInvoices = await Invoice.find({ createdBy: user._id })
      .select('invoiceNumber type date total status')
      .sort({ date: -1 })
      .limit(10);

    const userStats = {
      totalInvoices: await Invoice.countDocuments({ createdBy: user._id }),
      totalSales: await Invoice.countDocuments({ createdBy: user._id, type: 'sale' }),
      totalPurchases: await Invoice.countDocuments({ createdBy: user._id, type: 'purchase' }),
      totalSalesAmount: await Invoice.aggregate([
        { $match: { createdBy: user._id, type: 'sale' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).then(result => result[0]?.total || 0),
      totalPurchaseAmount: await Invoice.aggregate([
        { $match: { createdBy: user._id, type: 'purchase' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).then(result => result[0]?.total || 0)
    };

    const salaryStats = {
      baseSalary: user.salary.base,
      totalBonuses: user.salary.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0),
      totalPaid: user.salary.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0),
      lastPayment: user.salary.paymentHistory.length > 0 
        ? user.salary.paymentHistory[user.salary.paymentHistory.length - 1]
        : null
    };

    res.json({
      user: {
        ...user.toObject(),
        fullName: `${user.profile.firstName} ${user.profile.lastName}`
      },
      recentActivity: userInvoices,
      stats: userStats,
      salaryStats
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
});

router.post('/:id/approve', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin users do not need approval' });
    }

    if (user.isApproved) {
      return res.status(400).json({ message: 'User is already approved' });
    }

    user.isApproved = true;
    user.isActive = true;
    await user.save();

    res.json({
      message: 'User approved successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('User approval error:', error);
    res.status(500).json({ message: 'Server error during user approval' });
  }
});

router.post('/:id/deactivate', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = false;
    await user.save();

    res.json({
      message: 'User deactivated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('User deactivation error:', error);
    res.status(500).json({ message: 'Server error during user deactivation' });
  }
});

router.post('/:id/activate', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isApproved) {
      return res.status(400).json({ message: 'User must be approved first' });
    }

    user.isActive = true;
    await user.save();

    res.json({
      message: 'User activated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('User activation error:', error);
    res.status(500).json({ message: 'Server error during user activation' });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const userInvoices = await Invoice.countDocuments({ createdBy: user._id });
    if (userInvoices > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user with existing invoices. Consider deactivating instead.' 
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ message: 'Server error during user deletion' });
  }
});

router.put('/:id/role', adminOnly, [
  body('role').isIn(['admin', 'staff']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const { role } = req.body;

    user.role = role;
    if (role === 'admin') {
      user.isApproved = true;
      user.isActive = true;
    }

    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('User role update error:', error);
    res.status(500).json({ message: 'Server error during user role update' });
  }
});

router.put('/:id/salary', adminOnly, [
  body('base').isNumeric({ min: 0 }).withMessage('Base salary must be a non-negative number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { base } = req.body;
    user.salary.base = base;
    await user.save();

    res.json({
      message: 'Salary updated successfully',
      salary: user.salary
    });
  } catch (error) {
    console.error('Salary update error:', error);
    res.status(500).json({ message: 'Server error during salary update' });
  }
});

router.post('/:id/bonus', adminOnly, [
  body('amount').isNumeric({ min: 0 }).withMessage('Bonus amount must be non-negative'),
  body('reason').notEmpty().withMessage('Bonus reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { amount, reason } = req.body;

    user.salary.bonuses.push({
      amount,
      reason,
      date: new Date()
    });

    await user.save();

    res.json({
      message: 'Bonus added successfully',
      salary: user.salary
    });
  } catch (error) {
    console.error('Bonus addition error:', error);
    res.status(500).json({ message: 'Server error during bonus addition' });
  }
});

router.post('/:id/salary-payment', adminOnly, [
  body('amount').isNumeric({ min: 0 }).withMessage('Payment amount must be non-negative'),
  body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque', 'mobile_money']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { amount, paymentMethod, notes } = req.body;

    user.salary.paymentHistory.push({
      amount,
      paymentDate: new Date(),
      paymentMethod,
      notes,
      recordedBy: req.user._id
    });

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password -refreshTokens')
      .populate('salary.paymentHistory.recordedBy', 'username');

    res.json({
      message: 'Salary payment recorded successfully',
      salary: updatedUser.salary
    });
  } catch (error) {
    console.error('Salary payment error:', error);
    res.status(500).json({ message: 'Server error during salary payment recording' });
  }
});

router.get('/staff/performance', adminOnly, [
  query('period').optional().isIn(['30d', '90d', '1y'])
], async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    switch (period) {
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const staffPerformance = await User.find({
      role: 'staff',
      isActive: true,
      isApproved: true
    })
      .select('username profile.firstName profile.lastName activity')
      .populate('salary.paymentHistory', 'amount paymentDate')
      .sort({ 'activity.lastActive': -1 });

    const staffDetails = await Promise.all(
      staffPerformance.map(async (staff) => {
        const invoiceStats = await Invoice.aggregate([
          {
            $match: {
              createdBy: staff._id,
              date: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              totalInvoices: { $sum: 1 },
              totalSalesAmount: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'sale'] }, '$total', 0]
                }
              },
              totalPurchaseAmount: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'purchase'] }, '$total', 0]
                }
              }
            }
          }
        ]);

        const stats = invoiceStats[0] || { 
          totalInvoices: 0, 
          totalSalesAmount: 0, 
          totalPurchaseAmount: 0 
        };

        const totalSalaryPaid = staff.salary.paymentHistory
          .filter(payment => new Date(payment.paymentDate) >= startDate)
          .reduce((sum, payment) => sum + payment.amount, 0);

        return {
          id: staff._id,
          username: staff.username,
          name: `${staff.profile.firstName} ${staff.profile.lastName}`,
          activity: staff.activity,
          stats,
          totalSalaryPaid,
          productivity: stats.totalInvoices > 0 ? (stats.totalSalesAmount / stats.totalInvoices) : 0
        };
      })
    );

    res.json({
      staffPerformance: staffDetails.sort((a, b) => b.stats.totalSalesAmount - a.stats.totalSalesAmount),
      period
    });
  } catch (error) {
    console.error('Staff performance error:', error);
    res.status(500).json({ message: 'Server error while fetching staff performance' });
  }
});

module.exports = router;
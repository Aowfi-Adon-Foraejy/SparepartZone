const express = require('express');
const { query } = require('express-validator');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Transaction = require('../models/Transaction');
const { auth, adminOnly, adminOrStaff } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/overview', adminOrStaff, async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all data sequentially for now to avoid Promise.all issues
    const totalSales = await Invoice.aggregate([
      { $match: { type: 'sale', date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    const totalPurchases = await Invoice.aggregate([
      { $match: { type: 'purchase', date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    const totalCustomers = await Customer.countDocuments({ isActive: true, isBlacklisted: false });
    const totalSuppliers = await Supplier.countDocuments({ isActive: true, isBlacklisted: false });
    const totalProducts = await Product.countDocuments({ isActive: true, isArchived: false });
    const lowStockProducts = await Product.find({
      isActive: true,
      isArchived: false,
      $expr: { $lte: ['$stock.current', '$stock.reorderThreshold'] }
    }).countDocuments();

    const recentSales = await Invoice.find({ 
      type: 'sale', 
      date: { $gte: sevenDaysAgo } 
    })
      .populate('customer', 'name email phone')
      .sort({ date: -1 })
      .limit(5);

    const recentPurchases = await Invoice.find({ 
      type: 'purchase', 
      date: { $gte: sevenDaysAgo } 
    })
      .populate('supplier', 'name email phone')
      .sort({ date: -1 })
      .limit(5);

    const salesStats = await Invoice.aggregate([
      { $match: { type: 'sale', date: { $gte: thirtyDaysAgo } } },
      { $group: { 
        _id: null, 
        totalSales: { $sum: '$total' },
        totalPaid: { $sum: { $reduce: { input: '$payments', initialValue: 0, in: { $add: ['$$value', '$$this.amount'] } } } },
        count: { $sum: 1 }
      }}
    ]);

    const purchaseStats = await Invoice.aggregate([
      { $match: { type: 'purchase', date: { $gte: thirtyDaysAgo } } },
      { $group: { 
        _id: null, 
        totalPurchases: { $sum: '$total' },
        totalPaid: { $sum: { $reduce: { input: '$payments', initialValue: 0, in: { $add: ['$$value', '$$this.amount'] } } } },
        count: { $sum: 1 }
      }}
    ]);

    const inventoryValue = await Product.aggregate([
      { $match: { isActive: true, isArchived: false } },
      { $group: { _id: null, totalValue: { $sum: { $multiply: ['$stock.current', '$costPrice'] } } } }
    ]);

    const customerDues = await Customer.aggregate([
      { $match: { isActive: true, isBlacklisted: false } },
      { $group: { _id: null, totalDues: { $sum: '$financials.outstandingDue' } } }
    ]);

    const supplierPayables = await Supplier.aggregate([
      { $match: { isActive: true, isBlacklisted: false } },
      { $group: { _id: null, totalPayables: { $sum: '$financials.outstandingPayable' } } }
    ]);

    const accountBalances = [
      { account: 'cash', balance: 0 },
      { account: 'bank_account', balance: 0 },
      { account: 'receivables', balance: 0 },
      { account: 'payables', balance: 0 }
    ];

    const overdueInvoices = [];

    res.json({
      overview: {
        totalSales: totalSales[0]?.total || 0,
        totalPurchases: totalPurchases[0]?.total || 0,
        totalCustomers,
        totalSuppliers,
        totalProducts,
        lowStockProducts,
        inventoryValue: inventoryValue[0]?.totalValue || 0,
        totalCustomerDues: customerDues[0]?.totalDues || 0,
        totalSupplierPayables: supplierPayables[0]?.totalPayables || 0,
        totalOverdueInvoices: overdueInvoices.length,
        totalOverdueAmount: 0
      },
      recentActivity: {
        recentSales: recentSales.map(invoice => ({
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          customer: invoice.customer?.name,
          total: invoice.total,
          status: invoice.status
        })),
        recentPurchases: recentPurchases.map(invoice => ({
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          supplier: invoice.supplier?.name,
          total: invoice.total,
          status: invoice.status
        }))
      },
      financialSummary: {
        salesStats: salesStats[0] || { totalSales: 0, totalPaid: 0, count: 0 },
        purchaseStats: purchaseStats[0] || { totalPurchases: 0, totalPaid: 0, count: 0 },
        accountBalances
      },
      period: {
        startDate: thirtyDaysAgo,
        endDate: today
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard overview' });
  }
});

router.get('/sales-chart', adminOrStaff, [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('type').optional().isIn(['sales', 'purchases'])
], async (req, res) => {
  try {
    const { period = '30d', type = 'sales' } = req.query;
    
    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const data = await Invoice.aggregate([
      {
        $match: {
          type: type === 'sales' ? 'sale' : 'purchase',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      data,
      period: { startDate, endDate },
      type
    });
  } catch (error) {
    console.error('Sales chart error:', error);
    res.status(500).json({ message: 'Server error while fetching sales chart data' });
  }
});

module.exports = router;
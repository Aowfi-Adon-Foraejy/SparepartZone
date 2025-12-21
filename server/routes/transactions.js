const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const { auth, adminOrStaff, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', adminOrStaff, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['sale', 'purchase', 'quick', 'payment_received', 'payment_made', 'adjustment']),
  query('category').optional().isIn(['income', 'expense', 'asset', 'liability']),
  query('account').optional().isIn(['cash', 'bank_account', 'mobile_money', 'receivables', 'payables']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
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
      type,
      category,
      account,
      startDate,
      endDate,
      search
    } = req.query;

    let filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (account) filters.account = account;

    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    let result;
    if (search) {
      result = await Transaction.searchTransactions(search, filters)
        .limit(limit * 1)
        .skip((page - 1) * limit);
    } else {
      result = await Transaction.find(filters)
        .populate('customer', 'name email')
        .populate('supplier', 'name email')
        .populate('reference')
        .populate('createdBy', 'username')
        .sort({ date: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
    }

    const total = search 
      ? (await Transaction.searchTransactions(search, filters)).length
      : await Transaction.countDocuments(filters);

    res.json({
      transactions: result,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching transactions' });
  }
});

router.get('/summary', adminOrStaff, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate = new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate = new Date()
    } = req.query;

    const financialSummary = await Transaction.getFinancialSummary(
      new Date(startDate),
      new Date(endDate)
    );

    const salesSummary = await Transaction.getSalesSummary(
      new Date(startDate),
      new Date(endDate)
    );

    const purchasesSummary = await Transaction.getPurchaseSummary(
      new Date(startDate),
      new Date(endDate)
    );

    const accountBalances = await Promise.all([
      Transaction.getAccountBalance('cash'),
      Transaction.getAccountBalance('bank_account'),
      Transaction.getAccountBalance('mobile_money'),
      Transaction.getAccountBalance('receivables'),
      Transaction.getAccountBalance('payables')
    ]);

    const accounts = ['cash', 'bank_account', 'mobile_money', 'receivables', 'payables'];
    const balanceData = accountBalances.map((balance, index) => ({
      account: accounts[index],
      balance: balance?.balanceAfter || 0
    }));

    res.json({
      summary: financialSummary,
      sales: salesSummary,
      purchases: purchasesSummary,
      accountBalances: balanceData,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Transaction summary error:', error);
    res.status(500).json({ message: 'Server error while fetching transaction summary' });
  }
});

router.get('/account-balances', adminOrStaff, async (req, res) => {
  try {
    const accounts = ['cash', 'bank_account', 'mobile_money', 'receivables', 'payables'];
    
    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await Transaction.getAccountBalance(account);
        return {
          account,
          balance: balance?.balanceAfter || 0,
          lastTransaction: balance ? await Transaction.findOne({ account })
            .sort({ date: -1, createdAt: -1 })
            .select('date description amount type') : null
        };
      })
    );

    const totalAssets = accountBalances
      .filter(acc => ['cash', 'bank_account', 'mobile_money'].includes(acc.account))
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalLiabilities = accountBalances
      .filter(acc => ['receivables', 'payables'].includes(acc.account))
      .reduce((sum, acc) => sum + acc.balance, 0);

    res.json({
      accountBalances,
      totals: {
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities
      }
    });
  } catch (error) {
    console.error('Account balances fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching account balances' });
  }
});

router.get('/cash-flow', adminOrStaff, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('period').optional().isIn(['daily', 'weekly', 'monthly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate = new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate = new Date(),
      period = 'daily'
    } = req.query;

    let groupFormat;
    switch (period) {
      case 'daily':
        groupFormat = {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        };
        break;
      case 'weekly':
        groupFormat = {
          year: { $year: '$date' },
          week: { $week: '$date' }
        };
        break;
      case 'monthly':
        groupFormat = {
          year: { $year: '$date' },
          month: { $month: '$date' }
        };
        break;
    }

    const cashFlow = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: groupFormat,
          income: {
            $sum: {
              $cond: [{ $eq: ['$category', 'income'] }, '$amount', 0]
            }
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ['$category', 'expense'] }, '$amount', 0]
            }
          },
          net: {
            $sum: {
              $cond: [
                { $in: ['$category', ['income', 'expense']] },
                { $cond: [{ $eq: ['$category', 'income'] }, '$amount', { $multiply: ['$amount', -1] }] },
                0
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
      }
    ]);

    res.json({
      cashFlow,
      period,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error('Cash flow fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching cash flow' });
  }
});

router.get('/profit-loss', adminOrStaff, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate = new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate = new Date()
    } = req.query;

    const profitLoss = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$category', 'income'] }, '$amount', 0]
            }
          },
          totalExpenses: {
            $sum: {
              $cond: [{ $eq: ['$category', 'expense'] }, '$amount', 0]
            }
          },
          salesRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$category', 'income'] }, { $eq: ['$type', 'sale'] }] },
                '$amount',
                0
              ]
            }
          },
          purchaseCosts: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$category', 'expense'] }, { $eq: ['$type', 'purchase'] }] },
                '$amount',
                0
              ]
            }
          },
          otherRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$category', 'income'] }, { $ne: ['$type', 'sale'] }] },
                '$amount',
                0
              ]
            }
          },
          otherExpenses: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$category', 'expense'] }, { $ne: ['$type', 'purchase'] }] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const data = profitLoss[0] || {
      totalRevenue: 0,
      totalExpenses: 0,
      salesRevenue: 0,
      purchaseCosts: 0,
      otherRevenue: 0,
      otherExpenses: 0
    };

    data.grossProfit = data.salesRevenue - data.purchaseCosts;
    data.netProfit = data.totalRevenue - data.totalExpenses;
    data.grossMargin = data.salesRevenue > 0 ? (data.grossProfit / data.salesRevenue * 100) : 0;
    data.netMargin = data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue * 100) : 0;

    res.json({
      profitLoss: data,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Profit loss fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching profit loss statement' });
  }
});

router.post('/', adminOnly, [
  body('type').isIn(['sale', 'purchase', 'quick', 'payment_received', 'payment_made', 'adjustment', 'opening_balance']),
  body('category').isIn(['income', 'expense', 'asset', 'liability']),
  body('amount').isNumeric({ min: 0 }),
  body('description').notEmpty(),
  body('account').isIn(['cash', 'bank_account', 'mobile_money', 'receivables', 'payables'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type, category, amount, description, reference, referenceModel,
      customer, supplier, paymentMethod, account, tags, notes
    } = req.body;

    const transaction = await Transaction.createTransaction({
      type,
      category,
      amount,
      description,
      reference,
      referenceModel,
      customer,
      supplier,
      paymentMethod: paymentMethod || 'adjustment',
      account,
      balanceBefore: 0,
      balanceAfter: 0,
      tags,
      notes,
      isManual: true,
      createdBy: req.user._id
    });

    await transaction.setBalanceFields();
    await transaction.save();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('customer', 'name email')
      .populate('supplier', 'name email')
      .populate('reference')
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: populatedTransaction
    });
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(500).json({ message: 'Server error during transaction creation' });
  }
});

router.put('/:id', adminOnly, [
  body('description').optional().notEmpty(),
  body('tags').optional().isArray(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (!transaction.isManual) {
      return res.status(403).json({ message: 'Cannot edit automatic transactions' });
    }

    const { description, tags, notes } = req.body;

    if (description) transaction.description = description;
    if (tags) transaction.tags = tags;
    if (notes !== undefined) transaction.notes = notes;

    await transaction.save();

    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('customer', 'name email')
      .populate('supplier', 'name email')
      .populate('reference')
      .populate('createdBy', 'username');

    res.json({
      message: 'Transaction updated successfully',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Transaction update error:', error);
    res.status(500).json({ message: 'Server error during transaction update' });
  }
});

router.get('/export/csv', adminOrStaff, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('type').optional().isIn(['sale', 'purchase', 'quick', 'payment_received', 'payment_made', 'adjustment']),
  query('category').optional().isIn(['income', 'expense', 'asset', 'liability'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate = new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate = new Date(),
      type,
      category
    } = req.query;

    const filters = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (type) filters.type = type;
    if (category) filters.category = category;

    const transactions = await Transaction.getTransactionsByDateRange(
      new Date(startDate),
      new Date(endDate),
      filters
    );

    const csvHeader = 'Date,Type,Category,Description,Amount,Account,Customer,Supplier,Created By\n';
    
    const csvData = transactions.map(transaction => {
      return [
        transaction.date.toISOString().split('T')[0],
        transaction.type,
        transaction.category,
        `"${transaction.description}"`,
        transaction.amount,
        transaction.account,
        transaction.customer?.name || '',
        transaction.supplier?.name || '',
        transaction.createdBy?.username || ''
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${startDate}_to_${endDate}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Transaction export error:', error);
    res.status(500).json({ message: 'Server error during transaction export' });
  }
});

router.get('/:id', adminOrStaff, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('supplier', 'name email phone')
      .populate('product', 'name brand sku')
      .populate('reference')
      .populate('createdBy', 'username')
      .populate('approvedBy', 'username');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching transaction' });
  }
});

module.exports = router;
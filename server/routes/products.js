const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { auth, adminOrStaff } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/', adminOrStaff, [
  body('name').notEmpty().withMessage('Product name is required'),
  body('brand').notEmpty().withMessage('Brand is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('sku').notEmpty().withMessage('SKU is required'),
  body('costPrice').isNumeric().withMessage('Cost price must be a number'),
  body('sellingPrice').isNumeric().withMessage('Selling price must be a number'),
  body('stock.current').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('stock.reorderThreshold').isInt({ min: 0 }).withMessage('Reorder threshold must be a non-negative integer'),
  body('stock.minStock').isInt({ min: 0 }).withMessage('Min stock must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, brand, category, sku, description, costPrice, sellingPrice,
      stock, unit, location, supplier, images, specifications
    } = req.body;

    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this SKU already exists' });
    }

    const product = new Product({
      name,
      brand,
      category,
      sku: sku.toUpperCase(),
      description,
      costPrice,
      sellingPrice,
      stock: {
        current: stock?.current || 0,
        reorderThreshold: stock?.reorderThreshold || 10,
        minStock: stock?.minStock || 5
      },
      unit: unit || 'pieces',
      location,
      supplier,
      images,
      specifications
    });

    if (stock?.current > 0) {
      await product.updateStock(stock.current, 'stock_in', null, 'Adjustment', req.user._id, 'Initial stock');
    }

    await req.user.updateActivity('inventory');

    const populatedProduct = await Product.findById(product._id)
      .populate('supplier', 'name email phone');

    res.status(201).json({
      message: 'Product created successfully',
      product: populatedProduct
    });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ message: 'Server error during product creation' });
  }
});

router.get('/', adminOrStaff, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('brand').optional().isString(),
  query('lowStock').optional().isBoolean(),
  query('status').optional().isIn(['active', 'archived', 'all'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      lowStock,
      status = 'active'
    } = req.query;

    const filters = {};
    
    if (category) filters.category = category;
    if (brand) filters.brand = brand;
    if (lowStock === 'true') {
      filters['stock.current'] = { $lte: '$stock.reorderThreshold' };
    }
    
    switch (status) {
      case 'active':
        filters.isActive = true;
        filters.isArchived = false;
        break;
      case 'archived':
        filters.isArchived = true;
        break;
    }

    let query;
    if (search) {
      query = Product.searchProducts(search, filters);
    } else {
      query = Product.find(filters);
    }

    const products = await query
      .populate('supplier', 'name')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filters);

    const lowStockCount = 0;

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        lowStockCount
      }
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
});

router.get('/low-stock', adminOrStaff, async (req, res) => {
  try {
    const lowStockProducts = await Product.findLowStock()
      .populate('supplier', 'name')
      .sort({ 'stock.current': 1 });

    const criticalStockProducts = lowStockProducts.filter(product => 
      product.isCriticalStock()
    );

    res.json({
      lowStockProducts,
      criticalStockProducts,
      stats: {
        lowStockCount: lowStockProducts.length,
        criticalCount: criticalStockProducts.length
      }
    });
  } catch (error) {
    console.error('Low stock fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching low stock products' });
  }
});

router.get('/categories', adminOrStaff, async (req, res) => {
  try {
    const categories = await Product.distinct('category', {
      isActive: true,
      isArchived: false
    });

    const brands = await Product.distinct('brand', {
      isActive: true,
      isArchived: false
    });

    res.json({
      categories: categories.sort(),
      brands: brands.sort()
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

router.get('/:id', adminOrStaff, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('supplier', 'name email phone')
      .populate('activityLog.user', 'username');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching product' });
  }
});

router.put('/:id', adminOrStaff, [
  body('name').optional().notEmpty().withMessage('Product name cannot be empty'),
  body('brand').optional().notEmpty().withMessage('Brand cannot be empty'),
  body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  body('costPrice').optional().isNumeric().withMessage('Cost price must be a number'),
  body('sellingPrice').optional().isNumeric().withMessage('Selling price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const {
      name, brand, category, description, costPrice, sellingPrice,
      stock, unit, location, supplier, images, specifications
    } = req.body;

    if (name) product.name = name;
    if (brand) product.brand = brand;
    if (category) product.category = category;
    if (description !== undefined) product.description = description;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (unit) product.unit = unit;
    if (location) product.location = { ...product.location, ...location };
    if (supplier) product.supplier = supplier;
    if (images) product.images = images;
    if (specifications) product.specifications = { ...product.specifications, ...specifications };

    if (stock) {
      if (stock.current !== undefined && stock.current !== product.stock.current) {
        await product.updateStock(
          stock.current,
          'adjustment',
          null,
          'Adjustment',
          req.user._id,
          'Stock level updated'
        );
      }
      if (stock.reorderThreshold !== undefined) product.stock.reorderThreshold = stock.reorderThreshold;
      if (stock.minStock !== undefined) product.stock.minStock = stock.minStock;
    }

    await req.user.updateActivity('inventory');

    const updatedProduct = await Product.findById(product._id)
      .populate('supplier', 'name email phone');

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ message: 'Server error during product update' });
  }
});

router.post('/:id/stock', adminOrStaff, [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('type').isIn(['stock_in', 'stock_out', 'adjustment']).withMessage('Invalid stock operation type'),
  body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { quantity, type, reason, referenceId, referenceModel } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (type === 'stock_out' && product.stock.current < quantity) {
      return res.status(400).json({ message: 'Insufficient stock for this operation' });
    }

    await product.updateStock(
      quantity,
      type,
      referenceId,
      referenceModel,
      req.user._id,
      reason
    );

    await req.user.updateActivity('inventory');

    const updatedProduct = await Product.findById(product._id)
      .populate('activityLog.user', 'username');

    res.json({
      message: 'Stock updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Stock update error:', error);
    res.status(500).json({ message: 'Server error during stock update' });
  }
});

router.post('/:id/archive', adminOrStaff, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isArchived = true;
    product.isActive = false;
    await product.save();

    await req.user.updateActivity('inventory');

    res.json({ message: 'Product archived successfully' });
  } catch (error) {
    console.error('Product archive error:', error);
    res.status(500).json({ message: 'Server error during product archive' });
  }
});

router.post('/:id/restore', adminOrStaff, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isArchived = false;
    product.isActive = true;
    await product.save();

    await req.user.updateActivity('inventory');

    res.json({ message: 'Product restored successfully' });
  } catch (error) {
    console.error('Product restore error:', error);
    res.status(500).json({ message: 'Server error during product restore' });
  }
});

router.delete('/:id', adminOrStaff, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock.current > 0) {
      return res.status(400).json({ message: 'Cannot delete product with existing stock' });
    }

    await Product.findByIdAndDelete(req.params.id);

    await req.user.updateActivity('inventory');

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({ message: 'Server error during product deletion' });
  }
});

router.get('/:id/activity', adminOrStaff, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const activity = await Product.findById(req.params.id)
      .select('activityLog')
      .populate('activityLog.user', 'username')
      .populate('activityLog.reference', 'invoiceNumber')
      .then(doc => doc.activityLog);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedActivity = activity.slice(startIndex, endIndex);

    res.json({
      activity: paginatedActivity,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: activity.length,
        pages: Math.ceil(activity.length / limit)
      }
    });
  } catch (error) {
    console.error('Activity log fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching activity log' });
  }
});

module.exports = router;
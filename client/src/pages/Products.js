import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle,
  Edit,
  Trash2,
  X,
  TrendingUp
} from 'lucide-react';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: productsData, isLoading, error, refetch } = useQuery(
    'products',
    async () => {
      const { data } = await api.get('/products');
      return data;
    },
    {
      refetchInterval: 30000
    }
  );

  const { data: categoriesData } = useQuery(
    'product-categories',
    async () => {
      const { data } = await api.get('/products/categories');
      return data;
    },
    {
      onError: (error) => {
        console.error('Failed to fetch categories:', error);
        // Will use default categories from the form if API fails
      }
    }
  );

  const { data: lowStockData } = useQuery(
    'low-stock-products',
    async () => {
      const { data } = await api.get('/products/low-stock');
      return data;
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading products</h3>
          <p className="text-gray-600">{error.message}</p>
          <button onClick={() => refetch()} className="mt-4 btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { products, pagination } = productsData || {};
  
  // Filter products based on search term (Name and SKU)
  const filteredProducts = products?.filter(product => 
    searchTerm === '' || 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAddProduct = async (productData) => {
    try {
      await api.post('/products', productData);
      setShowAddModal(false);
      refetch();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleEditProduct = async (productData) => {
    try {
      await api.put(`/products/${selectedProduct._id}`, productData);
      setShowEditModal(false);
      setSelectedProduct(null);
      refetch();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${productId}`);
        refetch();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your inventory and track stock levels</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card stat-card-primary card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Products</p>
              <p className="text-3xl font-bold text-gray-900">{pagination?.total || 0}</p>
              <div className="mt-3 flex items-center text-xs text-primary-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>12% from last month</span>
              </div>
            </div>
            <div className="p-4 bg-primary-50 rounded-2xl">
              <Package className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-warning card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Low Stock Items</p>
              <p className="text-3xl font-bold text-warning-600">{lowStockData?.lowStockCount || 0}</p>
              <div className="mt-3 flex items-center text-xs text-warning-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Requires attention</span>
              </div>
            </div>
            <div className="p-4 bg-warning-50 rounded-2xl">
              <AlertTriangle className="h-8 w-8 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-success card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Active Products</p>
              <p className="text-3xl font-bold text-success-600">
                {products?.filter(p => p.isActive).length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-success-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Live inventory</span>
              </div>
            </div>
            <div className="p-4 bg-success-50 rounded-2xl">
              <Package className="h-8 w-8 text-success-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-primary card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Categories</p>
              <p className="text-3xl font-bold text-primary-600">
                {[...new Set(products?.map(p => p.category))].length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-primary-600">
                <Package className="h-3 w-3 mr-1" />
                <span>Product types</span>
              </div>
            </div>
            <div className="p-4 bg-primary-50 rounded-2xl">
              <Package className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full sm:w-80 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
        

      </div>

      {/* Products Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Product</th>
                <th className="table-header-cell">SKU</th>
                <th className="table-header-cell">Brand</th>
                <th className="table-header-cell">Category</th>
                <th className="table-header-cell">Stock</th>
                <th className="table-header-cell">Price</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredProducts.map((product) => (
                <tr key={product._id} className="table-row group">
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-gray">{product.sku}</span>
                  </td>
                  <td className="table-cell">{product.brand}</td>
                  <td className="table-cell">
                    <span className="badge badge-primary">{product.category}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <span className={`badge ${
                        product.stock.current <= product.stock.reorderThreshold 
                          ? 'badge-danger' 
                          : 'badge-success'
                      }`}>
                        {product.stock.current}
                      </span>
                      <span className="text-xs text-gray-500">
                        Min: {product.stock.reorderThreshold}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">৳{product.sellingPrice.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Cost: ৳{product.costPrice?.toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${
                      product.isActive ? 'badge-success' : 'badge-gray'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-content animate-bounce-in max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
                  <p className="text-sm text-gray-600 mt-1">Fill in the product details below</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <ProductForm
                onSubmit={handleAddProduct}
                onCancel={() => setShowAddModal(false)}
                categories={categoriesData?.categories || []}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-content animate-bounce-in max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
                  <p className="text-sm text-gray-600 mt-1">Update the product information</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <ProductForm
                onSubmit={handleEditProduct}
                onCancel={() => setShowEditModal(false)}
                categories={categoriesData?.categories || []}
                initialData={selectedProduct}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductForm = ({ onSubmit, onCancel, categories, initialData = {} }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    brand: initialData.brand || '',
    category: initialData.category || '',
    customCategory: '',
    sku: initialData.sku || '',
    costPrice: initialData.costPrice || '',
    sellingPrice: initialData.sellingPrice || '',
    stock: {
      current: initialData.stock?.current || 0,
      reorderThreshold: initialData.stock?.reorderThreshold || 10,
      minStock: initialData.stock?.minStock || 5
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle custom category
    const submissionData = {
      ...formData,
      category: formData.category === 'custom' ? formData.customCategory : formData.category
    };
    onSubmit(submissionData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="">Select category</option>
            {/* Default categories */}
            <option value="Engine Parts">Engine Parts</option>
            <option value="Transmission">Transmission</option>
            <option value="Brakes">Brakes</option>
            <option value="Suspension">Suspension</option>
            <option value="Electrical">Electrical</option>
            <option value="Body Parts">Body Parts</option>
            <option value="Filters">Filters</option>
            <option value="Fluids">Fluids</option>
            <option value="Tools">Tools</option>
            <option value="Accessories">Accessories</option>
            {/* Existing categories from database */}
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="">-- OR --</option>
            <option value="custom">Add New Category</option>
          </select>
          {formData.category === 'custom' && (
            <input
              type="text"
              name="customCategory"
              value={formData.customCategory || ''}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  customCategory: e.target.value
                }));
              }}
              className="input mt-2"
              placeholder="Enter new category name..."
              required
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
          <input
            type="number"
            name="costPrice"
            value={formData.costPrice}
            onChange={handleChange}
            className="input"
            min="0"
            step="0.01"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
          <input
            type="number"
            name="sellingPrice"
            value={formData.sellingPrice}
            onChange={handleChange}
            className="input"
            min="0"
            step="0.01"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
          <input
            type="number"
            name="stock.current"
            value={formData.stock.current}
            onChange={handleChange}
            className="input"
            min="0"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Threshold</label>
          <input
            type="number"
            name="stock.reorderThreshold"
            value={formData.stock.reorderThreshold}
            onChange={handleChange}
            className="input"
            min="0"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
          <input
            type="number"
            name="stock.minStock"
            value={formData.stock.minStock}
            onChange={handleChange}
            className="input"
            min="0"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
        >
          {initialData._id ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );
};

export default Products;

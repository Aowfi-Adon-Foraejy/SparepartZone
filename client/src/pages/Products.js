import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle,
  Edit,
  Trash2
} from 'lucide-react';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: productsData, isLoading, error, refetch } = useQuery(
    'products',
    async () => {
      const { data } = await axios.get('/api/products');
      return data;
    },
    {
      refetchInterval: 30000
    }
  );

  const { data: categoriesData } = useQuery(
    'product-categories',
    async () => {
      const { data } = await axios.get('/api/products/categories');
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
      const { data } = await axios.get('/api/products/low-stock');
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

  const handleAddProduct = async (productData) => {
    try {
      await axios.post('/api/products', productData);
      setShowAddModal(false);
      refetch();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleEditProduct = async (productData) => {
    try {
      await axios.put(`/api/products/${selectedProduct._id}`, productData);
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
        await axios.delete(`/api/products/${productId}`);
        refetch();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <p className="text-gray-600">Manage your inventory and track stock levels</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{pagination?.total || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold text-yellow-600">{lowStockData?.lowStockCount || 0}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Name</th>
                <th className="table-header-cell">SKU</th>
                <th className="table-header-cell">Brand</th>
                <th className="table-header-cell">Category</th>
                <th className="table-header-cell">Stock</th>
                <th className="table-header-cell">Price</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {products?.map((product) => (
                <tr key={product._id} className="table-row">
                  <td className="table-cell">{product.name}</td>
                  <td className="table-cell">{product.sku}</td>
                  <td className="table-cell">{product.brand}</td>
                  <td className="table-cell">{product.category}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.stock.current <= product.stock.reorderThreshold 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {product.stock.current}
                    </span>
                  </td>
                  <td className="table-cell">৳{product.sellingPrice.toLocaleString()}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="text-red-600 hover:text-red-800"
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
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

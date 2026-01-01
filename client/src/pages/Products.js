import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { getLowStockProducts } from '../utils/financialSummary';
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
  const queryClient = useQueryClient();

  const { data: productsData, isLoading, error, refetch } = useQuery(
    'products',
    async () => {
      const { data } = await api.get('/products');
      return data;
    },
    {
      refetchInterval: 60000, // Reduced from 30s to 60s since we have invalidation
      staleTime: 30000
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
      // Invalidate all relevant queries for global state refresh
      queryClient.invalidateQueries('products');
      queryClient.invalidateQueries('dashboard-products');
      queryClient.invalidateQueries('low-stock-products');
      toast.success('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error.response?.data?.message || 'Failed to add product');
    }
  };

  const handleEditProduct = async (productData) => {
    try {
      await api.put(`/products/${selectedProduct._id}`, productData);
      setShowEditModal(false);
      setSelectedProduct(null);
      refetch();
      // Invalidate all relevant queries for global state refresh
      queryClient.invalidateQueries('products');
      queryClient.invalidateQueries('dashboard-products');
      queryClient.invalidateQueries('low-stock-products');
      toast.success('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${productId}`);
        refetch();
        // Invalidate all relevant queries for global state refresh
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries('dashboard-products');
        queryClient.invalidateQueries('low-stock-products');
        toast.success('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <p className="text-white/80 mt-1">Manage your inventory and track stock levels</p>
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
        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Total Products</p>
              <p className="stat-card-value">{pagination?.total || 0}</p>
              <div className="mt-3 flex items-center text-xs text-blue-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>12% from last month</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-primary">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Low Stock Items</p>
              <p className="stat-card-value">{getLowStockProducts(products)}</p>
              <div className="mt-3 flex items-center text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Requires attention</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-warning">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Active Products</p>
              <p className="stat-card-value">
                {products?.filter(p => p.isActive).length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Live inventory</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-success">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Categories</p>
              <p className="stat-card-value">
                {[...new Set(products?.map(p => p.category))].length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-blue-400">
                <Package className="h-3 w-3 mr-1" />
                <span>Product types</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-primary">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
           <div className="relative flex-1 sm:flex-initial">
             <Search className="absolute left-4 top-3 h-5 w-5 text-white/40" />
             <input
               type="text"
               placeholder="Search products..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-12 pr-12 py-3 w-full sm:w-80 bg-white/10 border-white/20 text-white placeholder-white/50 backdrop-blur-md rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200"
               style={{ backdropFilter: 'blur(10px)' }}
             />
             {searchTerm && (
               <button
                 onClick={() => setSearchTerm('')}
                 className="absolute right-4 top-3 h-5 w-5 text-white/40 hover:text-white/60 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white/20"
                 title="Clear search"
               >
                 <X className="h-3 w-3" />
               </button>
             )}
           </div>
        </div>
        

      </div>

       {/* Products Table */}
      <div 
        className="rounded-xl overflow-hidden border"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="sticky top-0 z-10" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Brand</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product._id} className="group hover:bg-white/5 transition-colors duration-150" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'rgba(59, 130, 246, 0.2)'}}>
                        <Package className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{product.name}</p>
                        <p className="text-xs text-white/60">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{product.sku}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{product.brand}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{product.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        product.stock.current <= product.stock.reorderThreshold 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {product.stock.current}
                      </span>
                      <span className="text-xs text-white/60">
                        Min: {product.stock.reorderThreshold}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-left">
                      <p className="font-semibold text-white">৳{product.sellingPrice.toLocaleString()}</p>
                      <p className="text-xs text-white/60">Cost: ৳{product.costPrice?.toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      product.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-blue-400 hover:bg-white/10 rounded-lg transition-colors duration-200"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-2 text-red-400 hover:bg-white/10 rounded-lg transition-colors duration-200"
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

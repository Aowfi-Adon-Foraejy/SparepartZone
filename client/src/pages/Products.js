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
  TrendingUp,
  Download,
  RefreshCw,
  LayoutGrid,
  List,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'category', 'brand'
  const [viewMode, setViewMode] = useState('table'); // 'table', 'grid'
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const queryClient = useQueryClient();

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const { data: productsData, isLoading, error, refetch } = useQuery(
    ['products', currentPage, itemsPerPage, searchTerm],
    async () => {
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const { data } = await api.get('/products', { params });
      return data;
    },
    {
      refetchInterval: 60000, // Reduced from 30s to 60s since we have invalidation
      staleTime: 30000,
      keepPreviousData: true
    }
  );

  const { data: salesAnalytics, isLoading: analyticsLoading, error: analyticsError } = useQuery(
    'sales-analytics',
    async () => {
      console.log('Fetching sales analytics...');
      try {
        const { data } = await api.get('/products/analytics/sales');
        console.log('Sales analytics response:', data);
        return data;
      } catch (error) {
        console.error('Error fetching sales analytics:', error);
        throw error;
      }
    },
    {
      refetchInterval: 300000, // Refresh every 5 minutes
      staleTime: 240000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
  
  // Products are already filtered by backend API, no need for client-side filtering
  const filteredProducts = products || [];

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

  // Export to Excel
  const exportToExcel = () => {
    const dataToExport = filteredProducts.map(product => ({
      'Product Name': product.name,
      'SKU': product.sku,
      'Brand': product.brand,
      'Category': product.category,
      'Current Stock': product.stock.current,
      'Reorder Threshold': product.stock.reorderThreshold,
      'Min Stock': product.stock.minStock,
      'Cost Price': product.costPrice,
      'Selling Price': product.sellingPrice,
      'Status': product.isActive ? 'Active' : 'Inactive',
      'Stock Status': product.stock.current <= product.stock.reorderThreshold ? 'Low Stock' : 'In Stock'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock List');
    XLSX.writeFile(wb, `stock_list_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel file exported successfully!');
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const pdf = new jsPDF('landscape'); // Use landscape for better table fit
      
      // Page dimensions in landscape
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - 2 * margin;
      
      // Add title
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Stock List Report', margin, 15);
      
      // Add date
      pdf.setFontSize(9);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 25);
      
      // Define column widths that fit the page
      const columnWidths = [
        35, // Product Name
        25, // SKU
        25, // Brand
        25, // Category
        20, // Current Stock
        20, // Min Stock
        25, // Price
        20, // Status
        25  // Stock Status
      ];
      const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
      
      // Scale columns to fit available width
      const scaledWidths = columnWidths.map(width => (width / totalWidth) * usableWidth);
      
      // Prepare data for table
      const dataToExport = filteredProducts.map(product => [
        product.name,
        product.sku,
        product.brand,
        product.category,
        product.stock.current.toString(),
        product.stock.reorderThreshold.toString(),
        `৳${product.sellingPrice.toLocaleString()}`,
        product.isActive ? 'Active' : 'Inactive',
        product.stock.current <= product.stock.reorderThreshold ? 'Low Stock' : 'In Stock'
      ]);

      // Define table headers
      const headers = [
        'Product',
        'SKU',
        'Brand',
        'Category',
        'Stock',
        'Min',
        'Price',
        'Status',
        'Stock Status'
      ];

      const startY = 35;
      const rowHeight = 8;
      
      // Add headers
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      headers.forEach((header, index) => {
        const x = margin + scaledWidths.slice(0, index).reduce((a, b) => a + b, 0);
        pdf.text(header, x, startY);
      });
      
      // Add horizontal line after headers
      const lineY = startY + 2;
      pdf.line(margin, lineY, margin + usableWidth, lineY);
      
      // Add data rows
      pdf.setFont(undefined, 'normal');
      let currentY = startY + 8;
      
      dataToExport.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (currentY > pageHeight - 20) {
          pdf.addPage();
          currentY = 15;
          
          // Add headers on new page
          pdf.setFont(undefined, 'bold');
          headers.forEach((header, index) => {
            const x = margin + scaledWidths.slice(0, index).reduce((a, b) => a + b, 0);
            pdf.text(header, x, currentY);
          });
          pdf.line(margin, currentY + 2, margin + usableWidth, currentY + 2);
          pdf.setFont(undefined, 'normal');
          currentY += 8;
        }
        
        row.forEach((cell, cellIndex) => {
          const x = margin + scaledWidths.slice(0, cellIndex).reduce((a, b) => a + b, 0);
          
          // Truncate text based on column width
          let text = cell.toString();
          const maxLength = Math.floor(scaledWidths[cellIndex] / 3); // Approximate character limit
          if (text.length > maxLength) {
            text = text.substring(0, maxLength - 3) + '...';
          }
          
          pdf.text(text, x, currentY);
        });
        
        currentY += rowHeight;
      });
      
      // Add summary at the bottom
      const totalProducts = filteredProducts.length;
      const lowStockProducts = filteredProducts.filter(p => p.stock.current <= p.stock.reorderThreshold).length;
      
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10);
      pdf.text(`Total Products: ${totalProducts}`, margin, pageHeight - 15);
      pdf.text(`Low Stock Items: ${lowStockProducts}`, margin + 100, pageHeight - 15);
      
      pdf.save(`stock_list_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Handle restock
  const handleRestock = (product) => {
    setRestockProduct(product);
    setShowRestockModal(true);
  };

  const confirmRestock = async (quantity) => {
    if (!restockProduct) return;
    
    try {
      await api.post(`/products/${restockProduct._id}/stock`, {
        quantity: parseInt(quantity),
        type: 'stock_in',
        reason: 'Restock from low stock alert'
      });
      
      refetch();
      queryClient.invalidateQueries('products');
      queryClient.invalidateQueries('dashboard-products');
      queryClient.invalidateQueries('low-stock-products');
      setShowRestockModal(false);
      setRestockProduct(null);
      toast.success('Product restocked successfully!');
    } catch (error) {
      console.error('Error restocking product:', error);
      toast.error(error.response?.data?.message || 'Failed to restock product');
    }
  };

  // Group products
  const getGroupedProducts = () => {
    if (groupBy === 'none') return { 'All Products': filteredProducts };
    
    const grouped = filteredProducts.reduce((acc, product) => {
      const key = product[groupBy];
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    }, {});
    
    return grouped;
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

       {/* Sales Analytics Sections */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Most Sold Products */}
         <div 
           className="rounded-xl p-6 border"
           style={{
             background: 'rgba(255, 255, 255, 0.03)',
             backdropFilter: 'blur(20px)',
             border: '1px solid rgba(255, 255, 255, 0.1)'
           }}
         >
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-white flex items-center">
               <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
               Most Sold Products
             </h3>
             <span className="text-xs text-white/60">{salesAnalytics?.period || 'Last 30 days'}</span>
           </div>
           <div className="space-y-3">
             {analyticsLoading ? (
               <div className="space-y-3">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                     <div className="flex items-center space-x-3">
                       <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
                       <div className="space-y-1">
                         <div className="h-4 w-32 bg-white/10 rounded animate-pulse"></div>
                         <div className="h-3 w-24 bg-white/10 rounded animate-pulse"></div>
                       </div>
                     </div>
                     <div className="text-right space-y-1">
                       <div className="h-4 w-16 bg-white/10 rounded animate-pulse ml-auto"></div>
                       <div className="h-3 w-20 bg-white/10 rounded animate-pulse ml-auto"></div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : salesAnalytics?.mostSold?.length > 0 ? (
               salesAnalytics.mostSold.slice(0, 5).map((product, index) => (
                 <div key={product._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                   <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-semibold text-sm">
                       {index + 1}
                     </div>
                     <div>
                       <p className="font-medium text-white text-sm">{product.productName}</p>
                       <p className="text-xs text-white/60">{product.sku} • {product.brand}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="font-semibold text-white text-sm">{product.totalSold} units</p>
                     <p className="text-xs text-green-400">৳{product.totalRevenue.toLocaleString()}</p>
                   </div>
                 </div>
               ))
              ) : analyticsError ? (
                <div className="text-center py-4">
                  <p className="text-red-400 text-sm">Failed to load analytics data</p>
                  <p className="text-white/40 text-xs mt-2">
                    Please try refreshing the page
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/60 text-sm">
                    {salesAnalytics?.debug?.hasSalesData ? 'No sales data available' : 'Top products by stock level'}
                  </p>
                  <p className="text-white/40 text-xs mt-2">
                    {salesAnalytics?.debug?.hasSalesData 
                      ? 'No sales invoices found in the last 30 days' 
                      : 'Showing products with highest stock levels as demo'
                    }
                  </p>
                  {salesAnalytics?.debug && (
                    <p className="text-white/40 text-xs mt-1">
                      Found {salesAnalytics.debug.foundInvoices || salesAnalytics.debug.recentInvoices} recent invoices
                    </p>
                  )}
                </div>
              )}
           </div>
         </div>

         {/* Slow Moving Products */}
         <div 
           className="rounded-xl p-6 border"
           style={{
             background: 'rgba(255, 255, 255, 0.03)',
             backdropFilter: 'blur(20px)',
             border: '1px solid rgba(255, 255, 255, 0.1)'
           }}
         >
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-white flex items-center">
               <TrendingDown className="h-5 w-5 mr-2 text-red-400" />
               Slow Moving Products
             </h3>
             <span className="text-xs text-white/60">Low activity items</span>
           </div>
           <div className="space-y-3">
             {analyticsLoading ? (
               <div className="space-y-3">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                     <div className="flex items-center space-x-3">
                       <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
                       <div className="space-y-1">
                         <div className="h-4 w-32 bg-white/10 rounded animate-pulse"></div>
                         <div className="h-3 w-24 bg-white/10 rounded animate-pulse"></div>
                       </div>
                     </div>
                     <div className="text-right space-y-1">
                       <div className="h-4 w-16 bg-white/10 rounded animate-pulse ml-auto"></div>
                       <div className="h-3 w-20 bg-white/10 rounded animate-pulse ml-auto"></div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : salesAnalytics?.slowMoving?.length > 0 ? (
               salesAnalytics.slowMoving.slice(0, 5).map((product, index) => (
                 <div key={product._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                   <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-semibold text-sm">
                       <Clock className="h-4 w-4" />
                     </div>
                     <div>
                       <p className="font-medium text-white text-sm">{product.name}</p>
                       <p className="text-xs text-white/60">{product.sku} • {product.brand}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="font-semibold text-white text-sm">{product.totalSold || 0} units</p>
                     <p className="text-xs text-red-400">{Math.floor(product.daysSinceLastRestock)} days</p>
                   </div>
                 </div>
               ))
              ) : analyticsError ? (
                <div className="text-center py-4">
                  <p className="text-red-400 text-sm">Failed to load analytics data</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/60 text-sm">No slow-moving products</p>
                  <p className="text-white/40 text-xs mt-2">All products had sales recently</p>
                </div>
              )}
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
         
         <div className="flex items-center space-x-3">
           {/* Group By */}
           <select
             value={groupBy}
             onChange={(e) => setGroupBy(e.target.value)}
             className="bg-gray-800 border-gray-600 text-white rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
           >
             <option value="none">No Grouping</option>
             <option value="category">Group by Category</option>
             <option value="brand">Group by Brand</option>
           </select>

           {/* Export Options */}
           <div className="relative">
             <button
               onClick={() => setShowExportOptions(!showExportOptions)}
               className="flex items-center space-x-2 bg-white/10 border-white/20 text-white backdrop-blur-md rounded-lg border px-4 py-2 text-sm hover:bg-white/20 transition-colors"
             >
               <Download className="h-4 w-4" />
               <span>Export</span>
             </button>
             
             {showExportOptions && (
               <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                 <button
                   onClick={exportToExcel}
                   className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                 >
                   <FileSpreadsheet className="h-4 w-4" />
                   <span>Export to Excel</span>
                 </button>
                 <button
                   onClick={exportToPDF}
                   className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                 >
                   <FileText className="h-4 w-4" />
                   <span>Export to PDF</span>
                 </button>
               </div>
             )}
           </div>
         </div>
       </div>

        {/* Products Table */}
       <div 
         id="products-table"
         className="rounded-xl overflow-hidden border"
         style={{
           background: 'rgba(255, 255, 255, 0.03)',
           backdropFilter: 'blur(20px)',
           border: '1px solid rgba(255, 255, 255, 0.1)'
         }}
       >
         {Object.entries(getGroupedProducts()).map(([groupName, groupProducts]) => (
           <div key={groupName} className="mb-6">
             {groupBy !== 'none' && (
               <div className="px-6 py-3" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                 <h3 className="text-lg font-semibold text-white">{groupName} ({groupProducts.length})</h3>
               </div>
             )}
             <div className="overflow-x-auto">
               <table className="table">
                 {groupBy === 'none' && (
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
                 )}
                 <tbody>
                   {groupProducts.map((product) => (
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
                       {groupBy !== 'brand' && (
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{product.brand}</td>
                       )}
                       {groupBy !== 'category' && (
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{product.category}</span>
                         </td>
                       )}
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
                           {product.stock.current <= product.stock.reorderThreshold && (
                             <button
                               onClick={() => handleRestock(product)}
                               className="p-1 text-amber-400 hover:text-amber-300 transition-colors"
                               title="Restock this product"
                             >
                               <RefreshCw className="h-4 w-4" />
                             </button>
                           )}
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
         ))}
       </div>

       {/* Pagination */}
       {pagination && pagination.pages > 1 && (
         <div className="flex items-center justify-between">
           <div className="text-sm text-white/60">
             Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
           </div>
           <div className="flex items-center space-x-2">
             <select
               value={itemsPerPage}
               onChange={(e) => {
                 setItemsPerPage(Number(e.target.value));
                 setCurrentPage(1);
               }}
               className="bg-gray-800 border-gray-600 text-white rounded-lg border px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             >
               <option value={10}>10 per page</option>
               <option value={20}>20 per page</option>
               <option value={50}>50 per page</option>
               <option value={100}>100 per page</option>
             </select>
             
             <div className="flex items-center space-x-1">
               <button
                 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                 disabled={pagination.page <= 1}
                 className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <ChevronLeft className="h-4 w-4" />
               </button>
               
               <span className="px-4 py-2 text-sm text-white/80 bg-white/5 rounded-lg">
                 Page {pagination.page} of {pagination.pages}
               </span>
               
               <button
                 onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                 disabled={pagination.page >= pagination.pages}
                 className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <ChevronRight className="h-4 w-4" />
               </button>
             </div>
           </div>
         </div>
       )}

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

      {/* Restock Modal */}
      {showRestockModal && restockProduct && (
        <div className="modal-overlay">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-content animate-bounce-in max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Restock Product</h2>
                  <p className="text-sm text-gray-600 mt-1">Add stock to {restockProduct.name}</p>
                </div>
                <button
                  onClick={() => setShowRestockModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Current Stock:</span>
                    <span className="font-semibold">{restockProduct.stock.current}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reorder Threshold:</span>
                    <span className="font-semibold">{restockProduct.stock.reorderThreshold}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity to Add
                  </label>
                  <input
                    type="number"
                    id="restock-quantity"
                    className="input"
                    min="1"
                    placeholder="Enter quantity"
                    defaultValue={Math.max(restockProduct.stock.reorderThreshold * 2 - restockProduct.stock.current, 10)}
                  />
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => setShowRestockModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const quantity = document.getElementById('restock-quantity').value;
                      if (quantity && parseInt(quantity) > 0) {
                        confirmRestock(quantity);
                      } else {
                        toast.error('Please enter a valid quantity');
                      }
                    }}
                    className="btn btn-primary"
                  >
                    Restock
                  </button>
                </div>
              </div>
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

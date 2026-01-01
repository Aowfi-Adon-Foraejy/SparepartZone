import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';
import { calculateSupplierPayables } from '../utils/financialSummary';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Truck, 
  Plus, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  Building,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  X
} from 'lucide-react';

const Suppliers = () => {

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: suppliersData, isLoading, error, refetch } = useQuery(
    ['suppliers', currentPage],
    async () => {
      try {
        const { data } = await api.get('/suppliers', {
          params: { page: currentPage, limit: 15 }
        });
        return data;
      } catch (error) {
        console.error('Failed to fetch suppliers:', error);
        // Return empty data on error to prevent crashes
        return { suppliers: [], pagination: { total: 0, page: 1, pages: 0 } };
      }
    },
    {
      keepPreviousData: true,
      refetchInterval: 60000, // Reduced from 30s to 60s since we have invalidation
      retry: 2,
      retryDelay: 1000,
      staleTime: 30000
    }
  );

  const { data: purchaseInvoicesData } = useQuery(
    'supplier-purchase-invoices',
    async () => {
      try {
        const { data } = await api.get('/invoices/purchases', { params: { limit: 100 } });
        return data;
      } catch (error) {
        console.error('Failed to fetch purchase invoices:', error);
        return { invoices: [] };
      }
    },
    { staleTime: 30000 }
  );

  const { data: stats } = useQuery(
    'supplier-stats',
    async () => {
      const { data } = await api.get('/suppliers/overdue');
      return data;
    }
  );

  const deleteSupplierMutation = useMutation(
    (id) => api.delete(`/suppliers/${id}`),
    {
      onSuccess: () => {
        toast.success('Supplier deleted successfully');
        // Invalidate all relevant queries for global state refresh
        queryClient.invalidateQueries('suppliers');
        queryClient.invalidateQueries('dashboard-suppliers');
        queryClient.invalidateQueries('dashboard-purchase-invoices');
        queryClient.invalidateQueries('supplier-purchase-invoices');
        queryClient.invalidateQueries('transactions');
      },
      onError: () => {
        toast.error('Failed to delete supplier');
      }
    }
  );

  const handleDelete = (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplierMutation.mutate(supplierId);
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  const getPaymentStatusColor = (outstanding, lastPurchaseDate, paymentTerms) => {
    if (outstanding <= 0) return 'text-gray-600 bg-gray-50';
    
    let creditDays = 30;
    switch (paymentTerms) {
      case 'immediate': creditDays = 0; break;
      case 'net15': creditDays = 15; break;
      case 'net30': creditDays = 30; break;
      case 'net60': creditDays = 60; break;
      case 'net90': creditDays = 90; break;
    }
    
    if (!lastPurchaseDate) return 'text-green-600 bg-green-50';
    
    const dueDate = new Date(lastPurchaseDate);
    dueDate.setDate(dueDate.getDate() + creditDays);
    
    const today = new Date();
    const diffTime = today - dueDate;
    const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    if (overdueDays <= 0) return 'text-green-600 bg-green-50';
    if (overdueDays <= 15) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPaymentStatus = (outstanding, lastPurchaseDate, paymentTerms) => {
    if (outstanding <= 0) return 'paid';
    
    let creditDays = 30;
    switch (paymentTerms) {
      case 'immediate': creditDays = 0; break;
      case 'net15': creditDays = 15; break;
      case 'net30': creditDays = 30; break;
      case 'net60': creditDays = 60; break;
      case 'net90': creditDays = 90; break;
    }
    
    if (!lastPurchaseDate) return 'current';
    
    const dueDate = new Date(lastPurchaseDate);
    dueDate.setDate(dueDate.getDate() + creditDays);
    
    const today = new Date();
    const diffTime = today - dueDate;
    const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    if (overdueDays <= 0) return 'current';
    if (overdueDays <= 15) return 'due-soon';
    return 'overdue';
  };





  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Error loading suppliers</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
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
          <h1 className="text-3xl font-bold text-white">Suppliers</h1>
          <p className="text-white/80 mt-1">Manage your suppliers and purchases</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Total Suppliers</p>
              <p className="stat-card-value">
                {suppliersData?.pagination?.total || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-blue-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>12% from last month</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-primary">
              <Truck className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Overdue Payments</p>
              <p className="stat-card-value">
                {suppliersData?.stats?.overdueCount || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-red-400">
                <TrendingDown className="h-3 w-3 mr-1" />
                <span>Requires attention</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-danger">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Total Payables</p>
              <p className="stat-card-value">
                {formatCurrency((suppliersData?.suppliers || []).reduce((sum, supplier) => 
                  sum + calculateSupplierPayables(purchaseInvoicesData?.invoices || [], supplier.name), 0))}
              </p>
              <div className="mt-3 flex items-center text-xs text-amber-400">
                <DollarSign className="h-3 w-3 mr-1" />
                <span>All suppliers</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-warning">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Active Suppliers</p>
              <p className="stat-card-value">
                {suppliersData?.suppliers?.filter(s => s.isActive).length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Good relationships</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-success">
              <Truck className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>



       {/* Suppliers Table */}
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Total Purchased</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Outstanding</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
{suppliersData?.suppliers?.map((supplier, index) => (
                 <tr key={supplier._id} className="group hover:bg-white/5 transition-colors duration-150" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'rgba(59, 130, 246, 0.2)'}}>
                        <Truck className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{supplier.name}</p>
                        <p className="text-xs text-white/60">{supplier.businessInfo?.companyName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-white/40" />
                        <span className="text-white">{supplier.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4 text-white/40" />
                        <span className="text-white">{supplier.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-left">
                      <p className="font-semibold text-blue-400">
                        {formatCurrency(supplier.financials?.totalPurchased || 0)}
                      </p>
                      <p className="text-xs text-white/60">Total purchases</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-left">
                      <p className={`font-semibold ${
                        calculateSupplierPayables(purchaseInvoicesData?.invoices || [], supplier.name) > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {formatCurrency(calculateSupplierPayables(purchaseInvoicesData?.invoices || [], supplier.name))}
                      </p>
                      <p className="text-xs text-white/60">Outstanding</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                      getPaymentStatus(
                        calculateSupplierPayables(purchaseInvoicesData?.invoices || [], supplier.name),
                        supplier.lastPurchaseDate,
                        supplier.paymentTerms
                      ) === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      getPaymentStatus(
                        calculateSupplierPayables(purchaseInvoicesData?.invoices || [], supplier.name),
                        supplier.lastPurchaseDate,
                        supplier.paymentTerms
                      ) === 'current' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      getPaymentStatus(
                        calculateSupplierPayables(purchaseInvoicesData?.invoices || [], supplier.name),
                        supplier.lastPurchaseDate,
                        supplier.paymentTerms
                      ) === 'due-soon' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {getPaymentStatus(
                        calculateSupplierPayables(purchaseInvoicesData?.invoices || [], supplier.name),
                        supplier.lastPurchaseDate,
                        supplier.paymentTerms
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-blue-400 hover:bg-white/10 rounded-lg transition-colors duration-200"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier._id)}
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
        
        {suppliersData?.suppliers?.length === 0 && (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: 'rgba(59, 130, 246, 0.2)'}}>
              <Truck className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-white/60">No suppliers found</p>
          </div>
        )}
      </div>

       {/* Pagination */}
      {suppliersData?.pagination?.pages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-white/60">
            Showing {((suppliersData.pagination.page - 1) * 15) + 1} to{' '}
            {Math.min(suppliersData.pagination.page * 15, suppliersData.pagination.total)} of{' '}
            {suppliersData.pagination.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-white/20 rounded-md disabled:opacity-50 text-white bg-white/10 backdrop-blur-sm disabled:text-white/30"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, suppliersData.pagination.pages))}
              disabled={currentPage === suppliersData.pagination.pages}
              className="px-3 py-1 border border-white/20 rounded-md disabled:opacity-50 text-white bg-white/10 backdrop-blur-sm disabled:text-white/30"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <SupplierForm
          onSubmit={async (formData) => {
            try {
              await api.post('/suppliers', formData);
              toast.success('Supplier created successfully');
              setShowAddModal(false);
              // Invalidate all relevant queries for global state refresh
              queryClient.invalidateQueries('suppliers');
              queryClient.invalidateQueries('dashboard-suppliers');
              queryClient.invalidateQueries('dashboard-purchase-invoices');
              queryClient.invalidateQueries('supplier-purchase-invoices');
              queryClient.invalidateQueries('transactions');
            } catch (error) {
              toast.error(error.response?.data?.message || 'Failed to create supplier');
            }
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Supplier Modal */}
      {showEditModal && selectedSupplier && (
        <SupplierForm
          onSubmit={async (formData) => {
            try {
              await api.put(`/suppliers/${selectedSupplier._id}`, formData);
              toast.success('Supplier updated successfully');
              setShowEditModal(false);
              setSelectedSupplier(null);
              // Invalidate all relevant queries for global state refresh
              queryClient.invalidateQueries('suppliers');
              queryClient.invalidateQueries('dashboard-suppliers');
              queryClient.invalidateQueries('dashboard-purchase-invoices');
              queryClient.invalidateQueries('supplier-purchase-invoices');
              queryClient.invalidateQueries('transactions');
            } catch (error) {
              toast.error(error.response?.data?.message || 'Failed to update supplier');
            }
          }}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedSupplier(null);
          }}
          initialData={selectedSupplier}
        />
      )}
    </div>
  );
};

const SupplierForm = ({ onSubmit, onCancel, initialData = {} }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    address: {
      street: initialData.address?.street || '',
      city: initialData.address?.city || '',
      state: initialData.address?.state || '',
      postalCode: initialData.address?.postalCode || '',
      country: initialData.address?.country || 'Bangladesh'
    },
    businessInfo: {
      companyName: initialData.businessInfo?.companyName || '',
      registrationNumber: initialData.businessInfo?.registrationNumber || '',
      taxId: initialData.businessInfo?.taxId || '',
      website: initialData.businessInfo?.website || ''
    },
    contactPerson: {
      name: initialData.contactPerson?.name || '',
      designation: initialData.contactPerson?.designation || '',
      email: initialData.contactPerson?.email || '',
      phone: initialData.contactPerson?.phone || ''
    },
    categories: initialData.categories || ['General'],
    paymentTerms: initialData.paymentTerms || 'net30',
    creditLimit: initialData.creditLimit || 0,
    bankDetails: {
      bankName: initialData.bankDetails?.bankName || '',
      accountName: initialData.bankDetails?.accountName || '',
      accountNumber: initialData.bankDetails?.accountNumber || '',
      sortCode: initialData.bankDetails?.sortCode || ''
    },
    notes: initialData.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
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
    <div className="modal-overlay">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="modal-content animate-bounce-in max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {initialData._id ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {initialData._id ? 'Update supplier information' : 'Fill in supplier details below'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="net15">Net 15</option>
                    <option value="net30">Net 30</option>
                    <option value="net60">Net 60</option>
                    <option value="net90">Net 90</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
                  <input
                    type="text"
                    name="categories"
                    value={formData.categories.join(', ')}
                    onChange={(e) => {
                      const categories = e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat);
                      setFormData(prev => ({ ...prev, categories }));
                    }}
                    className="input"
                    placeholder="Enter categories separated by commas"
                  />
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="businessInfo.companyName"
                    value={formData.businessInfo.companyName}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    name="businessInfo.registrationNumber"
                    value={formData.businessInfo.registrationNumber}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                  <input
                    type="text"
                    name="businessInfo.taxId"
                    value={formData.businessInfo.taxId}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="businessInfo.website"
                    value={formData.businessInfo.website}
                    onChange={handleChange}
                    className="input"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                  <input
                    type="number"
                    name="creditLimit"
                    value={formData.creditLimit}
                    onChange={handleChange}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Person</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="contactPerson.name"
                    value={formData.contactPerson.name}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    name="contactPerson.designation"
                    value={formData.contactPerson.designation}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="contactPerson.email"
                    value={formData.contactPerson.email}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="contactPerson.phone"
                    value={formData.contactPerson.phone}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    name="address.postalCode"
                    value={formData.address.postalCode}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="input"
                placeholder="Additional notes about the supplier..."
              />
            </div>

            {/* Form Actions */}
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
                {initialData._id ? 'Update Supplier' : 'Add Supplier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
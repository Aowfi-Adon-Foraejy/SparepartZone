import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';
import LoadingSpinner from '../components/LoadingSpinner';
import { calculateCustomerDues } from '../utils/financialSummary';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  Building,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  X,
  Eye,
  Receipt
} from 'lucide-react';

const Customers = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: customersData, isLoading, error, refetch } = useQuery(
    ['customers', currentPage],
    async () => {
      try {
        const { data } = await api.get('/customers', {
          params: { page: currentPage, limit: 15 }
        });
        return data;
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        // Return empty data on error to prevent crashes
        return { customers: [], pagination: { total: 0, page: 1, pages: 0 } };
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

  const { data: allInvoicesData } = useQuery(
    'all-invoices-for-customers',
    async () => {
      try {
        const [salesResponse, purchaseResponse] = await Promise.all([
          api.get('/invoices/sales', { params: { limit: 100 } }),
          api.get('/invoices/purchases', { params: { limit: 100 } })
        ]);
        return {
          invoices: [...(salesResponse.data.invoices || []), ...(purchaseResponse.data.invoices || [])]
        };
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
        return { invoices: [] };
      }
    },
    { staleTime: 30000 }
  );

  const { data: customerInvoicesData } = useQuery(
    ['customer-invoices', selectedCustomer?._id],
    async () => {
      if (!selectedCustomer?._id) return { invoices: [] };
      try {
        const response = await api.get(`/invoices/customer/${selectedCustomer._id}`);
        return response.data;
      } catch (error) {
        console.error('Failed to fetch customer invoices:', error);
        return { invoices: [] };
      }
    },
    {
      enabled: !!selectedCustomer?._id && showDetailsModal,
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading customers</h3>
          <p className="text-gray-600">{error.message}</p>
          <button onClick={() => refetch()} className="mt-4 btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const { customers, pagination } = customersData || {};

  const handleAddCustomer = async (customerData) => {
    try {
      await api.post('/customers', customerData);
      setShowAddModal(false);
      toast.success('Customer created successfully!');
      // Invalidate all relevant queries for global state refresh
      queryClient.invalidateQueries('customers');
      queryClient.invalidateQueries('dashboard-customers');
      queryClient.invalidateQueries('dashboard-transactions');
      queryClient.invalidateQueries('dashboard-invoices');
      queryClient.invalidateQueries('all-invoices-for-customers');
      queryClient.invalidateQueries('transactions');
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error(error.response?.data?.message || 'Failed to create customer');
    }
  };

  const handleEditCustomer = async (customerData) => {
    try {
      await api.put(`/customers/${selectedCustomer._id}`, customerData);
      setShowEditModal(false);
      setSelectedCustomer(null);
      toast.success('Customer updated successfully!');
      // Invalidate all relevant queries for global state refresh
      queryClient.invalidateQueries('customers');
      queryClient.invalidateQueries('dashboard-customers');
      queryClient.invalidateQueries('dashboard-transactions');
      queryClient.invalidateQueries('dashboard-invoices');
      queryClient.invalidateQueries('all-invoices-for-customers');
      queryClient.invalidateQueries('transactions');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error(error.response?.data?.message || 'Failed to update customer');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await api.delete(`/customers/${customerId}`);
        toast.success('Customer deleted successfully!');
        // Invalidate all relevant queries for global state refresh
        queryClient.invalidateQueries('customers');
        queryClient.invalidateQueries('dashboard-customers');
        queryClient.invalidateQueries('dashboard-transactions');
        queryClient.invalidateQueries('dashboard-invoices');
        queryClient.invalidateQueries('all-invoices-for-customers');
        queryClient.invalidateQueries('transactions');
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customers and their billing information</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card stat-card-primary card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900">{pagination?.total || 0}</p>
              <div className="mt-3 flex items-center text-xs text-primary-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>8% from last month</span>
              </div>
            </div>
            <div className="p-4 bg-primary-50 rounded-2xl">
              <Users className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-danger card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Customer Dues</p>
              <p className="text-3xl font-bold text-danger-600">
                {formatCurrency((customers || []).reduce((sum, customer) => 
                  sum + calculateCustomerDues(allInvoicesData?.invoices || [], customer.name), 0))}
              </p>
              <div className="mt-3 flex items-center text-xs text-danger-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                <span>Requires attention</span>
              </div>
            </div>
            <div className="p-4 bg-danger-50 rounded-2xl">
              <AlertTriangle className="h-8 w-8 text-danger-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-success card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Active Customers</p>
              <p className="text-3xl font-bold text-success-600">
                {customers?.filter(c => c.isActive && !c.isBlacklisted).length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-success-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Good standing</span>
              </div>
            </div>
            <div className="p-4 bg-success-50 rounded-2xl">
              <Users className="h-8 w-8 text-success-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-warning card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Business Customers</p>
              <p className="text-3xl font-bold text-warning-600">
                {customers?.filter(c => c.type === 'business').length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-warning-600">
                <Building className="h-3 w-3 mr-1" />
                <span>Corporate accounts</span>
              </div>
            </div>
            <div className="p-4 bg-warning-50 rounded-2xl">
              <Building className="h-8 w-8 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {customersData?.pagination?.pages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {((customersData.pagination.page - 1) * customersData.pagination.limit) + 1} to{' '}
            {Math.min(customersData.pagination.page * customersData.pagination.limit, customersData.pagination.total)} of{' '}
            {customersData.pagination.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, customersData.pagination.pages))}
              disabled={currentPage === customersData.pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header sticky top-0 z-10 bg-gray-50 shadow-sm">
              <tr>
                <th className="table-header-cell">Customer</th>
                <th className="table-header-cell">Contact</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Outstanding Due</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {customers?.map((customer, index) => (
                <tr key={customer._id} className={`table-row group ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100 transition-colors duration-150`}>
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{customer.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{customer.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${
                      customer.type === 'business' ? 'badge-primary' : 
                      customer.type === 'individual' ? 'badge-success' : 'badge-gray'
                    }`}>
                      {customer.type}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="text-left">
                      <p className={`font-semibold ${
                        calculateCustomerDues(allInvoicesData?.invoices || [], customer.name) > 0 ? 'text-danger-600' : 'text-success-600'
                      }`}>
                        {formatCurrency(calculateCustomerDues(allInvoicesData?.invoices || [], customer.name))}
                      </p>
                      {customer.creditLimit > 0 && (
                        <p className="text-xs text-gray-500">Limit: {formatCurrency(customer.creditLimit)}</p>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${
                      customer.isBlacklisted ? 'badge-danger' : 
                      customer.isActive ? 'badge-success' : 'badge-gray'
                    }`}>
                      {customer.isBlacklisted ? 'Blacklisted' : 
                       customer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                   <td className="table-cell">
                     <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                       <button
                         onClick={() => {
                           setSelectedCustomer(customer);
                           setShowDetailsModal(true);
                         }}
                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                         title="View Details"
                       >
                         <Eye className="h-4 w-4" />
                       </button>
                       <button
                         onClick={() => {
                           setSelectedCustomer(customer);
                           setShowEditModal(true);
                         }}
                         className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                       >
                         <Edit className="h-4 w-4" />
                       </button>
                       <button
                         onClick={() => handleDeleteCustomer(customer._id)}
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-content animate-bounce-in max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New Customer</h2>
                  <p className="text-sm text-gray-600 mt-1">Fill in customer details below</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <CustomerForm
                onSubmit={handleAddCustomer}
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-content animate-bounce-in max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Edit Customer</h2>
                  <p className="text-sm text-gray-600 mt-1">Update customer information</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <CustomerForm
                onSubmit={handleEditCustomer}
                onCancel={() => setShowEditModal(false)}
                initialData={selectedCustomer}
              />
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-content animate-bounce-in max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Customer Details</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedCustomer.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCustomer(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedCustomer.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <span className={`badge ${
                      selectedCustomer.type === 'business' ? 'badge-primary' : 
                      selectedCustomer.type === 'individual' ? 'badge-success' : 'badge-gray'
                    }`}>
                      {selectedCustomer.type}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`badge ${
                      selectedCustomer.isBlacklisted ? 'badge-danger' : 
                      selectedCustomer.isActive ? 'badge-success' : 'badge-gray'
                    }`}>
                      {selectedCustomer.isBlacklisted ? 'Blacklisted' : 
                       selectedCustomer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Outstanding Due</p>
                    <p className={`font-semibold ${
                      calculateCustomerDues(allInvoicesData?.invoices || [], selectedCustomer.name) > 0 ? 'text-danger-600' : 'text-success-600'
                    }`}>
                      {formatCurrency(calculateCustomerDues(allInvoicesData?.invoices || [], selectedCustomer.name))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Log */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Log</h3>
                  <p className="text-sm text-gray-500 mt-1">All invoices and payments for this customer</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
{customerInvoicesData?.invoices?.map((invoice, index) => (
                         <tr key={invoice._id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                            <div className="text-sm text-gray-500">{invoice.type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{new Date(invoice.date).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total || 0)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.amountPaid || 0)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.amountDue || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs rounded-full ${
                              invoice.paymentStatus === 'fully_paid' ? 'bg-green-100 text-green-800' :
                              invoice.paymentStatus === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {invoice.paymentStatus === 'fully_paid' ? 'Paid' :
                               invoice.paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(!customerInvoicesData?.invoices || customerInvoicesData.invoices.length === 0) && (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No invoices found for this customer</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomerForm = ({ onSubmit, onCancel, initialData = {} }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    type: initialData.type || 'individual',
    paymentTerms: initialData.paymentTerms || 'cash',
    creditLimit: initialData.creditLimit || 0,
    creditDays: initialData.creditDays || 0,
    address: initialData.address || {},
    businessInfo: initialData.businessInfo || {},
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="input"
          >
            <option value="individual">Individual</option>
            <option value="business">Business</option>
            <option value="walk-in">Walk-in</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
          <select
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            className="input"
          >
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
            <option value="mixed">Mixed</option>
          </select>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Credit Days</label>
          <input
            type="number"
            name="creditDays"
            value={formData.creditDays}
            onChange={handleChange}
            className="input"
            min="0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input
            type="text"
            name="address.street"
            value={formData.address.street || ''}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            name="address.city"
            value={formData.address.city || ''}
            onChange={handleChange}
            className="input"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            name="address.state"
            value={formData.address.state || ''}
            onChange={handleChange}
            className="input"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
          <input
            type="text"
            name="address.postalCode"
            value={formData.address.postalCode || ''}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="input"
          rows="3"
        />
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
          {initialData._id ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
};

export default Customers;

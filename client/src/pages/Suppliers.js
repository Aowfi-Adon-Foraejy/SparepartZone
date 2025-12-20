import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Truck, 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  Building,
  AlertTriangle,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const Suppliers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: suppliersData, isLoading, error, refetch } = useQuery(
    ['suppliers', currentPage, searchTerm],
    async () => {
      const { data } = await api.get('/suppliers', {
        params: { page: currentPage, search: searchTerm }
      });
      return data;
    },
    {
      keepPreviousData: true
    }
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
        queryClient.invalidateQueries('suppliers');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">Manage your suppliers and purchases</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card stat-card-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {suppliersData?.pagination?.total || 0}
              </p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <Truck className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {suppliersData?.stats?.overdueCount || 0}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-yellow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payables</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                ৳{(suppliersData?.stats?.totalPayables || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Purchased
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliersData?.suppliers?.map((supplier) => (
                <tr key={supplier._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-sm text-gray-500">{supplier.businessInfo?.companyName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{supplier.phone}</div>
                    <div className="text-sm text-gray-500">{supplier.email}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ৳{supplier.financials?.totalPurchased?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ৳{supplier.financials?.outstandingPayable?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(
                      supplier.financials?.outstandingPayable || 0,
                      supplier.lastPurchaseDate,
                      supplier.paymentTerms
                    )}`}>
                      {getPaymentStatus(
                        supplier.financials?.outstandingPayable || 0,
                        supplier.lastPurchaseDate,
                        supplier.paymentTerms
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {suppliersData?.suppliers?.length === 0 && (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No suppliers found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {suppliersData?.pagination?.pages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {((suppliersData.pagination.page - 1) * suppliersData.pagination.limit) + 1} to{' '}
            {Math.min(suppliersData.pagination.page * suppliersData.pagination.limit, suppliersData.pagination.total)} of{' '}
            {suppliersData.pagination.total} results
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, suppliersData.pagination.pages))}
              disabled={currentPage === suppliersData.pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
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
              queryClient.invalidateQueries('suppliers');
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
              queryClient.invalidateQueries('suppliers');
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {initialData._id ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
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
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FileText, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Plus, Search, Edit, Download, X, Receipt, ShoppingCart } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import SalesInvoiceForm from '../components/SalesInvoiceForm';
import PurchaseInvoiceForm from '../components/purchaseInvoiceForm';
import QuickInvoiceForm from '../components/quickInvoiceForm';

const Invoices = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceType, setInvoiceType] = useState('sale');
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const queryClient = useQueryClient();
   
  // Fetch invoices based on active tab
  const { data: salesData, isLoading: salesLoading } = useQuery(
    ['sales-invoices', currentPage, searchTerm],
    async () => {
      const response = await api.get('/invoices/sales', {
        params: { page: currentPage, limit: 20, search: searchTerm }
      });
      return response.data;
    }
  );

  const { data: purchaseData, isLoading: purchaseLoading } = useQuery(
    ['purchase-invoices', currentPage, searchTerm],
    async () => {
      const response = await api.get('/invoices/purchases', {
        params: { page: currentPage, limit: 20, search: searchTerm }
      });
      return response.data;
    }
  );

  const { data: quickData, isLoading: quickLoading } = useQuery(
    ['quick-invoices', currentPage, searchTerm],
    async () => {
      const response = await api.get('/invoices/quick', {
        params: { page: currentPage, limit: 20, search: searchTerm }
      });
      return response.data;
    }
  );



  const { data: overdueData } = useQuery(
    'overdue-invoices',
    async () => {
      const response = await api.get('/invoices/overdue');
      return response.data;
    }
  );

  // Create invoice mutation
  const createInvoiceMutation = useMutation(
    async (invoiceData) => {
      let endpoint;
      if (invoiceData.type === 'quick') {
        endpoint = '/invoices/quick';
      } else if (invoiceData.type === 'sale') {
        endpoint = '/invoices/sales';
      } else if (invoiceData.type === 'purchase') {
        endpoint = '/invoices/purchases';
      }
      
      const response = await api.post(endpoint, invoiceData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        const invoiceTypeName = data.invoice.type === 'quick' ? 'Quick' : 
                                data.invoice.type === 'sale' ? 'Sales' : 'Purchase';
        toast.success(`${invoiceTypeName} invoice created successfully`);
        setShowCreateModal(false);
        setInvoiceType('sale');
        queryClient.invalidateQueries(['sales-invoices', 'purchase-invoices', 'quick-invoices', 'overdue-invoices']);
        // Force refetch of current active tab
        if (activeTab === 'sales') {
          queryClient.refetchQueries(['sales-invoices', currentPage, searchTerm]);
        } else if (activeTab === 'purchases') {
          queryClient.refetchQueries(['purchase-invoices', currentPage, searchTerm]);
        } else if (activeTab === 'quick') {
          queryClient.refetchQueries(['quick-invoices', currentPage, searchTerm]);
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create invoice');
      }
    }
  );

  // Download PDF mutation
  const downloadPDFMutation = useMutation(
    async (invoiceId) => {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseURL}/api/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    {
      onSuccess: () => {
        toast.success('PDF downloaded successfully');
      },
      onError: () => {
        toast.error('Failed to download PDF');
      }
    }
  );

  // Add payment mutation
  const addPaymentMutation = useMutation(
    async ({ invoiceId, paymentData }) => {
      const response = await api.post(`/invoices/${invoiceId}/payments`, paymentData);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Payment added successfully');
        setSelectedInvoice(null);
        setShowPaymentModal(false);
        queryClient.invalidateQueries(['sales-invoices', 'purchase-invoices', 'quick-invoices', 'overdue-invoices']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add payment');
      }
    }
  );

  // Add payment handler
  const handleAddPayment = (paymentData) => {
    if (selectedInvoice) {
      addPaymentMutation.mutate({
        invoiceId: selectedInvoice._id,
        paymentData
      });
    }
  };

  const handleDownloadPDF = (invoiceId) => {
    downloadPDFMutation.mutate(invoiceId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'fully_paid':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const currentData = activeTab === 'sales' ? salesData : 
                     activeTab === 'purchases' ? purchaseData : 
                     activeTab === 'quick' ? quickData : null;
  const isLoading = activeTab === 'sales' ? salesLoading : 
                     activeTab === 'purchases' ? purchaseLoading : 
                     activeTab === 'quick' ? quickLoading : false;

  const totalPages = currentData?.pagination?.pages || 0;
  const displayedPages = [];

  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    displayedPages.push(i);
  }

  const renderCreateModal = () => {
    if (!showCreateModal) return null;
    
    if (invoiceType === 'sale') {
      return (
        <SalesInvoiceForm
          onSubmit={createInvoiceMutation.mutateAsync}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createInvoiceMutation.isLoading}
        />
      );
    } else if (invoiceType === 'purchase') {
      return (
        <PurchaseInvoiceForm
          onSubmit={createInvoiceMutation.mutateAsync}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createInvoiceMutation.isLoading}
        />
      );
    } else if (invoiceType === 'quick') {
      return (
        <QuickInvoiceForm
          onSubmit={createInvoiceMutation.mutateAsync}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createInvoiceMutation.isLoading}
        />
      );
    }
    return null;
  };

  const renderQuickPaymentModal = () => {
    if (!showQuickPaymentModal || !selectedInvoice) return null;
    
    const amountDue = selectedInvoice.getAmountDue?.() || 
                    (selectedInvoice.total - (selectedInvoice.amountPaid || 0));
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Add Payment</h3>
          <div className="mb-4">
            <p className="text-gray-600">
              Invoice #{selectedInvoice.invoiceNumber}
            </p>
            <p className="text-sm text-gray-500">
              Total: ৳{selectedInvoice.total?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-500">
              Already Paid: ৳{(selectedInvoice.amountPaid || 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-gray-900">
              Amount Due: ৳{amountDue.toLocaleString()}
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowQuickPaymentModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => {
                handleAddPayment({
                  paymentAmount: amountDue,
                  paymentMethod: 'cash'
                });
              }}
            >
              Add Payment
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage sales and purchase invoices</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card stat-card-primary card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Invoices</p>
              <p className="text-3xl font-bold text-gray-900">
                {currentData?.pagination?.total || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-primary-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>8% from last month</span>
              </div>
            </div>
            <div className="p-4 bg-primary-50 rounded-2xl">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-success card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {currentData?.invoices?.filter(inv => inv.paymentStatus === 'fully_paid').length || 0}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-yellow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partially Paid</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {currentData?.invoices?.filter(inv => inv.paymentStatus === 'partially_paid').length || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {overdueData?.overdueInvoices?.length || 0}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>



      {/* Create Invoice Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => {
            setShowCreateModal(true);
            setInvoiceType('sale');
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Sales Invoice
        </button>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setInvoiceType('purchase');
          }}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Purchase Invoice
        </button>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setInvoiceType('quick');
          }}
          className="btn btn-accent flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Quick Invoice
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sales')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sales'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sales Invoices
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'purchases'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Purchase Invoices
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'quick'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Quick Invoices
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Invoices Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'sales' || activeTab === 'quick' ? 'Customer' : 'Supplier'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due
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
                {currentData?.invoices?.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">{invoice.type}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {activeTab === 'sales' || activeTab === 'quick' ? invoice.customer?.name : invoice.supplier?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{new Date(invoice.date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">৳{invoice.total?.toLocaleString() || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">৳{(invoice.getAmountPaid?.() || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">৳{(invoice.getAmountDue?.() || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // TODO: Implement edit functionality
                            toast('Edit functionality coming soon');
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowQuickPaymentModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Add Payment"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(invoice._id)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentData?.invoices?.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No {activeTab} invoices found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, currentData.pagination.total)} of {currentData.pagination.total} results
          </div>
          <div className="flex gap-2">
            {displayedPages.map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 border ${
                  page === currentPage
                    ? 'border-gray-300 bg-gray-100'
                    : 'border-gray-300 hover:bg-gray-50'
                } rounded-md disabled:opacity-50`}
                disabled={page === currentPage}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* Create Invoice Modal */}
      {renderCreateModal()}

      {/* Add Payment Modal */}
      {renderQuickPaymentModal()}
    </div>
  );
};

export default Invoices;
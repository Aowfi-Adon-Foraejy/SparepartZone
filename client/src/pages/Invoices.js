import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Fragment } from 'react';
import { FileText, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Plus, Edit, Download, X, Receipt, ShoppingCart, Printer } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currency';
import { calculatePaymentStatus } from '../utils/financialSummary';
import SalesInvoiceForm from '../components/SalesInvoiceForm';
import PurchaseInvoiceForm from '../components/purchaseInvoiceForm';
import QuickInvoiceForm from '../components/quickInvoiceForm';

const Invoices = () => {
  const [activeTab, setActiveTab] = useState('sales');

  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceType, setInvoiceType] = useState('sale');
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const queryClient = useQueryClient();
   
  // Fetch invoices based on active tab
  const { data: salesData, isLoading: salesLoading } = useQuery(
    ['sales-invoices', currentPage, dateRange],
    async () => {
      const params = { page: currentPage, limit: 15, ...dateRange };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      const response = await api.get('/invoices/sales', { params });
      return response.data;
    }
  );

  const { data: purchaseData, isLoading: purchaseLoading } = useQuery(
    ['purchase-invoices', currentPage, dateRange],
    async () => {
      const params = { page: currentPage, limit: 15, ...dateRange };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      const response = await api.get('/invoices/purchases', { params });
      return response.data;
    }
  );

  const { data: quickData, isLoading: quickLoading } = useQuery(
    ['quick-invoices', currentPage, dateRange],
    async () => {
      const params = { page: currentPage, limit: 15, ...dateRange };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      const response = await api.get('/invoices/quick', { params });
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
        toast.success(`${invoiceTypeName} invoice created successfully!`);
        setShowCreateModal(false);
        setInvoiceType('sale');
        // Invalidate all relevant queries for global state refresh
        queryClient.invalidateQueries(['sales-invoices', 'purchase-invoices', 'quick-invoices', 'overdue-invoices']);
        queryClient.invalidateQueries('customers');
        queryClient.invalidateQueries('suppliers');
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries('dashboard-transactions');
        queryClient.invalidateQueries('dashboard-invoices');
        queryClient.invalidateQueries('dashboard-purchase-invoices');
        queryClient.invalidateQueries('dashboard-products');
        queryClient.invalidateQueries('dashboard-customers');
        queryClient.invalidateQueries('dashboard-suppliers');
        queryClient.invalidateQueries('all-invoices-for-customers');
        queryClient.invalidateQueries('supplier-purchase-invoices');
        queryClient.invalidateQueries('transactions');
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
        toast.success('PDF downloaded successfully!');
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
        toast.success('Payment added successfully!');
        setSelectedInvoice(null);
        setShowQuickPaymentModal(false);
        // Invalidate all relevant queries for global state refresh
        queryClient.invalidateQueries(['sales-invoices', 'purchase-invoices', 'quick-invoices', 'overdue-invoices']);
        queryClient.invalidateQueries('customers');
        queryClient.invalidateQueries('dashboard-transactions');
        queryClient.invalidateQueries('dashboard-invoices');
        queryClient.invalidateQueries('dashboard-purchase-invoices');
        queryClient.invalidateQueries('dashboard-customers');
        queryClient.invalidateQueries('all-invoices-for-customers');
        queryClient.invalidateQueries('supplier-purchase-invoices');
        queryClient.invalidateQueries('transactions');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add payment');
      }
    }
  );

  // Update invoice mutation
  const updateInvoiceMutation = useMutation(
    async ({ invoiceId, updateData }) => {
      const response = await api.put(`/invoices/${invoiceId}`, updateData);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Invoice updated successfully!');
        setSelectedInvoice(null);
        setShowEditModal(false);
        // Invalidate all relevant queries for global state refresh
        queryClient.invalidateQueries(['sales-invoices', 'purchase-invoices', 'quick-invoices', 'overdue-invoices']);
        queryClient.invalidateQueries('customer-invoices');
        queryClient.invalidateQueries('dashboard-transactions');
        queryClient.invalidateQueries('dashboard-invoices');
        queryClient.invalidateQueries('dashboard-purchase-invoices');
        queryClient.invalidateQueries('dashboard-customers');
        queryClient.invalidateQueries('all-invoices-for-customers');
        queryClient.invalidateQueries('supplier-purchase-invoices');
        queryClient.invalidateQueries('transactions');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update invoice');
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

  const handlePrintInvoice = (invoice) => {
    // Create a simple printable version
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-info { margin-bottom: 30px; }
            .item { margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; }
            .total { font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice #${invoice.invoiceNumber}</h1>
            <p>Date: ${new Date(invoice.date).toLocaleDateString()}</p>
            <p>Type: ${invoice.type}</p>
          </div>
          <div class="invoice-info">
            <p>${activeTab === 'sales' || activeTab === 'quick' ? 'Customer' : 'Supplier'}: ${activeTab === 'sales' || activeTab === 'quick' ? invoice.customer?.name : invoice.supplier?.name}</p>
            <p>Total: ৳${(invoice.total || 0).toLocaleString()}</p>
            <p>Paid: ৳${(invoice.amountPaid || invoice.paid || 0).toLocaleString()}</p>
            <p class="total">Due: ৳${(invoice.amountDue || Math.max(0, (invoice.total || 0) - (invoice.amountPaid || invoice.paid || 0))).toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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

  const getPaymentStatusForInvoice = (invoice) => {
    const calculatedStatus = calculatePaymentStatus(invoice);
    return calculatedStatus;
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

  // Calculate unpaid invoices from current data
  const unpaidInvoices = currentData?.invoices?.filter(invoice => 
    getPaymentStatusForInvoice(invoice) === 'unpaid'
  ) || [];

  const partiallyPaidInvoices = currentData?.invoices?.filter(invoice => 
    getPaymentStatusForInvoice(invoice) === 'partially_paid'
  ) || [];

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
      <Fragment>
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
                 Pay Full Amount Due
               </button>
          </div>
        </div>
      </div>
    </Fragment>
   );
 };

     return (
       <div className="space-y-8 animate-fade-in">
         {/* Header */}

         {/* Add Payment Modal */}
       <div 
         className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
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
          <h1 className="text-3xl font-bold text-white">Invoices</h1>
          <p className="text-white/80 mt-1">Manage sales and purchase invoices</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setInvoiceType('sale');
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
          >
            <ShoppingCart className="h-4 w-4" />
            Sales Invoice
          </button>
          <button
            onClick={() => {
              setInvoiceType('purchase');
              setShowCreateModal(true);
            }}
            className="btn btn-secondary"
          >
            <Receipt className="h-4 w-4" />
            Purchase Invoice
          </button>
          <button
            onClick={() => {
              setInvoiceType('quick');
              setShowCreateModal(true);
            }}
            className="btn btn-warning"
          >
            <DollarSign className="h-4 w-4" />
            Quick Invoice
          </button>
        </div>
      </div>

      {/* Unpaid Invoices Flash Card */}
      {unpaidInvoices.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-800">Payment Reminder</h3>
                <p className="text-red-600">
                  You have <span className="font-bold">{unpaidInvoices.length}</span> unpaid invoice{unpaidInvoices.length > 1 ? 's' : ''} 
                  {partiallyPaidInvoices.length > 0 && ` and ${partiallyPaidInvoices.length} partially paid`} that require attention
                </p>
                <div className="mt-2 text-sm text-red-500">
                  Total unpaid amount: ৳{unpaidInvoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0).toLocaleString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const firstUnpaid = unpaidInvoices[0];
                setSelectedInvoice(firstUnpaid);
                setShowQuickPaymentModal(true);
              }}
              className="btn btn-danger flex-shrink-0"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Collect Payment
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Total Invoices</p>
              <p className="stat-card-value">
                {currentData?.pagination?.total || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-blue-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>8% from last month</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-primary">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Paid</p>
              <p className="stat-card-value">
                {currentData?.invoices?.filter(inv => getPaymentStatusForInvoice(inv) === 'fully_paid').length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Fully paid</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-success">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Partially Paid</p>
              <p className="stat-card-value">
                {currentData?.invoices?.filter(inv => getPaymentStatusForInvoice(inv) === 'partially_paid').length || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Partial payments</span>
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
              <p className="stat-card-label mb-2">Unpaid</p>
              <p className="stat-card-value">
                {unpaidInvoices.length}
              </p>
              <div className="mt-3 flex items-center text-xs text-red-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Requires attention</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-danger">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>





      {/* Unpaid Summary Row */}
      {unpaidInvoices.length > 0 && (
        <div className="bg-gradient-to-r from-red-100 to-orange-100 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-sm font-medium text-red-700">Total Unpaid Amount</p>
              <p className="text-2xl font-bold text-red-800">
                ৳{unpaidInvoices.reduce((sum, inv) => sum + (inv.amountDue || Math.max(0, (inv.total || 0) - (inv.amountPaid || inv.paid || 0))), 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-orange-700">Partially Paid Amount</p>
              <p className="text-2xl font-bold text-orange-800">
                ৳{partiallyPaidInvoices.reduce((sum, inv) => sum + (inv.amountDue || Math.max(0, (inv.total || 0) - (inv.amountPaid || inv.paid || 0))), 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <button
                onClick={() => setActiveTab('sales')}
                className="btn btn-primary"
              >
                <Receipt className="h-4 w-4 mr-2" />
                View All Invoices
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Date Range Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center space-x-3">
          <input
            type="date"
            className="select"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            placeholder="Start Date"
          />
          <input
            type="date"
            className="select"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            placeholder="End Date"
          />
        </div>
      </div>

       {/* Invoices Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {activeTab === 'sales' || activeTab === 'quick' ? 'Customer' : 'Supplier'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Due</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData?.invoices?.map((invoice, index) => (
                  <tr key={invoice._id} className="group hover:bg-white/5 transition-colors duration-150" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-white">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-white/60">{invoice.type}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {activeTab === 'sales' || activeTab === 'quick' ? invoice.customer?.name : invoice.supplier?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-white">
                      {formatCurrency(invoice.total || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-white">
                      {formatCurrency(invoice.amountPaid || invoice.paid || 0)}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-white">
                       {formatCurrency(invoice.amountDue || Math.max(0, (invoice.total || 0) - (invoice.amountPaid || invoice.paid || 0)))}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                         getPaymentStatusForInvoice(invoice) === 'fully_paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                         getPaymentStatusForInvoice(invoice) === 'partially_paid' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                         'bg-red-500/20 text-red-400 border-red-500/30'
                       }`}>
                         {getPaymentStatusForInvoice(invoice) === 'fully_paid' ? 'Paid' :
                          getPaymentStatusForInvoice(invoice) === 'partially_paid' ? 'Partially Paid' : 'Unpaid'}
                       </span>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowEditModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {invoice.paymentStatus !== 'fully_paid' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowQuickPaymentModal(true);
                            }}
                            className="text-emerald-400 hover:text-emerald-300"
                            title="Add Payment"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                        <button
                            onClick={() => handleDownloadPDF(invoice._id)}
                            className="text-white/60 hover:text-white/80"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrintInvoice(invoice)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Print Invoice"
                          >
                            <Printer className="h-4 w-4" />
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
              <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60">No {activeTab} invoices found</p>
              <p className="text-sm text-white/40 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

       {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-6 py-3" style={{ background: 'rgba(255, 255, 255, 0.05)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div className="text-sm text-white/60">
            Showing {((currentPage - 1) * 15) + 1} to {Math.min(currentPage * 15, currentData.pagination.total)} of {currentData.pagination.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-3 py-1 border border-white/20 rounded-md disabled:opacity-50 text-white bg-white/10 backdrop-blur-sm disabled:text-white/30"
              disabled={currentPage === 1}
              style={{ backdropFilter: 'blur(10px)' }}
            >
              Previous
            </button>
            {displayedPages.map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 border ${
                  page === currentPage
                    ? 'border-white/20 bg-white/20 text-white'
                    : 'border-white/20 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                } rounded-md disabled:opacity-50`}
                disabled={page === currentPage}
                style={{ backdropFilter: 'blur(10px)' }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-3 py-1 border border-white/20 rounded-md disabled:opacity-50 text-white bg-white/10 backdrop-blur-sm disabled:text-white/30"
              disabled={currentPage === totalPages}
              style={{ backdropFilter: 'blur(10px)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* Create Invoice Modal */}
      {renderCreateModal()}

      {/* Edit Invoice Modal */}
      {showEditModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Invoice - {selectedInvoice.invoiceNumber}
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> Editing invoice details will update the invoice record. 
                  If you need to adjust inventory, please create a separate transaction.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value={selectedInvoice.invoiceNumber}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="input"
                    defaultValue={new Date(selectedInvoice.date).toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="input"
                  rows="3"
                  defaultValue={selectedInvoice.notes || ''}
                />
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>{formatCurrency(selectedInvoice.discount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedInvoice.tax || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedInvoice.total || 0)}</span>
</div>

      {/* Unpaid Summary Row */}
      {unpaidInvoices.length > 0 && (
        <div className="bg-gradient-to-r from-red-100 to-orange-100 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-sm font-medium text-red-700">Total Unpaid Amount</p>
              <p className="text-2xl font-bold text-red-800">
                ৳{unpaidInvoices.reduce((sum, inv) => sum + (inv.amountDue || Math.max(0, (inv.total || 0) - (inv.amountPaid || inv.paid || 0))), 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-orange-700">Partially Paid Amount</p>
              <p className="text-2xl font-bold text-orange-800">
                ৳{partiallyPaidInvoices.reduce((sum, inv) => sum + (inv.amountDue || Math.max(0, (inv.total || 0) - (inv.amountPaid || inv.paid || 0))), 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <button
                onClick={() => setActiveTab('sales')}
                className="btn btn-primary"
              >
                <Receipt className="h-4 w-4 mr-2" />
                View All Invoices
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={updateInvoiceMutation.isLoading}
                >
                  {updateInvoiceMutation.isLoading ? 'Updating...' : 'Update Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {renderQuickPaymentModal()}
    </div>
  );
};

export default Invoices;
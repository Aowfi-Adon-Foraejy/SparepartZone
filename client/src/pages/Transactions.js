import React, { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currency';
import { getFinancialSummary } from '../utils/financialSummary';
import { 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  DollarSign
} from 'lucide-react';

const Transactions = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  const { data: transactionsData, isLoading } = useQuery(
    ['transactions', currentPage, filters],
    async () => {
      const params = { 
        page: currentPage, 
        limit: 15, 
        ...filters
      };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const response = await api.get('/transactions', { params });
      return response.data;
    },
    {
      keepPreviousData: true
    }
  );

  const getTypeColor = (type) => {
    switch (type) {
      case 'sale':
      case 'payment_received':
        return 'text-green-600 bg-green-100';
      case 'purchase':
      case 'payment_made':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getGlowPillClass = (type) => {
    switch (type) {
      case 'sale':
      case 'payment_received':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'purchase':
      case 'payment_made':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <DollarSign className="h-4 w-4 text-white/80" />;
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const financialSummary = getFinancialSummary(transactionsData?.transactions || []);

  return (
    <div className="space-y-8 animate-fade-in">
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
          <h1 className="text-3xl font-bold text-white">Transactions</h1>
          <p className="text-white/80 mt-1">View and manage financial transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Total Sales</p>
              <p className="stat-card-value">
                {formatCurrency(financialSummary.totalSales)}
              </p>
              <div className="mt-3 flex items-center text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>{financialSummary.salesCount} sales transactions</span>
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
              <p className="stat-card-label mb-2">Total Purchases</p>
              <p className="stat-card-value">
                {formatCurrency(financialSummary.totalPurchases)}
              </p>
              <div className="mt-3 flex items-center text-xs text-red-400">
                <TrendingDown className="h-3 w-3 mr-1" />
                <span>{financialSummary.purchaseCount} purchase transactions</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-danger">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Net Balance</p>
              <p className="stat-card-value">
                {formatCurrency(financialSummary.netBalance)}
              </p>
              <div className="mt-3 flex items-center text-xs text-blue-400">
                <span>Sales - Purchases</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-primary">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-card-label mb-2">Transactions</p>
              <p className="stat-card-value">
                {transactionsData?.pagination?.total || 0}
              </p>
              <div className="mt-3 flex items-center text-xs text-amber-400">
                <Receipt className="h-3 w-3 mr-1" />
                <span>All time</span>
              </div>
            </div>
            <div className="stat-card-icon-bg stat-card-icon-bg-warning">
              <Receipt className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center space-x-3">
          <input
            type="date"
            className="bg-white/10 border-white/20 text-white placeholder-white/50 backdrop-blur-md rounded-xl px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            placeholder="Start Date"
            style={{ backdropFilter: 'blur(10px)' }}
          />
          <input
            type="date"
            className="bg-white/10 border-white/20 text-white placeholder-white/50 backdrop-blur-md rounded-xl px-4 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            placeholder="End Date"
            style={{ backdropFilter: 'blur(10px)' }}
          />
        </div>
      </div>

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
                <th className="table-header-cell text-white">Date</th>
                <th className="table-header-cell text-white">Type</th>
                <th className="table-header-cell text-white">Description</th>
                <th className="table-header-cell text-white">Category</th>
                <th className="table-header-cell text-white">Amount</th>
                <th className="table-header-cell text-white">Account</th>
                <th className="table-header-cell text-white">Customer/Supplier</th>
              </tr>
            </thead>
            <tbody>
{transactionsData?.transactions?.map((transaction, index) => (
                 <tr key={transaction._id} className="hover:bg-white/5 transition-colors duration-150" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getGlowPillClass(transaction.type)}`}>
                      {transaction.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(transaction.category)}
                      <span className="text-sm text-white/80">
                        {transaction.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.category === 'income' ? 'text-emerald-400' : 'text-red-400'}>
                      {transaction.category === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {transaction.account?.replace('_', ' ') || transaction.account}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {transaction.customer?.name || transaction.supplier?.name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactionsData?.transactions?.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-white/40 mx-auto mb-3" />
            <p className="text-white/60">No transactions found</p>
            <p className="text-sm text-white/40 mt-1">Try adjusting your date filters</p>
          </div>
        )}
      </div>

      {transactionsData?.pagination && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-white/60">
            Showing {((currentPage - 1) * 15) + 1} to {Math.min(currentPage * 15, transactionsData.pagination.total)} of{' '}
            {transactionsData.pagination.total} results
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-white/20 rounded-md disabled:opacity-50 text-white bg-white/10 backdrop-blur-sm disabled:text-white/30"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ backdropFilter: 'blur(10px)' }}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 border border-white/20 rounded-md disabled:opacity-50 text-white bg-white/10 backdrop-blur-sm disabled:text-white/30"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === transactionsData.pagination.pages}
              style={{ backdropFilter: 'blur(10px)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
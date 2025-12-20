import React, { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Receipt, 
  Search, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  ArrowUpDown
} from 'lucide-react';

const Transactions = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    account: ''
  });

  const { data: transactionsData, isLoading } = useQuery(
    ['transactions', currentPage, searchTerm, filters],
    async () => {
      const params = { 
        page: currentPage, 
        limit: 20, 
        search: searchTerm,
        ...filters
      };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const response = await api.get('/transactions', { params });
      return response.data;
    }
  );

  const { data: summaryData } = useQuery(
    'transaction-summary',
    async () => {
      const response = await api.get('/transactions/summary');
      return response.data;
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">View and manage financial transactions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="btn btn-primary">
            <Calendar className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="stat-card stat-card-success card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Total Income</p>
                <p className="text-3xl font-bold text-success-600">
                  ৳{summaryData.summary?.totalIncome?.toLocaleString() || 0}
                </p>
                <div className="mt-3 flex items-center text-xs text-success-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>12% from last month</span>
                </div>
              </div>
              <div className="p-4 bg-success-50 rounded-2xl">
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
            </div>
          </div>
          
          <div className="stat-card stat-card-danger card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Total Expenses</p>
                <p className="text-3xl font-bold text-danger-600">
                  ৳{summaryData.summary?.totalExpense?.toLocaleString() || 0}
                </p>
                <div className="mt-3 flex items-center text-xs text-danger-600">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  <span>8% from last month</span>
                </div>
              </div>
              <div className="p-4 bg-danger-50 rounded-2xl">
                <TrendingDown className="h-8 w-8 text-danger-600" />
              </div>
            </div>
          </div>
          
          <div className="stat-card stat-card-primary card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Net Balance</p>
                <p className="text-3xl font-bold text-primary-600">
                  ৳{((summaryData.summary?.totalIncome || 0) - (summaryData.summary?.totalExpense || 0)).toLocaleString()}
                </p>
                <div className="mt-3 flex items-center text-xs text-primary-600">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <span>Cash flow</span>
                </div>
              </div>
              <div className="p-4 bg-primary-50 rounded-2xl">
                <DollarSign className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-warning card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Transactions</p>
                <p className="text-3xl font-bold text-warning-600">
                  {transactionsData?.pagination?.total || 0}
                </p>
                <div className="mt-3 flex items-center text-xs text-warning-600">
                  <Receipt className="h-3 w-3 mr-1" />
                  <span>All time</span>
                </div>
              </div>
              <div className="p-4 bg-warning-50 rounded-2xl">
                <Receipt className="h-8 w-8 text-warning-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="input pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          
          <div className="flex items-center space-x-3">
            <select
              className="select"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="sale">Sales</option>
              <option value="purchase">Purchases</option>
              <option value="quick">Quick Sales</option>
              <option value="payment_received">Payments Received</option>
              <option value="payment_made">Payments Made</option>
            </select>
            
            <select
              className="select"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Description</th>
                <th className="table-header-cell">Category</th>
                <th className="table-header-cell">Amount</th>
                <th className="table-header-cell">Account</th>
                <th className="table-header-cell">Customer/Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactionsData?.transactions?.map((transaction) => (
                <tr key={transaction._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(transaction.type)}`}>
                      {transaction.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(transaction.category)}
                      <span className="text-sm text-gray-900">
                        {transaction.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.category === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.category === 'income' ? '+' : '-'}৳{transaction.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.account.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.customer?.name || transaction.supplier?.name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactionsData?.transactions?.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No transactions found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {transactionsData?.pagination && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, transactionsData.pagination.total)} of{' '}
            {transactionsData.pagination.total} results
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === transactionsData.pagination.pages}
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
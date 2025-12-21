import React, { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currency';
import { 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar
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

  const incomeTotal = transactionsData?.transactions?.filter(t => 
    (t.type === 'sale' || t.type === 'payment_received' || t.category === 'income')
  ).reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  const expenseTotal = transactionsData?.transactions?.filter(t => 
    (t.type === 'purchase' || t.type === 'payment_made' || t.category === 'expense')
  ).reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">View and manage financial transactions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-primary">
            <Calendar className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div className="stat-card stat-card-success card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Income</p>
              <p className="text-3xl font-bold text-success-600">
                {formatCurrency(incomeTotal)}
              </p>
              <div className="mt-3 flex items-center text-xs text-success-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Income transactions</span>
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
                {formatCurrency(expenseTotal)}
              </p>
              <div className="mt-3 flex items-center text-xs text-danger-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                <span>Expense transactions</span>
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
                {formatCurrency(incomeTotal - expenseTotal)}
              </p>
              <div className="mt-3 flex items-center text-xs text-primary-600">
                <span>Income - Expenses</span>
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

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center space-x-3">
          <input
            type="date"
            className="select"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            placeholder="Start Date"
          />
          <input
            type="date"
            className="select"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            placeholder="End Date"
          />
        </div>
      </div>

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
                      {transaction.category === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.account?.replace('_', ' ') || transaction.account}
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
            <p className="text-sm text-gray-500 mt-1">Try adjusting your date filters</p>
          </div>
        )}
      </div>

      {transactionsData?.pagination && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * 15) + 1} to {Math.min(currentPage * 15, transactionsData.pagination.total)} of{' '}
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
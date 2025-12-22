import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonCard } from '../components/SkeletonLoader';
import { getFinancialSummary, calculateCustomerDues, calculateSupplierPayables, getAccountBalances, getLowStockProducts } from '../utils/financialSummary';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Truck,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, change, changeType, color = 'primary' }) => {
  const colorClasses = {
    primary: 'stat-card-primary',
    green: 'stat-card-success',
    yellow: 'stat-card-warning',
    red: 'stat-card-danger',
    blue: 'stat-card-primary',
  };

  const borderTopColors = {
    primary: 'border-t-primary-500',
    green: 'border-t-green-500',
    yellow: 'border-t-yellow-500',
    red: 'border-t-red-500',
    blue: 'border-t-blue-500',
  };

  const iconColors = {
    primary: 'text-primary-600',
    green: 'text-success-600',
    yellow: 'text-warning-600',
    red: 'text-danger-600',
    blue: 'text-blue-600',
  };

  return (
    <div 
      className={`stat-card ${colorClasses[color]} group cursor-pointer card-hover border-t-4 ${borderTopColors[color]}`}
      onClick={() => {
        // Navigate to relevant pages based on card type
        switch (title) {
          case 'Total Products':
            window.location.href = '/products';
            break;
          case 'Total Customers':
            window.location.href = '/customers';
            break;
          case 'Total Suppliers':
            window.location.href = '/suppliers';
            break;
          case 'Total Sales':
          case 'Total Purchases':
            window.location.href = '/transactions';
            break;
          case 'Customer Dues':
            window.location.href = '/customers';
            break;
          case 'Supplier Payables':
            window.location.href = '/suppliers';
            break;
          default:
            // For other cards, you can add navigation as needed
            break;
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-3">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
              changeType === 'increase' 
                ? 'bg-success-50 text-success-700' 
                : 'bg-danger-50 text-danger-700'
            }`}>
              {changeType === 'increase' ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className={`p-4 bg-gray-50 rounded-2xl group-hover:bg-gray-100 transition-all duration-200 ${iconColors[color]}`}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  // Fetch all data needed for unified financial calculations
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery(
    'dashboard-transactions',
    async () => {
      const { data } = await api.get('/transactions', { params: { limit: 100 } });
      return data;
    },
    { staleTime: 30000 }
  );

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery(
    'dashboard-invoices',
    async () => {
      const { data } = await api.get('/invoices/sales', { params: { limit: 100 } });
      return data;
    },
    { staleTime: 30000 }
  );

  const { data: purchaseInvoicesData, isLoading: purchaseInvoicesLoading } = useQuery(
    'dashboard-purchase-invoices',
    async () => {
      const { data } = await api.get('/invoices/purchases', { params: { limit: 100 } });
      return data;
    },
    { staleTime: 30000 }
  );

  const { data: productsData, isLoading: productsLoading } = useQuery(
    'dashboard-products',
    async () => {
      const { data } = await api.get('/products', { params: { limit: 100 } });
      return data;
    },
    { staleTime: 30000 }
  );

  const { data: customersData, isLoading: customersLoading } = useQuery(
    'dashboard-customers',
    async () => {
      const { data } = await api.get('/customers', { params: { limit: 100 } });
      return data;
    },
    { staleTime: 30000 }
  );

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery(
    'dashboard-suppliers',
    async () => {
      const { data } = await api.get('/suppliers', { params: { limit: 100 } });
      return data;
    },
    { staleTime: 30000 }
  );

  const isLoading = transactionsLoading || invoicesLoading || purchaseInvoicesLoading || 
                   productsLoading || customersLoading || suppliersLoading;

  // Show skeleton cards while loading
  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-10 bg-gray-300 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-48"></div>
          </div>
          <div className="h-8 bg-gray-300 rounded w-32"></div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>

        {/* Recent activity skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-gray-300 rounded w-32"></div>
                <div className="h-6 bg-gray-300 rounded w-16"></div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-300 rounded-lg"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-24"></div>
                        <div className="h-3 bg-gray-300 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-300 rounded w-16 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate unified financial summary
  const financialSummary = getFinancialSummary(transactionsData?.transactions || []);
  const accountBalances = getAccountBalances(transactionsData?.transactions || []);
  
  // Calculate customer dues dynamically
  const totalCustomerDues = (customersData?.customers || []).reduce((sum, customer) => {
    const customerInvoices = [...(invoicesData?.invoices || []), ...(purchaseInvoicesData?.invoices || [])];
    return sum + calculateCustomerDues(customerInvoices, customer.name);
  }, 0);

  // Calculate supplier payables dynamically
  const totalSupplierPayables = (suppliersData?.suppliers || []).reduce((sum, supplier) => {
    const purchaseInvoices = purchaseInvoicesData?.invoices || [];
    return sum + calculateSupplierPayables(purchaseInvoices, supplier.name);
  }, 0);

  // Product statistics
  const totalProducts = productsData?.products?.length || 0;
  const lowStockItems = getLowStockProducts(productsData?.products || []);

  const error = null;

if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening in your business today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="text-xs font-medium text-gray-700">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={`৳${financialSummary.totalSales.toLocaleString()}`}
          icon={DollarSign}
          color="green"
          change={15.3}
          changeType="increase"
        />
        <StatCard
          title="Total Purchases"
          value={`৳${financialSummary.totalPurchases.toLocaleString()}`}
          icon={Truck}
          change={8.1}
          changeType="increase"
        />
        <StatCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockItems}
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard
          title="Total Customers"
          value={customersData?.customers?.length || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Suppliers"
          value={suppliersData?.suppliers?.length || 0}
          icon={Truck}
          color="primary"
        />
        <StatCard
          title="Customer Dues"
          value={`৳${totalCustomerDues.toLocaleString()}`}
          icon={DollarSign}
          color="red"
        />
        <StatCard
          title="Supplier Payables"
          value={`৳${totalSupplierPayables.toLocaleString()}`}
          icon={DollarSign}
          color="yellow"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Sales</h3>
            <span className="badge badge-success relative">
              Live
              <div className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 bg-green-400 rounded-full animate-ping"></div>
              <div className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 bg-green-400 rounded-full"></div>
            </span>
          </div>
          <div className="space-y-3">
            {invoicesData?.invoices?.slice(0, 5).length > 0 ? (
              invoicesData.invoices.slice(0, 5).map((sale, index) => (
                <div 
                  key={sale._id} 
                  className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-success-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-success-600" />
                    </div>
                    <div>
<p className="text-sm font-semibold text-gray-900">{sale.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">{sale.customer?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-success-600">৳{sale.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{new Date(sale.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingDown className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500">No recent sales</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Purchases</h3>
            <span className="badge badge-primary relative">
              Live
              <div className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 bg-blue-400 rounded-full animate-ping"></div>
              <div className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 bg-blue-400 rounded-full"></div>
            </span>
          </div>
          <div className="space-y-3">
            {purchaseInvoicesData?.invoices?.slice(0, 5).length > 0 ? (
              purchaseInvoicesData.invoices.slice(0, 5).map((purchase, index) => (
                <div 
                  key={purchase._id} 
                  className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{purchase.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{purchase.supplier?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary-600">৳{purchase.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{new Date(purchase.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500">No recent purchases</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Financial Summary (Last 30 Days)</h3>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live Data</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-success-50 to-success-100/50 rounded-2xl border border-success-200/50">
            <div className="h-12 w-12 bg-success-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
            <p className="text-sm font-medium text-success-700 mb-2">Total Sales</p>
            <p className="text-3xl font-bold text-success-600 mb-2">
              ৳{financialSummary.totalSales.toLocaleString()}
            </p>
            <p className="text-xs text-success-600">
              {financialSummary.salesCount} transactions
            </p>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-2xl border border-primary-200/50">
            <div className="h-12 w-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Package className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-sm font-medium text-primary-700 mb-2">Total Purchases</p>
            <p className="text-3xl font-bold text-primary-600 mb-2">
              ৳{financialSummary.totalPurchases.toLocaleString()}
            </p>
            <p className="text-xs text-primary-600">
              {financialSummary.purchaseCount} transactions
            </p>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-secondary-50 to-secondary-100/50 rounded-2xl border border-secondary-200/50">
            <div className="h-12 w-12 bg-secondary-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-secondary-600" />
            </div>
            <p className="text-sm font-medium text-secondary-700 mb-2">Net Profit</p>
            <p className="text-3xl font-bold text-secondary-600 mb-2">
              ৳{(financialSummary.totalSales - financialSummary.totalPurchases).toLocaleString()}
            </p>
            <p className="text-xs text-secondary-600">
              Sales - Purchases
            </p>
          </div>
        </div>
      </div>

      {/* Account Balances */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Account Balances</h3>
          <button className="btn btn-ghost btn-sm">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {accountBalances.slice(0, 4).map((account, index) => (
            <div 
              key={account.account} 
              className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200/50 hover:shadow-medium transition-all duration-200 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-sm font-medium text-gray-600 capitalize mb-2">
                {account.account.replace('_', ' ')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ৳{account.balance.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

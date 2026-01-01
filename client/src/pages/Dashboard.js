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
  const iconBgColors = {
    primary: 'stat-card-icon-bg-primary',
    green: 'stat-card-icon-bg-success',
    yellow: 'stat-card-icon-bg-warning',
    red: 'stat-card-icon-bg-danger',
    blue: 'stat-card-icon-bg-primary',
  };

  const iconColors = {
    primary: 'text-white',
    green: 'text-white',
    yellow: 'text-white',
    red: 'text-white',
    blue: 'text-white',
  };

  return (
    <div 
      className="stat-card group cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2"
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
          <p className="stat-card-label mb-2">{title}</p>
          <p className="stat-card-value mb-3">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
              changeType === 'increase' 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-red-500/20 text-red-300 border-red-500/30'
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
        <div className={`stat-card-icon-bg ${iconBgColors[color]} group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
          <Icon className={`h-6 w-6 ${iconColors[color]}`} />
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
      <div 
        className="flex items-center justify-between mb-8"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.5rem 2rem',
          borderRadius: '16px'
        }}
      >
        <div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p className="text-white text-lg opacity-80">Welcome back! Here's what's happening in your business today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-white opacity-60">Last updated</p>
            <p className="text-sm font-medium text-white opacity-90">{new Date().toLocaleTimeString()}</p>
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
            <h3 className="text-lg font-bold text-white">Recent Sales</h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 relative">
              Live
              <div className="absolute top-0 right-0 -mt-1 -mr-1 h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></div>
            </span>
          </div>
          <div className="space-y-3">
            {invoicesData?.invoices?.slice(0, 5).length > 0 ? (
              invoicesData.invoices.slice(0, 5).map((sale, index) => (
                 <div 
                   key={sale._id} 
                   className="flex items-center justify-between p-4 hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-slide-up"
                   style={{ 
                     animationDelay: `${index * 100}ms`,
                     background: 'rgba(255, 255, 255, 0.08)',
                     backdropFilter: 'blur(10px)',
                     borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                   }}
                 >
                   <div className="flex items-center space-x-3">
                     <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'rgba(16, 185, 129, 0.2)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'}}>
                       <TrendingUp className="h-5 w-5 text-emerald-400" />
                     </div>
                     <div>
 <p className="text-sm font-semibold text-white">{sale.invoiceNumber}</p>
                         <p className="text-xs text-white/60">{sale.customer?.name || 'N/A'}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-bold text-emerald-400">৳{sale.total.toLocaleString()}</p>
                     <p className="text-xs text-white/60">{new Date(sale.date).toLocaleDateString()}</p>
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
            <h3 className="text-lg font-bold text-white">Recent Purchases</h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 relative">
              Live
              <div className="absolute top-0 right-0 -mt-1 -mr-1 h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
            </span>
          </div>
          <div className="space-y-3">
            {purchaseInvoicesData?.invoices?.slice(0, 5).length > 0 ? (
              purchaseInvoicesData.invoices.slice(0, 5).map((purchase, index) => (
                 <div 
                   key={purchase._id} 
                   className="flex items-center justify-between p-4 hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-slide-up"
                   style={{ 
                     animationDelay: `${index * 100}ms`,
                     background: 'rgba(255, 255, 255, 0.08)',
                     backdropFilter: 'blur(10px)',
                     borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                   }}
                 >
                   <div className="flex items-center space-x-3">
                     <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'rgba(59, 130, 246, 0.2)', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'}}>
                       <Package className="h-5 w-5 text-blue-400" />
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-white">{purchase.invoiceNumber}</p>
                       <p className="text-xs text-white/60">{purchase.supplier?.name || 'N/A'}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-bold text-blue-400">৳{purchase.total.toLocaleString()}</p>
                     <p className="text-xs text-white/60">{new Date(purchase.date).toLocaleDateString()}</p>
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
          <h3 className="text-lg font-bold text-white">Financial Summary (Last 30 Days)</h3>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live Data</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="text-center p-6 rounded-2xl transition-all duration-300 hover:transform hover:-translate-y-1"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div 
              className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.4), inset 0 0 10px rgba(16, 185, 129, 0.3)'
              }}
            >
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-2">Total Sales</p>
            <p className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.05em', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
              ৳{financialSummary.totalSales.toLocaleString()}
            </p>
            <p className="text-xs text-white/60">
              {financialSummary.salesCount} transactions
            </p>
          </div>
          <div 
            className="text-center p-6 rounded-2xl transition-all duration-300 hover:transform hover:-translate-y-1"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div 
              className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Package className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-white/80 mb-2">Total Purchases</p>
            <p className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.05em', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
              ৳{financialSummary.totalPurchases.toLocaleString()}
            </p>
            <p className="text-xs text-white/60">
              {financialSummary.purchaseCount} transactions
            </p>
          </div>
          {(() => {
            const netProfit = financialSummary.totalSales - financialSummary.totalPurchases;
            const isNegative = netProfit < 0;
            return (
              <div 
                className="text-center p-6 rounded-2xl transition-all duration-300 hover:transform hover:-translate-y-1"
                style={{
                  background: isNegative 
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)'
                    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}
              >
                <div 
                  className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: isNegative 
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(16, 185, 129, 0.2)',
                    boxShadow: isNegative 
                      ? '0 0 15px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.3)'
                      : '0 0 15px rgba(16, 185, 129, 0.4), inset 0 0 10px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <DollarSign className={`h-6 w-6 ${isNegative ? 'text-red-400' : 'text-emerald-400'}`} />
                </div>
                <p className={`text-sm font-medium text-white/80 mb-2`}>
                  {isNegative ? 'Net Loss' : 'Net Profit'}
                </p>
                <p className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.05em', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                  <span className={isNegative ? 'text-red-400' : 'text-emerald-400'}>
                    ৳{Math.abs(netProfit).toLocaleString()}
                  </span>
                  {isNegative && (
                    <span className="text-xs text-red-400/60 ml-2" style={{ fontSize: '0.5em' }}>
                      (Loss)
                    </span>
                  )}
                </p>
                <p className={`text-xs text-white/60`}>
                  Sales - Purchases
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Account Balances */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Account Balances</h3>
          <button className="btn btn-ghost btn-sm">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {accountBalances.slice(0, 4).map((account, index) => (
            <div 
              key={account.account} 
              className="p-4 rounded-xl transition-all duration-300 cursor-pointer animate-slide-up hover:transform hover:-translate-y-1"
              style={{ 
                animationDelay: `${index * 100}ms`,
                background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              <p className="text-sm font-medium text-white/80 capitalize mb-2">
                {account.account.replace('_', ' ')}
              </p>
              <p className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.05em', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
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

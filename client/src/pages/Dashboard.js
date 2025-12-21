import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
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

  const iconColors = {
    primary: 'text-primary-600',
    green: 'text-success-600',
    yellow: 'text-warning-600',
    red: 'text-danger-600',
    blue: 'text-blue-600',
  };

  return (
    <div className={`stat-card ${colorClasses[color]} group cursor-pointer card-hover`}>
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
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data } = await axios.get('/api/dashboard/overview');
        setOverview(data);
      } catch (err) {
        console.error('Dashboard API error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
    
    // Set up periodic refresh
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { overview: stats, recentActivity, financialSummary } = overview || {
    overview: {},
    recentActivity: {},
    financialSummary: {}
  };

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
          value={`৳${stats?.totalSales?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="green"
          change={15.3}
          changeType="increase"
        />
        <StatCard
          title="Total Purchases"
          value={`৳${stats?.totalPurchases?.toLocaleString() || 0}`}
          icon={Truck}
          change={8.1}
          changeType="increase"
        />
        <StatCard
          title="Total Products"
          value={overview?.products?.length || 0}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Low Stock Items"
          value={overview?.products?.filter(p => p.stock?.current <= p.stock?.reorderThreshold)?.length || 0}
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard
          title="Total Customers"
          value={overview?.customers?.length || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Suppliers"
          value={overview?.suppliers?.length || 0}
          icon={Truck}
          color="primary"
        />
        <StatCard
          title="Customer Dues"
          value={`৳${stats?.totalCustomerDues?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="red"
        />
        <StatCard
          title="Supplier Payables"
          value={`৳${stats?.totalSupplierPayables?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="yellow"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Sales</h3>
            <span className="badge badge-success">Live</span>
          </div>
          <div className="space-y-3">
            {recentActivity?.recentSales?.length > 0 ? (
              recentActivity.recentSales.map((sale, index) => (
                <div 
                  key={sale.id} 
                  className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-success-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-success-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{sale.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{sale.customer}</p>
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
            <span className="badge badge-primary">Live</span>
          </div>
          <div className="space-y-3">
            {recentActivity?.recentPurchases?.length > 0 ? (
              recentActivity.recentPurchases.map((purchase, index) => (
                <div 
                  key={purchase.id} 
                  className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{purchase.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{purchase.supplier}</p>
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
              ৳{financialSummary?.salesStats?.totalSales?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-success-600">
              {financialSummary?.salesStats?.count || 0} transactions
            </p>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-2xl border border-primary-200/50">
            <div className="h-12 w-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Package className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-sm font-medium text-primary-700 mb-2">Total Purchases</p>
            <p className="text-3xl font-bold text-primary-600 mb-2">
              ৳{financialSummary?.purchaseStats?.totalPurchases?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-primary-600">
              {financialSummary?.purchaseStats?.count || 0} transactions
            </p>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-secondary-50 to-secondary-100/50 rounded-2xl border border-secondary-200/50">
            <div className="h-12 w-12 bg-secondary-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-secondary-600" />
            </div>
            <p className="text-sm font-medium text-secondary-700 mb-2">Net Profit</p>
            <p className="text-3xl font-bold text-secondary-600 mb-2">
              ৳{((financialSummary?.salesStats?.totalSales || 0) - (financialSummary?.purchaseStats?.totalPurchases || 0)).toLocaleString()}
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
          {financialSummary?.accountBalances?.map((account, index) => (
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

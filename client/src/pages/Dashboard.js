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
    green: 'stat-card-green',
    yellow: 'stat-card-yellow',
    red: 'stat-card-red',
  };

  return (
    <div className={`stat-card ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className="p-3 bg-gray-50 rounded-full">
          <Icon className="h-6 w-6 text-gray-600" />
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening in your business today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={`₦${stats?.totalSales?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="green"
          change={15.3}
          changeType="increase"
        />
        <StatCard
          title="Total Purchases"
          value={`₦${stats?.totalPurchases?.toLocaleString() || 0}`}
          icon={Truck}
          change={8.1}
          changeType="increase"
        />
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockProducts || 0}
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Suppliers"
          value={stats?.totalSuppliers || 0}
          icon={Truck}
          color="primary"
        />
        <StatCard
          title="Customer Dues"
          value={`₦${stats?.totalCustomerDues?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="red"
        />
        <StatCard
          title="Supplier Payables"
          value={`₦${stats?.totalSupplierPayables?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="yellow"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Sales</h3>
          <div className="space-y-3">
            {recentActivity?.recentSales?.length > 0 ? (
              recentActivity.recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{sale.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">₦{sale.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{new Date(sale.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent sales</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Purchases</h3>
          <div className="space-y-3">
            {recentActivity?.recentPurchases?.length > 0 ? (
              recentActivity.recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{purchase.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{purchase.supplier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">₦{purchase.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{new Date(purchase.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent purchases</p>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary (Last 30 Days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Sales</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              ₦{financialSummary?.salesStats?.totalSales?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {financialSummary?.salesStats?.count || 0} transactions
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Purchases</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              ₦{financialSummary?.purchaseStats?.totalPurchases?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {financialSummary?.purchaseStats?.count || 0} transactions
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Net Profit</p>
            <p className="text-2xl font-bold text-primary-600 mt-1">
              ₦{((financialSummary?.salesStats?.totalSales || 0) - (financialSummary?.purchaseStats?.totalPurchases || 0)).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Sales - Purchases
            </p>
          </div>
        </div>
      </div>

      {/* Account Balances */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Balances</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {financialSummary?.accountBalances?.map((account) => (
            <div key={account.account} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 capitalize">
                {account.account.replace('_', ' ')}
              </p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                ₦{account.balance.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: Settings },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-64 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-2xl
          ${isOpen ? 'translate-x-0 shadow-strong' : '-translate-x-full'}
        `}
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(30px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between h-16 px-6 border-b"
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(30px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Package className="w-8 h-8 text-emerald-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div>
              <span className="text-xl font-bold text-white">
                Spare Parts
              </span>
              <p className="text-xs text-gray-400">Zone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Section */}
        <nav className="mt-6">
          <div className="px-6 mb-6">
            <div 
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="h-12 w-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-emerald-500/20">
                    {user?.profile?.firstName?.[0] || user?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-success-500 rounded-full border-2 border-gray-800 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">
                    {user?.profile?.firstName || user?.username}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="px-4 mb-6">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Main Menu
            </p>
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}
                      group
                    `}
                    onClick={() => onClose()}
                  >
                    <item.icon
                      className={`
                        h-5 w-5 transition-all duration-200
                        ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}
                      `}
                    />
                    <span className="font-medium">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto h-2 w-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Admin Section */}
          {user?.role === 'admin' && (
            <div className="px-4">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Administration
              </p>
              <div className="space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}
                        group
                      `}
                      onClick={() => onClose()}
                    >
                      <item.icon
                        className={`
                          h-5 w-5 transition-all duration-200
                          ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}
                        `}
                      />
                      <span className="font-medium">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto h-2 w-2 bg-white rounded-full animate-pulse"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-700/50">
          <button
            onClick={handleLogout}
            className="w-full sidebar-item sidebar-item-inactive group"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
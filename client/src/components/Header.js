import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Bell, Settings, LogOut, ChevronDown } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount] = useState(3);
  
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  return (
    <header 
      className="sticky top-0 z-30 transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        margin: '10px',
        borderRadius: '12px',
        height: '72px'
      }}
    >
      <div className="max-w-full px-6 sm:px-8 lg:px-10 h-full flex items-center justify-between">
        <div className="flex items-center flex-1">
          {/* Left Section - Menu & Search */}
          <div className="flex items-center flex-1">
            <button
              onClick={onMenuClick}
              className="p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 lg:hidden transition-all duration-200"
              style={{
                backdropFilter: 'blur(10px)'
              }}
            >
              <Menu className="h-5 w-5" />
            </button>


          </div>

          {/* Right Section - Notifications & User */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                style={{
                  backdropFilter: 'blur(10px)',
                  border: '1px solid transparent'
                }}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center animate-bounce">
                    {notificationCount}
                  </span>
                )}
              </button>

               {/* Notifications Dropdown */}
              {showNotifications && (
                <div 
                  className="absolute right-0 mt-2 w-80 overflow-hidden animate-slide-up"
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px) saturate(150%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div className="p-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 hover:bg-white/10 cursor-pointer transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="h-2 w-2 bg-primary-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Low stock alert</p>
                          <p className="text-xs text-gray-500">Engine Oil filter is running low</p>
                          <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 hover:bg-white/10 cursor-pointer transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="h-2 w-2 bg-success-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">New sale completed</p>
                          <p className="text-xs text-gray-500">Invoice #INV-001 completed</p>
                          <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/10 transition-all duration-200"
                style={{
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div className="text-right hidden sm:block">
                  <div 
                    className="text-sm font-semibold text-white"
                    style={{
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {user?.profile?.firstName || user?.username}
                  </div>
                  <div className="text-xs text-white/80 capitalize flex items-center">
                    {user?.role}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </div>
                </div>
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold relative"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.1)'
                  }}
                >
                  {user?.profile?.firstName?.[0] || user?.username?.[0]?.toUpperCase()}
                </div>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div 
                  className="absolute right-0 mt-2 w-56 overflow-hidden animate-slide-up"
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px) saturate(150%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div className="p-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.profile?.firstName || user?.username}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <div className="py-2">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-white/10 flex items-center space-x-3 transition-colors rounded-lg">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={logout}
                      className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 flex items-center space-x-3 transition-colors rounded-lg"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
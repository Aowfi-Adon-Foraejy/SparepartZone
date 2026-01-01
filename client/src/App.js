import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Invoices from './pages/Invoices';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import LoadingSpinner from './components/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen">
      <div className="blob-1"></div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex h-screen overflow-hidden">
                <Sidebar
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                />
                
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                  />
                  
                  <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 animate-fade-in">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/products/*" element={<Products />} />
                      <Route path="/customers/*" element={<Customers />} />
                      <Route path="/suppliers/*" element={<Suppliers />} />
                      <Route path="/invoices/*" element={<Invoices />} />
                      <Route path="/transactions" element={<Transactions />} />
                      <Route
                        path="/users/*"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <Users />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/currency';
import { 
  Users as UsersIcon, 
  Plus, 
  Edit, 
  Trash2,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const UserManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const isAdmin = user?.role === 'admin';

  // Fetch users from API
  const { data: usersData, isLoading, refetch } = useQuery(
    ['users', statusFilter, searchTerm],
    async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get(`/users?${params.toString()}`);
      return response.data;
    },
    {
      enabled: isAdmin // Only fetch if user is admin
    }
  );

const approveUserMutation = useMutation(
    async (userId) => {
      const response = await api.post(`/users/${userId}/approve`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User approved successfully!');
        queryClient.invalidateQueries('users');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve user');
      }
    }
  );

  const deactivateUserMutation = useMutation(
    async (userId) => {
      const response = await api.post(`/users/${userId}/deactivate`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User deactivated successfully!');
        queryClient.invalidateQueries('users');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to deactivate user');
      }
    }
  );

  const activateUserMutation = useMutation(
    async (userId) => {
      const response = await api.post(`/users/${userId}/activate`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('User activated successfully!');
        queryClient.invalidateQueries('users');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to activate user');
      }
    }
  );

  const deleteUserMutation = useMutation(
    async (userId) => {
      await api.delete(`/users/${userId}`);
    },
    {
      onSuccess: () => {
        toast.success('User deleted successfully!');
        queryClient.invalidateQueries('users');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  );

  const handleApprove = (userId) => {
    if (!isAdmin) return;
    approveUserMutation.mutate(userId);
  };

const handleDeactivate = (userId) => {
    if (!isAdmin) return;
    
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      deactivateUserMutation.mutate(userId);
    }
  };

  const handleActivate = (userId) => {
    if (!isAdmin) return;
    activateUserMutation.mutate(userId);
  };

  const handleDelete = (userId) => {
    if (!isAdmin) return;
    
    if (window.confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'staff': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (user) => {
    if (!user.isApproved) return 'bg-yellow-100 text-yellow-800';
    if (!user.isActive) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredUsers = usersData?.users || [];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div 
        className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0"
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
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-white/80 mt-1">Manage staff accounts and permissions</p>
        </div>
        {isAdmin && (
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {usersData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label mb-2">Active Admins</p>
                <p className="stat-card-value">{usersData.stats.activeAdmins}</p>
              </div>
              <div className="stat-card-icon-bg stat-card-icon-bg-danger">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label mb-2">Active Staff</p>
                <p className="stat-card-value">{usersData.stats.activeStaff}</p>
              </div>
              <div className="stat-card-icon-bg stat-card-icon-bg-primary">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label mb-2">Pending Approval</p>
                <p className="stat-card-value">{usersData.stats.pendingStaff}</p>
              </div>
              <div className="stat-card-icon-bg stat-card-icon-bg-warning">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="stat-card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label mb-2">Inactive Users</p>
                <p className="stat-card-value">{usersData.stats.inactiveUsers}</p>
              </div>
              <div className="stat-card-icon-bg" style={{background: 'rgba(107, 114, 128, 0.2)', boxShadow: '0 0 15px rgba(107, 114, 128, 0.4), inset 0 0 10px rgba(107, 114, 128, 0.3)'}}>
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Filters */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search users by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-white/50 backdrop-blur-md rounded-xl px-4 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200"
            style={{ backdropFilter: 'blur(10px)' }}
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'all' 
                ? 'bg-white/20 border-white/30 text-white' 
                : 'border-white/20 text-white/60 hover:bg-white/10'
            }`}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'active' 
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                : 'border-white/20 text-white/60 hover:bg-white/10'
            }`}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'pending' 
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
                : 'border-white/20 text-white/60 hover:bg-white/10'
            }`}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'inactive' 
                ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                : 'border-white/20 text-white/60 hover:bg-white/10'
            }`}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            Inactive
          </button>
        </div>
      </div>



       {/* Users Table */}
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Salary</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="group hover:bg-white/5 transition-colors duration-150" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'rgba(59, 130, 246, 0.2)'}}>
                        <UsersIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.username}
                        </p>
                        <p className="text-xs text-white/60">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4 text-white/40" />
                        <span className="text-white">{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-white/40" />
                        <span className="text-white">{user.profile?.phone || user.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      user.role === 'staff' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      !user.isApproved ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      !user.isActive ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {!user.isApproved ? 'Pending' : !user.isActive ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(user.salary?.base || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {isAdmin && (
                        <>
                          {!user.isApproved && (
                            <button
                              onClick={() => handleApprove(user._id)}
                              className="p-2 text-emerald-400 hover:bg-white/10 rounded-lg transition-colors duration-200"
                              title="Approve"
                              disabled={approveUserMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {user.isApproved && user.isActive ? (
                            <button
                              onClick={() => handleDeactivate(user._id)}
                              className="p-2 text-red-400 hover:bg-white/10 rounded-lg transition-colors duration-200"
                              title="Deactivate"
                              disabled={deactivateUserMutation.isLoading}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          ) : user.isApproved && !user.isActive ? (
                            <button
                              onClick={() => handleActivate(user._id)}
                              className="p-2 text-emerald-400 hover:bg-white/10 rounded-lg transition-colors duration-200"
                              title="Activate"
                              disabled={activateUserMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-400 hover:bg-white/10 rounded-lg transition-colors duration-200"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="p-2 text-red-400 hover:bg-white/10 rounded-lg transition-colors duration-200"
                            title="Delete"
                            disabled={deleteUserMutation.isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">No users found</p>
          </div>
        )}
      </div>

      {/* Add/Edit User Modal (placeholder) */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="modal-content animate-bounce-in max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {showAddModal ? 'Add New User' : 'Edit User'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {showAddModal ? 'Fill in user details below' : 'Update user information'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="text-center py-8">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">User form coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
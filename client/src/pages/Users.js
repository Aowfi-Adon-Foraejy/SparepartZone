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
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage staff accounts and permissions</p>
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
          <div className="stat-card stat-card-success">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Admins</p>
                <p className="text-2xl font-bold text-gray-900">{usersData.stats.activeAdmins}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="stat-card stat-card-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold text-gray-900">{usersData.stats.activeStaff}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="stat-card stat-card-yellow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{usersData.stats.pendingStaff}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full">
                <XCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="stat-card stat-card-red">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Users</p>
                <p className="text-2xl font-bold text-gray-900">{usersData.stats.inactiveUsers}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-full">
                <XCircle className="h-6 w-6 text-gray-600" />
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
            className="input w-full"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'all' 
                ? 'bg-primary-100 border-primary-300 text-primary-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'active' 
                ? 'bg-primary-100 border-primary-300 text-primary-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'pending' 
                ? 'bg-yellow-100 border-yellow-300 text-yellow-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'inactive' 
                ? 'bg-red-100 border-red-300 text-red-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>



      {/* Users Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">User</th>
                <th className="table-header-cell">Contact</th>
                <th className="table-header-cell">Role</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Join Date</th>
                <th className="table-header-cell">Salary</th>
                <th className="table-header-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="table-row group">
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.username}
                        </p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{user.profile?.phone || user.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`px-3 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(user)}`}>
                      {!user.isApproved ? 'Pending' : !user.isActive ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(user.salary?.base || 0)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {isAdmin && (
                        <>
                          {!user.isApproved && (
                            <button
                              onClick={() => handleApprove(user._id)}
                              className="p-2 text-success-600 hover:bg-success-50 rounded-lg transition-colors duration-200"
                              title="Approve"
                              disabled={approveUserMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {user.isApproved && user.isActive ? (
                            <button
                              onClick={() => handleDeactivate(user._id)}
                              className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors duration-200"
                              title="Deactivate"
                              disabled={deactivateUserMutation.isLoading}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          ) : user.isApproved && !user.isActive ? (
                            <button
                              onClick={() => handleActivate(user._id)}
                              className="p-2 text-success-600 hover:bg-success-50 rounded-lg transition-colors duration-200"
                              title="Activate"
                              disabled={activateUserMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors duration-200"
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
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
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
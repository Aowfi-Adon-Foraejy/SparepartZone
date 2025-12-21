import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Mock user data - in real app this would come from API
  const mockUsers = [
    {
      _id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+8801234567890',
      role: 'admin',
      isActive: true,
      isApproved: true,
      joinDate: '2024-01-15',
      salary: 50000
    },
    {
      _id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+8801234567891',
      role: 'staff',
      isActive: true,
      isApproved: false,
      joinDate: '2024-02-20',
      salary: 30000
    },
    {
      _id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      phone: '+8801234567892',
      role: 'staff',
      isActive: false,
      isApproved: true,
      joinDate: '2024-03-10',
      salary: 32000
    }
  ];

  const [users, setUsers] = useState(mockUsers);
  const [currentUser, setCurrentUser] = useState({ role: 'admin' }); // Mock current user
  
  // In a real app, this would come from auth context
  const isAdmin = currentUser?.role === 'admin';

  const handleApprove = async (userId) => {
    if (!isAdmin) return;
    
    try {
      // In a real app, this would call the API
      // await api.patch(`/users/${userId}/approve`);
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, isApproved: true } : user
      ));
      toast.success('User approved successfully');
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleRemove = async (userId) => {
    if (!isAdmin) return;
    
    if (window.confirm('Are you sure you want to remove this user?')) {
      try {
        // In a real app, this would call the API
        // await api.delete(`/users/${userId}`);
        setUsers(prev => prev.filter(user => user._id !== userId));
        toast.success('User removed successfully');
      } catch (error) {
        toast.error('Failed to remove user');
      }
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

  const filteredUsers = users;

  if (false) { // isLoading check for real API
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage staff accounts and permissions</p>
        </div>
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
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
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">ID: {user._id}</p>
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
                        <span className="text-gray-900">{user.phone}</span>
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
                      {new Date(user.joinDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(user.salary)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {currentUser.role === 'admin' && (
                        <>
                          {!user.isApproved && (
                            <button
                              onClick={() => handleApprove(user._id)}
                              className="p-2 text-success-600 hover:bg-success-50 rounded-lg transition-colors duration-200"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemove(user._id)}
                            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors duration-200"
                            title="Remove"
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
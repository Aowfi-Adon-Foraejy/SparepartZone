import React from 'react';
import { Settings } from 'lucide-react';

const Users = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage staff accounts and permissions</p>
      </div>
      
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">User management page</p>
          <p className="text-sm text-gray-500 mt-1">Staff approval, roles, salaries, performance</p>
        </div>
      </div>
    </div>
  );
};

export default Users;
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Dropdown = ({ 
  trigger, 
  children, 
  className = '',
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'right-0 mt-2',
    'bottom-left': 'left-0 mt-2',
    'top-right': 'right-0 bottom-full mb-2',
    'top-left': 'left-0 bottom-full mb-2',
  };

  const handleClickOutside = (event) => {
    if (!event.target.closest('.dropdown-container')) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`dropdown-container relative ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className={`absolute ${positionClasses[position]} w-56 bg-white rounded-2xl shadow-strong border border-gray-100 overflow-hidden z-50 animate-slide-up`}>
          <div className="py-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({ 
  children, 
  onClick, 
  icon: Icon, 
  danger = false,
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors
        ${danger 
          ? 'text-danger-600 hover:bg-danger-50' 
          : 'text-gray-700 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{children}</span>
    </button>
  );
};

const DropdownDivider = () => (
  <div className="border-t border-gray-100 my-1"></div>
);

export { Dropdown, DropdownItem, DropdownDivider };
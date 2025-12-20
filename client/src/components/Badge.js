import React from 'react';

const Badge = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  dot = false,
  className = '' 
}) => {
  const variantClasses = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    gray: 'badge-gray',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${className}
    `}>
      {dot && (
        <span className={`
          h-2 w-2 rounded-full mr-2
          ${variant === 'primary' ? 'bg-primary-500' :
            variant === 'success' ? 'bg-success-500' :
            variant === 'warning' ? 'bg-warning-500' :
            variant === 'danger' ? 'bg-danger-500' :
            'bg-gray-500'
          }
        `}></span>
      )}
      {children}
    </span>
  );
};

export default Badge;
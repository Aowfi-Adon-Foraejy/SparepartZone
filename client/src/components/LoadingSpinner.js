import React from 'react';

const LoadingSpinner = ({ size = 'md', text, fullScreen = false, variant = 'primary' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const variantClasses = {
    primary: 'border-t-primary-600',
    success: 'border-t-success-600',
    warning: 'border-t-warning-600',
    danger: 'border-t-danger-600',
    gray: 'border-t-gray-600',
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex items-center justify-center';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div
            className={`
              ${sizeClasses[size]}
              border-2 border-gray-200 rounded-full
            `}
          ></div>
          <div
            className={`
              ${sizeClasses[size]}
              absolute top-0 left-0 border-2 border-transparent rounded-full animate-spin
              ${variantClasses[variant]}
            `}
          ></div>
        </div>
        {text && (
          <p className="text-sm text-gray-600 font-medium animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
};

const Skeleton = ({ className = '', lines = 1, height = 'h-4' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`skeleton ${height} ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

export { Skeleton };
export default LoadingSpinner;
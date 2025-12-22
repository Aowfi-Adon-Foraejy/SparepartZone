import React from 'react';

const SkeletonCard = ({ className = "" }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 rounded-lg h-32 mb-6">
      <div className="flex items-center justify-between h-full p-6">
        <div className="space-y-3 flex-1">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        </div>
        <div className="h-12 w-12 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  </div>
);

const SkeletonRow = ({ rows = 5, columns = 6 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="animate-pulse bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const SkeletonTable = ({ headerRows = 1, dataRows = 5, columns = 7 }) => (
  <div className="animate-pulse">
    {/* Table Headers */}
    <div className="bg-gray-50 border-b border-gray-200">
      {Array.from({ length: headerRows }).map((_, index) => (
        <div key={index} className="grid grid-cols-7 gap-4 p-4 border-b border-gray-200">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-300 rounded"></div>
          ))}
        </div>
      ))}
    </div>
    {/* Table Rows */}
    <div className="divide-y divide-gray-200">
      {Array.from({ length: dataRows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-7 gap-4 p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export { SkeletonCard, SkeletonRow, SkeletonTable };
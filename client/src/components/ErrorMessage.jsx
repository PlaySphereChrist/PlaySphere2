import React from 'react';

export default function ErrorMessage({ message, className = '' }) {
  if (!message) return null;
  
  return (
    <div className={`rounded-md bg-red-50 p-4 ${className}`}>
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

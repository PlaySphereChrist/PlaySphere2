import React from 'react';

export default function EmptyState({ title, description, actionText, onAction, actionLink, className = '' }) {
  return (
    <div className={`text-center py-12 bg-white shadow sm:rounded-lg px-4 ${className}`}>
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      
      {(onAction || actionLink) && (
        <div className="mt-6">
          {actionLink ? (
            <a href={actionLink} className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              {actionText}
            </a>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

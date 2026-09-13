import React from 'react';

export default function TournamentStatusBadge({ status, className = '' }) {
  const statusConfig = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
    registration_open: { bg: 'bg-green-100', text: 'text-green-800', label: 'Registration Open' },
    registration_closed: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Registration Closed' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
    completed: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
    archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Archived' },
  };

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      {config.label}
    </span>
  );
}

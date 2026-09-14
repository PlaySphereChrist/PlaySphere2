import React, { useState } from 'react';
import { api } from '../../lib/api';
import ErrorMessage from '../../components/ErrorMessage';
import Spinner from '../../components/Spinner';

export default function ModerateModal({ postId, commentId, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const endpoint = postId 
        ? `/community/posts/${postId}/moderate`
        : `/community/comments/${commentId}/moderate`;

      const res = await api.request('POST', endpoint, { moderate: true, reason });

      if (res.success) {
        onSuccess();
      } else {
        throw new Error(res.message || 'Failed to moderate content');
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-red-600 mb-4">
          Admin Action: Moderate {postId ? 'Post' : 'Comment'}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          This will hide the content from normal users and display the moderation reason instead.
        </p>

        {error && <ErrorMessage message={error} className="mb-4" />}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Moderation Reason (Optional)</label>
            <textarea
              id="reason"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              placeholder="E.g., Removed for violating community guidelines."
            />
          </div>

          <div className="flex justify-end space-x-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none disabled:opacity-50"
            >
              {submitting ? <Spinner size="sm" /> : 'Confirm Moderation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

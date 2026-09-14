import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ErrorMessage from '../../components/ErrorMessage';
import Spinner from '../../components/Spinner';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actioningId, setActioningId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [modAction, setModAction] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/community/reports?status=${statusFilter}` : '/community/reports';
      const res = await api.request('GET', url);
      if (res.success) {
        setReports(res.reports || []);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleUpdate = async (e, reportId) => {
    e.preventDefault();
    try {
      const res = await api.request('PATCH', `/community/reports/${reportId}`, {
        status: newStatus,
        moderationAction: modAction || null
      });
      if (res.success) {
        setActioningId(null);
        fetchReports();
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      window.alert(err.message);
    }
  };

  const startAction = (r) => {
    setActioningId(r.id);
    setNewStatus(r.status);
    setModAction(r.moderation_action || '');
  };

  if (loading && reports.length === 0) return <div className="py-12"><Spinner /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white px-4 py-5 border-b border-gray-200 sm:px-6 shadow sm:rounded-lg flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Community Reports</h3>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="actioned">Actioned</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {reports.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No reports found.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {reports.map(r => (
              <li key={r.id} className="p-4 sm:px-6 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      Reported by {r.reporter_email}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      <strong>Reason:</strong> {r.reason}
                    </p>
                    {r.description && (
                      <p className="mt-1 text-sm text-gray-500 italic">
                        &ldquo;{r.description}&rdquo;
                      </p>
                    )}
                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                      {r.post_id && <div>Post ID: <span className="font-mono">{r.post_id}</span></div>}
                      {r.comment_id && <div>Comment ID: <span className="font-mono">{r.comment_id}</span></div>}
                      <div>Reported on: {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      r.status === 'actioned' ? 'bg-green-100 text-green-800' :
                      r.status === 'dismissed' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {r.status.toUpperCase()}
                    </span>
                    
                    {actioningId !== r.id && (
                      <button 
                        onClick={() => startAction(r)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium mt-2"
                      >
                        Update Status
                      </button>
                    )}
                  </div>
                </div>

                {actioningId === r.id && (
                  <form onSubmit={(e) => handleUpdate(e, r.id)} className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          value={newStatus}
                          onChange={e => setNewStatus(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="actioned">Actioned</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Moderation Action (Optional)</label>
                        <input
                          type="text"
                          value={modAction}
                          onChange={e => setModAction(e.target.value)}
                          placeholder="e.g. Deleted comment, Warned user"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setActioningId(null)}
                        className="bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

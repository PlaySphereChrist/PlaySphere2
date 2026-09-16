import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { PsCard, PsButton, PsBadge, PsSelect, PsInput, PsPageHeader, PsLoading, PsAlert, PsEmpty } from '../../components/ui';

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

  if (loading && reports.length === 0) return <PsLoading />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <PsPageHeader
        title="Community Reports"
        subtitle="Manage user reports for community posts and comments."
        actions={
          <PsSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="actioned">Actioned</option>
            <option value="dismissed">Dismissed</option>
          </PsSelect>
        }
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard>
        {reports.length === 0 ? (
          <div className="p-12">
            <PsEmpty title="No reports found" message="There are no reports matching the selected status." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map(r => (
              <li key={r.id} className="p-6 hover:bg-pill-hover transition">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-primary">
                      Reported by {r.reporter_email}
                    </p>
                    <p className="mt-2 text-sm text-secondary">
                      <strong className="text-primary">Reason:</strong> {r.reason}
                    </p>
                    {r.description && (
                      <p className="mt-2 text-sm text-secondary italic bg-surface p-3 rounded-md border border-border">
                        &ldquo;{r.description}&rdquo;
                      </p>
                    )}
                    <div className="mt-3 text-xs text-muted space-y-1">
                      {r.post_id && <div>Post ID: <span className="font-mono bg-surface px-1 py-0.5 rounded">{r.post_id}</span></div>}
                      {r.comment_id && <div>Comment ID: <span className="font-mono bg-surface px-1 py-0.5 rounded">{r.comment_id}</span></div>}
                      <div>Reported on: {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start sm:items-end space-y-3 shrink-0">
                    <PsBadge variant={
                      r.status === 'pending' ? 'warning' :
                      r.status === 'actioned' ? 'success' :
                      r.status === 'dismissed' ? 'default' :
                      'info'
                    }>
                      {r.status.toUpperCase()}
                    </PsBadge>
                    
                    {actioningId !== r.id && (
                      <button 
                        onClick={() => startAction(r)}
                        className="text-maroon hover:text-maroon/80 text-sm font-bold transition underline"
                      >
                        Update Status
                      </button>
                    )}
                  </div>
                </div>

                {actioningId === r.id && (
                  <form onSubmit={(e) => handleUpdate(e, r.id)} className="mt-4 bg-surface p-5 rounded-lg border border-border">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <PsSelect
                        label="Status"
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="actioned">Actioned</option>
                        <option value="dismissed">Dismissed</option>
                      </PsSelect>
                      <PsInput
                        label="Moderation Action (Optional)"
                        value={modAction}
                        onChange={e => setModAction(e.target.value)}
                        placeholder="e.g. Deleted comment, Warned user"
                      />
                    </div>
                    <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-border">
                      <PsButton type="button" variant="ghost" onClick={() => setActioningId(null)}>
                        Cancel
                      </PsButton>
                      <PsButton type="submit">
                        Save Status
                      </PsButton>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </PsCard>
    </div>
  );
}

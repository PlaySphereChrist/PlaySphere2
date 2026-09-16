import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { useAuth } from '../../../store/AuthContext';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../../../components/ui';

export default function OrganizerTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // tournament object pending confirmation

  const { user } = useAuth();

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tournaments?organizer_user_id=${user.id}`);
      const owned = (res.data.tournaments || []).filter(t => t.organizer_user_id === user.id);
      setTournaments(owned);
    } catch (err) {
      setError(err.message || 'Failed to load managed tournaments');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    try {
      await api.delete(`/tournaments/${confirmDelete.id}`);
      setTournaments(prev => prev.filter(t => t.id !== confirmDelete.id));
    } catch (err) {
      setError(err.message || 'Failed to delete tournament');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadgeVariant = (s) => {
    switch (s) {
      case 'registration_open': return 'success';
      case 'in_progress': return 'maroon';
      case 'completed': return 'default';
      case 'cancelled': return 'danger';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (s) => {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-2xl shadow-xl p-6 max-w-md w-full border border-border">
            <h3 className="text-xl font-serif font-bold text-primary">Delete Tournament</h3>
            <p className="mt-2 text-sm text-secondary">
              Are you sure you want to permanently delete <strong>{confirmDelete.name}</strong>?
            </p>
            <div className="mt-3 text-xs text-warning bg-warning/10 border border-warning/30 rounded-xl p-3">
              ⚠️ This action cannot be undone. Only draft tournaments with no registrations or fixtures can be deleted.
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <PsButton variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </PsButton>
              <PsButton variant="danger" onClick={handleDeleteConfirmed}>
                Delete Permanently
              </PsButton>
            </div>
          </div>
        </div>
      )}

      <PsPageHeader 
        title="Manage Tournaments" 
        actions={
          <Link to="/organizer/tournaments/new">
            <PsButton>Create Tournament</PsButton>
          </Link>
        }
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {loading ? (
        <PsLoading />
      ) : tournaments.length === 0 ? (
        <PsEmpty
          title="No tournaments"
          message="You haven't created any tournaments yet."
          action={
            <Link to="/organizer/tournaments/new">
              <PsButton>Create Tournament</PsButton>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {tournaments.map(tournament => (
            <PsCard key={tournament.id} className="hover:border-maroon/50 transition overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <Link to={`/organizer/tournaments/${tournament.id}/manage`} className="flex-1 px-6 py-5 hover:bg-pill-hover transition">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-serif font-bold text-primary hover:text-maroon transition line-clamp-1">
                      {tournament.name}
                    </h3>
                    <PsBadge variant={getStatusBadgeVariant(tournament.status)} className="shrink-0">
                      {getStatusLabel(tournament.status)}
                    </PsBadge>
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <p className="flex items-center gap-1.5 text-sm text-secondary">
                      <span className="text-muted">🏆</span>
                      {tournament.sport_name} • {tournament.format.replace(/_/g, ' ')}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="text-muted">📅</span>
                      Created {new Date(tournament.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>

                {/* Delete action — only shown for draft tournaments */}
                {tournament.status === 'draft' && (
                  <div className="px-6 pb-4 sm:p-5 sm:border-l border-t sm:border-t-0 border-border bg-pill flex items-center justify-end sm:justify-center">
                    <PsButton
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmDelete(tournament)}
                      disabled={deletingId === tournament.id}
                      className="bg-transparent text-error hover:bg-error/10 border border-error/50"
                    >
                      {deletingId === tournament.id ? 'Deleting…' : 'Delete'}
                    </PsButton>
                  </div>
                )}
              </div>
            </PsCard>
          ))}
        </div>
      )}
    </div>
  );
}

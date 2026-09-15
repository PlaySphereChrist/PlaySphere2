import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import Spinner from '../../../components/Spinner';
import ErrorMessage from '../../../components/ErrorMessage';
import TournamentStatusBadge from '../../../components/TournamentStatusBadge';
import { useAuth } from '../../../store/AuthContext';
import EmptyState from '../../../components/EmptyState';

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Tournament</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to permanently delete <strong>{confirmDelete.name}</strong>?
            </p>
            <p className="mt-1 text-xs text-amber-700 bg-amber-50 rounded p-2">
              ⚠️ This action cannot be undone. Only draft tournaments with no registrations or fixtures can be deleted.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Manage Tournaments</h1>
        <Link
          to="/organizer/tournaments/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Create Tournament
        </Link>
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <div className="py-12"><Spinner /></div>
      ) : tournaments.length === 0 ? (
        <EmptyState
          title="No tournaments"
          description="You haven't created any tournaments yet."
          actionText="Create Tournament"
          actionLink="/organizer/tournaments/new"
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {tournaments.map(tournament => (
              <li key={tournament.id}>
                <div className="flex items-center px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <Link to={`/organizer/tournaments/${tournament.id}/manage`} className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">{tournament.name}</p>
                      <div className="ml-2 flex flex-shrink-0">
                        <TournamentStatusBadge status={tournament.status} />
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {tournament.sport_name} • {tournament.format.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>Created {new Date(tournament.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </Link>

                  {/* Delete action — only shown for draft tournaments */}
                  {tournament.status === 'draft' && (
                    <button
                      onClick={() => setConfirmDelete(tournament)}
                      disabled={deletingId === tournament.id}
                      className="ml-4 shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                      title="Delete draft tournament"
                    >
                      {deletingId === tournament.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

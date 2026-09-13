import React, { useState, useEffect } from 'react';
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
  
  const { user } = useAuth();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        // Admin sees all, organizer sees their own + open.
        // We filter implicitly on backend, but to be sure we just want the ones we manage.
        // For phase 9, backend returns own + registration_open for organizers.
        const res = await api.get(`/tournaments?organizer_user_id=${user.id}`);
        // Filter client side to just the ones this user owns for this specific view
        const owned = (res.data.tournaments || []).filter(t => t.organizer_user_id === user.id);
        setTournaments(owned);
      } catch (err) {
        setError(err.message || 'Failed to load managed tournaments');
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, [user.id]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
                <Link to={`/organizer/tournaments/${tournament.id}/manage`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
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
                        <p>
                          Created {new Date(tournament.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

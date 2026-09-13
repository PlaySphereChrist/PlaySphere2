import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';
import TournamentStatusBadge from '../../components/TournamentStatusBadge';
import { useAuth } from '../../store/AuthContext';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [sportId, setSportId] = useState('');
  const [status, setStatus] = useState('registration_open');

  const { user } = useAuth();
  const isOrganizerOrAdmin = user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN');

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await api.get('/sports');
        setSports(res.data.sports);
      } catch (err) {
        console.error('Failed to load sports', err);
      }
    };
    fetchSports();
  }, []);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const params = new window.URLSearchParams();
        if (sportId) params.append('sport_id', sportId);
        if (status && isOrganizerOrAdmin) params.append('status', status);

        const res = await api.get(`/tournaments?${params.toString()}`);
        setTournaments(res.data.tournaments || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [sportId, status, isOrganizerOrAdmin]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Tournaments</h1>
        {isOrganizerOrAdmin && (
          <Link
            to="/organizer/tournaments"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            Manage Tournaments
          </Link>
        )}
      </div>

      <div className="bg-white p-4 shadow sm:rounded-md">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sport</label>
            <select
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Sports</option>
              {sports.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          {isOrganizerOrAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
                <option value="registration_closed">Registration Closed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <div className="py-12"><Spinner /></div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-12 bg-white shadow sm:rounded-lg">
          <p className="text-sm text-gray-500">No tournaments found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(tournament => (
            <div key={tournament.id} className="bg-white overflow-hidden shadow rounded-lg flex flex-col">
              <div className="p-6 flex-grow">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {tournament.sport_name}
                  </span>
                  <TournamentStatusBadge status={tournament.status} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 truncate" title={tournament.name}>
                  {tournament.name}
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>📅 {new Date(tournament.starts_at).toLocaleDateString()} - {new Date(tournament.ends_at).toLocaleDateString()}</p>
                  <p>👥 {tournament.participation_type === 'team' ? 'Team' : 'Individual'} ({tournament.format.replace(/_/g, ' ')})</p>
                  <p>📍 {tournament.city || 'Online / TBD'}</p>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="w-full inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import ErrorMessage from '../../components/ErrorMessage';
import Spinner from '../../components/Spinner';

export default function TournamentMatchesPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tournRes, matchesRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}`),
        api.get(`/tournaments/${tournamentId}/matches`)
      ]);
      setTournament(tournRes.data.tournament);
      setMatches(matchesRes.data.matches);
    } catch (err) {
      setError(err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorMessage message={error} />;
  if (!tournament) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to={`/tournaments/${tournamentId}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
        &larr; Back to {tournament.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
        <p className="text-sm text-gray-500">All matches for {tournament.name}</p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {matches.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No matches scheduled yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {matches.map((match) => (
              <li key={match.id}>
                <Link to={`/tournaments/${tournamentId}/matches/${match.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {match.round_name || `Round ${match.round_number}`} - Match {match.match_number}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${match.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            match.status === 'in_progress' ? 'bg-red-100 text-red-800' : 
                            match.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                          {match.status.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Teams: {match.participants?.map(p => p.team_name || p.registration_name).join(' vs ') || 'TBD'}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        {match.scheduled_at && (
                          <p>
                            Scheduled: {new Date(match.scheduled_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


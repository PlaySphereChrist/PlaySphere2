import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import LeaderboardCreateForm from './LeaderboardCreateForm';
import LeaderboardEntriesTable from './LeaderboardEntriesTable';

/**
 * LeaderboardPanel — embeds into TournamentDetailsPage.
 * Props:
 *   tournamentId       : string
 *   tournament         : object (full tournament row, includes sport_id, organizer_user_id)
 *   isOrganizerOrAdmin : boolean
 */
export default function LeaderboardPanel({ tournamentId, tournament, isOrganizerOrAdmin }) {
  const [leaderboards, setLeaderboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedLbId, setSelectedLbId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadLeaderboards = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/leaderboards/tournaments/${tournamentId}`);
      const lbs = res.leaderboards || [];
      setLeaderboards(lbs);
      // Auto-select first leaderboard if none selected yet
      if (!selectedLbId && lbs.length > 0) {
        setSelectedLbId(lbs[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load leaderboards');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    loadLeaderboards();
  }, [loadLeaderboards]);

  const handleCreated = (newLb) => {
    setLeaderboards((prev) => [...prev, newLb]);
    setSelectedLbId(newLb.id);
    setShowCreateForm(false);
  };

  const selectedLb = leaderboards.find((lb) => lb.id === selectedLbId) || null;

  return (
    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Leaderboards</h4>
          <p className="mt-1 text-sm text-gray-500">Tournament rankings derived from official match statistics.</p>
        </div>
        {isOrganizerOrAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap"
          >
            {showCreateForm ? 'Cancel' : '+ New Leaderboard'}
          </button>
        )}
      </div>

      {/* Create form (organizer/admin only) */}
      {showCreateForm && isOrganizerOrAdmin && (
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
          <LeaderboardCreateForm
            tournament={tournament}
            onCreated={handleCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Leaderboard list / tabs */}
      {loading ? (
        <div className="py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="px-4 py-5">
          <ErrorMessage message={error} />
        </div>
      ) : leaderboards.length === 0 ? (
        <EmptyState
          title="No leaderboards yet"
          description={
            isOrganizerOrAdmin
              ? 'Create a leaderboard to rank players or teams by a statistic.'
              : 'The organizer has not set up any leaderboards for this tournament yet.'
          }
          className="shadow-none rounded-none"
        />
      ) : (
        <>
          {/* Tab strip */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-1 px-4 sm:px-6 min-w-max" aria-label="Leaderboard tabs">
              {leaderboards.map((lb) => (
                <button
                  key={lb.id}
                  type="button"
                  onClick={() => setSelectedLbId(lb.id)}
                  className={`whitespace-nowrap py-3 px-3 border-b-2 text-sm font-medium transition-colors ${
                    lb.id === selectedLbId
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {lb.name}
                  <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    lb.leaderboard_type === 'team' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {lb.leaderboard_type}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Selected leaderboard entries */}
          {selectedLb && (
            <LeaderboardEntriesTable
              leaderboard={selectedLb}
              isOrganizerOrAdmin={isOrganizerOrAdmin}
              onGenerated={loadLeaderboards}
            />
          )}
        </>
      )}
    </div>
  );
}

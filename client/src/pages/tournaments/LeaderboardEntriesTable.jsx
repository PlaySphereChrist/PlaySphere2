import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';

/**
 * LeaderboardEntriesTable — shows entries for a single leaderboard.
 * Props:
 *   leaderboard        : leaderboard object {id, name, leaderboard_type, stat_key, computed_at}
 *   isOrganizerOrAdmin : boolean
 *   onGenerated        : callback() — refresh parent leaderboard list after generate
 */
export default function LeaderboardEntriesTable({ leaderboard, isOrganizerOrAdmin, onGenerated }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/leaderboards/${leaderboard.id}/entries`);
      setEntries(res.entries || []);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard entries');
    } finally {
      setLoading(false);
    }
  }, [leaderboard.id]);

  useEffect(() => {
    setGenError('');
    setGenSuccess('');
    loadEntries();
  }, [loadEntries]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setGenError('');
    setGenSuccess('');
    try {
      const res = await api.post(`/leaderboards/${leaderboard.id}/generate`, {});
      setGenSuccess(`Generated ${res.data.entries_generated} entr${res.data.entries_generated === 1 ? 'y' : 'ies'}.`);
      await loadEntries();
      onGenerated?.();
    } catch (err) {
      setGenError(err.data?.message || err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const isPlayer = leaderboard.leaderboard_type === 'player';

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 ring-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-700 ring-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-700 ring-orange-300';
    return 'bg-white text-gray-600 ring-gray-200';
  };

  return (
    <div className="px-4 py-4 sm:px-6 space-y-4">
      {/* Leaderboard metadata + generate button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            Statistic: <span className="font-medium text-gray-900">{leaderboard.stat_key}</span>
            {leaderboard.computed_at && (
              <span className="ml-3 text-xs text-gray-400">
                Last generated: {new Date(leaderboard.computed_at).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        {isOrganizerOrAdmin && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
          >
            {generating ? <><Spinner size="sm" /><span className="ml-2">Generating…</span></> : '↻ Generate / Refresh'}
          </button>
        )}
      </div>

      {genError && <ErrorMessage message={genError} />}
      {genSuccess && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 font-medium">
          ✓ {genSuccess}
        </div>
      )}

      {loading ? (
        <div className="py-8"><Spinner size="lg" /></div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          description={
            isOrganizerOrAdmin
              ? 'Click "Generate / Refresh" to calculate rankings from current statistics.'
              : 'Rankings have not been generated yet for this leaderboard.'
          }
          className="shadow-none rounded-none border border-dashed border-gray-200"
          {...(isOrganizerOrAdmin
            ? { actionText: 'Generate Now', onAction: handleGenerate }
            : {})}
        />
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Rank
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isPlayer ? 'Player' : 'Team'}
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {leaderboard.stat_key.replace(/_/g, ' ')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full ring-1 text-sm font-bold ${getRankBadgeClass(entry.rank)}`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {isPlayer ? (
                        <>
                          {entry.avatar_url ? (
                            <img
                              src={entry.avatar_url}
                              alt={entry.display_name}
                              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                              {(entry.display_name || '?')[0].toUpperCase()}
                            </span>
                          )}
                          <span className="text-sm font-medium text-gray-900">{entry.display_name || 'Unknown'}</span>
                        </>
                      ) : (
                        <>
                          {entry.logo_url ? (
                            <img
                              src={entry.logo_url}
                              alt={entry.team_name}
                              className="h-8 w-8 rounded object-contain flex-shrink-0"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                              {(entry.team_name || '?')[0].toUpperCase()}
                            </span>
                          )}
                          <span className="text-sm font-medium text-gray-900">{entry.team_name || 'Unknown'}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {Number(entry.stat_value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

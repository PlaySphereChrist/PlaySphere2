import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  PsButton,
  PsBadge,
  PsAlert,
  PsLoading,
  PsEmpty
} from '../../components/ui';

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
    if (rank === 1) return 'bg-gold/20 text-gold border border-gold/40';
    if (rank === 2) return 'bg-muted/20 text-secondary border border-border';
    if (rank === 3) return 'bg-[#CD7F32]/20 text-[#CD7F32] border border-[#CD7F32]/40'; // bronze
    return 'bg-surface text-secondary border border-border';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-sm text-secondary">
            Statistic: <span className="font-medium text-primary">{leaderboard.stat_key}</span>
            {leaderboard.computed_at && (
              <span className="ml-3 text-xs text-muted">
                Last generated: {new Date(leaderboard.computed_at).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        {isOrganizerOrAdmin && (
          <PsButton
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : '↻ Generate / Refresh'}
          </PsButton>
        )}
      </div>

      {genError && <PsAlert variant="error">{genError}</PsAlert>}
      {genSuccess && <PsAlert variant="success">{genSuccess}</PsAlert>}

      {loading ? (
        <div className="py-8"><PsLoading /></div>
      ) : error ? (
        <PsAlert variant="error">{error}</PsAlert>
      ) : entries.length === 0 ? (
        <div className="py-6 border border-dashed border-border rounded-xl">
          <PsEmpty
            title="No rankings yet"
            message={
              isOrganizerOrAdmin
                ? 'Click "Generate / Refresh" to calculate rankings from current statistics.'
                : 'Rankings have not been generated yet for this leaderboard.'
            }
            action={
              isOrganizerOrAdmin ? (
                <PsButton onClick={handleGenerate} disabled={generating}>
                  Generate Now
                </PsButton>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-pill-hover">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-secondary uppercase tracking-wider w-16">
                  Rank
                </th>
                <th className="px-4 py-3 text-left font-medium text-secondary uppercase tracking-wider">
                  {isPlayer ? 'Player' : 'Team'}
                </th>
                <th className="px-4 py-3 text-right font-medium text-secondary uppercase tracking-wider">
                  {leaderboard.stat_key.replace(/_/g, ' ')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-pill-hover transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-bold ${getRankBadgeClass(entry.rank)}`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {isPlayer ? (
                        <>
                          {entry.avatar_url ? (
                            <img
                              src={entry.avatar_url}
                              alt={entry.display_name}
                              className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded-full bg-maroon/10 flex items-center justify-center text-maroon font-semibold shrink-0">
                              {(entry.display_name || '?')[0].toUpperCase()}
                            </span>
                          )}
                          <span className="font-medium text-primary">{entry.display_name || 'Unknown'}</span>
                        </>
                      ) : (
                        <>
                          {entry.logo_url ? (
                            <img
                              src={entry.logo_url}
                              alt={entry.team_name}
                              className="h-8 w-8 rounded-md object-contain shrink-0"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded-md bg-gold/10 flex items-center justify-center text-gold font-semibold shrink-0">
                              {(entry.team_name || '?')[0].toUpperCase()}
                            </span>
                          )}
                          <span className="font-medium text-primary">{entry.team_name || 'Unknown'}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="font-bold text-primary tabular-nums">
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

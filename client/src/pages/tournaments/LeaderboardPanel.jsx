import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsLoading,
  PsEmpty
} from '../../components/ui';
import LeaderboardCreateForm from './LeaderboardCreateForm';
import LeaderboardEntriesTable from './LeaderboardEntriesTable';

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
    <PsCard className="overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-pill-hover flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-xl font-serif font-semibold text-primary">Leaderboards</h4>
          <p className="mt-1 text-sm text-secondary">Tournament rankings derived from official match statistics.</p>
        </div>
        {isOrganizerOrAdmin && (
          <PsButton
            variant={showCreateForm ? "secondary" : "primary"}
            onClick={() => setShowCreateForm((v) => !v)}
          >
            {showCreateForm ? 'Cancel' : '+ New Leaderboard'}
          </PsButton>
        )}
      </div>

      {/* Create form (organizer/admin only) */}
      {showCreateForm && isOrganizerOrAdmin && (
        <div className="px-6 py-5 border-b border-border bg-maroon/5">
          <LeaderboardCreateForm
            tournament={tournament}
            onCreated={handleCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Leaderboard list / tabs */}
      {loading ? (
        <div className="py-12"><PsLoading /></div>
      ) : error ? (
        <div className="p-6">
          <PsAlert variant="error">{error}</PsAlert>
        </div>
      ) : leaderboards.length === 0 ? (
        <div className="p-6">
          <PsEmpty
            title="No leaderboards yet"
            message={
              isOrganizerOrAdmin
                ? 'Create a leaderboard to rank players or teams by a statistic.'
                : 'The organizer has not set up any leaderboards for this tournament yet.'
            }
          />
        </div>
      ) : (
        <>
          {/* Tab strip */}
          <div className="border-b border-border overflow-x-auto bg-surface">
            <nav className="flex px-4 sm:px-6 min-w-max" aria-label="Leaderboard tabs">
              {leaderboards.map((lb) => (
                <button
                  key={lb.id}
                  type="button"
                  onClick={() => setSelectedLbId(lb.id)}
                  className={`whitespace-nowrap py-4 px-4 border-b-2 text-sm font-medium transition-colors ${
                    lb.id === selectedLbId
                      ? 'border-maroon text-primary'
                      : 'border-transparent text-secondary hover:text-primary hover:border-border'
                  }`}
                >
                  {lb.name}
                  <PsBadge 
                    variant={lb.leaderboard_type === 'team' ? 'default' : 'success'} 
                    className="ml-2"
                  >
                    {lb.leaderboard_type}
                  </PsBadge>
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
    </PsCard>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  PsCard,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty,
  PsBackButton
} from '../../components/ui';

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

  if (loading) return <PsLoading />;
  
  if (error && !tournament) {
    return (
      <div className="space-y-4">
        <PsBackButton to={`/tournaments/${tournamentId}`} label="Back to Tournament" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PsBackButton to={`/tournaments/${tournamentId}`} label={`Back to ${tournament.name}`} />

      <PsPageHeader 
        title="Matches" 
        subtitle={`All matches for ${tournament.name}`}
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard>
        {matches.length === 0 ? (
          <div className="py-8">
            <PsEmpty title="No matches" message="No matches are scheduled yet." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {matches.map((match) => (
              <li key={match.id}>
                <Link to={`/tournaments/${tournamentId}/matches/${match.id}`} className="block hover:bg-pill-hover transition">
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-primary truncate">
                        {match.round_name || `Round ${match.round_number}`} - Match {match.match_number}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <PsBadge variant={
                          match.status === 'completed' ? 'success' : 
                          match.status === 'in_progress' ? 'maroon' : 
                          match.status === 'cancelled' ? 'default' : 'warning'
                        }>
                          {match.status.replace('_', ' ').toUpperCase()}
                        </PsBadge>
                      </div>
                    </div>
                    
                    <div className="mt-3 sm:flex sm:justify-between items-end">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm font-medium text-primary bg-surface border border-border px-3 py-1.5 rounded-lg shadow-sm">
                          {match.participants?.map(p => p.team_name || p.registration_name).join(' vs ') || 'TBD'}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-secondary sm:mt-0">
                        {match.scheduled_at && (
                          <p className="flex items-center gap-1.5">
                            <span className="text-muted">🕒</span>
                            {new Date(match.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
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
      </PsCard>
    </div>
  );
}

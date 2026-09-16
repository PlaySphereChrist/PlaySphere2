import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { api } from '../../lib/api';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty,
  PsBackButton
} from '../../components/ui';

export default function MatchDetailsPage() {
  const { tournamentId, matchId } = useParams();
  const { user } = useAuth();
  
  const [match, setMatch] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [events, setEvents] = useState([]);
  const [statDefs, setStatDefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tournament, setTournament] = useState(null);

  // Event recording state
  const [selectedStatDefId, setSelectedStatDefId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [eventValue, setEventValue] = useState('');

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tournRes, matchRes, partsRes, eventsRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}`),
        api.get(`/matches/${matchId}`),
        api.get(`/matches/${matchId}/participants`),
        api.get(`/matches/${matchId}/performance-events`).catch(() => ({ data: { events: [] } }))
      ]);

      const t = tournRes.data.tournament;
      setTournament(t);
      setMatch(matchRes.data.match);
      setParticipants(partsRes.data.participants || []);
      
      const rawEvents = eventsRes.data.events || [];
      const eventsWithPlayers = await Promise.all(
        rawEvents.map(async (ev) => {
          try {
            const pRes = await api.get(`/performance-events/${ev.id}/players`);
            return { ...ev, players: pRes.data.players || [] };
          } catch {
            return { ...ev, players: [] };
          }
        })
      );
      setEvents(eventsWithPlayers);

      const isOwnerOrAdmin = user?.roles?.includes('ADMIN') || user?.id === t.organizer_user_id;
      if (isOwnerOrAdmin) {
        try {
          const statsRes = await api.get(`/sports/${t.sport_id}/stat-definitions`);
          setStatDefs(statsRes.data.statDefinitions || []);
        } catch (err) {
          console.error("Could not fetch stat definitions", err);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load match details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!window.confirm('Are you sure you want to start this match?')) return;
    setActionLoading(true);
    try {
      await api.post(`/matches/${matchId}/start`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to start match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelMatch = async () => {
    const reason = window.prompt('Enter cancellation reason (optional):');
    if (reason === null) return;
    setActionLoading(true);
    try {
      await api.post(`/matches/${matchId}/cancel`, { reason });
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to cancel match');
    } finally {
      setActionLoading(false);
    }
  };

  const [isCompleting, setIsCompleting] = useState(false);
  const [completeData, setCompleteData] = useState({});

  const handleStartComplete = () => {
    setIsCompleting(true);
    const initialData = {};
    participants.forEach(p => {
      initialData[p.registration_id] = { result: '', score_numeric: '' };
    });
    setCompleteData(initialData);
  };

  const handleCompleteMatch = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to complete this match?')) return;
    setActionLoading(true);
    try {
      const payloadParticipants = Object.entries(completeData).map(([regId, data]) => ({
        registration_id: regId,
        result: data.result || undefined,
        score: data.score_numeric !== '' ? { numeric: Number(data.score_numeric) } : undefined
      }));
      const winner = payloadParticipants.find(p => p.result === 'win');
      
      const payload = {
        participants: payloadParticipants,
        winner_registration_id: winner ? winner.registration_id : undefined
      };
      
      await api.post(`/matches/${matchId}/complete`, payload);
      setIsCompleting(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to complete match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordEvent = async (e) => {
    e.preventDefault();
    if (!selectedStatDefId || !selectedPlayerId) return;
    setActionLoading(true);
    try {
      const payload = {
        sport_stat_definition_id: selectedStatDefId,
        players: [{
          player_profile_id: selectedPlayerId,
          value: eventValue ? Number(eventValue) : undefined
        }]
      };
      await api.post(`/matches/${matchId}/performance-events`, payload);
      setSelectedStatDefId('');
      setSelectedPlayerId('');
      setEventValue('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to record event');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !match) {
    return (
      <div className="space-y-4">
        <PsBackButton to={`/tournaments/${tournamentId}/matches`} label="Back to Matches" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }
  
  if (!match || !tournament) return null;

  const isOwnerOrAdmin = user?.roles?.includes('ADMIN') || user?.id === tournament.organizer_user_id;

  const validPlayers = [];
  participants.forEach(p => {
    if (p.players && p.players.length > 0) {
      validPlayers.push(...p.players);
    } else if (p.individual_player_profile_id) {
      validPlayers.push({
        player_profile_id: p.individual_player_profile_id,
        display_name: p.registration_name
      });
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PsBackButton to={`/tournaments/${tournamentId}/matches`} label="Back to Matches" />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard>
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border bg-pill-hover rounded-t-2xl">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">
              {match.round_name || `Round ${match.round_number}`} - Match {match.match_number}
            </h1>
            <p className="mt-1 text-sm text-secondary">
              {tournament.name}
            </p>
          </div>
          <PsBadge variant={
            match.status === 'completed' ? 'success' : 
            match.status === 'in_progress' ? 'maroon' : 
            match.status === 'cancelled' ? 'default' : 'warning'
          }>
            {match.status.replace('_', ' ').toUpperCase()}
          </PsBadge>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary mb-2">Participants</p>
            {participants.length === 0 ? (
              <p className="text-sm text-primary">TBD</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {participants.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border border-border bg-surface flex flex-col">
                    <span className="text-xs font-semibold text-secondary uppercase mb-1">{p.side}</span>
                    <span className="text-lg font-bold text-primary">{p.team_name || p.registration_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {match.scheduled_at && (
            <div>
              <p className="text-sm font-medium text-secondary">Scheduled Time</p>
              <p className="mt-1 text-sm text-primary">
                {new Date(match.scheduled_at).toLocaleString()}
              </p>
            </div>
          )}
          {match.started_at && (
            <div>
              <p className="text-sm font-medium text-secondary">Started At</p>
              <p className="mt-1 text-sm text-primary">
                {new Date(match.started_at).toLocaleString()}
              </p>
            </div>
          )}
          {match.ended_at && (
            <div>
              <p className="text-sm font-medium text-secondary">Ended At</p>
              <p className="mt-1 text-sm text-primary">
                {new Date(match.ended_at).toLocaleString()}
              </p>
            </div>
          )}
          {match.notes && (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-secondary">Notes / Reason</p>
              <p className="mt-1 text-sm text-primary">
                {match.notes}
              </p>
            </div>
          )}
        </div>
      </PsCard>

      {/* Organizer Controls */}
      {isOwnerOrAdmin && (match.status === 'scheduled' || match.status === 'in_progress') && (
        <PsCard className="p-6 border-maroon/20">
          <h2 className="text-lg font-serif font-semibold text-primary mb-4">Organizer Controls</h2>
          <div className="flex flex-wrap gap-3">
            {match.status === 'scheduled' && (
              <>
                <PsButton onClick={handleStartMatch} disabled={actionLoading}>
                  Start Match
                </PsButton>
                <PsButton variant="ghost" onClick={handleCancelMatch} disabled={actionLoading} className="text-error">
                  Cancel Match
                </PsButton>
              </>
            )}
            {match.status === 'in_progress' && !isCompleting && (
              <PsButton onClick={handleStartComplete} disabled={actionLoading}>
                Complete Match
              </PsButton>
            )}
          </div>
          
          {isCompleting && (
            <form onSubmit={handleCompleteMatch} className="mt-6 border-t border-border pt-6 max-w-lg">
              <h3 className="text-md font-semibold text-primary mb-4">Enter Results</h3>
              <div className="space-y-4">
                {participants.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-border rounded-xl bg-surface">
                    <div className="flex-1 font-medium text-primary">{p.team_name || p.registration_name}</div>
                    <select
                      value={completeData[p.registration_id]?.result || ''}
                      onChange={e => setCompleteData({...completeData, [p.registration_id]: {...completeData[p.registration_id], result: e.target.value}})}
                      className="rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40"
                    >
                      <option value="">-- Result --</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="draw">Draw</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Score"
                      value={completeData[p.registration_id]?.score_numeric || ''}
                      onChange={e => setCompleteData({...completeData, [p.registration_id]: {...completeData[p.registration_id], score_numeric: e.target.value}})}
                      className="w-24 rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <PsButton type="submit" disabled={actionLoading}>Submit Results</PsButton>
                <PsButton variant="ghost" type="button" onClick={() => setIsCompleting(false)}>Cancel</PsButton>
              </div>
            </form>
          )}
        </PsCard>
      )}

      {/* Event Recording UI */}
      {isOwnerOrAdmin && match.status === 'in_progress' && (
        <PsCard className="p-6">
          <h2 className="text-lg font-serif font-semibold text-primary mb-4">Record Performance Event</h2>
          <form onSubmit={handleRecordEvent} className="space-y-4 max-w-lg">
            <PsSelect
              label="Event Type"
              required
              value={selectedStatDefId}
              onChange={e => setSelectedStatDefId(e.target.value)}
            >
              <option value="">-- Select Event Type --</option>
              {statDefs.map(def => (
                <option key={def.id} value={def.id}>{def.stat_name}</option>
              ))}
            </PsSelect>
            <PsSelect
              label="Player"
              required
              value={selectedPlayerId}
              onChange={e => setSelectedPlayerId(e.target.value)}
            >
              <option value="">-- Select Player --</option>
              {validPlayers.map(p => (
                <option key={p.player_profile_id} value={p.player_profile_id}>{p.display_name}</option>
              ))}
            </PsSelect>
            <PsInput
              label="Value (Optional)"
              type="number"
              value={eventValue}
              onChange={e => setEventValue(e.target.value)}
            />
            <div className="pt-2">
              <PsButton type="submit" disabled={actionLoading}>
                Record Event
              </PsButton>
            </div>
          </form>
        </PsCard>
      )}

      {/* Event Timeline */}
      {(match.status === 'in_progress' || match.status === 'completed') && (
        <PsCard className="p-6">
          <h2 className="text-lg font-serif font-semibold text-primary mb-4">Event Timeline</h2>
          {events.length === 0 ? (
            <PsEmpty title="No events" message="No performance events recorded yet." />
          ) : (
            <div className="flow-root mt-6">
              <ul className="-mb-8">
                {events.map((event, idx) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {idx !== events.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true"></span>
                      ) : null}
                      <div className="relative flex space-x-4">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-surface border-2 border-maroon flex items-center justify-center">
                            <span className="text-maroon text-xs font-bold">{idx + 1}</span>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-secondary">
                              <span className="font-medium text-primary">{event.stat_name}</span> 
                              {event.players && event.players.length > 0 && (
                                <span> by <span className="font-medium text-primary">{event.players[0].display_name}</span></span>
                              )}
                              {event.players && event.players.length > 0 && event.players[0].value !== null && (
                                <span> (Value: {event.players[0].value})</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right text-xs whitespace-nowrap text-muted">
                            {new Date(event.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PsCard>
      )}

    </div>
  );
}
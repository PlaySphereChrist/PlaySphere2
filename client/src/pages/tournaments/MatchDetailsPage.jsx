import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { api } from '../../lib/api';
import ErrorMessage from '../../components/ErrorMessage';
import Spinner from '../../components/Spinner';

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
      // Fetch players for each event
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

      // If we are organizer/admin, fetch sport definitions
      const isOwnerOrAdmin = user?.roles?.includes('ADMIN') || user?.id === t.organizer_user_id;
      if (isOwnerOrAdmin) {
        try {
          const statsRes = await api.get(`/sports/${t.sport_id}/stat-definitions`);
          setStatDefs(statsRes.data.statDefinitions || []);
        } catch {
          console.error("Could not fetch stat definitions", e);
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
    if (reason === null) return; // cancelled prompt
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
    // Initialize default states for participants
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
        score_numeric: data.score_numeric !== '' ? Number(data.score_numeric) : undefined
      }));
      const winner = payloadParticipants.find(p => p.result === 'win');
      
      const payload = {
        participants: payloadParticipants,
        winner_registration_id: winner ? winner.registration_id : undefined
      };
      
      await api.post(/matches//complete, payload);
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
      // Reset form
      setSelectedStatDefId('');
      setSelectedPlayerId('');
      setEventValue('');
      await loadData(); // refresh events
    } catch (err) {
      setError(err.message || 'Failed to record event');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;
  if (error && !match) return <ErrorMessage message={error} />;
  if (!match || !tournament) return null;

  const isOwnerOrAdmin = user?.roles?.includes('ADMIN') || user?.id === tournament.organizer_user_id;

  // Flatten participants to get a list of valid players for the event dropdown
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to={`/tournaments/${tournamentId}/matches`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
        &larr; Back to Matches
      </Link>

      {error && <ErrorMessage message={error} />}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold leading-6 text-gray-900">
              {match.round_name || `Round ${match.round_number}`} - Match {match.match_number}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {tournament.name}
            </p>
          </div>
          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
            ${match.status === 'completed' ? 'bg-green-100 text-green-800' : 
              match.status === 'in_progress' ? 'bg-red-100 text-red-800' : 
              match.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
            {match.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Participants</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {participants.length === 0 ? 'TBD' : (
                  <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                    {participants.map(p => (
                      <li key={p.id} className="p-3">
                        <div className="font-medium text-indigo-600 uppercase text-xs mb-1">{p.side}</div>
                        <div className="font-semibold">{p.team_name || p.registration_name}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            {match.scheduled_at && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Scheduled Time</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {new Date(match.scheduled_at).toLocaleString()}
                </dd>
              </div>
            )}
            {match.started_at && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Started At</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {new Date(match.started_at).toLocaleString()}
                </dd>
              </div>
            )}
            {match.ended_at && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Ended At</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {new Date(match.ended_at).toLocaleString()}
                </dd>
              </div>
            )}
            {match.notes && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes / Reason</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {match.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Organizer Controls */}
      {isOwnerOrAdmin && (match.status === 'scheduled' || match.status === 'in_progress') && (
        <div className="bg-gray-50 shadow sm:rounded-lg p-6 border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Organizer Controls</h4>
          <div className="flex flex-wrap gap-4">
            {match.status === 'scheduled' && (
              <>
                <button
                  onClick={handleStartMatch}
                  disabled={actionLoading}
                  className="inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
                >
                  Start Match
                </button>
                <button
                  onClick={handleCancelMatch}
                  disabled={actionLoading}
                  className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel Match
                </button>
              </>
            )}
            {match.status === 'in_progress' && !isCompleting && (
              <button
                onClick={handleStartComplete}
                disabled={actionLoading}
                className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                Complete Match
              </button>
            )}
          </div>
          {isCompleting && (
            <form onSubmit={handleCompleteMatch} className="mt-6 border-t border-gray-200 pt-6 max-w-lg">
              <h5 className="text-md font-medium text-gray-900 mb-4">Enter Results</h5>
              <div className="space-y-4">
                {participants.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-gray-200 rounded-md">
                    <div className="flex-1 font-medium">{p.team_name || p.registration_name}</div>
                    <select
                      value={completeData[p.registration_id]?.result || ''}
                      onChange={e => setCompleteData({...completeData, [p.registration_id]: {...completeData[p.registration_id], result: e.target.value}})}
                      className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                      className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={actionLoading} className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">Submit Results</button>
                <button type="button" onClick={() => setIsCompleting(false)} className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Event Recording UI */}
      {isOwnerOrAdmin && match.status === 'in_progress' && (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Record Performance Event</h4>
          <form onSubmit={handleRecordEvent} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Type</label>
              <select
                required
                value={selectedStatDefId}
                onChange={e => setSelectedStatDefId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">-- Select Event Type --</option>
                {statDefs.map(def => (
                  <option key={def.id} value={def.id}>{def.stat_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Player</label>
              <select
                required
                value={selectedPlayerId}
                onChange={e => setSelectedPlayerId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">-- Select Player --</option>
                {validPlayers.map(p => (
                  <option key={p.player_profile_id} value={p.player_profile_id}>{p.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Value (Optional)</label>
              <input
                type="number"
                value={eventValue}
                onChange={e => setEventValue(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              Record Event
            </button>
          </form>
        </div>
      )}

      {/* Event Timeline */}
      {(match.status === 'in_progress' || match.status === 'completed') && (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Event Timeline</h4>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No events recorded.</p>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {events.map((event, idx) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {idx !== events.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                            <span className="text-white text-xs font-bold">{idx + 1}</span>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{event.stat_name}</span> 
                              {event.players && event.players.length > 0 && (
                                <span> by <span className="font-medium">{event.players[0].display_name}</span></span>
                              )}
                              {event.players && event.players.length > 0 && event.players[0].value !== null && (
                                <span> (Value: {event.players[0].value})</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {new Date(event.recorded_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

    </div>
  );
}






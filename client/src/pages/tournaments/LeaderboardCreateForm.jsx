import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';

/**
 * LeaderboardCreateForm — lets organizer/admin create a new leaderboard.
 * Props:
 *   tournament : full tournament object (provides sport_id)
 *   onCreated  : callback(newLeaderboard)
 *   onCancel   : callback()
 */
export default function LeaderboardCreateForm({ tournament, onCreated, onCancel }) {
  const [statDefs, setStatDefs] = useState([]);
  const [defsLoading, setDefsLoading] = useState(true);
  const [defsError, setDefsError] = useState('');

  const [name, setName] = useState('');
  const [statKey, setStatKey] = useState('');
  const [lbType, setLbType] = useState('player');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setDefsLoading(true);
        const res = await api.get(`/sports/${tournament.sport_id}/stat-definitions`);
        setStatDefs(res.data?.statDefinitions || []);
      } catch (err) {
        setDefsError('Could not load stat definitions: ' + (err.message || ''));
      } finally {
        setDefsLoading(false);
      }
    };
    load();
  }, [tournament.sport_id]);

  // Filter stat defs by the selected leaderboard type's applicability
  const filteredDefs = statDefs.filter((d) => {
    if (lbType === 'player') return d.applies_to === 'player' || d.applies_to === 'both';
    if (lbType === 'team') return d.applies_to === 'team' || d.applies_to === 'both';
    return true;
  });

  // Reset statKey when lbType changes if currently selected key is incompatible
  useEffect(() => {
    const available = statDefs.filter((d) => {
      if (lbType === 'player') return d.applies_to === 'player' || d.applies_to === 'both';
      if (lbType === 'team') return d.applies_to === 'team' || d.applies_to === 'both';
      return true;
    });
    if (statKey && !available.find((d) => d.stat_key === statKey)) {
      setStatKey('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !statKey || !lbType) {
      setSubmitError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await api.post('/leaderboards', {
        tournamentId: tournament.id,
        sport_id: tournament.sport_id,
        stat_key: statKey,
        leaderboard_type: lbType,
        name: name.trim(),
      });
      onCreated(res.leaderboard);
    } catch (err) {
      setSubmitError(err.data?.message || err.message || 'Failed to create leaderboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <h5 className="text-sm font-semibold text-gray-900">Create New Leaderboard</h5>

      <ErrorMessage message={submitError} />
      <ErrorMessage message={defsError} />

      <div>
        <label className="block text-sm font-medium text-gray-700">Leaderboard Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Top Scorers"
          maxLength={120}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Participant Type</label>
        <select
          value={lbType}
          onChange={(e) => setLbType(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          disabled={submitting}
        >
          <option value="player">Player</option>
          <option value="team">Team</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Statistic</label>
        {defsLoading ? (
          <Spinner size="sm" className="mt-2" />
        ) : (
          <select
            value={statKey}
            onChange={(e) => setStatKey(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            disabled={submitting || filteredDefs.length === 0}
          >
            <option value="">-- Select statistic --</option>
            {filteredDefs.map((d) => (
              <option key={d.id} value={d.stat_key}>
                {d.stat_name} ({d.stat_key})
              </option>
            ))}
          </select>
        )}
        {!defsLoading && filteredDefs.length === 0 && !defsError && (
          <p className="mt-1 text-xs text-amber-600">No {lbType} statistics defined for this sport.</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || defsLoading || !name.trim() || !statKey}
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {submitting ? <Spinner size="sm" /> : 'Create Leaderboard'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

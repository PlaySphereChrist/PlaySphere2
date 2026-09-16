import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  PsButton,
  PsInput,
  PsSelect,
  PsAlert,
  PsLoading
} from '../../components/ui';

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

  const filteredDefs = statDefs.filter((d) => {
    if (lbType === 'player') return d.applies_to === 'player' || d.applies_to === 'both';
    if (lbType === 'team') return d.applies_to === 'team' || d.applies_to === 'both';
    return true;
  });

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
      <h5 className="text-base font-serif font-semibold text-primary">Create New Leaderboard</h5>

      {submitError && <PsAlert variant="error">{submitError}</PsAlert>}
      {defsError && <PsAlert variant="error">{defsError}</PsAlert>}

      <PsInput
        label="Leaderboard Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Top Scorers"
        maxLength={120}
        disabled={submitting}
      />

      <PsSelect
        label="Participant Type"
        value={lbType}
        onChange={(e) => setLbType(e.target.value)}
        disabled={submitting}
      >
        <option value="player">Player</option>
        <option value="team">Team</option>
      </PsSelect>

      <div>
        <label className="block text-sm font-medium text-primary mb-1">Statistic</label>
        {defsLoading ? (
          <div className="py-2"><PsLoading message="Loading statistics..." /></div>
        ) : (
          <select
            value={statKey}
            onChange={(e) => setStatKey(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40 transition"
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
          <p className="mt-1 text-xs text-warning">No {lbType} statistics defined for this sport.</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <PsButton
          type="submit"
          disabled={submitting || defsLoading || !name.trim() || !statKey}
        >
          {submitting ? 'Creating...' : 'Create Leaderboard'}
        </PsButton>
        <PsButton
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </PsButton>
      </div>
    </form>
  );
}

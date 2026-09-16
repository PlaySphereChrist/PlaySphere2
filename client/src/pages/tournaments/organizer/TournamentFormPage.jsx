import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsTextarea,
  PsAlert,
  PsPageHeader,
  PsLoading
} from '../../../components/ui';

export default function TournamentFormPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(tournamentId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sports, setSports] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    sport_id: '',
    format: 'knockout',
    participation_type: 'team',
    description: '',
    city: '',
    venue_details: '',
    registration_fee: 0,
    prize_pool: 0,
    max_teams: '',
    min_teams: '',
    registration_opens_at: '',
    registration_closes_at: '',
    starts_at: '',
    ends_at: ''
  });

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const sportsRes = await api.get('/sports');
        setSports(sportsRes.data.sports);

        if (isEdit) {
          const tRes = await api.get(`/tournaments/${tournamentId}`);
          const t = tRes.data.tournament;
          const formatDate = (ds) => ds ? new Date(ds).toISOString().slice(0, 16) : '';
          
          setFormData({
            name: t.name,
            sport_id: t.sport_id,
            format: t.format,
            participation_type: t.participation_type,
            description: t.description || '',
            city: t.city || '',
            venue_details: t.venue_details || '',
            registration_fee: t.registration_fee || 0,
            prize_pool: t.prize_pool || 0,
            max_teams: t.max_teams || '',
            min_teams: t.min_teams || '',
            registration_opens_at: formatDate(t.registration_opens_at),
            registration_closes_at: formatDate(t.registration_closes_at),
            starts_at: formatDate(t.starts_at),
            ends_at: formatDate(t.ends_at)
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [tournamentId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = { ...formData };
      ['max_teams', 'min_teams', 'registration_fee', 'prize_pool'].forEach(f => {
        if (payload[f] === '') payload[f] = null;
        else if (payload[f] !== null) payload[f] = Number(payload[f]);
      });
      ['registration_opens_at', 'registration_closes_at', 'starts_at', 'ends_at'].forEach(f => {
        if (!payload[f]) payload[f] = null;
        else payload[f] = new Date(payload[f]).toISOString();
      });

      let res;
      if (isEdit) {
        res = await api.patch(`/tournaments/${tournamentId}`, payload);
      } else {
        res = await api.post('/tournaments', payload);
      }
      navigate(`/organizer/tournaments/${res.data.tournament.id}/manage`);
    } catch (err) {
      setError(err.data?.error || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PsLoading />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PsPageHeader 
        title={isEdit ? 'Edit Tournament' : 'Create Tournament'} 
        actions={
          <Link to="/organizer/tournaments">
            <PsButton variant="ghost">Cancel</PsButton>
          </Link>
        }
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <PsInput
                label="Tournament Name *"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <PsSelect
              label="Sport *"
              name="sport_id"
              required
              disabled={isEdit}
              value={formData.sport_id}
              onChange={handleChange}
            >
              <option value="">Select Sport</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </PsSelect>

            <PsSelect
              label="Format *"
              name="format"
              required
              value={formData.format}
              onChange={handleChange}
            >
              <option value="knockout">Knockout</option>
              <option value="league">League</option>
              <option value="round_robin">Round Robin</option>
              <option value="group_stage_knockout">Group Stage & Knockout</option>
            </PsSelect>

            <PsSelect
              label="Participation Type *"
              name="participation_type"
              required
              disabled={isEdit}
              value={formData.participation_type}
              onChange={handleChange}
            >
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </PsSelect>
            
            <div className="sm:col-span-2">
              <PsTextarea
                label="Description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <PsInput
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
            />
            
            <PsInput
              label="Venue Details"
              name="venue_details"
              value={formData.venue_details}
              onChange={handleChange}
            />

            <PsInput
              label="Registration Opens At"
              type="datetime-local"
              name="registration_opens_at"
              value={formData.registration_opens_at}
              onChange={handleChange}
            />

            <PsInput
              label="Registration Closes At"
              type="datetime-local"
              name="registration_closes_at"
              value={formData.registration_closes_at}
              onChange={handleChange}
            />

            <PsInput
              label="Tournament Starts At"
              type="datetime-local"
              name="starts_at"
              value={formData.starts_at}
              onChange={handleChange}
            />

            <PsInput
              label="Tournament Ends At"
              type="datetime-local"
              name="ends_at"
              value={formData.ends_at}
              onChange={handleChange}
            />

            <PsInput
              label={`Max Capacity (${formData.participation_type === 'team' ? 'Teams' : 'Players'})`}
              type="number"
              min="2"
              name="max_teams"
              value={formData.max_teams}
              onChange={handleChange}
            />

            <PsInput
              label={`Min Required (${formData.participation_type === 'team' ? 'Teams' : 'Players'})`}
              type="number"
              min="2"
              name="min_teams"
              value={formData.min_teams}
              onChange={handleChange}
            />

            <PsInput
              label="Registration Fee"
              type="number"
              min="0"
              step="0.01"
              name="registration_fee"
              value={formData.registration_fee}
              onChange={handleChange}
            />

            <PsInput
              label="Prize Pool"
              type="number"
              min="0"
              step="0.01"
              name="prize_pool"
              value={formData.prize_pool}
              onChange={handleChange}
            />
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-border mt-6">
            <Link to="/organizer/tournaments">
              <PsButton variant="ghost" type="button">Cancel</PsButton>
            </Link>
            <PsButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Tournament'}
            </PsButton>
          </div>
        </form>
      </PsCard>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import Spinner from '../../../components/Spinner';
import ErrorMessage from '../../../components/ErrorMessage';

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
          // Format dates for datetime-local input
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
      // Clean up empty numbers
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

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEdit ? 'Edit Tournament' : 'Create Tournament'}
        </h1>
        <Link to="/organizer/tournaments" className="text-sm text-indigo-600 hover:text-indigo-500">
          Cancel
        </Link>
      </div>

      <ErrorMessage message={error} />

      <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 space-y-6">
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700">Tournament Name *</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Sport *</label>
            <select name="sport_id" required disabled={isEdit} value={formData.sport_id} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="">Select Sport</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Format *</label>
            <select name="format" required value={formData.format} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="knockout">Knockout</option>
              <option value="league">League</option>
              <option value="round_robin">Round Robin</option>
              <option value="group_stage_knockout">Group Stage & Knockout</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Participation Type *</label>
            <select name="participation_type" required disabled={isEdit} value={formData.participation_type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          
          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
          
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Venue Details</label>
            <input type="text" name="venue_details" value={formData.venue_details} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Registration Opens At</label>
            <input type="datetime-local" name="registration_opens_at" value={formData.registration_opens_at} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Registration Closes At</label>
            <input type="datetime-local" name="registration_closes_at" value={formData.registration_closes_at} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Tournament Starts At</label>
            <input type="datetime-local" name="starts_at" value={formData.starts_at} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Tournament Ends At</label>
            <input type="datetime-local" name="ends_at" value={formData.ends_at} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>

          {formData.participation_type === 'team' && (
            <>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Max Capacity (Teams)</label>
                <input type="number" min="2" name="max_teams" value={formData.max_teams} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Min Required (Teams)</label>
                <input type="number" min="2" name="min_teams" value={formData.min_teams} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
            </>
          )}
          {formData.participation_type === 'individual' && (
            <>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Max Capacity (Players)</label>
                <input type="number" min="2" name="max_teams" value={formData.max_teams} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Min Required (Players)</label>
                <input type="number" min="2" name="min_teams" value={formData.min_teams} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
            </>
          )}

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Registration Fee</label>
            <input type="number" min="0" step="0.01" name="registration_fee" value={formData.registration_fee} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">Prize Pool</label>
            <input type="number" min="0" step="0.01" name="prize_pool" value={formData.prize_pool} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div className="pt-5 flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex justify-center rounded-md bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
            {saving ? <Spinner size="sm" /> : 'Save Tournament'}
          </button>
        </div>
      </form>
    </div>
  );
}

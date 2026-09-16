import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsTextarea,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsBackButton
} from '../components/ui';

export default function CasualGameForm() {
  const { gameId } = useParams();
  const isEditing = !!gameId;
  const navigate = useNavigate();

  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    sport_id: '',
    title: '',
    description: '',
    game_date: '',
    start_time: '',
    location_name: '',
    max_players: '',
    skill_level: ''
  });

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await api.get('/sports');
        setSports(res.data.sports);
      } catch (e) {
        console.error(e);
      }
    };

    const fetchGame = async () => {
      try {
        const res = await api.get(`/casual-games/${gameId}`);
        const game = res.data.game;
        const scheduled = new Date(game.scheduled_at);
        
        setFormData({
          sport_id: game.sport_id,
          title: game.title,
          description: game.description || '',
          game_date: scheduled.toISOString().split('T')[0],
          start_time: scheduled.toISOString().split('T')[1].substring(0, 5),
          location_name: game.location_name,
          max_players: game.max_participants,
          skill_level: game.skill_level
        });
      } catch {
        setError('Failed to load game for editing');
      } finally {
        setLoading(false);
      }
    };

    fetchSports();
    if (isEditing) {
      fetchGame();
    }
  }, [gameId, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        max_players: parseInt(formData.max_players, 10)
      };

      if (isEditing) {
        await api.patch(`/casual-games/${gameId}`, data);
        navigate(`/casual-games/${gameId}`);
      } else {
        const res = await api.post('/casual-games', data);
        navigate(`/casual-games/${res.data.game.id}`);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to save game');
      setSubmitting(false);
    }
  };

  if (loading) return <PsLoading />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PsBackButton to={isEditing ? `/casual-games/${gameId}` : '/casual-games'} label="Back" />
      <PsPageHeader title={isEditing ? 'Edit Casual Game' : 'Create Casual Game'} />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <PsInput
                label="Title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <PsSelect
              label="Sport"
              name="sport_id"
              required
              disabled={isEditing}
              value={formData.sport_id}
              onChange={handleChange}
            >
              <option value="">Select a sport...</option>
              {sports.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </PsSelect>

            <PsSelect
              label="Skill Level"
              name="skill_level"
              required
              value={formData.skill_level}
              onChange={handleChange}
            >
              <option value="">Select skill level...</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
              <option value="Professional">Professional</option>
            </PsSelect>

            <PsInput
              label="Date"
              type="date"
              name="game_date"
              required
              value={formData.game_date}
              onChange={handleChange}
            />

            <PsInput
              label="Start Time"
              type="time"
              name="start_time"
              required
              value={formData.start_time}
              onChange={handleChange}
            />

            <div className="sm:col-span-2">
              <PsInput
                label="Location Name"
                name="location_name"
                required
                value={formData.location_name}
                onChange={handleChange}
                placeholder="e.g. Central Park Field 3"
              />
            </div>

            <div className="sm:col-span-2">
              <PsInput
                label="Maximum Players"
                type="number"
                name="max_players"
                required
                min="2"
                value={formData.max_players}
                onChange={handleChange}
              />
              {isEditing && (
                <p className="mt-1 text-xs text-secondary">Cannot be reduced below the current number of participants.</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <PsTextarea
                label="Description (Optional)"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Any additional details..."
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-border mt-6">
            <PsButton
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              Cancel
            </PsButton>
            <PsButton
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </PsButton>
          </div>
        </form>
      </PsCard>
    </div>
  );
}

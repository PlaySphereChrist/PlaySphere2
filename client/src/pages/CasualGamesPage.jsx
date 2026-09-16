import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/AuthContext';
import {
  PsButton,
  PsCard,
  PsSelect,
  PsInput,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../components/ui';

export default function CasualGamesPage() {
  const [games, setGames] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [sportId, setSportId] = useState('');
  const [status, setStatus] = useState('open');
  const [skillLevel, setSkillLevel] = useState('');
  const [date, setDate] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await api.get('/sports');
        setSports(res.data.sports);
      } catch (err) {
        console.error('Failed to load sports', err);
      }
    };

    const fetchGames = async () => {
      try {
        setLoading(true);
        const params = new window.URLSearchParams();
        if (sportId) params.append('sport_id', sportId);
        if (status) params.append('status', status);
        if (skillLevel) params.append('skill_level', skillLevel);
        if (date) params.append('date', date);

        const res = await api.get(`/casual-games?${params.toString()}`);
        setGames(res.data.games);
        setError('');
      } catch (err) {
        setError(err.data?.error || err.message || 'Failed to load games');
      } finally {
        setLoading(false);
      }
    };

    fetchSports();
    fetchGames();
  }, [sportId, status, skillLevel, date]);

  const getStatusVariant = (s) => {
    switch (s) {
      case 'open': return 'success';
      case 'full': return 'warning';
      case 'cancelled': return 'danger';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getSportEmoji = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('football')) return '⚽';
    if (lower.includes('basketball')) return '🏀';
    if (lower.includes('cricket')) return '🏏';
    if (lower.includes('volleyball')) return '🏐';
    return '🏆';
  };

  return (
    <div className="space-y-6">
      <PsPageHeader 
        title="Casual Games" 
        subtitle="Find and join pickup games in your area."
        actions={
          <Link to="/casual-games/create">
            <PsButton>Create Game</PsButton>
          </Link>
        }
      />

      <PsCard className="p-4 bg-surface">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <PsSelect
            label="Sport"
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
          >
            <option value="">All Sports</option>
            {sports.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </PsSelect>

          <PsSelect
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="full">Full</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="">All Statuses</option>
          </PsSelect>

          <PsSelect
            label="Skill Level"
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Expert">Expert</option>
            <option value="Professional">Professional</option>
          </PsSelect>

          <PsInput
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </PsCard>

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {loading ? (
        <PsLoading />
      ) : games.length === 0 ? (
        <PsEmpty 
          title="No casual games found" 
          message="No casual games found matching your filters." 
          action={
            <Link to="/casual-games/create">
              <PsButton>Create Game</PsButton>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map(game => (
            <PsCard key={game.id} className="flex flex-col hover:border-maroon/50 transition">
              <div className="p-6 flex-grow">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                  <PsBadge variant="default">
                    {getSportEmoji(game.sport_name)} {game.sport_name}
                  </PsBadge>
                  <PsBadge variant={getStatusVariant(game.status)}>
                    {game.status.toUpperCase()}
                  </PsBadge>
                </div>
                <h3 className="text-xl font-serif font-bold text-primary truncate" title={game.title}>
                  {game.title}
                </h3>
                <div className="mt-4 text-sm text-secondary space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="text-muted">📅</span>
                    {new Date(game.scheduled_at).toLocaleDateString()} at {new Date(game.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-muted">📍</span>
                    <span className="truncate">{game.location_name}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-muted">⭐</span>
                    {game.skill_level}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-muted">👥</span>
                    <div className="flex-1 bg-surface border border-border h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-maroon/60 rounded-full" 
                        style={{ width: `${Math.min(100, (game.current_participants / game.max_participants) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-primary w-12 text-right">
                      {game.current_participants}/{game.max_participants}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-pill-hover px-6 py-4 border-t border-border flex justify-between items-center rounded-b-2xl">
                <div className="text-sm text-secondary">
                  By <span className="font-medium text-primary">{game.creator_id === user?.id ? 'You' : game.creator_name}</span>
                </div>
                <Link to={`/casual-games/${game.id}`}>
                  <PsButton size="sm">View</PsButton>
                </Link>
              </div>
            </PsCard>
          ))}
        </div>
      )}
    </div>
  );
}

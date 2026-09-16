import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../store/AuthContext';
import {
  PsButton,
  PsCard,
  PsSelect,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../../components/ui';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [sportId, setSportId] = useState('');
  const [status, setStatus] = useState('registration_open');

  const { user } = useAuth();
  const isOrganizerOrAdmin = user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN');

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await api.get('/sports');
        setSports(res.data.sports);
      } catch (err) {
        console.error('Failed to load sports', err);
      }
    };
    fetchSports();
  }, []);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const params = new window.URLSearchParams();
        if (sportId) params.append('sport_id', sportId);
        if (status && isOrganizerOrAdmin) params.append('status', status);

        const res = await api.get(`/tournaments?${params.toString()}`);
        setTournaments(res.data.tournaments || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [sportId, status, isOrganizerOrAdmin]);

  const getSportEmoji = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('football')) return '⚽';
    if (lower.includes('basketball')) return '🏀';
    if (lower.includes('cricket')) return '🏏';
    if (lower.includes('volleyball')) return '🏐';
    return '🏆';
  };

  const getStatusBadgeVariant = (s) => {
    switch (s) {
      case 'registration_open': return 'success';
      case 'in_progress': return 'maroon';
      case 'completed': return 'default';
      case 'cancelled': return 'danger';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (s) => {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <PsPageHeader 
        title="Tournaments" 
        actions={
          isOrganizerOrAdmin && (
            <Link to="/organizer/tournaments">
              <PsButton variant="secondary">Manage Tournaments</PsButton>
            </Link>
          )
        }
      />

      <PsCard className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          
          {isOrganizerOrAdmin && (
            <PsSelect
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="registration_open">Registration Open</option>
              <option value="registration_closed">Registration Closed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </PsSelect>
          )}
        </div>
      </PsCard>

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {loading ? (
        <PsLoading />
      ) : tournaments.length === 0 ? (
        <PsEmpty title="No tournaments found" message="Try adjusting your filters." />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(tournament => (
            <PsCard key={tournament.id} className="flex flex-col hover:border-maroon/50 transition h-full">
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <PsBadge variant="default" className="shrink-0 flex items-center gap-1">
                    <span>{getSportEmoji(tournament.sport_name)}</span>
                    {tournament.sport_name}
                  </PsBadge>
                  <PsBadge variant={getStatusBadgeVariant(tournament.status)} className="shrink-0">
                    {getStatusLabel(tournament.status)}
                  </PsBadge>
                </div>
                
                <h3 className="text-xl font-serif font-bold text-primary mb-3 leading-tight">
                  {tournament.name}
                </h3>
                
                <div className="mt-auto space-y-2 text-sm text-secondary">
                  <p className="flex items-center gap-2">
                    <span className="text-muted">📅</span> 
                    {new Date(tournament.starts_at).toLocaleDateString()} - {new Date(tournament.ends_at).toLocaleDateString()}
                  </p>
                  <p className="flex items-center gap-2 text-xs">
                    <span className="text-muted">👥</span> 
                    <span className="capitalize">{tournament.participation_type}</span> ({tournament.format.replace(/_/g, ' ')})
                  </p>
                  <p className="flex items-center gap-2 text-xs">
                    <span className="text-muted">📍</span> 
                    {tournament.city || 'TBD'}
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border bg-pill-hover rounded-b-2xl">
                <Link to={`/tournaments/${tournament.id}`}>
                  <PsButton variant="secondary" className="w-full">
                    View Details
                  </PsButton>
                </Link>
              </div>
            </PsCard>
          ))}
        </div>
      )}
    </div>
  );
}

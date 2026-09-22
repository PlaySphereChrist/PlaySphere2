import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PsButton,
  PsCard,
  PsInput,
  PsTextarea,
  PsSelect,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty,
} from '../components/ui';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [sports, setSports] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showCreate, setShowCreate] = useState(false);
  
  // Create form state
  const [formData, setFormData] = useState({ name: '', sport_id: '', description: '', city: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [teamsRes, invRes, sportsRes] = await Promise.all([
        api.get('/teams'),
        api.get('/team-invitations'),
        api.get('/sports')
      ]);

      setTeams(teamsRes.data.teams || []);
      setInvitations(invRes.data.invitations || []);
      setSports(sportsRes.data.sports || []);
    } catch (err) {
      setError(err.message || 'Failed to load teams data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!formData.name || !formData.sport_id) {
      setCreateError('Name and Sport are required.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await api.post('/teams', formData);
      setShowCreate(false);
      setFormData({ name: '', sport_id: '', description: '', city: '' });
      
      // Navigate to the new team page directly
      if (res.data?.team?.id) {
        navigate(`/teams/${res.data.team.id}`);
      } else {
        fetchData();
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create team.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRespond = async (invitationId, action) => {
    try {
      await api.post(`/team-invitations/${invitationId}/respond`, { action });
      fetchData(); // Refresh everything
    } catch (err) {
      setError(err.message || 'Failed to respond to invitation.');
    }
  };

  if (loading) return <PsLoading />;

  return (
    <div className="space-y-6">
      <PsPageHeader 
        title="Teams" 
        actions={
          <PsButton 
            variant={showCreate ? "secondary" : "primary"} 
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? 'Cancel' : '+ Create Team'}
          </PsButton>
        }
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {/* CREATE FORM */}
      {showCreate && (
        <PsCard className="p-6 border-maroon/20 bg-maroon/5">
          <h2 className="text-lg font-serif font-semibold text-primary mb-4">Create a New Team</h2>
          {createError && <PsAlert variant="error" className="mb-4">{createError}</PsAlert>}
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
              <PsInput
                label="Team Name *"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <PsSelect
                label="Sport *"
                required
                value={formData.sport_id}
                onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
              >
                <option value="">Select a sport...</option>
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </PsSelect>
              <PsInput
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <PsTextarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div className="flex justify-end pt-2">
              <PsButton type="submit" disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create Team'}
              </PsButton>
            </div>
          </form>
        </PsCard>
      )}

      {/* PENDING INVITATIONS */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-serif font-semibold text-primary">Pending Invitations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map(inv => (
              <PsCard key={inv.id} className="p-4 flex flex-col justify-between gap-4 border-gold/40 bg-gold/5">
                <div>
                  <h3 className="text-sm font-semibold text-primary">{inv.team_name}</h3>
                  <p className="text-xs text-secondary mt-1">Invited by: {inv.inviter_name}</p>
                </div>
                <div className="flex gap-2">
                  <PsButton size="sm" onClick={() => handleRespond(inv.id, 'accept')}>Accept</PsButton>
                  <PsButton size="sm" variant="secondary" onClick={() => handleRespond(inv.id, 'reject')}>Decline</PsButton>
                </div>
              </PsCard>
            ))}
          </div>
        </div>
      )}

      {/* MY TEAMS */}
      <div className="space-y-4">
        <h2 className="text-lg font-serif font-semibold text-primary">My Teams</h2>
        
        {teams.length === 0 ? (
          <PsEmpty 
            title="No Teams Yet" 
            message="You are not part of any teams. Create one or ask a manager to invite you." 
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <PsCard key={team.id} className="hover:border-maroon/50 transition">
                <Link to={`/teams/${team.id}`} className="block p-5 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-primary truncate pr-2">{team.name}</h3>
                    {team.is_manager && (
                      <PsBadge variant="maroon">Manager</PsBadge>
                    )}
                  </div>
                  <p className="text-sm text-secondary mb-4">{team.sport_name}</p>
                  <div className="mt-auto flex items-center justify-between text-xs text-secondary">
                    <span className="flex items-center gap-1">
                      👥 {team.member_count} members
                    </span>
                    {team.city && (
                      <span className="flex items-center gap-1 text-muted">
                        📍 {team.city}
                      </span>
                    )}
                  </div>
                </Link>
              </PsCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
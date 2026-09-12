import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          {showCreate ? 'Cancel' : '+ Create Team'}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* CREATE FORM */}
      {showCreate && (
        <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">Create a New Team</h2>
          {createError && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="text-sm text-red-700">{createError}</div>
            </div>
          )}
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Sport *</label>
                <select
                  required
                  value={formData.sport_id}
                  onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select a sport...</option>
                  {sports.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={createLoading}
                className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INVITATIONS */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-3">Pending Invitations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invitations.map(inv => (
              <div key={inv.id} className="bg-white shadow sm:rounded-lg px-4 py-4 border-l-4 border-yellow-400 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{inv.team_name}</h3>
                  {inv.message && <p className="text-sm text-gray-500 italic mt-1">&quot;{inv.message}&quot;</p>}
                  <p className="text-xs text-gray-400 mt-2">Invited on {new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => handleRespond(inv.id, 'accept')}
                    className="flex-1 bg-indigo-50 text-indigo-700 py-1.5 px-3 rounded text-sm font-medium hover:bg-indigo-100"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(inv.id, 'reject')}
                    className="flex-1 bg-red-50 text-red-700 py-1.5 px-3 rounded text-sm font-medium hover:bg-red-100"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAMS LIST */}
      <div>
        <h2 className="text-lg font-medium leading-6 text-gray-900 mb-3">My Teams</h2>
        {teams.length === 0 ? (
          <div className="text-center rounded-lg border-2 border-dashed border-gray-300 p-12">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No teams</h3>
            <p className="mt-1 text-sm text-gray-500">You haven&apos;t joined or created any teams yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map(team => (
              <Link key={team.id} to={`/teams/${team.id}`} className="block">
                <div className="bg-white shadow sm:rounded-lg hover:shadow-md transition-shadow h-full flex flex-col p-5 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900 truncate pr-2">{team.name}</h3>
                    {team.is_manager && (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                        Manager
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 flex-1">
                    <p className="mb-1">{team.sport_name}</p>
                    {team.city && <p className="text-gray-400">{team.city}</p>}
                    {!team.is_active && (
                      <span className="inline-block mt-2 text-xs text-red-600 font-medium">Inactive</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

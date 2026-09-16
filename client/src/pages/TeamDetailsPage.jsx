import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/AuthContext';
import {
  PsButton,
  PsCard,
  PsInput,
  PsTextarea,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty,
  PsBackButton,
} from '../components/ui';

export default function TeamDetailsPage() {
  const { teamId } = useParams();
  const { user } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Invite
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [teamRes, membersRes] = await Promise.all([
        api.get(`/teams/${teamId}`),
        api.get(`/teams/${teamId}/members`)
      ]);

      setTeam(teamRes.data.team);
      setMembers(membersRes.data.members || []);
      setEditData({
        name: teamRes.data.team.name,
        description: teamRes.data.team.description || '',
        city: teamRes.data.team.city || '',
        is_active: teamRes.data.team.is_active
      });
    } catch (err) {
      setError(err.message || 'Failed to load team details.');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (inviteSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(inviteSearchQuery)}`);
        setSearchResults(res.data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [inviteSearchQuery]);

  const isManager = team?.manager_user_id === user?.id;

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      const res = await api.patch(`/teams/${teamId}`, editData);
      setTeam(res.data.team);
      setIsEditing(false);
    } catch (err) {
      setEditError(err.message || 'Failed to update team.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    try {
      await api.delete(`/teams/${teamId}/members/${memberId}`);
      const membersRes = await api.get(`/teams/${teamId}/members`);
      setMembers(membersRes.data.members || []);
    } catch (err) {
      window.alert(err.message || 'Failed to remove member.');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!selectedUser) {
      setInviteError('Please select a user to invite.');
      return;
    }

    setInviteLoading(true);
    try {
      await api.post(`/teams/${teamId}/invitations`, { 
        invited_user_id: selectedUser.id, 
        message: inviteMessage.trim() 
      });
      setInviteSuccess('Invitation sent successfully!');
      setSelectedUser(null);
      setInviteSearchQuery('');
      setInviteMessage('');
    } catch (err) {
      setInviteError(err.message || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) return <PsLoading />;

  if (error && !team) {
    return (
      <div className="space-y-4">
        <PsBackButton />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PsBackButton to="/teams" label="Back to Teams" />
      
      {/* HEADER */}
      <PsPageHeader 
        title={
          <div className="flex items-center gap-3">
            {team.name}
            {!team.is_active && <PsBadge variant="danger">Inactive</PsBadge>}
          </div>
        }
        actions={
          isManager && !isEditing && (
            <PsButton variant="secondary" onClick={() => setIsEditing(true)}>
              Edit Team
            </PsButton>
          )
        }
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {/* EDIT FORM OR INFO */}
      {isEditing && isManager ? (
        <PsCard className="p-6">
          <h2 className="text-lg font-serif font-semibold text-primary mb-4">Edit Team</h2>
          {editError && <PsAlert variant="error" className="mb-4">{editError}</PsAlert>}
          <form onSubmit={handleUpdateTeam} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PsInput
                label="Team Name *"
                required
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
              <PsInput
                label="City"
                value={editData.city}
                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
              />
            </div>
            <PsTextarea
              label="Description"
              rows={2}
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            />
            <div className="flex items-center pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editData.is_active}
                onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-border text-maroon focus:ring-maroon accent-maroon"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-primary">
                Team is Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <PsButton variant="ghost" onClick={() => setIsEditing(false)} disabled={editLoading}>
                Cancel
              </PsButton>
              <PsButton type="submit" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </PsButton>
            </div>
          </form>
        </PsCard>
      ) : (
        <PsCard>
          <div className="px-6 py-4 flex justify-between items-center bg-pill-hover border-b border-border rounded-t-2xl">
            <h3 className="font-semibold text-primary">Team Information</h3>
            <PsBadge>{team.sport_name}</PsBadge>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-secondary">City</p>
              <p className="mt-1 text-sm text-primary">{team.city || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-secondary">Created On</p>
              <p className="mt-1 text-sm text-primary">{new Date(team.created_at).toLocaleDateString()}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-secondary">Description</p>
              <p className="mt-1 text-sm text-primary whitespace-pre-wrap">{team.description || 'No description provided.'}</p>
            </div>
          </div>
        </PsCard>
      )}

      {/* TEAM MEMBERS AND INVITATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MEMBERS LIST */}
        <div className="lg:col-span-2 space-y-4">
          <PsCard>
            <div className="px-6 py-4 bg-pill-hover border-b border-border rounded-t-2xl flex justify-between items-center">
              <h3 className="font-semibold text-primary">Members ({members.length})</h3>
            </div>
            {members.length === 0 ? (
              <div className="p-6 text-center text-sm text-secondary">
                No active members in this team.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {members.map(member => (
                  <li key={member.member_id} className="p-4 sm:px-6 hover:bg-pill-hover flex items-center justify-between transition">
                    <div>
                      <p className="text-sm font-medium text-primary">{member.display_name}</p>
                      <p className="text-xs text-secondary mt-1">Joined {new Date(member.joined_at).toLocaleDateString()} &middot; {member.team_role}</p>
                    </div>
                    {isManager && (
                      <button
                        onClick={() => handleRemoveMember(member.member_id)}
                        className="text-xs font-semibold text-error hover:brightness-110 p-2"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </PsCard>
        </div>

        {/* INVITATION FORM */}
        {isManager && (
          <div className="lg:col-span-1 space-y-4">
            <PsCard className="self-start">
              <div className="px-6 py-4 bg-pill-hover border-b border-border rounded-t-2xl">
                <h3 className="font-semibold text-primary">Invite a Player</h3>
              </div>
              <div className="p-6 space-y-4">
                {inviteSuccess && <PsAlert variant="success">{inviteSuccess}</PsAlert>}
                {inviteError && <PsAlert variant="error">{inviteError}</PsAlert>}
                
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-primary mb-1">Search User to invite *</label>
                    {selectedUser ? (
                      <div className="mt-1 flex items-center justify-between p-2 border border-success/30 bg-success/10 rounded-xl">
                        <span className="text-sm font-medium text-success">{selectedUser.display_name || selectedUser.email}</span>
                        <button type="button" onClick={() => setSelectedUser(null)} className="text-success hover:brightness-110 text-xs font-semibold">Clear</button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={inviteSearchQuery}
                          onChange={(e) => setInviteSearchQuery(e.target.value)}
                          placeholder="Type name or email..."
                          className="w-full rounded-xl border border-border bg-surface text-primary placeholder-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/40 transition"
                        />
                        {searchLoading && <div className="absolute right-3 top-8 text-xs text-secondary">Searching...</div>}
                        {searchResults.length > 0 && (
                          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl bg-surface border border-border shadow-lg py-1">
                            {searchResults.map(u => (
                              <li
                                key={u.id}
                                onClick={() => { setSelectedUser(u); setSearchResults([]); setInviteSearchQuery(''); }}
                                className="relative cursor-pointer select-none py-2 pl-3 pr-3 hover:bg-pill-hover transition"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm text-primary">{u.display_name || 'Unnamed Player'}</span>
                                  <span className="text-xs text-secondary">{u.email}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                  
                  <PsTextarea
                    label="Message (optional)"
                    rows={2}
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="E.g., Welcome to the squad!"
                  />
                  
                  <PsButton type="submit" className="w-full" disabled={inviteLoading}>
                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                  </PsButton>
                </form>
              </div>
            </PsCard>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/AuthContext';
import Spinner from '../components/Spinner';

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
      // Refresh members
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">{error}</div>
        <Link to="/teams" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500 font-medium">
          &larr; Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <Link to="/teams" className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          {!team.is_active && (
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
              Inactive
            </span>
          )}
        </div>
        {isManager && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Edit Team
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* EDIT FORM */}
      {isEditing && isManager ? (
        <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 border border-gray-200">
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit Team</h2>
          {editError && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="text-sm text-red-700">{editError}</div>
            </div>
          )}
          <form onSubmit={handleUpdateTeam} className="space-y-4">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name *</label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2 flex items-center">
                <input
                  type="checkbox"
                  checked={editData.is_active}
                  onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Team is Active
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 space-x-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={editLoading}
                className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-gray-50 border-b border-gray-200">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Team Information</h3>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              {team.sport_name}
            </span>
          </div>
          <div className="px-4 py-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">City</dt>
              <dd className="mt-1 text-sm text-gray-900">{team.city || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created On</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(team.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{team.description || 'No description provided.'}</dd>
            </div>
          </div>
        </div>
      )}

      {/* TEAM MEMBERS AND INVITATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MEMBERS LIST */}
        <div className="lg:col-span-2 bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Members ({members.length})</h3>
          </div>
          {members.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No active members in this team.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {members.map(member => (
                <li key={member.member_id} className="p-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.display_name}</p>
                    <p className="text-xs text-gray-500">Joined {new Date(member.joined_at).toLocaleDateString()} &middot; {member.team_role}</p>
                  </div>
                  {isManager && (
                    <button
                      onClick={() => handleRemoveMember(member.member_id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium p-2"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* INVITATION FORM (MANAGER ONLY) */}
        {isManager && (
          <div className="lg:col-span-1 bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200 self-start">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Invite a Player</h3>
            </div>
            <div className="p-4 sm:p-6">
              {inviteSuccess && (
                <div className="rounded-md bg-green-50 p-3 mb-4">
                  <div className="text-sm text-green-700">{inviteSuccess}</div>
                </div>
              )}
              {inviteError && (
                <div className="rounded-md bg-red-50 p-3 mb-4">
                  <div className="text-sm text-red-700">{inviteError}</div>
                </div>
              )}
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700">Search User to invite *</label>
                  {selectedUser ? (
                    <div className="mt-1 flex items-center justify-between p-2 border border-green-300 bg-green-50 rounded-md">
                      <span className="text-sm font-medium text-green-800">{selectedUser.display_name || selectedUser.email}</span>
                      <button type="button" onClick={() => setSelectedUser(null)} className="text-green-600 hover:text-green-800 text-xs font-semibold">Clear</button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={inviteSearchQuery}
                        onChange={(e) => setInviteSearchQuery(e.target.value)}
                        placeholder="Type name or email..."
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      {searchLoading && <div className="absolute right-2 top-8 text-xs text-gray-500">Searching...</div>}
                      {searchResults.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {searchResults.map(u => (
                            <li
                              key={u.id}
                              onClick={() => { setSelectedUser(u); setSearchResults([]); setInviteSearchQuery(''); }}
                              className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-50"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{u.display_name || 'Unnamed Player'}</span>
                                <span className="text-xs text-gray-500">{u.email}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Message (optional)</label>
                  <textarea
                    rows={2}
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="E.g., Welcome to the squad!"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

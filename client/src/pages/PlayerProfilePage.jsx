import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

export default function PlayerProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    city: '',
    state: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    is_public: true
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/player-profiles/me');
      setProfile(res.data.profile);
      if (res.data.profile) {
        // Populate form
        const p = res.data.profile;
        setFormData({
          display_name: p.display_name || '',
          bio: p.bio || '',
          city: p.city || '',
          state: p.state || '',
          phone: p.phone || '',
          gender: p.gender || '',
          date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '', // format for YYYY-MM-DD input
          is_public: p.is_public ?? true
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load player profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    // Clean up empty optional fields so they aren't sent as empty strings if backend expects null
    const payload = { ...formData };
    if (!payload.gender) delete payload.gender;
    if (!payload.date_of_birth) delete payload.date_of_birth;

    try {
      let res;
      if (profile) {
        res = await api.patch('/player-profiles/me', payload);
      } else {
        res = await api.post('/player-profiles/me', payload);
      }
      setProfile(res.data.profile);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;



  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold leading-6 text-gray-900">Player Profile</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Your optional sports identity for competitive activities and community features.</p>
              </div>
            </div>
            {!isEditing && profile && (
              <div className="mt-4 sm:ml-4 sm:mt-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {!profile && !isEditing ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No Player Profile</h3>
              <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                You do not have a Player Profile yet. Player Profiles are completely optional, but you will need one to participate in official tournaments or join teams.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Create Player Profile
                </button>
              </div>
            </div>
          ) : !isEditing && profile ? (
            <dl className="space-y-6 divide-y divide-gray-100 text-sm leading-6">
              <div className="pt-6 sm:flex">
                <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none">Display Name</dt>
                <dd className="mt-1 text-gray-900 sm:mt-0 sm:flex-auto">{profile.display_name}</dd>
              </div>
              <div className="pt-6 sm:flex">
                <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none">Bio</dt>
                <dd className="mt-1 text-gray-900 sm:mt-0 sm:flex-auto whitespace-pre-wrap">{profile.bio || '-'}</dd>
              </div>
              <div className="pt-6 sm:flex">
                <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none">Location</dt>
                <dd className="mt-1 text-gray-900 sm:mt-0 sm:flex-auto">
                  {[profile.city, profile.state].filter(Boolean).join(', ') || '-'}
                </dd>
              </div>
              <div className="pt-6 sm:flex">
                <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none">Phone</dt>
                <dd className="mt-1 text-gray-900 sm:mt-0 sm:flex-auto">{profile.phone || '-'}</dd>
              </div>
              <div className="pt-6 sm:flex">
                <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none">Visibility</dt>
                <dd className="mt-1 text-gray-900 sm:mt-0 sm:flex-auto">
                  {profile.is_public ? 'Public' : 'Private'}
                </dd>
              </div>
            </dl>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                
                <div className="sm:col-span-4">
                  <label htmlFor="display_name" className="block text-sm font-medium leading-6 text-gray-900">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="display_name"
                      id="display_name"
                      required
                      maxLength={100}
                      value={formData.display_name}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div className="col-span-full">
                  <label htmlFor="bio" className="block text-sm font-medium leading-6 text-gray-900">
                    Bio
                  </label>
                  <div className="mt-2">
                    <textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      value={formData.bio}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600">Write a few sentences about yourself and your sports background.</p>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="city" className="block text-sm font-medium leading-6 text-gray-900">
                    City
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="city"
                      id="city"
                      maxLength={100}
                      value={formData.city}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="state" className="block text-sm font-medium leading-6 text-gray-900">
                    State / Province
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="state"
                      id="state"
                      maxLength={100}
                      value={formData.state}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-900">
                    Phone
                  </label>
                  <div className="mt-2">
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      maxLength={20}
                      value={formData.phone}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="date_of_birth" className="block text-sm font-medium leading-6 text-gray-900">
                    Date of Birth
                  </label>
                  <div className="mt-2">
                    <input
                      type="date"
                      name="date_of_birth"
                      id="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="gender" className="block text-sm font-medium leading-6 text-gray-900">
                    Gender
                  </label>
                  <div className="mt-2">
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    >
                      <option value="">Prefer not to answer</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non_binary">Non Binary</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-full">
                  <div className="relative flex gap-x-3">
                    <div className="flex h-6 items-center">
                      <input
                        id="is_public"
                        name="is_public"
                        type="checkbox"
                        checked={formData.is_public}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                    </div>
                    <div className="text-sm leading-6">
                      <label htmlFor="is_public" className="font-medium text-gray-900">Public Profile</label>
                      <p className="text-gray-500">Make this profile visible to other players on PlaySphere.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-x-6 border-t border-gray-200 pt-6">
                {profile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setError('');
                    }}
                    className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                )}
                {!profile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setError('');
                    }}
                    className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700"
                  >
                    Cancel Creation
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {saving ? <Spinner size="sm" className="text-white" /> : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

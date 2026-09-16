import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  PsButton,
  PsCard,
  PsInput,
  PsTextarea,
  PsSelect,
  PsAlert,
  PsPageHeader,
  PsLoading
} from '../components/ui';

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
        const p = res.data.profile;
        setFormData({
          display_name: p.display_name || '',
          bio: p.bio || '',
          city: p.city || '',
          state: p.state || '',
          phone: p.phone || '',
          gender: p.gender || '',
          date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
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

  if (loading) return <PsLoading />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PsPageHeader 
        title="Player Profile" 
        subtitle="Your optional sports identity for competitive activities and community features."
        actions={
          !isEditing && profile && (
            <PsButton variant="secondary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </PsButton>
          )
        }
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard className="p-6">
        {!profile && !isEditing ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <h3 className="mt-2 text-sm font-semibold text-primary">No Player Profile</h3>
            <p className="mt-1 text-sm text-secondary max-w-md mx-auto">
              You do not have a Player Profile yet. Player Profiles are completely optional, but you will need one to participate in official tournaments or join teams.
            </p>
            <div className="mt-6">
              <PsButton onClick={() => setIsEditing(true)}>
                Create Player Profile
              </PsButton>
            </div>
          </div>
        ) : !isEditing && profile ? (
          <dl className="space-y-6 divide-y divide-border text-sm leading-6">
            <div className="pt-2 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none">Display Name</dt>
              <dd className="mt-1 text-secondary sm:mt-0 sm:flex-auto">{profile.display_name}</dd>
            </div>
            <div className="pt-6 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none">Bio</dt>
              <dd className="mt-1 text-secondary sm:mt-0 sm:flex-auto whitespace-pre-wrap">{profile.bio || '-'}</dd>
            </div>
            <div className="pt-6 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none">Location</dt>
              <dd className="mt-1 text-secondary sm:mt-0 sm:flex-auto">
                {[profile.city, profile.state].filter(Boolean).join(', ') || '-'}
              </dd>
            </div>
            <div className="pt-6 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none">Phone</dt>
              <dd className="mt-1 text-secondary sm:mt-0 sm:flex-auto">{profile.phone || '-'}</dd>
            </div>
            <div className="pt-6 sm:flex">
              <dt className="font-medium text-primary sm:w-64 sm:flex-none">Visibility</dt>
              <dd className="mt-1 text-secondary sm:mt-0 sm:flex-auto">
                {profile.is_public ? 'Public' : 'Private'}
              </dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <PsInput
                  label="Display Name *"
                  name="display_name"
                  required
                  maxLength={100}
                  value={formData.display_name}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <PsTextarea
                  label="Bio"
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Write a few sentences about yourself and your sports background."
                />
              </div>

              <PsInput
                label="City"
                name="city"
                maxLength={100}
                value={formData.city}
                onChange={handleChange}
              />

              <PsInput
                label="State / Province"
                name="state"
                maxLength={100}
                value={formData.state}
                onChange={handleChange}
              />

              <PsInput
                label="Phone"
                type="tel"
                name="phone"
                maxLength={20}
                value={formData.phone}
                onChange={handleChange}
              />

              <PsInput
                label="Date of Birth"
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
              />

              <PsSelect
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Prefer not to answer</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non_binary">Non Binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </PsSelect>

              <div className="sm:col-span-2 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="flex h-6 items-center">
                    <input
                      name="is_public"
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-border text-maroon focus:ring-maroon bg-surface cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-primary group-hover:text-maroon transition">Public Profile</span>
                    <span className="block text-sm text-secondary mt-1">Make this profile visible to other players on PlaySphere.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
              <PsButton
                variant="ghost"
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError('');
                }}
              >
                {profile ? 'Cancel' : 'Cancel Creation'}
              </PsButton>
              <PsButton type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </PsButton>
            </div>
          </form>
        )}
      </PsCard>
    </div>
  );
}

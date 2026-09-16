import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../components/ui';

// Exact values accepted by the backend CHECK constraint
const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'professional', label: 'Professional' },
];

function getSportEmoji(name) {
  const lower = name?.toLowerCase() || '';
  if (lower.includes('football')) return '⚽';
  if (lower.includes('basketball')) return '🏀';
  if (lower.includes('cricket')) return '🏏';
  if (lower.includes('volleyball')) return '🏐';
  return '🏆';
}

function AddSportForm({ sports, existingSportIds, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    sport_id: '',
    position: '',
    skill_level: '',
    years_of_experience: '',
    is_primary: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const availableSports = sports.filter((s) => !existingSportIds.has(s.id));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.sport_id) {
      setError('Please select a sport.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sport_id: formData.sport_id,
        is_primary: formData.is_primary,
      };
      if (formData.position.trim()) payload.position = formData.position.trim();
      if (formData.skill_level) payload.skill_level = formData.skill_level;
      if (formData.years_of_experience !== '') {
        payload.years_of_experience = Number(formData.years_of_experience);
      }
      const res = await api.post('/player-profiles/me/sports', payload);
      onSuccess(res.data.profile);
    } catch (err) {
      if (err.status === 409) {
        setError('You already have a profile for this sport.');
      } else if (err.status === 404) {
        setError('Player Profile not found. Please create your Player Profile first.');
      } else {
        setError(err.message || 'Failed to add sport. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (availableSports.length === 0) {
    return (
      <PsAlert variant="info">
        You have already added all available sports to your profile.
      </PsAlert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6 bg-surface border border-border rounded-xl">
      {error && <PsAlert variant="error">{error}</PsAlert>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <PsSelect
            label="Sport *"
            name="sport_id"
            required
            value={formData.sport_id}
            onChange={handleChange}
          >
            <option value="">— Select a sport —</option>
            {availableSports.map((s) => (
              <option key={s.id} value={s.id}>
                {getSportEmoji(s.name)} {s.name}
              </option>
            ))}
          </PsSelect>
        </div>

        <PsInput
          label="Position"
          name="position"
          maxLength={100}
          placeholder="e.g. Forward, Goalkeeper…"
          value={formData.position}
          onChange={handleChange}
        />

        <PsSelect
          label="Skill Level"
          name="skill_level"
          value={formData.skill_level}
          onChange={handleChange}
        >
          <option value="">— Select level —</option>
          {SKILL_LEVELS.map((sl) => (
            <option key={sl.value} value={sl.value}>
              {sl.label}
            </option>
          ))}
        </PsSelect>

        <PsInput
          label="Years of Experience"
          type="number"
          name="years_of_experience"
          min={0}
          max={99}
          placeholder="0"
          value={formData.years_of_experience}
          onChange={handleChange}
        />

        <div className="sm:col-span-2 pt-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex h-6 items-center">
              <input
                name="is_primary"
                type="checkbox"
                checked={formData.is_primary}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border text-maroon focus:ring-maroon bg-surface cursor-pointer"
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-primary group-hover:text-maroon transition">Primary Sport</span>
              <span className="block text-sm text-secondary mt-1">Mark this as your main sport.</span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
        <PsButton type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </PsButton>
        <PsButton type="submit" disabled={saving}>
          {saving ? 'Adding…' : 'Add Sport'}
        </PsButton>
      </div>
    </form>
  );
}

function EditSportForm({ profile, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    position: profile.position || '',
    skill_level: profile.skill_level || '',
    years_of_experience: profile.years_of_experience != null ? String(profile.years_of_experience) : '',
    is_primary: profile.is_primary || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { is_primary: formData.is_primary };
      if (formData.position.trim() !== (profile.position || '')) {
        payload.position = formData.position.trim() || null;
      }
      if (formData.skill_level !== (profile.skill_level || '')) {
        payload.skill_level = formData.skill_level || null;
      }
      if (formData.years_of_experience !== String(profile.years_of_experience ?? '')) {
        payload.years_of_experience =
          formData.years_of_experience !== '' ? Number(formData.years_of_experience) : null;
      }
      const res = await api.patch(`/player-profiles/me/sports/${profile.id}`, payload);
      onSuccess(res.data.profile);
    } catch (err) {
      setError(err.message || 'Failed to update sport profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6 bg-surface border border-border rounded-xl">
      {error && <PsAlert variant="error">{error}</PsAlert>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-primary">
            Sport:{' '}
            <span className="font-serif font-bold text-maroon ml-1">{getSportEmoji(profile.sport_name)} {profile.sport_name}</span>
            <span className="ml-2 text-xs text-secondary">(cannot be changed — remove and re-add to switch)</span>
          </p>
        </div>

        <PsInput
          label="Position"
          name="position"
          maxLength={100}
          placeholder="e.g. Forward, Goalkeeper…"
          value={formData.position}
          onChange={handleChange}
        />

        <PsSelect
          label="Skill Level"
          name="skill_level"
          value={formData.skill_level}
          onChange={handleChange}
        >
          <option value="">— Select level —</option>
          {SKILL_LEVELS.map((sl) => (
            <option key={sl.value} value={sl.value}>
              {sl.label}
            </option>
          ))}
        </PsSelect>

        <PsInput
          label="Years of Experience"
          type="number"
          name="years_of_experience"
          min={0}
          max={99}
          value={formData.years_of_experience}
          onChange={handleChange}
        />

        <div className="sm:col-span-2 pt-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex h-6 items-center">
              <input
                name="is_primary"
                type="checkbox"
                checked={formData.is_primary}
                onChange={handleChange}
                className="h-4 w-4 rounded border-border text-maroon focus:ring-maroon bg-surface cursor-pointer"
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-primary group-hover:text-maroon transition">Primary Sport</span>
              <span className="block text-sm text-secondary mt-1">Mark this as your main sport.</span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
        <PsButton type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </PsButton>
        <PsButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </PsButton>
      </div>
    </form>
  );
}

function SportProfileCard({ profile, onEdit, onDelete, isDeleting }) {
  const skillLabel = SKILL_LEVELS.find((s) => s.value === profile.skill_level)?.label || profile.skill_level;

  return (
    <PsCard className="overflow-hidden hover:border-maroon/30 transition">
      <div className="px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="text-xl font-serif font-bold text-primary truncate">
                {getSportEmoji(profile.sport_name)} {profile.sport_name}
              </h4>
              {profile.is_primary && (
                <PsBadge variant="success" className="ml-2">
                  Primary
                </PsBadge>
              )}
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3 text-sm text-secondary">
              {profile.position && (
                <div>
                  <dt className="inline font-medium text-primary">Position: </dt>
                  <dd className="inline">{profile.position}</dd>
                </div>
              )}
              {skillLabel && (
                <div>
                  <dt className="inline font-medium text-primary">Level: </dt>
                  <dd className="inline">{skillLabel}</dd>
                </div>
              )}
              {profile.years_of_experience != null && (
                <div>
                  <dt className="inline font-medium text-primary">Experience: </dt>
                  <dd className="inline">
                    {profile.years_of_experience} {profile.years_of_experience === 1 ? 'year' : 'years'}
                  </dd>
                </div>
              )}
              {!profile.position && !skillLabel && profile.years_of_experience == null && (
                <div className="sm:col-span-3 text-muted italic">No details added yet.</div>
              )}
            </dl>
          </div>

          <div className="flex flex-shrink-0 gap-2 sm:ml-4">
            <PsButton variant="secondary" onClick={() => onEdit(profile)}>
              Edit
            </PsButton>
            <PsButton
              variant="danger"
              onClick={() => onDelete(profile)}
              disabled={isDeleting}
              className="bg-transparent text-error hover:bg-error/10 border border-error/50"
            >
              {isDeleting ? 'Removing…' : 'Remove'}
            </PsButton>
          </div>
        </div>
      </div>
    </PsCard>
  );
}

function DeleteConfirmModal({ profile, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onCancel} />
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <PsCard className="relative transform overflow-hidden text-left shadow-2xl transition-all w-full sm:max-w-lg">
          <div className="px-6 py-6 sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-error/10 sm:mx-0 sm:h-10 sm:w-10">
              <span className="text-error text-xl">⚠</span>
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-lg font-serif font-bold text-primary">
                Remove Sport Profile
              </h3>
              <div className="mt-2">
                <p className="text-sm text-secondary">
                  Are you sure you want to remove{' '}
                  <span className="font-bold text-primary">{profile.sport_name}</span> from your sport profiles? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-pill-hover border-t border-border flex justify-end gap-3">
            <PsButton variant="ghost" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </PsButton>
            <PsButton variant="danger" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? 'Removing…' : 'Remove'}
            </PsButton>
          </div>
        </PsCard>
      </div>
    </div>
  );
}

function SportsCatalog({ sports, loadingCatalog, catalogError }) {
  if (loadingCatalog) return <PsLoading />;
  if (catalogError) return <PsAlert variant="error">{catalogError}</PsAlert>;
  if (!sports.length) return <p className="text-sm text-secondary italic py-2">No sports available at this time.</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sports.map((sport) => (
        <PsCard key={sport.id} className="p-5 hover:border-gold/50 transition">
          <p className="text-lg font-serif font-bold text-primary">
            {getSportEmoji(sport.name)} {sport.name}
          </p>
          {sport.description && (
            <p className="mt-2 text-sm text-secondary line-clamp-2">{sport.description}</p>
          )}
          {(sport.min_players_per_team != null || sport.max_players_per_team != null) && (
            <p className="mt-3 text-xs font-medium text-muted bg-pill inline-block px-2 py-1 rounded-md">
              Team size:{' '}
              {sport.min_players_per_team === sport.max_players_per_team
                ? sport.min_players_per_team
                : `${sport.min_players_per_team ?? '?'}–${sport.max_players_per_team ?? '?'}`}
            </p>
          )}
        </PsCard>
      ))}
    </div>
  );
}

export default function SportsPage() {
  const [sports, setSports] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  const [myProfiles, setMyProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [hasPlayerProfile, setHasPlayerProfile] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [deletingProfile, setDeletingProfile] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/sports');
        setSports(res.data.sports || []);
      } catch (err) {
        setCatalogError(err.message || 'Failed to load sports catalog.');
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, []);

  const loadMyProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const profileRes = await api.get('/player-profiles/me');
      if (!profileRes.data.profile) {
        setHasPlayerProfile(false);
        setMyProfiles([]);
        setLoadingProfiles(false);
        return;
      }

      const res = await api.get('/player-profiles/me/sports');
      setMyProfiles(res.data.profiles || []);
      setHasPlayerProfile(true);
    } catch (err) {
      if (err.status === 404) {
        setHasPlayerProfile(false);
        setMyProfiles([]);
      } else {
        setPageError(err.message || 'Failed to load your sport profiles.');
      }
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    loadMyProfiles();
  }, [loadMyProfiles]);

  const existingSportIds = new Set(myProfiles.map((p) => p.sport_id));

  const handleAddSuccess = (newProfile) => {
    setMyProfiles((prev) => [...prev, newProfile]);
    setShowAddForm(false);
    setSuccessMsg(`${sports.find((s) => s.id === newProfile.sport_id)?.name ?? 'Sport'} added to your profile.`);
  };

  const handleEditSuccess = (updatedProfile) => {
    setMyProfiles((prev) =>
      prev.map((p) => (p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p))
    );
    setEditingProfile(null);
    setSuccessMsg('Sport profile updated.');
  };

  const handleDeleteRequest = (profile) => {
    setDeletingProfile(profile);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProfile) return;
    setIsDeleting(true);
    try {
      await api.delete(`/player-profiles/me/sports/${deletingProfile.id}`);
      setMyProfiles((prev) => prev.filter((p) => p.id !== deletingProfile.id));
      setSuccessMsg(`${deletingProfile.sport_name} removed from your profile.`);
      setDeletingProfile(null);
    } catch (err) {
      setPageError(err.message || 'Failed to remove sport profile.');
      setDeletingProfile(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <PsPageHeader 
        title="Sports" 
        subtitle="Browse the sports catalog and manage your sport profiles."
      />

      {pageError && <PsAlert variant="error">{pageError}</PsAlert>}
      {successMsg && <PsAlert variant="success">{successMsg}</PsAlert>}

      <section>
        <PsCard>
          <div className="px-6 py-5 border-b border-border bg-pill-hover rounded-t-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-serif font-bold text-primary">
                My Sports
              </h3>
              <p className="mt-1 text-sm text-secondary">
                Sport profiles you have added to your Player Profile.
              </p>
            </div>
            {hasPlayerProfile && !showAddForm && !editingProfile && (
              <PsButton onClick={() => setShowAddForm(true)}>
                + Add Sport
              </PsButton>
            )}
          </div>

          <div className="p-6">
            {!hasPlayerProfile ? (
              <PsEmpty
                title="Player Profile Required"
                message="You need a Player Profile before you can add sports. Player Profiles are optional overall, but required to track your sport involvement."
                action={
                  <Link to="/player-profile">
                    <PsButton>Create Player Profile</PsButton>
                  </Link>
                }
              />
            ) : loadingProfiles ? (
              <PsLoading />
            ) : showAddForm ? (
              <AddSportForm
                sports={sports}
                existingSportIds={existingSportIds}
                onSuccess={handleAddSuccess}
                onCancel={() => setShowAddForm(false)}
              />
            ) : editingProfile ? (
              <EditSportForm
                profile={editingProfile}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditingProfile(null)}
              />
            ) : myProfiles.length === 0 ? (
              <PsEmpty
                title="No sports added yet"
                message="Add a sport to start tracking your experience and skills."
                action={
                  <PsButton onClick={() => setShowAddForm(true)}>
                    + Add Your First Sport
                  </PsButton>
                }
              />
            ) : (
              <div className="space-y-4">
                {myProfiles.map((profile) => (
                  <SportProfileCard
                    key={profile.id}
                    profile={profile}
                    onEdit={(p) => {
                      setEditingProfile(p);
                      setShowAddForm(false);
                    }}
                    onDelete={handleDeleteRequest}
                    isDeleting={isDeleting && deletingProfile?.id === profile.id}
                  />
                ))}
              </div>
            )}
          </div>
        </PsCard>
      </section>

      <section>
        <PsCard>
          <div className="px-6 py-5 border-b border-border bg-pill-hover rounded-t-2xl">
            <h3 className="text-xl font-serif font-bold text-primary">
              Available Sports
            </h3>
            <p className="mt-1 text-sm text-secondary">
              The official catalog of sports supported on PlaySphere.
            </p>
          </div>
          <div className="p-6">
            <SportsCatalog sports={sports} loadingCatalog={loadingCatalog} catalogError={catalogError} />
          </div>
        </PsCard>
      </section>

      {deletingProfile && (
        <DeleteConfirmModal
          profile={deletingProfile}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingProfile(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

// Exact values accepted by the backend CHECK constraint
const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'professional', label: 'Professional' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="flex-1 text-sm text-red-700">{message}</div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-3 text-sm font-medium text-red-700 hover:text-red-600"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function SuccessBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="rounded-md bg-green-50 p-4">
      <div className="flex">
        <div className="flex-1 text-sm text-green-700">{message}</div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-3 text-sm font-medium text-green-700 hover:text-green-600"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add Sport Form ───────────────────────────────────────────────────────────

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

  // Filter out already-added sports
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
      <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
        You have already added all available sports to your profile.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Sport */}
        <div className="sm:col-span-2">
          <label htmlFor="sport_id" className="block text-sm font-medium leading-6 text-gray-900">
            Sport <span className="text-red-500">*</span>
          </label>
          <div className="mt-2">
            <select
              id="sport_id"
              name="sport_id"
              required
              value={formData.sport_id}
              onChange={handleChange}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">— Select a sport —</option>
              {availableSports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Position */}
        <div>
          <label htmlFor="add_position" className="block text-sm font-medium leading-6 text-gray-900">
            Position
          </label>
          <div className="mt-2">
            <input
              type="text"
              id="add_position"
              name="position"
              maxLength={100}
              placeholder="e.g. Forward, Goalkeeper…"
              value={formData.position}
              onChange={handleChange}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        {/* Skill Level */}
        <div>
          <label htmlFor="add_skill_level" className="block text-sm font-medium leading-6 text-gray-900">
            Skill Level
          </label>
          <div className="mt-2">
            <select
              id="add_skill_level"
              name="skill_level"
              value={formData.skill_level}
              onChange={handleChange}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">— Select level —</option>
              {SKILL_LEVELS.map((sl) => (
                <option key={sl.value} value={sl.value}>
                  {sl.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Years of Experience */}
        <div>
          <label htmlFor="add_years" className="block text-sm font-medium leading-6 text-gray-900">
            Years of Experience
          </label>
          <div className="mt-2">
            <input
              type="number"
              id="add_years"
              name="years_of_experience"
              min={0}
              max={99}
              placeholder="0"
              value={formData.years_of_experience}
              onChange={handleChange}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        {/* Is Primary */}
        <div className="sm:col-span-2">
          <div className="relative flex gap-x-3">
            <div className="flex h-6 items-center">
              <input
                id="add_is_primary"
                name="is_primary"
                type="checkbox"
                checked={formData.is_primary}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
            </div>
            <div className="text-sm leading-6">
              <label htmlFor="add_is_primary" className="font-medium text-gray-900">
                Primary Sport
              </label>
              <p className="text-gray-500">Mark this as your main sport.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {saving && <Spinner size="sm" className="text-white" />}
          {saving ? 'Adding…' : 'Add Sport'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit Sport Form ──────────────────────────────────────────────────────────

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
      const payload = {
        is_primary: formData.is_primary,
      };
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Sport (read-only) */}
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-gray-900">
            Sport:{' '}
            <span className="font-semibold text-indigo-700">{profile.sport_name}</span>
            <span className="ml-2 text-xs text-gray-500">(cannot be changed — remove and re-add to switch)</span>
          </p>
        </div>

        {/* Position */}
        <div>
          <label htmlFor="edit_position" className="block text-sm font-medium leading-6 text-gray-900">
            Position
          </label>
          <div className="mt-2">
            <input
              type="text"
              id="edit_position"
              name="position"
              maxLength={100}
              placeholder="e.g. Forward, Goalkeeper…"
              value={formData.position}
              onChange={handleChange}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        {/* Skill Level */}
        <div>
          <label htmlFor="edit_skill_level" className="block text-sm font-medium leading-6 text-gray-900">
            Skill Level
          </label>
          <div className="mt-2">
            <select
              id="edit_skill_level"
              name="skill_level"
              value={formData.skill_level}
              onChange={handleChange}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">— Select level —</option>
              {SKILL_LEVELS.map((sl) => (
                <option key={sl.value} value={sl.value}>
                  {sl.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Years of Experience */}
        <div>
          <label htmlFor="edit_years" className="block text-sm font-medium leading-6 text-gray-900">
            Years of Experience
          </label>
          <div className="mt-2">
            <input
              type="number"
              id="edit_years"
              name="years_of_experience"
              min={0}
              max={99}
              value={formData.years_of_experience}
              onChange={handleChange}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        {/* Is Primary */}
        <div className="sm:col-span-2">
          <div className="relative flex gap-x-3">
            <div className="flex h-6 items-center">
              <input
                id="edit_is_primary"
                name="is_primary"
                type="checkbox"
                checked={formData.is_primary}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
            </div>
            <div className="text-sm leading-6">
              <label htmlFor="edit_is_primary" className="font-medium text-gray-900">
                Primary Sport
              </label>
              <p className="text-gray-500">Mark this as your main sport.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {saving && <Spinner size="sm" className="text-white" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ─── Sport Profile Card ───────────────────────────────────────────────────────

function SportProfileCard({ profile, onEdit, onDelete, isDeleting }) {
  const skillLabel = SKILL_LEVELS.find((s) => s.value === profile.skill_level)?.label || profile.skill_level;

  return (
    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-semibold text-gray-900 truncate">{profile.sport_name}</h4>
              {profile.is_primary && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  Primary
                </span>
              )}
            </div>

            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3 text-sm text-gray-600">
              {profile.position && (
                <div>
                  <dt className="inline font-medium text-gray-700">Position: </dt>
                  <dd className="inline">{profile.position}</dd>
                </div>
              )}
              {skillLabel && (
                <div>
                  <dt className="inline font-medium text-gray-700">Level: </dt>
                  <dd className="inline">{skillLabel}</dd>
                </div>
              )}
              {profile.years_of_experience != null && (
                <div>
                  <dt className="inline font-medium text-gray-700">Experience: </dt>
                  <dd className="inline">
                    {profile.years_of_experience} {profile.years_of_experience === 1 ? 'year' : 'years'}
                  </dd>
                </div>
              )}
              {!profile.position && !skillLabel && profile.years_of_experience == null && (
                <div className="sm:col-span-3 text-gray-400 italic">No details added yet.</div>
              )}
            </dl>
          </div>

          <div className="flex flex-shrink-0 gap-2 sm:ml-4">
            <button
              type="button"
              onClick={() => onEdit(profile)}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(profile)}
              disabled={isDeleting}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ profile, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 transition-opacity" onClick={onCancel} />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all w-full sm:my-8 sm:max-w-lg sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <span className="text-red-600 text-xl" aria-hidden="true">⚠</span>
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 id="delete-modal-title" className="text-base font-semibold leading-6 text-gray-900">
                Remove Sport Profile
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to remove{' '}
                  <span className="font-semibold">{profile.sport_name}</span> from your sport profiles? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex justify-center items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
            >
              {isDeleting && <Spinner size="sm" className="text-white" />}
              {isDeleting ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sports Catalog Section ───────────────────────────────────────────────────

function SportsCatalog({ sports, loadingCatalog, catalogError }) {
  if (loadingCatalog) {
    return <Spinner size="md" className="py-6" />;
  }
  if (catalogError) {
    return <p className="text-sm text-red-600 py-2">{catalogError}</p>;
  }
  if (!sports.length) {
    return <p className="text-sm text-gray-500 italic py-2">No sports available at this time.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sports.map((sport) => (
        <li key={sport.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{sport.name}</p>
          {sport.description && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{sport.description}</p>
          )}
          {(sport.min_players_per_team != null || sport.max_players_per_team != null) && (
            <p className="mt-1 text-xs text-gray-400">
              Team size:{' '}
              {sport.min_players_per_team === sport.max_players_per_team
                ? sport.min_players_per_team
                : `${sport.min_players_per_team ?? '?'}–${sport.max_players_per_team ?? '?'}`}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SportsPage() {
  // Catalog
  const [sports, setSports] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  // My Sport Profiles
  const [myProfiles, setMyProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [hasPlayerProfile, setHasPlayerProfile] = useState(true); // optimistic

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [deletingProfile, setDeletingProfile] = useState(null); // profile pending delete confirm
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Load catalog ──────────────────────────────────────────────────────────
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

  // ── Load my sport profiles ────────────────────────────────────────────────
  const loadMyProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      // Check if player profile exists first to avoid 404 spam
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

  // ── Derived data ──────────────────────────────────────────────────────────
  const existingSportIds = new Set(myProfiles.map((p) => p.sport_id));

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sports</h2>
        <p className="mt-1 text-sm text-gray-500">
          Browse the sports catalog and manage your sport profiles.
        </p>
      </div>

      {/* Global banners */}
      <ErrorBanner message={pageError} onDismiss={() => setPageError('')} />
      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />

      {/* ── My Sports ── */}
      <section aria-labelledby="my-sports-heading">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 id="my-sports-heading" className="text-base font-semibold leading-6 text-gray-900">
                  My Sports
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sport profiles you have added to your Player Profile.
                </p>
              </div>
              {hasPlayerProfile && !showAddForm && !editingProfile && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  + Add Sport
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 space-y-4">
            {/* No Player Profile state */}
            {!hasPlayerProfile ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 py-10 text-center">
                <p className="text-sm font-semibold text-gray-900">Player Profile Required</p>
                <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                  You need a Player Profile before you can add sports. Player Profiles are optional
                  overall, but required to track your sport involvement.
                </p>
                <div className="mt-4">
                  <Link
                    to="/player-profile"
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    Create Player Profile
                  </Link>
                </div>
              </div>
            ) : loadingProfiles ? (
              <Spinner size="md" className="py-6" />
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
              <div className="rounded-lg border-2 border-dashed border-gray-300 py-10 text-center">
                <p className="text-sm font-semibold text-gray-900">No sports added yet</p>
                <p className="mt-2 text-sm text-gray-500">
                  Add a sport to start tracking your experience and skills.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    + Add Your First Sport
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
        </div>
      </section>

      {/* ── Sports Catalog ── */}
      <section aria-labelledby="catalog-heading">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 id="catalog-heading" className="text-base font-semibold leading-6 text-gray-900">
              Available Sports
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Sports currently available on the PlaySphere platform.
            </p>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <SportsCatalog
              sports={sports}
              loadingCatalog={loadingCatalog}
              catalogError={catalogError}
            />
          </div>
        </div>
      </section>

      {/* Delete confirmation modal */}
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

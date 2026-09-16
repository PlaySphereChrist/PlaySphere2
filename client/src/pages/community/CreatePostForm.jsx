import React, { useState } from 'react';
import { api } from '../../lib/api';
import { PsCard, PsInput, PsSelect, PsTextarea, PsButton, PsAlert } from '../../components/ui';

export default function CreatePostForm({ onCreated, isEquipment = false }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(isEquipment ? 'equipment_request' : 'general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const endpoint = isEquipment ? '/community/equipment-requests' : '/community/posts';
      const payload = isEquipment ? { title, body } : { title, body, category };

      const res = await api.request('POST', endpoint, payload);

      if (!res.success) throw new Error(res.message || 'Failed to create post');

      setTitle('');
      setBody('');
      setCategory(isEquipment ? 'equipment_request' : 'general');
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PsCard className="p-6 mb-6">
      <h3 className="text-lg font-serif font-bold text-primary mb-4">
        {isEquipment ? 'Create Equipment Request' : 'Create a Post'}
      </h3>
      {error && <PsAlert variant="error" className="mb-4">{error}</PsAlert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <PsInput
          label="Title"
          required
          maxLength={300}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />

        {!isEquipment && (
          <PsSelect
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
          >
            <option value="general">General</option>
            <option value="looking_for_players">Looking for Players</option>
            <option value="event_announcement">Event Announcement</option>
            <option value="discussion">Discussion</option>
            <option value="feedback">Feedback</option>
          </PsSelect>
        )}

        <PsTextarea
          label="Content"
          required
          maxLength={10000}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={submitting}
        />

        <div className="flex justify-end pt-2">
          <PsButton
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
          >
            {submitting ? 'Posting...' : 'Post'}
          </PsButton>
        </div>
      </form>
    </PsCard>
  );
}

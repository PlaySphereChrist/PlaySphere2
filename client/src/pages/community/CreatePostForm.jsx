import React, { useState } from 'react';
import { api } from '../../lib/api';
import ErrorMessage from '../../components/ErrorMessage';
import Spinner from '../../components/Spinner';

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
    <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {isEquipment ? 'Create Equipment Request' : 'Create a Post'}
      </h3>
      {error && <ErrorMessage message={error} className="mb-4" />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            id="title"
            required
            maxLength={300}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </div>

        {!isEquipment && (
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <select
              id="category"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              <option value="general">General</option>
              <option value="looking_for_players">Looking for Players</option>
              <option value="event_announcement">Event Announcement</option>
              <option value="discussion">Discussion</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700">Content</label>
          <textarea
            id="body"
            required
            maxLength={10000}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
          >
            {submitting ? <Spinner size="sm" /> : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

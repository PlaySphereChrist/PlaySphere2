import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ErrorMessage from '../../components/ErrorMessage';
import Spinner from '../../components/Spinner';

export default function CommentSection({ postId, currentUser, isMember }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');

  const fetchComments = async () => {
    try {
      const res = await api.request('GET', `/community/posts/${postId}/comments`);
      if (res.success) {
        setComments(res.comments || []);
      } else {
        throw new Error(res.message || 'Failed to load comments');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.request('POST', `/community/posts/${postId}/comments`, { body: newBody });
      if (res.success) {
        setNewBody('');
        fetchComments();
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      window.alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await api.request('POST', `/community/comments/${commentId}/archive`);
      if (res.success) {
        fetchComments();
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      window.alert(err.message);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditBody(c.body);
  };

  const handleEditSubmit = async (commentId) => {
    if (!editBody.trim()) return;
    try {
      const res = await api.request('PATCH', `/community/comments/${commentId}`, { body: editBody });
      if (res.success) {
        setEditingId(null);
        fetchComments();
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      window.alert(err.message);
    }
  };

  if (loading) return <div className="mt-4"><Spinner size="sm" /></div>;
  if (error) return <div className="mt-4"><ErrorMessage message={error} /></div>;

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <h4 className="text-sm font-medium text-gray-900 mb-4">Comments ({comments.length})</h4>

      <div className="space-y-4 mb-4">
        {comments.map(c => {
          const isAuthor = currentUser?.id === c.author_user_id;
          const isAdmin = currentUser?.roles?.includes('ADMIN');
          const canEdit = isAuthor || isAdmin;

          return (
            <div key={c.id} className="bg-gray-50 rounded-md p-3 text-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-gray-900">{c.author_email}</span>
                <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
              </div>

              {c.is_moderated ? (
                <div className="text-red-600 italic">This comment was moderated: {c.moderation_reason || 'No reason provided'}</div>
              ) : editingId === c.id ? (
                <div className="mt-2">
                  <textarea
                    className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2 border"
                    rows={2}
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                  />
                  <div className="mt-2 flex space-x-2">
                    <button onClick={() => handleEditSubmit(c.id)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap">{c.body}</div>
              )}

              {canEdit && !c.is_moderated && editingId !== c.id && (
                <div className="mt-2 flex space-x-3 text-xs">
                  <button onClick={() => startEdit(c)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                  <button onClick={() => handleArchive(c.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isMember ? (
        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="Add a comment..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newBody.trim()}
            className="inline-flex justify-center items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
          >
            {submitting ? '...' : 'Post'}
          </button>
        </form>
      ) : (
        <div className="text-sm text-gray-500 italic mt-4">You must join the community to comment.</div>
      )}
    </div>
  );
}

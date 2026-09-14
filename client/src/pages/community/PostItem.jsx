import React, { useState } from 'react';
import { api } from '../../lib/api';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import ModerateModal from './ModerateModal';

export default function PostItem({ post, currentUser, isMember, onUpdate }) {
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [submitting, setSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showModerateModal, setShowModerateModal] = useState(false);

  const isAuthor = currentUser?.id === post.author_user_id;
  const isAdmin = currentUser?.roles?.includes('ADMIN');
  const canEdit = isAuthor || isAdmin;

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await api.request('POST', `/community/posts/${post.id}/archive`);
      if (res.success) {
        onUpdate();
      } else {
        window.alert(res.message);
      }
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editBody.trim()) return;
    setSubmitting(true);
    try {
      const endpoint = post.category === 'equipment_request'
        ? `/community/equipment-requests/${post.id}`
        : `/community/posts/${post.id}`;

      const res = await api.request('PATCH', endpoint, { title: editTitle, body: editBody });
      if (res.success) {
        setEditing(false);
        onUpdate();
      } else {
        window.alert(res.message);
      }
    } catch (err) {
      window.alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow mb-4 border border-gray-200">
      {post.is_moderated ? (
        <div className="text-red-600 italic">This post was moderated: {post.moderation_reason || 'No reason provided'}</div>
      ) : editing ? (
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <input
            type="text"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            disabled={submitting}
          />
          <textarea
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            rows={4}
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            disabled={submitting}
          />
          <div className="flex space-x-2">
            <button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} disabled={submitting} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-lg font-bold text-gray-900">{post.title}</h4>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span className="font-medium text-gray-700">{post.author_email}</span>
                <span>•</span>
                <span>{new Date(post.created_at).toLocaleString()}</span>
                {post.category !== 'general' && post.category !== 'equipment_request' && (
                  <>
                    <span>•</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{post.category.replace(/_/g, ' ')}</span>
                  </>
                )}
                {post.is_pinned && <span className="text-indigo-600 font-semibold">• Pinned</span>}
                {post.is_locked && <span className="text-red-600 font-semibold">• Locked</span>}
              </div>
            </div>

            <div className="flex space-x-2 text-sm">
              {canEdit && (
                <>
                  <button onClick={() => setEditing(true)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                  <button onClick={handleArchive} className="text-red-600 hover:text-red-900">Delete</button>
                </>
              )}
              {isAdmin && !post.is_moderated && (
                <button onClick={() => setShowModerateModal(true)} className="text-red-600 hover:text-red-900 ml-2 border-l border-gray-300 pl-2">Moderate</button>
              )}
              {currentUser && !isAuthor && (
                <button onClick={() => setShowReportModal(true)} className="text-gray-500 hover:text-gray-700 ml-2 border-l border-gray-300 pl-2">Report</button>
              )}
            </div>
          </div>

          <div className="mt-3 text-gray-800 whitespace-pre-wrap">{post.body}</div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-sm text-gray-600 hover:text-indigo-600 flex items-center gap-1"
            >
              <span>💬</span> {post.comment_count || 0} Comments
            </button>
          </div>

          {showComments && (
            <CommentSection postId={post.id} currentUser={currentUser} isMember={isMember} />
          )}

          {showReportModal && (
            <ReportModal
              postId={post.id}
              onClose={() => setShowReportModal(false)}
              onSuccess={() => {
                setShowReportModal(false);
                window.alert('Report submitted successfully.');
              }}
            />
          )}

          {showModerateModal && (
            <ModerateModal
              postId={post.id}
              onClose={() => setShowModerateModal(false)}
              onSuccess={() => {
                setShowModerateModal(false);
                onUpdate();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

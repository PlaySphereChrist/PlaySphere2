import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ReportModal from './ReportModal';
import ModerateModal from './ModerateModal';
import { PsButton, PsInput, PsAlert, PsLoading, PsTextarea } from '../../components/ui';

export default function CommentSection({ postId, currentUser, isMember }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [reportCommentId, setReportCommentId] = useState(null);
  const [moderateCommentId, setModerateCommentId] = useState(null);

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

  if (loading) return <div className="mt-4"><PsLoading /></div>;
  if (error) return <div className="mt-4"><PsAlert variant="error">{error}</PsAlert></div>;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-serif font-bold text-primary mb-4">Comments ({comments.length})</h4>

      <div className="space-y-4 mb-4">
        {comments.map(c => {
          const isAuthor = currentUser?.id === c.author_user_id;
          const isAdmin = currentUser?.roles?.includes('ADMIN');
          const canEdit = isAuthor || isAdmin;

          return (
            <div key={c.id} className="bg-pill-hover rounded-lg p-4 text-sm border border-border">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-primary">{c.author_email}</span>
                <span className="text-xs text-muted font-medium">{new Date(c.created_at).toLocaleString()}</span>
              </div>

              {c.is_moderated ? (
                <div className="text-error italic p-3 bg-error/5 rounded border border-error/10">This comment was moderated: {c.moderation_reason || 'No reason provided'}</div>
              ) : editingId === c.id ? (
                <div className="mt-2">
                  <PsTextarea
                    rows={2}
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                  />
                  <div className="mt-3 flex space-x-2">
                    <PsButton onClick={() => setEditingId(null)} variant="ghost" size="sm">Cancel</PsButton>
                    <PsButton onClick={() => handleEditSubmit(c.id)} size="sm">Save</PsButton>
                  </div>
                </div>
              ) : (
                <div className="text-primary whitespace-pre-wrap">{c.body}</div>
              )}

              {!c.is_moderated && editingId !== c.id && (
                <div className="mt-3 flex space-x-3 text-xs border-t border-border/50 pt-2">
                  {canEdit && (
                    <>
                      <button onClick={() => startEdit(c)} className="text-secondary hover:text-primary transition font-medium">Edit</button>
                      <button onClick={() => handleArchive(c.id)} className="text-error hover:text-error/80 transition font-medium">Delete</button>
                    </>
                  )}
                  {isAdmin && (
                    <button onClick={() => setModerateCommentId(c.id)} className="text-error hover:text-error/80 font-medium">Moderate</button>
                  )}
                  {currentUser && !isAuthor && (
                    <button onClick={() => setReportCommentId(c.id)} className="text-secondary hover:text-primary font-medium">Report</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isMember ? (
        <form onSubmit={handleCreate} className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <PsInput
              placeholder="Add a comment..."
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              disabled={submitting}
            />
          </div>
          <PsButton
            type="submit"
            disabled={submitting || !newBody.trim()}
          >
            {submitting ? '...' : 'Post'}
          </PsButton>
        </form>
      ) : (
        <PsAlert variant="info" className="mt-4">
          You must join the community to comment.
        </PsAlert>
      )}

      {reportCommentId && (
        <ReportModal
          commentId={reportCommentId}
          onClose={() => setReportCommentId(null)}
          onSuccess={() => {
            setReportCommentId(null);
            window.alert('Report submitted successfully.');
          }}
        />
      )}

      {moderateCommentId && (
        <ModerateModal
          commentId={moderateCommentId}
          onClose={() => setModerateCommentId(null)}
          onSuccess={() => {
            setModerateCommentId(null);
            fetchComments();
          }}
        />
      )}
    </div>
  );
}

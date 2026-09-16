import React, { useState } from 'react';
import { api } from '../../lib/api';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import ModerateModal from './ModerateModal';
import { PsCard, PsButton, PsBadge, PsInput, PsTextarea } from '../../components/ui';

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

  const handleReact = async (reactionType) => {
    if (!isMember) {
      window.alert('You must join the community to react.');
      return;
    }
    try {
      const res = await api.request('POST', `/community/posts/${post.id}/react`, { reaction: reactionType });
      if (res.success) {
        onUpdate(); // refresh post data
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
    <PsCard className="mb-4">
      <div className="p-5">
        {post.is_moderated ? (
          <div className="text-error italic text-sm p-4 bg-error/5 rounded-lg border border-error/20">
            This post was moderated: {post.moderation_reason || 'No reason provided'}
          </div>
        ) : editing ? (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <PsInput
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              disabled={submitting}
            />
            <PsTextarea
              rows={4}
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              disabled={submitting}
            />
            <div className="flex space-x-2 justify-end">
              <PsButton type="button" variant="ghost" onClick={() => setEditing(false)} disabled={submitting}>Cancel</PsButton>
              <PsButton type="submit" disabled={submitting}>Save</PsButton>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
              <div>
                <h4 className="text-lg font-serif font-bold text-primary">{post.title}</h4>
                <div className="text-xs text-secondary mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-bold">{post.author_email}</span>
                  <span className="text-muted">•</span>
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                  {post.category !== 'general' && post.category !== 'equipment_request' && (
                    <>
                      <span className="text-muted">•</span>
                      <PsBadge variant="default" className="capitalize text-[10px]">
                        {post.category.replace(/_/g, ' ')}
                      </PsBadge>
                    </>
                  )}
                  {post.is_pinned && <span className="text-maroon font-bold text-[10px] uppercase tracking-wider">• Pinned</span>}
                  {post.is_locked && <span className="text-error font-bold text-[10px] uppercase tracking-wider">• Locked</span>}
                </div>
              </div>

              <div className="flex space-x-3 text-sm shrink-0">
                {canEdit && (
                  <>
                    <button onClick={() => setEditing(true)} className="text-secondary hover:text-primary transition font-medium">Edit</button>
                    <button onClick={handleArchive} className="text-error hover:text-error/80 transition font-medium">Delete</button>
                  </>
                )}
                {isAdmin && !post.is_moderated && (
                  <button onClick={() => setShowModerateModal(true)} className="text-error hover:text-error/80 ml-2 border-l border-border pl-3 font-medium">Moderate</button>
                )}
                {currentUser && !isAuthor && (
                  <button onClick={() => setShowReportModal(true)} className="text-secondary hover:text-primary ml-2 border-l border-border pl-3 font-medium">Report</button>
                )}
              </div>
            </div>

            <div className="mt-3 text-primary whitespace-pre-wrap text-sm leading-relaxed bg-surface rounded-lg">
              {post.body}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-6">
              <button
                onClick={() => handleReact('like')}
                className={`text-sm transition flex items-center gap-2 font-medium ${post.user_reaction === 'like' ? 'text-maroon' : 'text-secondary hover:text-maroon'}`}
              >
                <span>{post.user_reaction === 'like' ? '❤️' : '🤍'}</span> 
                {post.reactions?.find(r => r.type === 'like')?.count || 0} Likes
              </button>
              
              <button
                onClick={() => setShowComments(!showComments)}
                className="text-sm text-secondary hover:text-maroon transition flex items-center gap-2 font-medium"
              >
                <span>💬</span> {post.comment_count || 0} Comments
              </button>
            </div>

            {showComments && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <CommentSection postId={post.id} currentUser={currentUser} isMember={isMember} />
              </div>
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
    </PsCard>
  );
}

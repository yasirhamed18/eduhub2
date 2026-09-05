'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Eye, Download, Heart, Copy, Play } from 'lucide-react';
import { api, ApiError, getToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { formatSize, formatDate } from '@/lib/format';
import { Loader, EmptyState } from '@/components/ui/Feedback';
import type { Comment, Resource } from '@/types';

export default function ResourceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const { showToast } = useToast();

  const [resource, setResource] = useState<Resource | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = getToken();
      const res = await api.get<{ resource: Resource }>(`/resources/${id}`, token);
      setResource(res.resource);
    } catch {
      setResource(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    try {
      const res = await api.get<{ comments: Comment[] }>(`/resources/${id}/comments`);
      setComments(res.comments);
    } catch {
      setComments([]);
    }
  }, [id]);

  useEffect(() => {
    load();
    loadComments();
  }, [load, loadComments]);

  if (loading) return <Loader label="Loading resource…" />;
  if (!resource) return <NotFound />;

  const r = resource;
  const isQuiz = r.category?.key === 'quizzes';
  const isImage = r.category?.key === 'images';
  const fileUrl = r.file_url || r.url || '';

  const handleView = async () => {
    if (fileUrl) {
      window.dispatchEvent(new CustomEvent('eduhub:open-viewer', { detail: { resource: r } }));
    } else if (r.url) {
      window.open(r.url, '_blank', 'noopener');
    }
    try {
      await api.post(`/resources/${r.id}/view`);
      setResource((prev) => (prev ? { ...prev, view_count: prev.view_count + 1 } : prev));
    } catch {
      /* non-fatal */
    }
  };

  const handleDownload = async () => {
    try {
      const resp = await fetch(fileUrl);
      if (!resp.ok) throw new Error('fetch failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.file_name || r.title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      await api.post(`/resources/${r.id}/download`);
      setResource((prev) => (prev ? { ...prev, download_count: prev.download_count + 1 } : prev));
    } catch {
      if (r.url) window.open(r.url, '_blank', 'noopener');
    }
  };

  const handleLike = async () => {
    const token = getToken();
    if (!token) {
      showToast('Please log in to like resources.');
      return;
    }
    try {
      const res = await api.post<{ liked: boolean; like_count: number }>(
        `/resources/${r.id}/like`,
        {},
        token
      );
      setResource((prev) =>
        prev ? { ...prev, liked_by_me: res.liked, like_count: res.like_count } : prev
      );
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not update like.');
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/resource/${r.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied!');
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) {
      showToast('Write a comment first.');
      return;
    }
    setSubmitting(true);
    try {
      const token = getToken();
      if (!token) {
        showToast('Please log in to comment.');
        setSubmitting(false);
        return;
      }
      const res = await api.post<{ comment: Comment }>(
        `/resources/${r.id}/comments`,
        { body: text },
        token
      );
      setComments((prev) => [...prev, res.comment]);
      setCommentText('');
      setResource((prev) => (prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev));
      showToast('Comment posted!');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const token = getToken();
      if (!token) return;
      await api.del(`/resources/comments/${commentId}`, token);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setResource((prev) => (prev ? { ...prev, comment_count: prev.comment_count - 1 } : prev));
      showToast('Comment deleted.');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not delete comment.');
    }
  };

  const canDeleteComment = (comment: Comment) =>
    user?.role === 'admin' || user?.id === comment.user_id;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <Link href={`/category/${r.category?.key || ''}`} className="back-link">
        <ArrowLeft size={16} /> Back to {r.category?.label || 'resources'}
      </Link>

      <div className="detail-wrap">
        {/* Detail card */}
        <div className="detail-card">
          {isImage && fileUrl ? (
            <img src={fileUrl} alt={r.title} />
          ) : (
            <span className="detail-icon">{r.category?.icon}</span>
          )}
          <h1>{r.title}</h1>
          {r.description ? (
            <p className="res-desc" style={{ margin: '10px auto 0', maxWidth: 460 }}>
              {r.description}
            </p>
          ) : null}

          <div className="detail-stats">
            {r.type === 'file' && r.file_size ? (
              <span className="chip">{formatSize(r.file_size)}</span>
            ) : null}
            <span className="chip">👁 {r.view_count} views</span>
            <span className="chip">⬇ {r.download_count} downloads</span>
            <span className="chip">♥ {r.like_count} likes</span>
            {isQuiz ? <span className="chip">🎯 {r.question_count} questions</span> : null}
          </div>

          <div className="detail-actions">
            {isQuiz ? (
              <Link href={`/quiz/${r.id}`} className="btn btn-primary btn-lg">
                <Play size={17} /> Start quiz
              </Link>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={handleView} disabled={!fileUrl}>
                  <Eye size={17} /> View
                </button>
                <button className="btn btn-ghost btn-lg" onClick={handleDownload}>
                  <Download size={17} /> Download
                </button>
              </>
            )}
            <button
              className={`btn btn-lg ${r.liked_by_me ? 'btn-danger' : 'btn-ghost'}`}
              onClick={handleLike}
            >
              <Heart size={17} fill={r.liked_by_me ? 'currentColor' : 'none'} />{' '}
              {r.liked_by_me ? 'Liked' : 'Like'}
            </button>
          </div>

          <div className="link-box">
            <input type="text" readOnly value={`${window.location.origin}/resource/${r.id}`} />
            <button className="btn btn-ghost btn-sm" onClick={copyLink}>
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>

        {/* Comments */}
        <section className="comments-section">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Comments <span className="comment-total">({r.comment_count})</span>
          </h2>

          <form className="comment-form" onSubmit={submitComment}>
            <textarea
              placeholder="Share your thoughts about this resource…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              disabled={!user}
            />
            <button className="btn btn-primary" disabled={submitting || !user}>
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
            {!user && (
              <p className="hint" style={{ margin: 0 }}>
                <Link href="/login">Log in</Link> to join the conversation.
              </p>
            )}
          </form>

          <div className="comment-list">
            {comments.length ? (
              [...comments]
                .slice()
                .reverse()
                .map((c) => (
                  <div className="comment-item" key={c.id}>
                    <div className="comment-avatar">{c.user_name.charAt(0).toUpperCase()}</div>
                    <div className="comment-body">
                      <div className="comment-head">
                        <strong>{c.user_name}</strong>
                        <span className="comment-date">{formatDate(c.created_at)}</span>
                      </div>
                      <p>{c.body}</p>
                    </div>
                    {canDeleteComment(c) && (
                      <button className="del-comment" onClick={() => deleteComment(c.id)} title="Delete">
                        ✕
                      </button>
                    )}
                  </div>
                ))
            ) : (
              <EmptyState icon="💬" title="No comments yet" subtitle="Be the first to share your thoughts." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="container">
      <div className="empty-state">
        <span className="em">🙈</span>
        <h3>We couldn’t find that resource</h3>
        <p>
          It may have been removed.{' '}
          <a href="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Go back home
          </a>
        </p>
      </div>
    </div>
  );
}
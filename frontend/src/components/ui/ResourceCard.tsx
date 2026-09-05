'use client';

import Link from 'next/link';
import { formatSize } from '@/lib/format';
import { api, ApiError, getToken } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { Resource } from '@/types';

interface Props {
  resource: Resource;
  onLike?: (id: number, liked: boolean, count: number) => void;
  onStatChange?: (id: number, field: 'view' | 'download') => void;
}

export default function ResourceCard({ resource: r, onLike, onStatChange }: Props) {
  const { showToast } = useToast();

  const isQuiz = r.category?.key === 'quizzes';

  const handleView = async () => {
    if (r.type === 'file' && r.file_url) {
      openViewer();
    } else if (r.type === 'link' && r.url) {
      window.open(r.url, '_blank', 'noopener');
    }
    try {
      await api.post(`/resources/${r.id}/view`);
      onStatChange?.(r.id, 'view');
    } catch {
      /* non-fatal */
    }
  };

  const openViewer = () => {
    window.dispatchEvent(
      new CustomEvent('eduhub:open-viewer', {
        detail: { resource: r },
      })
    );
    handleStat();
  };

  const handleStat = async () => {
    try {
      await api.post(`/resources/${r.id}/view`);
      onStatChange?.(r.id, 'view');
    } catch {
      /* non-fatal */
    }
  };

  const handleDownload = async () => {
    const fileUrl = r.file_url || '';
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
    const target = /^https?:\/\//i.test(fileUrl) ? fileUrl : `${base}${fileUrl}`;
    try {
      const resp = await fetch(target, { method: 'GET' });
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
      onStatChange?.(r.id, 'download');
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
      onLike?.(r.id, res.liked, res.like_count);
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

  const infoMeta = (
    <div className="res-meta">
      {r.type === 'file' && r.file_size ? (
        <span className="chip">{formatSize(r.file_size)}</span>
      ) : null}
      <span className="chip">👁 {r.view_count}</span>
      <span className="chip">⬇ {r.download_count}</span>
      <span className="chip">💬 {r.comment_count}</span>
    </div>
  );

  if (isQuiz) {
    return (
      <article className="res-card">
        <span className="res-icon">{r.category?.icon}</span>
        <div className="res-main">
          <Link href={`/resource/${r.id}`} className="res-title-link">
            <h3 className="res-title">{r.title}</h3>
          </Link>
          <div className="res-meta">
            <span className="chip badge-quiz">🎯 {r.question_count} questions</span>
            <span className="chip">💬 {r.comment_count}</span>
          </div>
          {r.description ? <p className="res-desc">{r.description}</p> : null}
        </div>
        <div className="res-actions">
          <Link href={`/quiz/${r.id}`} className="btn btn-primary">
            Start quiz
          </Link>
          <button className={`like-btn ${r.liked_by_me ? 'liked' : ''}`} onClick={handleLike}>
            ♥ <span className="like-count">{r.like_count}</span>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={copyLink}>
            Copy link
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="res-card">
      <span className="res-icon">{r.category?.icon}</span>
      <div className="res-main">
        <Link href={`/resource/${r.id}`} className="res-title-link">
          <h3 className="res-title">{r.title}</h3>
        </Link>
        {infoMeta}
        {r.description ? <p className="res-desc">{r.description}</p> : null}
      </div>
      <div className="res-actions">
        <button className="btn btn-primary" onClick={handleView}>
          View
        </button>
        <button className="btn btn-ghost" onClick={handleDownload}>
          Download
        </button>
        <button className={`like-btn ${r.liked_by_me ? 'liked' : ''}`} onClick={handleLike}>
          ♥ <span className="like-count">{r.like_count}</span>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={copyLink}>
          Copy link
        </button>
      </div>
    </article>
  );
}

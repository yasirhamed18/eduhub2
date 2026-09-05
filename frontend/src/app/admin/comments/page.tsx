'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { api, ApiError, getToken } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatDate } from '@/lib/format';
import { Loader, EmptyState } from '@/components/ui/Feedback';
import type { AdminComment } from '@/types';

export default function AdminCommentsPage() {
  const { showToast } = useToast();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ comments: AdminComment[] }>('/admin/comments', token)
      .then((res) => setComments(res.comments))
      .catch((e) => showToast(e instanceof ApiError ? e.message : 'Could not load comments.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (c: AdminComment) => {
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (!token) return;
    if (!window.confirm('Delete this comment?')) return;
    setDeletingId(c.id);
    try {
      await api.del<{ success: boolean }>(`/resources/comments/${c.id}`, token);
      setComments((prev) => prev.filter((x) => x.id !== c.id));
      showToast('Comment deleted.');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not delete comment.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="admin-header">
        <h1>Comments</h1>
      </div>

      {loading ? (
        <Loader label="Loading comments…" />
      ) : comments.length ? (
        comments.map((c) => (
          <div className="admin-list-item" key={c.id}>
            <div className="item-main">
              <strong>{c.user_name}</strong>
              <div className="hint" style={{ marginBottom: 4 }}>
                on{' '}
                <Link href={`/resource/${c.resource_id}`} style={{ color: 'var(--primary)' }}>
                  {c.resource_title}
                </Link>{' '}
                · {formatDate(c.created_at)}
              </div>
              <div style={{ color: 'var(--text)', lineHeight: 1.5 }}>{c.body}</div>
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDelete(c)}
              disabled={deletingId === c.id}
            >
              <Trash2 size={14} /> {deletingId === c.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ))
      ) : (
        <EmptyState icon="💬" title="No comments yet" subtitle="Comments from the site will appear here." />
      )}
    </div>
  );
}
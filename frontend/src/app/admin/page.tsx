'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Users, Eye, Download, Heart, MessageSquare, Files } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Loader, EmptyState } from '@/components/ui/Feedback';
import type { AdminStats } from '@/types';

export default function AdminDashboardPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('eduhub_token') : null;
    if (!token) return;
    api
      .get<{ stats: AdminStats }>('/admin/stats', token)
      .then((res) => setStats(res.stats))
      .catch((e) => showToast(e instanceof Error ? e.message : 'Could not load stats.'))
      .finally(() => setLoading(false));
  }, [showToast]);

  if (loading) return <Loader label="Loading dashboard…" />;
  if (!stats) return <EmptyState icon="📊" title="Could not load stats" />;

  const items = [
    { label: 'Resources', value: stats.resources, icon: Files, color: 'var(--primary)' },
    { label: 'Categories', value: stats.categories, icon: FolderOpen, color: 'var(--indigo)' },
    { label: 'Views', value: stats.views, icon: Eye, color: 'var(--success)' },
    { label: 'Downloads', value: stats.downloads, icon: Download, color: 'var(--warning)' },
    { label: 'Likes', value: stats.likes, icon: Heart, color: 'var(--danger)' },
    { label: 'Comments', value: stats.comments, icon: MessageSquare, color: 'var(--text-soft)' },
    { label: 'Users', value: stats.users, icon: Users, color: 'var(--primary)' },
  ];

  return (
    <div>
      <div className="admin-header">
        <h1>Dashboard</h1>
        <Link href="/admin/resources" className="btn btn-primary btn-sm">
          + Add resource
        </Link>
      </div>

      <div className="stats-grid">
        {items.map((it) => (
          <div className="stat-card" key={it.label}>
            <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <it.icon size={15} style={{ color: it.color }} /> {it.label}
            </div>
            <div className="value">{it.value}</div>
          </div>
        ))}
      </div>

      <p className="muted" style={{ fontSize: 13 }}>
        All stats reflect the current state of the live database.
      </p>
    </div>
  );
}
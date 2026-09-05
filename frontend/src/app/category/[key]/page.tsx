'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useCategories, useResources } from '@/lib/hooks';
import { Loader, EmptyState } from '@/components/ui/Feedback';
import ResourceCard from '@/components/ui/ResourceCard';

export default function CategoryPage() {
  const params = useParams<{ key: string }>();
  const slug = params.key;
  const { categories, loading: catLoading } = useCategories();
  const { resources, loading: resLoading, updateResource } = useResources({ category: slug });

  const category = categories.find((c) => c.key === slug);

  if (!catLoading && !category) {
    notFound();
  }

  const handleLike = (id: number, liked: boolean, count: number) =>
    updateResource(id, { liked_by_me: liked, like_count: count });

  const handleStatChange = (id: number, field: 'view' | 'download') => {
    const r = resources.find((x) => x.id === id);
    if (!r) return;
    updateResource(
      id,
      field === 'view' ? { view_count: r.view_count + 1 } : { download_count: r.download_count + 1 }
    );
  };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <Link href="/categories" className="back-link">
        <ArrowLeft size={16} /> All categories
      </Link>

      {category && (
        <div className="section-head">
          <div className="title">
            <span
              className="cat-icon"
              style={{ background: `${category.color}18`, color: category.color }}
            >
              {category.icon}
            </span>
            <h2>{category.label}</h2>
          </div>
          <span className="chip">
            {resources.length} {resources.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      )}

      {resLoading ? (
        <Loader label="Loading resources…" />
      ) : resources.length ? (
        <div className="res-list">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} onLike={handleLike} onStatChange={handleStatChange} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={category?.icon || '📂'}
          title={`Nothing in ${category?.label || 'this shelf'} yet`}
          subtitle="New items will show up here as soon as they're added."
        />
      )}
    </div>
  );
}
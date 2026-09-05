'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useCategories } from '@/lib/hooks';
import { Loader, EmptyState } from '@/components/ui/Feedback';

export default function CategoriesPage() {
  const { categories, loading } = useCategories();

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="section-head">
        <h2>All categories</h2>
        <p className="muted" style={{ margin: 0 }}>
          {categories.length} shelves
        </p>
      </div>

      {loading ? (
        <Loader label="Loading categories…" />
      ) : categories.length ? (
        <div className="grid">
          {categories.map((c) => (
            <Link key={c.key} href={`/category/${c.key}`} className="cat-card">
              <span className="cat-icon" style={{ background: `${c.color}18`, color: c.color }}>
                {c.icon}
              </span>
              <span className="cat-text">
                <span className="cat-label">{c.label}</span>
                <span className="cat-count">
                  {c.resource_count ?? 0} {c.resource_count === 1 ? 'item' : 'items'}
                </span>
              </span>
              <span className="cat-arrow">
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="🗂️" title="No categories yet" subtitle="Add categories from the admin dashboard." />
      )}
    </div>
  );
}
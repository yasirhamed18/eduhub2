'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { useCategories, useResources } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Loader, EmptyState } from '@/components/ui/Feedback';
import ResourceCard from '@/components/ui/ResourceCard';
import type { Resource } from '@/types';

export default function HomePage() {
  const { categories } = useCategories();
  const { resources, loading, updateResource } = useResources();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Resource[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{ resources: Resource[] }>(
          `/resources?q=${encodeURIComponent(query.trim())}`
        );
        if (!cancelled) setResults(res.resources);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const handleLikeUpdate = (id: number, liked: boolean, count: number) =>
    updateResource(id, { liked_by_me: liked, like_count: count });
  const handleStat = (id: number, field: 'view' | 'download') => {
    setResourcesCount(field, id);
  };

  const setResourcesCount = (field: 'view' | 'download', id: number) => {
    const r = resources.find((x) => x.id === id);
    if (!r) return;
    updateResource(
      id,
      field === 'view'
        ? { view_count: r.view_count + 1 }
        : { download_count: r.download_count + 1 }
    );
  };

  const latest = resources.slice(0, 6);

  return (
    <div className="container">
      {/* Hero */}
      <section className="hero">
        <span className="hero-badge">
          <SparklesIcon /> Your education library
        </span>
        <h1>Learn. Discover. Grow.</h1>
        <p className="hero-sub">
          Notes, books, slides, quizzes and past papers — everything you need to study,
          all in one clean place.
        </p>
        <div className="search-wrap">
          <span className="icn">
            <Search size={17} />
          </span>
          <input
            type="text"
            placeholder="Search resources by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {query.trim() ? (
          <div className="mt-3">
            {searching ? (
              <EmptyState icon="🔍" title="Searching…" />
            ) : results && results.length ? (
              <div className="res-list" style={{ textAlign: 'left', maxWidth: 680, margin: '0 auto' }}>
                <div className="section-head">
                  <h2>Search results</h2>
                </div>
                {results.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    onLike={handleLikeUpdate}
                    onStatChange={handleStat}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="em">🔎</span>
                <h3>No matches yet</h3>
                <p>Try a different word, or browse a category below.</p>
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Categories */}
      <section style={{ marginTop: 24 }}>
        <div className="section-head">
          <h2>Browse categories</h2>
        </div>
        <div className="grid">
          {categories.map((c) => (
            <Link key={c.key} href={`/category/${c.key}`} className="cat-card">
              <span
                className="cat-icon"
                style={{
                  background: `${c.color}18`,
                  color: c.color,
                }}
              >
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
      </section>

      {/* Latest resources */}
      <section style={{ marginTop: 48 }}>
        <div className="section-head">
          <h2>Latest resources</h2>
          <Link href="/categories" className="btn btn-ghost btn-sm">
            View all
          </Link>
        </div>
        {loading ? (
          <Loader label="Loading resources…" />
        ) : latest.length ? (
          <div className="res-list">
            {latest.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                onLike={handleLikeUpdate}
                onStatChange={handleStat}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon="📚" title="No resources yet" subtitle="Check back soon for new content." />
        )}
      </section>
    </div>
  );
}

function SparklesIcon() {
  return <span style={{ display: 'inline-flex' }}>✦</span>;
}

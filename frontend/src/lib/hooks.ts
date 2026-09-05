'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Category, Resource } from '@/types';

export interface ResourceData {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  updateResource: (id: number, patch: Partial<Resource>) => void;
  refresh: () => void;
}

export function useResources(
  options?: { category?: string | null; q?: string | null },
  enabled = true
): ResourceData {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.category) params.set('category', options.category);
      if (options?.q) params.set('q', options.q);
      const res = await api.get<{ resources: Resource[] }>(
        `/resources${params.toString() ? `?${params.toString()}` : ''}`
      );
      setResources(res.resources);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load resources.');
    } finally {
      setLoading(false);
    }
  }, [enabled, options?.category, options?.q]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateResource = useCallback((id: number, patch: Partial<Resource>) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }, []);

  return { resources, loading, error, updateResource, refresh: fetch };
}

export function useCategories(enabled = true) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await api.get<{ categories: Category[] }>('/categories');
      setCategories(res.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { categories, loading, error, refresh: fetch };
}

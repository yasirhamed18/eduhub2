'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { api, ApiError, getToken } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useCategories } from '@/lib/hooks';
import { Loader, EmptyState } from '@/components/ui/Feedback';
import type { Category } from '@/types';

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const { categories, loading, refresh } = useCategories();
  const token = typeof window !== 'undefined' ? getToken() : null;

  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Category | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('#2563eb');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleAdd = async () => {
    if (!token) return;
    if (!label.trim()) {
      showToast('Category label is required.');
      return;
    }
    setSaving(true);
    try {
      await api.post<{ category: Category }>(
        '/admin/categories',
        { label: label.trim(), icon: icon.trim() || '📁', color: color.trim() || '#2563eb' },
        token
      );
      showToast('Category added.');
      setLabel('');
      setIcon('');
      setColor('#2563eb');
      refresh();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not add category.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setEditLabel(c.label);
    setEditIcon(c.icon);
    setEditColor(c.color);
  };

  const saveEdit = async () => {
    if (!token || !editing) return;
    if (!editLabel.trim()) {
      showToast('Label cannot be empty.');
      return;
    }
    setSavingEdit(true);
    try {
      await api.patch<{ category: Category }>(
        `/admin/categories/${editing.id}`,
        { label: editLabel.trim(), icon: editIcon.trim() || '📁', color: editColor.trim() || '#2563eb' },
        token
      );
      showToast('Category updated.');
      setEditing(null);
      refresh();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not update category.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (c: Category) => {
    if (!token) return;
    if (c.resource_count && c.resource_count > 0) {
      showToast('This category still has items. Move or delete them first.');
      return;
    }
    if (!window.confirm(`Delete category "${c.label}"?`)) return;
    try {
      await api.del<{ success: boolean }>(`/admin/categories/${c.id}`, token);
      showToast('Category deleted.');
      refresh();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not delete category.');
    }
  };

  return (
    <div>
      <div className="admin-header">
        <h1>Categories</h1>
      </div>

      <div className="form-card">
        <h3>Add a new category</h3>
        <div className="field">
          <label>Label</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Mathematics" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Icon (emoji)</label>
            <input className="input" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📐" maxLength={8} />
          </div>
          <div className="field">
            <label>Colour</label>
            <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !token}>
          <Plus size={16} /> {saving ? 'Adding…' : 'Add category'}
        </button>
      </div>

      {editing && (
        <div className="form-card">
          <h3>
            <Pencil size={16} style={{ display: 'inline', marginRight: 6 }} />
            Edit category
          </h3>
          <div className="field">
            <label>Label</label>
            <input className="input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Icon (emoji)</label>
              <input className="input" value={editIcon} onChange={(e) => setEditIcon(e.target.value)} maxLength={8} />
            </div>
            <div className="field">
              <label>Colour</label>
              <input className="input" type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit}>
              <Check size={16} /> {savingEdit ? 'Saving…' : 'Save changes'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: 14 }}>All categories ({categories.length})</h3>
      {loading ? (
        <Loader label="Loading categories…" />
      ) : categories.length ? (
        categories.map((c) => (
          <div className="admin-list-item" key={c.id}>
            <div className="item-main">
              <strong>
                <span style={{ marginRight: 8 }}>{c.icon}</span>
                {c.label}
              </strong>
              <div className="hint">
                <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: c.color, marginRight: 6, verticalAlign: 'middle' }} />
                {c.key} · {c.resource_count ?? 0} item{c.resource_count === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>
                <Pencil size={14} /> Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))
      ) : (
        <EmptyState icon="📂" title="No categories" subtitle="Add your first category above." />
      )}
    </div>
  );
}
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  ListChecks,
  X,
  Pencil,
  Check,
} from 'lucide-react';
import { api, ApiError, getToken } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useCategories, useResources } from '@/lib/hooks';
import { formatSize, formatDate } from '@/lib/format';
import { Loader, EmptyState } from '@/components/ui/Feedback';
import type { Resource } from '@/types';

interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

type Mode = 'none' | 'files' | 'link' | 'quiz';

export default function AdminResourcesPage() {
  const { showToast } = useToast();
  const { categories } = useCategories();
  const { resources, loading, refresh: refreshResources } = useResources();

  const [mode, setMode] = useState<Mode>('none');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  const [pendingFiles, setPendingFiles] = useState<{ file: File; title: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Edit state
  const [editing, setEditing] = useState<Resource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [savingEdit, setSavingEdit] = useState(false);

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (categories.length && !categoryId) setCategoryId(categories[0].id);
    if (editing && categories.length && !editCategoryId) {
      setEditCategoryId(editing.category_id);
    }
  }, [categories, categoryId, editCategoryId, editing]);

  const resetForm = () => {
    setMode('none');
    setTitle('');
    setDescription('');
    setUrl('');
    setPendingFiles([]);
    setQuizQuestions([]);
    setCategoryId('');
  };

  const addFile = (list: FileList | null) => {
    if (!list) return;
    const added: { file: File; title: string }[] = [];
    Array.from(list).forEach((file) => {
      added.push({ file, title: file.name.replace(/\.[^/.]+$/, '') });
    });
    setPendingFiles((prev) => [...prev, ...added]);
  };

  const handleUploadAll = async () => {
    if (!token) return;
    if (!categoryId) {
      showToast('Select a category first.');
      return;
    }
    if (!pendingFiles.length) {
      showToast('Add at least one file first.');
      return;
    }
    setUploading(true);
    let done = 0;
    for (const pf of pendingFiles) {
      const fd = new FormData();
      fd.append('category_id', String(categoryId));
      fd.append('title', pf.title);
      fd.append('description', description);
      fd.append('file', pf.file);
      try {
        await api.upload('/resources/upload', fd, token);
        done++;
      } catch (e) {
        showToast(`Upload failed for "${pf.file.name}": ${e instanceof ApiError ? e.message : e}`);
      }
    }
    if (done) {
      showToast(`Added ${done} item${done !== 1 ? 's' : ''}! 🎉`);
      resetForm();
      refreshResources();
    }
    setUploading(false);
  };

  const handleAddLink = async () => {
    if (!token) return;
    if (!categoryId) {
      showToast('Select a category first.');
      return;
    }
    if (!title.trim() || !url.trim()) {
      showToast('Both a title and link are required.');
      return;
    }
    try {
      await api.post(
        '/resources',
        { category_id: categoryId, title: title.trim(), description: description.trim(), url: url.trim() },
        token
      );
      showToast('Link item added! 🎉');
      resetForm();
      refreshResources();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not add link.');
    }
  };

  const handleQuizSubmit = async () => {
    if (!token) return;
    if (!title.trim()) {
      showToast('Quiz title is required.');
      return;
    }
    const valid = quizQuestions.filter((q) => q.q.trim() && q.options.every((o) => o.trim()));
    if (!valid.length) {
      showToast('Add at least one complete question.');
      return;
    }
    try {
      await api.post(
        '/resources/quiz',
        {
          category_id: categoryId || undefined,
          title: title.trim(),
          description: description.trim(),
          questions: valid,
        },
        token
      );
      showToast('Quiz added! 🎯');
      resetForm();
      refreshResources();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not add quiz.');
    }
  };

  const handleDelete = async (r: Resource) => {
    if (!token) return;
    if (!window.confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    try {
      await api.del(`/resources/${r.id}`, token);
      showToast('Deleted.');
      refreshResources();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not delete.');
    }
  };

  const startEdit = (r: Resource) => {
    setEditing(r);
    setEditTitle(r.title);
    setEditDescription(r.description || '');
    setEditCategoryId(r.category_id);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditTitle('');
    setEditDescription('');
    setEditCategoryId('');
  };

  const saveEdit = async () => {
    if (!token || !editing) return;
    if (!editTitle.trim()) {
      showToast('Title cannot be empty.');
      return;
    }
    if (!editCategoryId) {
      showToast('Select a category.');
      return;
    }
    setSavingEdit(true);
    try {
      await api.put(
        `/resources/${editing.id}`,
        {
          title: editTitle.trim(),
          description: editDescription.trim(),
          category_id: editCategoryId,
        },
        token
      );
      showToast('Resource updated.');
      cancelEdit();
      refreshResources();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not update resource.');
    } finally {
      setSavingEdit(false);
    }
  };

  const addQuestion = () =>
    setQuizQuestions((prev) => [...prev, { q: '', options: ['', '', '', ''], correct: 0 }]);

  const updateQuestion = (i: number, patch: Partial<QuizQuestion>) =>
    setQuizQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const removeQuestion = (i: number) =>
    setQuizQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const changeOption = (qi: number, oi: number, value: string) =>
    setQuizQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q))
    );

  return (
    <div>
      <div className="admin-header">
        <h1>Resources</h1>
      </div>

      {/* Add content */}
      <div className="form-card">
        <h3>Add new content</h3>

        {mode === 'none' && (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <button
              className="btn btn-ghost btn-lg"
              style={{ height: 96, flexDirection: 'column', gap: 6 }}
              onClick={() => setMode('files')}
            >
              <Upload size={22} /> Upload files
            </button>
            <button
              className="btn btn-ghost btn-lg"
              style={{ height: 96, flexDirection: 'column', gap: 6 }}
              onClick={() => setMode('link')}
            >
              <LinkIcon size={22} /> Add link
            </button>
            <button
              className="btn btn-ghost btn-lg"
              style={{ height: 96, flexDirection: 'column', gap: 6 }}
              onClick={() => setMode('quiz')}
            >
              <ListChecks size={22} /> Build quiz
            </button>
          </div>
        )}

        {mode !== 'none' && (
          <>
            <div className="field">
              <label>Category</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'files' && (
              <>
                <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
                  <span className="dz-icon">📤</span>
                  <strong>Click to choose files</strong>
                  <div className="hint">
                    Select as many as you like at once — each becomes its own item. Max{' '}
                    {formatSize(50 * 1024 * 1024)} per file.
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => addFile(e.target.files)}
                />

                {pendingFiles.length > 0 && (
                  <div className="mt-2">
                    {pendingFiles.map((pf, i) => (
                      <div className="file-pending-item" key={i}>
                        <input
                          type="text"
                          value={pf.title}
                          onChange={(e) =>
                            setPendingFiles((prev) =>
                              prev.map((p, idx) => (idx === i ? { ...p, title: e.target.value } : p))
                            )
                          }
                        />
                        <span className="fp-size">{formatSize(pf.file.size)}</span>
                        <button
                          className="fp-remove"
                          onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                    <button className="btn btn-primary btn-block mt-2" onClick={handleUploadAll} disabled={uploading}>
                      {uploading
                        ? 'Uploading…'
                        : `Add ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}`}
                    </button>
                  </div>
                )}
              </>
            )}

            {mode === 'link' && (
              <>
                <div className="field">
                  <label>Title</label>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title for this item" />
                </div>
                <div className="field">
                  <label>File link</label>
                  <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
                </div>
                <div className="field">
                  <label>Description (optional)</label>
                  <textarea className="input" style={{ minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={handleAddLink}>
                  <Plus size={16} /> Add link item
                </button>
              </>
            )}

            {mode === 'quiz' && (
              <>
                <div className="field">
                  <label>Quiz title</label>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Science Chapter 3 Quiz" />
                </div>
                <div className="field">
                  <label>Short description (optional)</label>
                  <textarea className="input" style={{ minHeight: 70 }} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                {quizQuestions.map((q, qi) => (
                  <div className="qbuilder-block" key={qi}>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <input
                        className="input"
                        placeholder={`Question ${qi + 1}`}
                        value={q.q}
                        onChange={(e) => updateQuestion(qi, { q: e.target.value })}
                      />
                    </div>
                    {q.options.map((opt, oi) => (
                      <div className="qopt-row" key={oi}>
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correct === oi}
                          onChange={() => updateQuestion(qi, { correct: oi })}
                        />
                        <input
                          type="text"
                          className="input"
                          placeholder={`Option ${oi + 1}`}
                          value={opt}
                          onChange={(e) => changeOption(qi, oi, e.target.value)}
                        />
                      </div>
                    ))}
                    <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(qi)}>
                      <Trash2 size={14} /> Remove question
                    </button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={addQuestion}>
                  <Plus size={15} /> Add question
                </button>
                <div className="mt-2">
                  <button className="btn btn-primary" onClick={handleQuizSubmit}>
                    Add quiz
                  </button>
                </div>
              </>
            )}

            <div className="mt-2">
              <button className="btn btn-ghost btn-sm" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="form-card">
          <h3>
            <Pencil size={16} style={{ display: 'inline', marginRight: 6 }} />
            Edit resource
          </h3>
          <div className="field">
            <label>Title</label>
            <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              className="input"
              style={{ minHeight: 70 }}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="input" value={editCategoryId} onChange={(e) => setEditCategoryId(Number(e.target.value))}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit}>
              <Check size={16} /> {savingEdit ? 'Saving…' : 'Save changes'}
            </button>
            <button className="btn btn-ghost" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List resources */}
      <h3 style={{ marginBottom: 14 }}>All resources ({resources.length})</h3>
      {loading ? (
        <Loader label="Loading resources…" />
      ) : resources.length ? (
        resources
          .slice()
          .reverse()
          .map((r) => (
            <div className="admin-list-item" key={r.id}>
              <div className="item-main">
                <strong>
                  {r.category?.icon} {r.title}
                </strong>
                <div className="hint">
                  {r.category?.label} ·{' '}
                  {r.type === 'link' ? (
                    <span className="badge badge-link">Link</span>
                  ) : r.category?.key === 'quizzes' ? (
                    <span className="badge badge-quiz">Quiz</span>
                  ) : (
                    <span className="badge badge-file">File</span>
                  )}
                  {r.file_size ? ` · ${formatSize(r.file_size)}` : ''}
                </div>
                <div className="res-meta" style={{ marginTop: 6 }}>
                  <span className="chip">👁 {r.view_count}</span>
                  <span className="chip">⬇ {r.download_count}</span>
                  <span className="chip">♥ {r.like_count}</span>
                  <span className="chip">💬 {r.comment_count}</span>
                  <span className="chip">{formatDate(r.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(r)}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
      ) : (
        <EmptyState icon="📁" title="No resources yet" subtitle="Use the form above to add your first item." />
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { KeyRound, Check } from 'lucide-react';
import { api, ApiError, getToken } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? getToken() : null;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!token) return;
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.post<{ success: boolean }>(
        '/auth/change-password',
        { currentPassword, newPassword },
        token
      );
      showToast('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-header">
        <h1>Settings</h1>
      </div>

      <div className="form-card" style={{ maxWidth: 480 }}>
        <h3>
          <KeyRound size={16} style={{ display: 'inline', marginRight: 6 }} />
          Change password
        </h3>
        <p className="hint" style={{ marginBottom: 14 }}>
          Logged in as <strong>{user?.email}</strong> ({user?.role})
        </p>
        <div className="field">
          <label>Current password</label>
          <input
            className="input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="field">
          <label>New password</label>
          <input
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label>Confirm new password</label>
          <input
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !token}>
          <Check size={16} /> {saving ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </div>
  );
}
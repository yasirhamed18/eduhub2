'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, Shield, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { Loader } from '@/components/ui/Feedback';

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const loggingOut = useRef(false);

  useEffect(() => {
    return () => {
      loggingOut.current = false;
    };
  }, []);

  if (loading) return <Loader label="Loading your account…" />;

  if (!user) {
    if (typeof window !== 'undefined' && !loggingOut.current) {
      router.replace('/login');
    }
    return <Loader label="Redirecting…" />;
  }

  const handleLogout = () => {
    loggingOut.current = true;
    logout();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="container" style={{ maxWidth: 640, paddingTop: 32, paddingBottom: 60 }}>
      <a href="/" className="back-link">
        <ArrowLeft size={16} /> Back home
      </a>

      <div className="detail-card" style={{ textAlign: 'left' }}>
        <h1>My account</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Manage your profile and sign-in details.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div className="comment-avatar" style={{ width: 56, height: 56, fontSize: 24 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{user.name}</h3>
            <p className="muted" style={{ margin: 0 }}>
              Member since {formatDate(user.created_at)}
            </p>
          </div>
        </div>

        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <div className="admin-list-item">
            <div className="item-main">
              <div className="res-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={16} /> Email
              </div>
            </div>
            <span style={{ color: 'var(--text-soft)', fontSize: 14 }}>{user.email}</span>
          </div>
          <div className="admin-list-item">
            <div className="item-main">
              <div className="res-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} /> Role
              </div>
            </div>
            <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
              {user.role === 'admin' ? (
                <>
                  <Shield size={13} /> Admin
                </>
              ) : (
                <>
                  <UserIcon size={13} /> User
                </>
              )}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleLogout}>
            <LogOut size={16} /> Log out
          </button>
          {user.role === 'admin' && (
            <a href="/admin" className="btn btn-ghost">
              Go to admin dashboard
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Files,
  FolderOpen,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Loader } from '@/components/ui/Feedback';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/resources', label: 'Resources', icon: Files },
  { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) return <Loader label="Checking access…" />;

  if (!user || user.role !== 'admin') {
    if (typeof window !== 'undefined') {
      router.replace('/login');
    }
    return <Loader label="Redirecting…" />;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="container">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-side-link ${active ? 'active' : ''}`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
            <button
              className="admin-side-link"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={handleLogout}
            >
              <LogOut size={17} /> Log out
            </button>
          </div>
        </aside>

        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
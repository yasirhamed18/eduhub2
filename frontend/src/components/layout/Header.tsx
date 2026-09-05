'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function Header() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push('/');
  };

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">🎓</span>
          EduHub
        </Link>

        <div className="header-actions">
          <nav className="header-nav">
            <Link href="/" className="nav-link">
              Home
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin" className="nav-link">
                Admin
              </Link>
            )}
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link href="/account" className="nav-link">
                      {user.name}
                    </Link>
                    <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="btn btn-ghost btn-sm">
                      Log in
                    </Link>
                    <Link href="/signup" className="btn btn-primary btn-sm">
                      Sign up
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          <button
            className="btn-menu"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/" className="nav-link" onClick={() => setMenuOpen(false)}>
          Home
        </Link>
        {user?.role === 'admin' && (
          <Link href="/admin" className="nav-link" onClick={() => setMenuOpen(false)}>
            Admin dashboard
          </Link>
        )}
        {user ? (
          <>
            <Link href="/account" className="nav-link" onClick={() => setMenuOpen(false)}>
              My account
            </Link>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

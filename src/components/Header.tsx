'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Header({ userName }: { userName?: string | null }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-bold">
            🏈 <span className="text-sea-green">SB</span>{' '}
            <span className="text-ne-red">LX</span>{' '}
            <span className="text-foreground hidden sm:inline">Boxes</span>
          </span>
        </a>

        <nav className="flex items-center gap-3 text-sm">
          <a href="/board" className="text-muted hover:text-foreground transition-colors">
            Board
          </a>
          {userName ? (
            <>
              <span className="text-muted">|</span>
              <span className="text-foreground font-medium">{userName}</span>
              <button
                onClick={handleLogout}
                className="text-muted hover:text-ne-red transition-colors text-xs"
              >
                Logout
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="bg-sea-green text-sea-navy font-bold px-3 py-1.5 rounded-lg text-xs hover:brightness-110 transition"
            >
              Sign In
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

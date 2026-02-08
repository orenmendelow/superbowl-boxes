'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/board';
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}&name=${encodeURIComponent(fullName)}`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center space-y-4">
            <p className="text-4xl">📧</p>
            <h1 className="text-2xl font-bold">Check Your Email!</h1>
            <p className="text-muted">
              We sent a magic link to <span className="text-foreground font-medium">{email}</span>.
              Click the link to sign in.
            </p>
            <p className="text-xs text-muted">Check your spam folder if you don&apos;t see it.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full space-y-6">
          <div className="text-center">
            <p className="text-4xl mb-2">🏈</p>
            <h1 className="text-2xl font-bold">Sign In</h1>
            <p className="text-muted text-sm mt-1">Enter your info to pick your boxes</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Smith"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-sea-green transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-sea-green transition"
              />
            </div>

            {error && (
              <p className="text-ne-red text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !fullName}
              className="w-full bg-sea-green text-sea-navy font-bold py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link ✨'}
            </button>
          </form>

          <p className="text-xs text-muted text-center">
            No password needed — we&apos;ll email you a magic link to sign in.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted animate-pulse">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

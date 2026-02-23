import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Countdown from '@/components/Countdown';
import Link from 'next/link';

export default async function Home() {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  let userName: string | null = null;
  let isAdmin = false;
  let soldCount = 0;

  if (isDemo) {
    userName = 'Demo User';
    isAdmin = true;
    soldCount = 73;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      userName = profile?.full_name || null;

      const { data: adminRow } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      isAdmin = !!adminRow;
    }

    const { count: confirmedCount } = await supabase
      .from('boxes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed');

    const { count: reservedCount } = await supabase
      .from('boxes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'reserved');

    soldCount = (confirmedCount || 0) + (reservedCount || 0);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header userName={userName} isAdmin={isAdmin} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-sea-navy/50 via-background to-ne-red/10" />
          <div className="relative max-w-4xl mx-auto px-4 py-12 sm:py-20 text-center space-y-8">
            {/* Teams */}
            <div className="flex items-center justify-center gap-4 sm:gap-8">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto rounded-full bg-sea-green/20 flex items-center justify-center text-sea-green font-black text-2xl sm:text-4xl">
                  SEA
                </div>
                <p className="text-sea-green font-bold mt-2 text-sm sm:text-lg">Seahawks</p>
                <p className="text-muted text-xs">-4.5</p>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted uppercase tracking-widest mb-1">Super Bowl LX</p>
                <p className="text-4xl sm:text-6xl font-black tracking-tight">
                  <span className="text-sea-green">SEA</span>
                  <span className="text-muted mx-2 text-2xl sm:text-4xl">vs</span>
                  <span className="text-ne-red">NE</span>
                </p>
                <p className="text-xs text-muted mt-2">Levi&apos;s Stadium · Santa Clara, CA</p>
                <p className="text-xs text-muted">NBC / Peacock</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto rounded-full bg-ne-red/20 flex items-center justify-center text-ne-red font-black text-2xl sm:text-4xl">
                  NE
                </div>
                <p className="text-ne-red font-bold mt-2 text-sm sm:text-lg">Patriots</p>
                <p className="text-muted text-xs">+4.5</p>
              </div>
            </div>

            {/* Countdown */}
            <Countdown />

            {/* CTA */}
            <div className="space-y-4">
              <Link
                href={isDemo || userName ? '/board' : '/login'}
                className="inline-block bg-sea-green text-sea-navy font-bold text-lg px-8 py-3 rounded-xl hover:brightness-110 transition transform hover:scale-105"
              >
                Get Your Boxes
              </Link>
              <p className="text-sm text-muted">{soldCount}/100 boxes claimed</p>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="max-w-4xl mx-auto px-4 py-12 grid sm:grid-cols-3 gap-6">
          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <p className="text-3xl mb-2 font-bold text-foreground">$</p>
            <h3 className="font-bold text-foreground mb-2">Pricing</h3>
            <p className="text-muted text-sm">$5/box</p>
            <p className="text-sea-green text-sm font-medium">$35 for 10 · $60 for 20</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <svg className="mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V8a2 2 0 0 0-2-2H6v6a6 6 0 0 0 12 0V2h-2a2 2 0 0 0-2 2v14"/></svg>
            <h3 className="font-bold text-foreground mb-2">Payouts</h3>
            <div className="text-sm text-muted space-y-1">
              <p>Q1: <span className="text-foreground">10%</span></p>
              <p>Q2: <span className="text-foreground">20%</span></p>
              <p>Q3: <span className="text-foreground">20%</span></p>
              <p>Q4 (Final): <span className="text-sea-green font-bold">50%</span></p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <svg className="mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
            <h3 className="font-bold text-foreground mb-2">How It Works</h3>
            <ol className="text-sm text-muted text-left space-y-1">
              <li>1. Pick your boxes on the grid</li>
              <li>2. Pay via Venmo @orenmendelow</li>
              <li>3. Numbers get assigned randomly</li>
              <li>4. Win at the end of each quarter!</li>
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
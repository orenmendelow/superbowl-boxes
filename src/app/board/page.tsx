import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Scoreboard from '@/components/Scoreboard';
import Grid from '@/components/Grid';
import { Game, Box, QuarterResult } from '@/lib/types';

const GAME_ID = '00000000-0000-0000-0000-000000000001';

export default async function BoardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let userName: string | null = null;
  let isAdmin = false;
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

  // Fetch game
  const { data: game } = await supabase
    .from('game')
    .select('*')
    .eq('id', GAME_ID)
    .single();

  // Fetch boxes with profiles
  const { data: boxes } = await supabase
    .from('boxes')
    .select('*, profiles(full_name, email)')
    .eq('game_id', GAME_ID)
    .order('row_index')
    .order('col_index');

  // Fetch quarter results with profiles
  const { data: quarterResults } = await supabase
    .from('quarter_results')
    .select('*, profiles:winning_user_id(full_name)')
    .eq('game_id', GAME_ID)
    .order('quarter');

  if (!game || !boxes) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header userName={userName} isAdmin={isAdmin} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted">Game not found. Has the database been set up?</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header userName={userName} isAdmin={isAdmin} />

      <main className="flex-1 max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-3xl font-bold">
            <span className="text-sea-green">SEA</span>
            <span className="text-muted mx-2">vs</span>
            <span className="text-ne-red">NE</span>
            <span className="text-foreground ml-2">Boxes</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Click available boxes to select · Pay via Venmo · Admin confirms
          </p>
        </div>

        <Scoreboard />

        <Grid
          initialBoxes={boxes as Box[]}
          game={game as Game}
          userId={user?.id || null}
          userName={userName}
          quarterResults={(quarterResults as QuarterResult[]) || []}
        />
      </main>

      <Footer />
    </div>
  );
}

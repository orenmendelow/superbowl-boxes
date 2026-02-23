import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BoardContent from '@/components/BoardContent';
import { Game, Box, QuarterResult } from '@/lib/types';
import { GAME_ID } from '@/lib/constants';
import { demoGame, demoBoxes, demoQuarterResults, DEMO_USER_ID } from '@/lib/demo-data';

export default async function BoardPage() {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  let userName: string | null = null;
  let isAdmin = false;
  let userId: string | null = null;
  let game: Game | null = null;
  let boxes: Box[] | null = null;
  let quarterResults: QuarterResult[] = [];

  if (isDemo) {
    userName = 'Demo User';
    isAdmin = true;
    userId = DEMO_USER_ID;
    game = demoGame;
    boxes = demoBoxes;
    quarterResults = demoQuarterResults;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;

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

    const { data: gameData } = await supabase
      .from('game')
      .select('*')
      .eq('id', GAME_ID)
      .single();
    game = gameData;

    const { data: boxData } = await supabase
      .from('boxes')
      .select('*, profiles(full_name, email)')
      .eq('game_id', GAME_ID)
      .order('row_index')
      .order('col_index');
    boxes = boxData;

    const { data: qrData } = await supabase
      .from('quarter_results')
      .select('*, profiles:winning_user_id(full_name)')
      .eq('game_id', GAME_ID)
      .order('quarter');
    quarterResults = (qrData as QuarterResult[]) || [];
  }

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

        <BoardContent
          initialBoxes={boxes as Box[]}
          game={game as Game}
          userId={userId}
          userName={userName}
          quarterResults={quarterResults}
        />
      </main>

      <Footer />
    </div>
  );
}

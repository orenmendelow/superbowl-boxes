import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';
import { Box, Game, QuarterResult, Profile } from '@/lib/types';
import { GAME_ID } from '@/lib/constants';
import { demoGame, demoBoxes, demoQuarterResults, demoProfiles } from '@/lib/demo-data';

export default async function AdminPage() {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  let game: Game | null = null;
  let boxes: Box[] = [];
  let quarterResults: QuarterResult[] = [];
  let profiles: Profile[] = [];

  if (isDemo) {
    game = demoGame;
    boxes = demoBoxes;
    quarterResults = demoQuarterResults;
    profiles = demoProfiles;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login?redirect=/admin');

    const { data: adminRow } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!adminRow) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted">You are not an admin.</p>
            <a href="/board" className="text-sea-green hover:underline text-sm">← Back to Board</a>
          </div>
        </div>
      );
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
    boxes = (boxData as Box[]) || [];

    const { data: qrData } = await supabase
      .from('quarter_results')
      .select('*, profiles:winning_user_id(full_name)')
      .eq('game_id', GAME_ID)
      .order('quarter');
    quarterResults = (qrData as QuarterResult[]) || [];

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    profiles = (profileData as Profile[]) || [];
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Game not found.</p>
      </div>
    );
  }

  return (
    <AdminDashboard
      game={game}
      boxes={boxes}
      quarterResults={quarterResults}
      profiles={profiles}
      gameId={GAME_ID}
    />
  );
}

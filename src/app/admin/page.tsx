import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';
import { Box, Game, QuarterResult, Profile } from '@/lib/types';
import { GAME_ID } from '@/lib/constants';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirect=/admin');

  // Check if admin
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

  // Fetch quarter results
  const { data: quarterResults } = await supabase
    .from('quarter_results')
    .select('*, profiles:winning_user_id(full_name)')
    .eq('game_id', GAME_ID)
    .order('quarter');

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Game not found.</p>
      </div>
    );
  }

  return (
    <AdminDashboard
      game={game as Game}
      boxes={(boxes as Box[]) || []}
      quarterResults={(quarterResults as QuarterResult[]) || []}
      profiles={(profiles as Profile[]) || []}
      gameId={GAME_ID}
    />
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GiveawayDashboard from './GiveawayDashboard';
import { Box, Profile } from '@/lib/types';
import { GAME_ID } from '@/lib/constants';

export default async function GiveawayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirect=/admin/giveaway');

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

  const { data: boxes } = await supabase
    .from('boxes')
    .select('*, profiles(full_name, email)')
    .eq('game_id', GAME_ID)
    .order('row_index')
    .order('col_index');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  return (
    <GiveawayDashboard
      boxes={(boxes as Box[]) || []}
      profiles={(profiles as Profile[]) || []}
      gameId={GAME_ID}
    />
  );
}

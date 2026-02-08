import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const GAME_ID = '00000000-0000-0000-0000-000000000001';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if admin
  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!adminRow) {
    return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Don't let admin delete themselves
  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  // 1. Release any reserved (unpaid) boxes — make them available again
  await supabase
    .from('boxes')
    .update({ status: 'available', user_id: null, reserved_at: null, confirmed_at: null })
    .eq('user_id', userId)
    .eq('status', 'reserved')
    .eq('game_id', GAME_ID);

  // 2. Confirmed boxes: clear user_id so the FK doesn't block deletion
  //    The box stays confirmed (it was paid for), just no longer linked to a user
  await supabase
    .from('boxes')
    .update({ user_id: null })
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .eq('game_id', GAME_ID);

  // 3. Clear winning_user_id from quarter_results
  await supabase
    .from('quarter_results')
    .update({ winning_user_id: null })
    .eq('winning_user_id', userId)
    .eq('game_id', GAME_ID);

  // 4. Remove from admins table if present
  await supabase
    .from('admins')
    .delete()
    .eq('user_id', userId);

  // 5. Delete the profile
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

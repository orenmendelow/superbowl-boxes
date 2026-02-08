import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { GAME_ID } from '@/lib/constants';

// One-time endpoint to reset accidentally assigned numbers
// Protected by admin check — only admins can call this
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Verify admin
  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!adminRow) {
    return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
  }

  // Reset numbers
  const { error } = await supabase
    .from('game')
    .update({
      row_numbers: null,
      col_numbers: null,
      numbers_assigned: false,
      status: 'selling',
    })
    .eq('id', GAME_ID);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Numbers reset. Status back to selling.' });
}

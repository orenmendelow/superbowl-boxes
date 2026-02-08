import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Expire reservations older than 10 minutes
export async function GET() {
  const supabase = await createClient();

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('boxes')
    .update({
      user_id: null,
      status: 'available',
      reserved_at: null,
    })
    .eq('status', 'reserved')
    .lt('reserved_at', tenMinutesAgo)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data?.length || 0 });
}

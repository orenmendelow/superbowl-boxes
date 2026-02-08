import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/board';
  const name = searchParams.get('name') || '';

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Upsert profile
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        email: user.email || '',
      }, { onConflict: 'id' });

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Auth failed, redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

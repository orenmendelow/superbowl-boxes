import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') || 'magiclink';
  const redirect = searchParams.get('redirect') || '/board';
  const name = searchParams.get('name') || '';

  const supabase = await createClient();
  let user = null;
  let authError = null;

  if (code) {
    // PKCE flow
    const result = await supabase.auth.exchangeCodeForSession(code);
    user = result.data?.user;
    authError = result.error;
  } else if (token_hash) {
    // Implicit flow (magic link)
    const result = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    user = result.data?.user;
    authError = result.error;
  }

  if (!authError && user) {
    // Upsert profile
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      email: user.email || '',
    }, { onConflict: 'id' });

    return NextResponse.redirect(`${origin}${redirect}`);
  }

  // Auth failed, redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

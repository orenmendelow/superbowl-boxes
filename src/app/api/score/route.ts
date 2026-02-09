import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { ESPN_GAME_ID, GAME_ID } from '@/lib/constants';

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(ESPN_API, { next: { revalidate: 10 } });
    const data = await res.json();

    const event = data.events?.find((e: any) => e.id === ESPN_GAME_ID);
    if (!event) {
      return NextResponse.json({ score: null, error: 'Game not found' });
    }

    const competition = event.competitions[0];
    const status = competition.status;

    const homeComp = competition.competitors.find((c: any) => c.homeAway === 'home');
    const awayComp = competition.competitors.find((c: any) => c.homeAway === 'away');

    if (!homeComp || !awayComp) {
      return NextResponse.json({ score: null, error: 'Teams not found' });
    }

    const gameState = status.type.state as 'pre' | 'in' | 'post';

    // Build cumulative per-quarter scores from ESPN linescores
    const homeLinescores: number[] = (homeComp.linescores || []).map((ls: any) => Number(ls.value) || 0);
    const awayLinescores: number[] = (awayComp.linescores || []).map((ls: any) => Number(ls.value) || 0);
    const quarterScores: { home: number; away: number }[] = [];
    let homeCum = 0;
    let awayCum = 0;
    const numQtrs = Math.max(homeLinescores.length, awayLinescores.length);
    for (let i = 0; i < numQtrs; i++) {
      homeCum += homeLinescores[i] || 0;
      awayCum += awayLinescores[i] || 0;
      quarterScores.push({ home: homeCum, away: awayCum });
    }

    const score = {
      gameState,
      period: status.period || 0,
      displayClock: status.displayClock || '',
      homeScore: parseInt(homeComp.score || '0', 10),
      awayScore: parseInt(awayComp.score || '0', 10),
      homeTeam: homeComp.team.abbreviation,
      awayTeam: awayComp.team.abbreviation,
      homeLogo: homeComp.team.logo,
      awayLogo: awayComp.team.logo,
      lastPlay: competition.situation?.lastPlay?.text,
      down: competition.situation?.shortDownDistanceText,
      possession: competition.situation?.possession,
      quarterScores,
    };

    // Auto-update game status based on ESPN state
    try {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: game } = await supabase
        .from('game')
        .select('status, numbers_assigned')
        .eq('id', GAME_ID)
        .single();

      if (game) {
        let newStatus: string | null = null;

        if (gameState === 'in' && game.status !== 'live' && game.status !== 'final') {
          newStatus = 'live';
        } else if (gameState === 'post' && game.status !== 'final') {
          newStatus = 'final';
        }

        if (newStatus) {
          await supabase
            .from('game')
            .update({ status: newStatus })
            .eq('id', GAME_ID);
        }
      }
    } catch (dbErr) {
      // Don't fail the score response if DB update fails
      console.error('Failed to auto-update game status:', dbErr);
    }

    return NextResponse.json({ score });
  } catch (err) {
    return NextResponse.json({ score: null, error: 'Failed to fetch score' }, { status: 500 });
  }
}

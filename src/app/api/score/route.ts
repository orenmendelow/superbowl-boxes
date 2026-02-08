import { NextResponse } from 'next/server';

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const GAME_ID = '401772988';

export const revalidate = 10;

export async function GET() {
  try {
    const res = await fetch(ESPN_API, { next: { revalidate: 10 } });
    const data = await res.json();

    const event = data.events?.find((e: any) => e.id === GAME_ID);
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

    const score = {
      gameState: status.type.state,
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
    };

    return NextResponse.json({ score });
  } catch (err) {
    return NextResponse.json({ score: null, error: 'Failed to fetch score' }, { status: 500 });
  }
}

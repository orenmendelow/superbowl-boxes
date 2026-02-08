import { ESPNScore } from './types';

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const GAME_ID = '401772988';

export async function fetchScore(): Promise<ESPNScore | null> {
  try {
    const res = await fetch(ESPN_API, { next: { revalidate: 10 } });
    const data = await res.json();

    const event = data.events?.find((e: any) => e.id === GAME_ID);
    if (!event) return null;

    const competition = event.competitions[0];
    const status = competition.status;

    // ESPN: competitors[0] is usually home
    const homeComp = competition.competitors.find((c: any) => c.homeAway === 'home');
    const awayComp = competition.competitors.find((c: any) => c.homeAway === 'away');

    if (!homeComp || !awayComp) return null;

    return {
      gameState: status.type.state as 'pre' | 'in' | 'post',
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
  } catch (err) {
    console.error('ESPN API error:', err);
    return null;
  }
}

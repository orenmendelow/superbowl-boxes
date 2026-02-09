import { ESPNScore } from './types';
import { ESPN_GAME_ID } from './constants';

const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export async function fetchScore(): Promise<ESPNScore | null> {
  try {
    const res = await fetch(ESPN_API, { next: { revalidate: 10 } });
    const data = await res.json();

    const event = data.events?.find((e: any) => e.id === ESPN_GAME_ID);
    if (!event) return null;

    const competition = event.competitions[0];
    const status = competition.status;

    // ESPN: competitors[0] is usually home
    const homeComp = competition.competitors.find((c: any) => c.homeAway === 'home');
    const awayComp = competition.competitors.find((c: any) => c.homeAway === 'away');

    if (!homeComp || !awayComp) return null;

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
      quarterScores,
    };
  } catch (err) {
    console.error('ESPN API error:', err);
    return null;
  }
}

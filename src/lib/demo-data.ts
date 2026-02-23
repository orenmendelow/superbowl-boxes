import { Game, Box, QuarterResult, Profile } from './types';
import { GAME_ID } from './constants';

const DEMO_PROFILES: Profile[] = [
  { id: 'demo-1', full_name: 'Mike Chen', email: 'mike@example.com', created_at: '2026-01-15T00:00:00Z' },
  { id: 'demo-2', full_name: 'Sarah Kim', email: 'sarah@example.com', created_at: '2026-01-16T00:00:00Z' },
  { id: 'demo-3', full_name: 'Jake Torres', email: 'jake@example.com', created_at: '2026-01-17T00:00:00Z' },
  { id: 'demo-4', full_name: 'Lisa Patel', email: 'lisa@example.com', created_at: '2026-01-18T00:00:00Z' },
  { id: 'demo-5', full_name: 'Demo User', email: 'demo@example.com', created_at: '2026-01-14T00:00:00Z' },
  { id: 'demo-6', full_name: 'Chris Wong', email: 'chris@example.com', created_at: '2026-01-19T00:00:00Z' },
  { id: 'demo-7', full_name: 'Emma Davis', email: 'emma@example.com', created_at: '2026-01-20T00:00:00Z' },
  { id: 'demo-8', full_name: 'Ryan Murphy', email: 'ryan@example.com', created_at: '2026-01-21T00:00:00Z' },
];

export const DEMO_USER_ID = 'demo-5';

export const demoGame: Game = {
  id: GAME_ID,
  season_year: 2025,
  home_team: 'Seattle Seahawks',
  home_abbreviation: 'SEA',
  home_color: '#002244',
  home_alt_color: '#69BE28',
  away_team: 'New England Patriots',
  away_abbreviation: 'NE',
  away_color: '#002244',
  away_alt_color: '#C60C30',
  espn_game_id: '401772988',
  kickoff_time: '2026-02-08T23:30:00Z',
  price_per_box: 5,
  price_10_boxes: 35,
  price_20_boxes: 60,
  payout_q1: 10,
  payout_q2: 20,
  payout_q3: 20,
  payout_q4: 50,
  numbers_assigned: true,
  row_numbers: [7, 3, 0, 9, 5, 1, 8, 4, 6, 2],
  col_numbers: [4, 8, 1, 6, 0, 9, 3, 7, 2, 5],
  status: 'selling',
  created_at: '2026-01-10T00:00:00Z',
};

function buildDemoBoxes(): Box[] {
  const boxes: Box[] = [];
  const owners = [
    { id: 'demo-1', name: 'Mike Chen', count: 20 },
    { id: 'demo-2', name: 'Sarah Kim', count: 15 },
    { id: 'demo-3', name: 'Jake Torres', count: 10 },
    { id: 'demo-4', name: 'Lisa Patel', count: 10 },
    { id: 'demo-5', name: 'Demo User', count: 8 },
    { id: 'demo-6', name: 'Chris Wong', count: 5 },
    { id: 'demo-7', name: 'Emma Davis', count: 3 },
    { id: 'demo-8', name: 'Ryan Murphy', count: 2 },
  ];

  let ownerIdx = 0;
  let ownerRemaining = owners[0].count;
  let boxId = 1;

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const claimed = ownerIdx < owners.length;
      const owner = claimed ? owners[ownerIdx] : null;

      boxes.push({
        id: boxId++,
        game_id: GAME_ID,
        row_index: row,
        col_index: col,
        user_id: owner?.id ?? null,
        reserved_at: owner ? '2026-01-20T00:00:00Z' : null,
        confirmed_at: owner ? '2026-01-21T00:00:00Z' : null,
        is_free: false,
        status: owner ? 'confirmed' : 'available',
        profiles: owner
          ? DEMO_PROFILES.find((p) => p.id === owner.id) ?? null
          : null,
      });

      if (claimed) {
        ownerRemaining--;
        if (ownerRemaining === 0) {
          ownerIdx++;
          if (ownerIdx < owners.length) {
            ownerRemaining = owners[ownerIdx].count;
          }
        }
      }
    }
  }

  return boxes;
}

export const demoBoxes: Box[] = buildDemoBoxes();

export const demoQuarterResults: QuarterResult[] = [];

export const demoProfiles: Profile[] = DEMO_PROFILES;

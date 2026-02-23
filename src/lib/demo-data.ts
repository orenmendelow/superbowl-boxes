import { Game, Box, QuarterResult, Profile, ESPNScore } from './types';
import { GAME_ID } from './constants';

const DEMO_PROFILES: Profile[] = [
  { id: 'demo-1', full_name: 'Mike Chen', email: 'mike@example.com', created_at: '2026-01-15T00:00:00Z' },
  { id: 'demo-2', full_name: 'Sarah Kim', email: 'sarah@example.com', created_at: '2026-01-16T00:00:00Z' },
  { id: 'demo-3', full_name: 'Jake Torres', email: 'jake@example.com', created_at: '2026-01-17T00:00:00Z' },
  { id: 'demo-4', full_name: 'Lisa Patel', email: 'lisa@example.com', created_at: '2026-01-18T00:00:00Z' },
  { id: 'demo-5', full_name: 'Alex Rivera', email: 'alex@example.com', created_at: '2026-01-14T00:00:00Z' },
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
  kickoff_time: '2026-02-23T18:30:00Z', // Earlier today — game is in progress
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
  status: 'live',
  created_at: '2026-01-10T00:00:00Z',
};

// ------------------------------------------------------------------
// Scattered box ownership map
// null = available, otherwise owner id suffix (1-8)
// ------------------------------------------------------------------
// Layout designed so boxes are scattered realistically across the grid.
// 75 claimed boxes, 25 available (null).
//
// Key cells:
//   (row=7, col=0) = Q1 winner — owner demo-3 (Jake Torres)
//   (row=4, col=7) = Q2 winner — owner demo-1 (Mike Chen)
//
const OWNER_MAP: (number | null)[][] = [
  //  c0    c1    c2    c3    c4    c5    c6    c7    c8    c9
  [    1, null,    5,    2, null,    4,    1,    3,    6, null],  // row 0
  [    2,    3, null,    1,    7,    2, null,    1,    4,    8],  // row 1
  [ null,    1,    6,    4,    2, null,    3,    8,    1,    2],  // row 2
  [    4,    2,    1, null,    5,    1,    7,    2, null,    3],  // row 3
  [    1, null,    3,    2,    6,    4, null,    1,    2,    5],  // row 4
  [    3,    4, null,    1,    2, null,    8,    5, null,    1],  // row 5
  [ null,    2,    4,    1, null,    3,    1,    6,    2, null],  // row 6
  [    3,    1,    2, null,    4,    1,    2, null,    7,    1],  // row 7
  [    2, null,    1,    4,    3, null,    5,    1, null,    2],  // row 8
  [    1,    4, null,    2, null,    6,    1,    3,    2, null],  // row 9
];

function buildDemoBoxes(): Box[] {
  const boxes: Box[] = [];
  let boxId = 1;

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const ownerSuffix = OWNER_MAP[row][col];
      const ownerId = ownerSuffix ? `demo-${ownerSuffix}` : null;
      const profile = ownerId
        ? DEMO_PROFILES.find((p) => p.id === ownerId) ?? null
        : null;

      boxes.push({
        id: boxId++,
        game_id: GAME_ID,
        row_index: row,
        col_index: col,
        user_id: ownerId,
        reserved_at: ownerId ? '2026-02-01T00:00:00Z' : null,
        confirmed_at: ownerId ? '2026-02-02T00:00:00Z' : null,
        is_free: false,
        status: ownerId ? 'confirmed' : 'available',
        profiles: profile,
      });

      boxId; // already incremented above
    }
  }

  return boxes;
}

export const demoBoxes: Box[] = buildDemoBoxes();

// ------------------------------------------------------------------
// Quarter results — Q1 and Q2 complete (halftime)
// ------------------------------------------------------------------
// Q1: NE 7, SEA 7  →  home_last=7, away_last=7
//   col where row_numbers[col]=7  →  col=0
//   row where col_numbers[row]=7  →  row=7
//   Box at (7, 0) = id 71, owner demo-3 (Jake Torres)
//
// Q2: SEA 14, NE 10  →  home_last=4, away_last=0
//   colIdx = row_numbers.indexOf(4) → 7
//   rowIdx = col_numbers.indexOf(0) → 4
//   Box at (4, 7) = id 48, owner demo-1 (Mike Chen)
//
// Owner counts: demo-1=21, demo-2=18, demo-3=10, demo-4=10,
//               demo-5=5,  demo-6=5,  demo-7=3,  demo-8=3
// Pot = calculatePrice(21)+calculatePrice(18)+calculatePrice(10)*2
//      +calculatePrice(5)*2+calculatePrice(3)*2
//     = 80+75+45+45+25+25+15+15 = $325
// ------------------------------------------------------------------

const q1WinnerProfile = DEMO_PROFILES.find((p) => p.id === 'demo-3')!;
const q2WinnerProfile = DEMO_PROFILES.find((p) => p.id === 'demo-1')!;

export const demoQuarterResults: QuarterResult[] = [
  {
    id: 1,
    game_id: GAME_ID,
    quarter: 1,
    home_score: 7,    // SEA 7
    away_score: 7,    // NE 7
    home_last_digit: 7,
    away_last_digit: 7,
    winning_box_id: 71, // row 7, col 0
    winning_user_id: 'demo-3',
    payout_amount: 32.50,  // totalPot($325) * 10% = $32.50
    created_at: '2026-02-23T19:15:00Z',
    profiles: q1WinnerProfile,
  },
  {
    id: 2,
    game_id: GAME_ID,
    quarter: 2,
    home_score: 14,   // SEA 14
    away_score: 10,   // NE 10
    home_last_digit: 4,
    away_last_digit: 0,
    winning_box_id: 48, // row 4, col 7
    winning_user_id: 'demo-1',
    payout_amount: 65,    // totalPot($325) * 20% = $65
    created_at: '2026-02-23T20:00:00Z',
    profiles: q2WinnerProfile,
  },
];

export const demoScore: ESPNScore = {
  gameState: 'in',
  period: 2,
  displayClock: '0:00',
  homeScore: 14,  // SEA
  awayScore: 10,  // NE
  homeTeam: 'SEA',
  awayTeam: 'NE',
  homeLogo: '',
  awayLogo: '',
  quarterScores: [
    { home: 7, away: 7 },   // End of Q1: SEA 7, NE 7
    { home: 14, away: 10 }, // End of Q2: SEA 14, NE 10
  ],
};

export const demoProfiles: Profile[] = DEMO_PROFILES;

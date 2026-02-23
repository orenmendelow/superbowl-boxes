export interface Game {
  id: string;
  season_year: number;
  home_team: string;
  home_abbreviation: string;
  home_color: string;
  home_alt_color: string;
  away_team: string;
  away_abbreviation: string;
  away_color: string;
  away_alt_color: string;
  espn_game_id: string;
  kickoff_time: string;
  price_per_box: number;
  price_10_boxes: number;
  price_20_boxes: number;
  payout_q1: number;
  payout_q2: number;
  payout_q3: number;
  payout_q4: number;
  numbers_assigned: boolean;
  row_numbers: number[] | null;
  col_numbers: number[] | null;
  status: 'selling' | 'numbers_assigned' | 'live' | 'final';
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface Box {
  id: number;
  game_id: string;
  row_index: number;
  col_index: number;
  user_id: string | null;
  reserved_at: string | null;
  confirmed_at: string | null;
  is_free: boolean;
  status: 'available' | 'reserved' | 'confirmed';
  profiles?: Profile | null;
}

export interface QuarterResult {
  id: number;
  game_id: string;
  quarter: number;
  home_score: number;
  away_score: number;
  home_last_digit: number;
  away_last_digit: number;
  winning_box_id: number | null;
  winning_user_id: string | null;
  payout_amount: number;
  created_at: string;
  profiles?: Profile | null;
}

export interface ESPNScore {
  gameState: 'pre' | 'in' | 'post';
  period: number;
  displayClock: string;
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  lastPlay?: string;
  down?: string;
  possession?: string;
  /** Cumulative score at end of each quarter: index 0 = Q1, 1 = Q2, … */
  quarterScores?: { home: number; away: number }[];
}

export function calculatePrice(count: number): number {
  if (count >= 20) {
    const fullSets = Math.floor(count / 20);
    const remainder = count % 20;
    return fullSets * 60 + calculatePrice(remainder);
  }
  if (count >= 10) {
    const fullSets = Math.floor(count / 10);
    const remainder = count % 10;
    return fullSets * 35 + remainder * 5;
  }
  return count * 5;
}

/**
 * Calculate the actual pot by summing per-user prices.
 * Excludes free (gifted) boxes since no money was collected for them.
 * Each user's price is based on their own paid box count (volume discounts apply per-user).
 */
export function calculatePot(boxes: { user_id: string | null; status: string; is_free?: boolean }[]): number {
  const countByUser = new Map<string, number>();
  for (const b of boxes) {
    if (b.user_id && (b.status === 'confirmed' || b.status === 'reserved') && !b.is_free) {
      countByUser.set(b.user_id, (countByUser.get(b.user_id) || 0) + 1);
    }
  }
  let total = 0;
  for (const count of countByUser.values()) {
    total += calculatePrice(count);
  }
  return total;
}

/**
 * Calculate the incremental cost when a user upgrades their box count.
 * They already paid for `existingCount` boxes; now they want `additionalCount` more.
 * Charge = price(total) - price(existing).
 *
 * Example: 10 confirmed ($35 paid) + 10 new → price(20) - price(10) = $60 - $35 = $25.
 */
export function calculateUpgradePrice(
  existingCount: number,
  additionalCount: number,
): number {
  if (additionalCount <= 0) return 0;
  const totalPrice = calculatePrice(existingCount + additionalCount);
  const alreadyPaid = calculatePrice(existingCount);
  return Math.max(0, totalPrice - alreadyPaid);
}



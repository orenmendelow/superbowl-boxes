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

export function formatPrice(count: number): string {
  const total = calculatePrice(count);
  return `$${total}`;
}

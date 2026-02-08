-- =============================================
-- Super Bowl Boxes Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The game configuration
CREATE TABLE game (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year INT NOT NULL DEFAULT 2025,
  home_team TEXT NOT NULL DEFAULT 'New England Patriots',
  home_abbreviation TEXT NOT NULL DEFAULT 'NE',
  home_color TEXT NOT NULL DEFAULT '#002a5c',
  home_alt_color TEXT NOT NULL DEFAULT '#c60c30',
  away_team TEXT NOT NULL DEFAULT 'Seattle Seahawks',
  away_abbreviation TEXT NOT NULL DEFAULT 'SEA',
  away_color TEXT NOT NULL DEFAULT '#002a5c',
  away_alt_color TEXT NOT NULL DEFAULT '#69be28',
  espn_game_id TEXT NOT NULL DEFAULT '401772988',
  kickoff_time TIMESTAMPTZ NOT NULL DEFAULT '2026-02-08T23:30:00Z',
  price_per_box INT NOT NULL DEFAULT 5,
  price_10_boxes INT NOT NULL DEFAULT 35,
  price_20_boxes INT NOT NULL DEFAULT 60,
  payout_q1 DECIMAL NOT NULL DEFAULT 0.10,
  payout_q2 DECIMAL NOT NULL DEFAULT 0.20,
  payout_q3 DECIMAL NOT NULL DEFAULT 0.20,
  payout_q4 DECIMAL NOT NULL DEFAULT 0.50,
  numbers_assigned BOOLEAN DEFAULT FALSE,
  row_numbers INT[] DEFAULT NULL,
  col_numbers INT[] DEFAULT NULL,
  status TEXT DEFAULT 'selling' CHECK (status IN ('selling', 'numbers_assigned', 'live', 'final')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual boxes
CREATE TABLE boxes (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES game(id) ON DELETE CASCADE,
  row_index INT NOT NULL CHECK (row_index >= 0 AND row_index <= 9),
  col_index INT NOT NULL CHECK (col_index >= 0 AND col_index <= 9),
  user_id UUID REFERENCES profiles(id),
  reserved_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'confirmed')),
  UNIQUE(game_id, row_index, col_index)
);

-- Quarter results
CREATE TABLE quarter_results (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES game(id) ON DELETE CASCADE,
  quarter INT NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  home_score INT,
  away_score INT,
  home_last_digit INT,
  away_last_digit INT,
  winning_box_id INT REFERENCES boxes(id),
  winning_user_id UUID REFERENCES profiles(id),
  payout_amount DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, quarter)
);

-- Admin users
CREATE TABLE admins (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE
);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game ENABLE ROW LEVEL SECURITY;
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarter_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, users can update own, admins can delete
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
);

-- Game: anyone can read, admins can update
CREATE POLICY "game_select" ON game FOR SELECT USING (true);
CREATE POLICY "game_update" ON game FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
);

-- Boxes: anyone can read, authenticated can reserve, admins can do anything
CREATE POLICY "boxes_select" ON boxes FOR SELECT USING (true);
CREATE POLICY "boxes_update_user" ON boxes FOR UPDATE USING (
  auth.uid() IS NOT NULL
);
CREATE POLICY "boxes_insert" ON boxes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
);

-- Quarter results: anyone can read, admins can insert/update
CREATE POLICY "qr_select" ON quarter_results FOR SELECT USING (true);
CREATE POLICY "qr_insert" ON quarter_results FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
);
CREATE POLICY "qr_update" ON quarter_results FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
);

-- Admins: any authenticated user can check if they are admin, admins can delete
CREATE POLICY "admins_select" ON admins FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "admins_delete" ON admins FOR DELETE USING (
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
);

-- =============================================
-- Enable Realtime on boxes & quarter_results
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE boxes;
ALTER PUBLICATION supabase_realtime ADD TABLE quarter_results;
ALTER PUBLICATION supabase_realtime ADD TABLE game;

-- =============================================
-- Insert the game record and 100 boxes
-- =============================================
INSERT INTO game (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- Generate 100 boxes (0-9 × 0-9)
INSERT INTO boxes (game_id, row_index, col_index)
SELECT '00000000-0000-0000-0000-000000000001', r, c
FROM generate_series(0, 9) AS r, generate_series(0, 9) AS c;

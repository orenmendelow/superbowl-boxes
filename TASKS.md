# 🏈 Super Bowl Boxes — Project Task Plan

## Project: superbowl-boxes.mendelow.studio
## Super Bowl LX: Seattle Seahawks vs New England Patriots
## Kickoff: Feb 8, 2026, 6:30 PM EST — Levi's Stadium, Santa Clara, CA
## ESPN Game ID: 401772988

---

## KEY DETAILS

- **Teams**: Seattle Seahawks (SEA, away, favored -4.5) vs New England Patriots (NE, home)
- **Seahawks colors**: `#002a5c` (navy), `#69be28` (action green), `#a5acaf` (wolf grey)
- **Patriots colors**: `#002a5c` (navy), `#c60c30` (red), `#b0b7bc` (silver)
- **Price tiers**: $5/box, $35 for 10 boxes, $60 for 20 boxes
- **Payout**: Q1 = 10%, Q2 = 20%, Q3 = 20%, Q4 (Final) = 50%
- **Venmo**: @orenmendelow
- **Attendees**: 7 couples + 4 singles = ~18 people
- **Domain**: superbowl-boxes.mendelow.studio
- **Live Score API**: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` (no API key needed, game ID `401772988`)
- **Broadcast**: NBC / Peacock

---

## TECH STACK DECISION

**Next.js 14 (App Router) + Supabase + Vercel**

### Why:
- **Next.js**: Fast to build, SSR + API routes in one project, great DX
- **Supabase**: Free tier, Postgres DB, built-in auth (magic link = low friction), real-time subscriptions for live updates, row-level security
- **Vercel**: One-click deploy for Next.js, custom domain support, free tier
- **Tailwind CSS**: Fast styling, responsive out of the box
- **Reusable for future years**: Just update teams/game ID, reset DB

### Key Libraries:
- `@supabase/supabase-js` + `@supabase/auth-helpers-nextjs` — DB + auth
- `tailwindcss` — styling
- `date-fns` or `dayjs` — countdown timer
- `framer-motion` (optional) — animations for box selection, winner reveals

---

## DATABASE SCHEMA (Supabase / Postgres)

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
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
  price_per_box INT NOT NULL DEFAULT 5, -- in dollars
  price_10_boxes INT NOT NULL DEFAULT 35,
  price_20_boxes INT NOT NULL DEFAULT 60,
  payout_q1 DECIMAL NOT NULL DEFAULT 0.10,
  payout_q2 DECIMAL NOT NULL DEFAULT 0.20,
  payout_q3 DECIMAL NOT NULL DEFAULT 0.20,
  payout_q4 DECIMAL NOT NULL DEFAULT 0.50,
  numbers_assigned BOOLEAN DEFAULT FALSE,
  row_numbers INT[] DEFAULT NULL, -- array of 0-9 shuffled (assigned to home team / rows)
  col_numbers INT[] DEFAULT NULL, -- array of 0-9 shuffled (assigned to away team / columns)
  status TEXT DEFAULT 'selling' CHECK (status IN ('selling', 'numbers_assigned', 'live', 'final')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual boxes
CREATE TABLE boxes (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES game(id),
  row_index INT NOT NULL CHECK (row_index >= 0 AND row_index <= 9),
  col_index INT NOT NULL CHECK (col_index >= 0 AND col_index <= 9),
  user_id UUID REFERENCES profiles(id),
  reserved_at TIMESTAMPTZ, -- when user selected box (temporary hold)
  confirmed_at TIMESTAMPTZ, -- when admin confirmed payment
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'confirmed')),
  UNIQUE(game_id, row_index, col_index)
);

-- Quarter results (filled in during game)
CREATE TABLE quarter_results (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES game(id),
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
  user_id UUID PRIMARY KEY REFERENCES profiles(id)
);
```

---

## TASK LIST

### Status Key:
- ⬜ Not started
- 🔄 In progress
- ✅ Complete

---

### PHASE 1: Project Setup & Infrastructure

#### Task 1.1: Initialize Next.js Project ✅
- Run `npx create-next-app@latest superbowl-boxes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- Install dependencies: `@supabase/supabase-js @supabase/ssr @supabase/auth-helpers-nextjs`
- Set up project structure:
  ```
  src/
    app/
      layout.tsx          -- root layout with Supabase provider, fonts, metadata
      page.tsx            -- landing / home page
      login/page.tsx      -- login page (magic link)
      board/page.tsx      -- the main 10x10 grid (public view)
      admin/
        page.tsx          -- admin dashboard
        login/page.tsx    -- admin login
      api/
        score/route.ts    -- proxy ESPN API for live scores
        cron/expire-reservations/route.ts -- expire old reservations
    components/
      Grid.tsx            -- 10x10 interactive grid
      Box.tsx             -- individual box cell
      Scoreboard.tsx      -- live score display
      Countdown.tsx       -- countdown to kickoff
      BoxSelector.tsx     -- box selection + quantity/pricing UI
      VenmoButton.tsx     -- Venmo deep link button
      QuarterResults.tsx  -- quarter-by-quarter results
      WinnerBanner.tsx    -- animated winner announcement
      Header.tsx          -- site header with team logos
      Footer.tsx          -- footer
    lib/
      supabase/
        client.ts         -- browser Supabase client
        server.ts         -- server Supabase client
        middleware.ts      -- auth middleware
        admin.ts          -- admin check helper
      espn.ts             -- ESPN API helper functions
      pricing.ts          -- pricing calculation logic
      types.ts            -- TypeScript types
    hooks/
      useScore.ts         -- real-time score polling hook
      useBoxes.ts         -- real-time box state subscription
      useCountdown.ts     -- countdown timer hook
  ```

#### Task 1.2: Set Up Supabase ✅ (schema + client code ready, user needs to create project & run SQL)
- Create a new Supabase project (user will do this manually or via CLI)
- Run the SQL schema from above to create tables
- Set up Row Level Security (RLS) policies:
  - `profiles`: Users can read all, update own
  - `boxes`: Anyone can read. Authenticated users can reserve (insert/update where status='available'). Only admins can confirm.
  - `game`: Anyone can read. Only admins can update.
  - `quarter_results`: Anyone can read. Only admins can insert/update.
  - `admins`: Only admins can read.
- Enable Supabase Auth with magic link (email)
- Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Add admin insert for Oren's user ID after first login

#### Task 1.3: Configure Tailwind & Theming ✅
- Set up custom color palette in `tailwind.config.ts`:
  - Seahawks: navy `#002a5c`, action green `#69be28`, wolf grey `#a5acaf`
  - Patriots: navy `#002a5c`, red `#c60c30`, silver `#b0b7bc`
  - Use Seahawks green and Patriots red as the two primary accent colors
- Add custom fonts (e.g., a sporty font for headings)
- Dark mode support (optional but nice for game day)

---

### PHASE 2: Authentication & User Flow

#### Task 2.1: Magic Link Authentication ✅
- Implement login page at `/login`
- Fields: Full Name (first time only), Email
- On submit: send magic link via Supabase Auth
- After auth: upsert into `profiles` table
- Redirect to `/board` after login
- Add auth middleware to protect `/board` and `/admin` routes
- Session management via Supabase SSR helpers

#### Task 2.2: User Profile Management ⬜
- After first login, ensure name is captured
- Display logged-in user's name in header
- "My Boxes" section showing their reserved/confirmed boxes
- Logout button

---

### PHASE 3: The Board (Core Feature)

#### Task 3.1: Landing Page ✅
- Hero section with Super Bowl LX branding
- Team logos: SEA vs NE with team colors
- **Countdown timer** to kickoff (Feb 8, 2026, 6:30 PM EST)
- Pricing info: "$5/box · $35 for 10 · $60 for 20"
- Payout structure: Q1: 10% · Q2: 20% · Q3: 20% · Q4: 50%
- "Total pot" calculator based on boxes sold
- CTA button: "Get Your Boxes" → links to `/board` (or `/login` if not authenticated)
- Brief "How It Works" explainer
- Attendee info: "18 friends battling for glory"

#### Task 3.2: Interactive 10x10 Grid ✅
- Render 10x10 grid (100 boxes)
- Column headers = Away team (SEA) digits 0-9 (hidden until numbers assigned, show "?")
- Row headers = Home team (NE) digits 0-9 (hidden until numbers assigned, show "?")
- Each box shows:
  - If available: empty, clickable
  - If reserved (unpaid): shows name, yellow/orange border, "Pending" label
  - If confirmed (paid): shows name, green border, solid fill
  - If owned by current user: highlighted distinctly
- Click an available box → adds it to your "cart" (local state)
- Show running total: "3 boxes selected · $15" or "10 boxes selected · $35" (bulk pricing)
- Real-time updates via Supabase subscription (see other people's selections live)

#### Task 3.3: Box Selection & Purchase Flow ✅
- User clicks boxes on the grid to select them
- Selection cart/panel shows:
  - Number of boxes selected
  - Price calculation with bulk discounts applied automatically
  - Breakdown: "10 boxes × $3.50/box = $35" 
- "Reserve & Pay" button:
  1. Reserves the boxes in DB (status = 'reserved', reserved_at = now())
  2. Shows Venmo deep link button
- Venmo button: `venmo://paycharge?txn=pay&recipients=orenmendelow&amount={total}&note=SB+Boxes+-+{name}+-+{count}+boxes`
  - Also show QR code fallback and Venmo username as text
  - Include "I've paid!" confirmation (doesn't actually confirm—just reassures user; admin confirms)
- Reservation expires after 10 minutes if not confirmed by admin
  - Show countdown on reserved boxes
  - Background job or cron to release expired reservations

#### Task 3.4: Number Assignment ✅
- Once all 100 boxes are sold (confirmed), admin can trigger randomization
- Randomly shuffle digits 0-9 for rows and 0-9 for columns
- Store in `game` table
- Animate the number reveal on the board (optional but fun)
- After assignment, the grid updates to show actual digits
- Each box now has a definitive score combination

---

### PHASE 4: Live Game Day Features

#### Task 4.1: ESPN Live Score Integration ✅
- API endpoint: `GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- Filter for game ID `401772988`
- Parse response for:
  - Game status: `pre`, `in`, `post`
  - Current period (quarter)
  - Clock
  - Home score, away score
  - Last play description
  - Scoring plays
- Create `/api/score/route.ts` as a proxy (to avoid CORS and cache for 10s)
- Client-side: poll every 30 seconds during game, every 5 minutes pre-game
- Display: animated scoreboard component with team logos, score, quarter, clock

#### Task 4.2: Live Board Highlighting ✅
- During the game, highlight the "current winning box" based on last digit of each team's score
- Pulse/glow animation on the active winning box
- Show which box would win if the quarter ended now
- Color-code: green glow for current Q winner

#### Task 4.3: Quarter Results & Winners ✅
- At end of each quarter (detect via ESPN API period changes):
  - Admin confirms the quarter result (or auto-detect)
  - Record in `quarter_results` table
  - Calculate payout amount based on total pot and quarter percentage
  - Display winner banner/toast: "🎉 Q1 Winner: John Smith — $50!"
- Results panel showing all quarter winners and payouts
- Running tally of who has won what

#### Task 4.4: Scoring Event Feed ⬜
- Parse ESPN scoring plays
- Show a live feed of scoring events:
  - "🏈 TOUCHDOWN — SEA 14, NE 7 (Q2 8:32)"
  - "⚡ FIELD GOAL — NE 10, SEA 14 (Q2 2:15)"
  - "🛡️ SAFETY — SEA 16, NE 10 (Q3 5:44)"
- Each event updates the highlighted box on the grid
- Show what the current last-digit combo is after each score

#### Task 4.5: Countdown to Kickoff ✅
- Before the game: show a live countdown timer to 6:30 PM EST
- Display: "KICKOFF IN 3h 22m 15s"
- After kickoff: switch to showing game clock/quarter
- Use interval-based countdown, no external dependency needed

---

### PHASE 5: Admin Panel

#### Task 5.1: Admin Authentication ✅
- Admin login at `/admin/login` (or protect `/admin/*` routes)
- Check `admins` table for user_id
- Only Oren's account is admin (seed after first login)
- Show admin nav: Dashboard, Manage Boxes, Game Settings

#### Task 5.2: Admin Dashboard ✅
- Overview stats:
  - Boxes sold: X/100
  - Boxes reserved (pending payment): X
  - Boxes available: X
  - Revenue: $X collected, $X pending
  - Total pot: $X
  - Payout breakdown: Q1 $X, Q2 $X, Q3 $X, Q4 $X
- List of all users and their boxes
- Quick actions: Confirm payment, Release box, Assign numbers

#### Task 5.3: Payment Confirmation ✅
- List of all reserved (unpaid) boxes grouped by user
- Each user shows: name, email, # boxes, amount owed, reserved time
- "Confirm Payment" button per user → marks all their reserved boxes as confirmed
- "Release Boxes" button → returns boxes to available pool
- Visual indicators: red = overdue (>10 min), yellow = recent reservation

#### Task 5.4: Number Assignment Trigger ✅
- Button: "Randomize Numbers" (only enabled when all 100 boxes are confirmed)
- Preview the randomization before committing
- "Lock Numbers" to finalize
- Cannot be undone once locked

#### Task 5.5: Game Day Admin Controls ✅
- Manual score override (in case ESPN API has issues)
- "Record Quarter Result" button for each quarter
- Auto-detect from ESPN API with admin confirmation
- "Mark Game as Final" button

---

### PHASE 6: Polish & Deploy

#### Task 6.1: Responsive Design ⬜
- Mobile-first: the grid must work on phones
  - Pinch-to-zoom or scrollable grid on small screens
  - Box selection works with touch
- Tablet and desktop layouts
- Test on common screen sizes

#### Task 6.2: Real-time Updates ✅
- Supabase real-time subscriptions for:
  - Box status changes (someone buys a box, you see it update)
  - Game state changes
  - Quarter results
- Optimistic UI updates for box selection

#### Task 6.3: Error Handling & Edge Cases ⬜
- Handle concurrent box selection (two people click same box)
  - Use Supabase RLS + unique constraints
  - Show "Sorry, this box was just taken!" toast
- Handle expired reservations gracefully
- Handle ESPN API downtime (show "Score unavailable" with manual fallback)
- Handle network disconnects (reconnect Supabase subscription)

#### Task 6.4: SEO & Meta Tags ✅
- OpenGraph tags for sharing the link
- Fun preview image with Super Bowl LX branding
- Title: "Super Bowl LX Boxes — SEA vs NE"
- Favicon with football/box theme

#### Task 6.5: Deploy to Vercel ⬜
- Connect GitHub repo to Vercel
- Set environment variables (Supabase URL, anon key)
- Configure custom domain: `superbowl-boxes.mendelow.studio`
- Test deployment
- Ensure CORS and API routes work in production

---

## IMPLEMENTATION ORDER (Priority)

Since the game is **TODAY** (Feb 8, 2026), here's the critical path:

### 🚨 MUST SHIP BEFORE KICKOFF (6:30 PM EST):
1. **Task 1.1** — Project setup (15 min)
2. **Task 1.2** — Supabase setup (20 min)
3. **Task 1.3** — Tailwind theming (10 min)
4. **Task 3.1** — Landing page (30 min)
5. **Task 2.1** — Auth with magic link (20 min)
6. **Task 3.2** — Interactive grid (45 min)
7. **Task 3.3** — Box selection + Venmo flow (30 min)
8. **Task 5.1** — Admin auth (10 min)
9. **Task 5.2** — Admin dashboard (20 min)
10. **Task 5.3** — Payment confirmation (15 min)
11. **Task 6.5** — Deploy to Vercel (15 min)

### 🏈 MUST SHIP BEFORE/DURING GAME:
12. **Task 4.5** — Countdown timer (10 min)
13. **Task 4.1** — ESPN live score (20 min)
14. **Task 4.2** — Live board highlighting (15 min)
15. **Task 3.4** — Number assignment (15 min)
16. **Task 5.4** — Number assignment admin (10 min)
17. **Task 4.3** — Quarter results (20 min)

### ✨ NICE TO HAVE:
18. **Task 4.4** — Scoring event feed
19. **Task 6.1** — Responsive polish
20. **Task 6.2** — Real-time subscriptions
21. **Task 6.3** — Error handling
22. **Task 6.4** — SEO/meta tags
23. **Task 5.5** — Game day admin controls
24. **Task 2.2** — User profile management

---

## ESPN API REFERENCE

### Scoreboard Endpoint
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
```

### Key Response Fields (for game ID 401772988):
```
events[0].competitions[0].competitors[0] = Home team (NE)
  .team.displayName = "New England Patriots"
  .team.abbreviation = "NE"
  .team.color = "002a5c"
  .team.logo = "https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ne.png"
  .score = "0"

events[0].competitions[0].competitors[1] = Away team (SEA)
  .team.displayName = "Seattle Seahawks"
  .team.abbreviation = "SEA"  
  .team.color = "002a5c"
  .team.alternateColor = "69be28"
  .team.logo = "https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/sea.png"
  .score = "0"

events[0].competitions[0].status.type.state = "pre" | "in" | "post"
events[0].competitions[0].status.period = 1-4 (quarter)
events[0].competitions[0].status.displayClock = "12:00"
```

### Venmo Deep Link Format:
```
venmo://paycharge?txn=pay&recipients=orenmendelow&amount={total}&note=SB%20Boxes%20-%20{name}%20-%20{count}%20boxes
```
Web fallback:
```
https://venmo.com/orenmendelow?txn=pay&amount={total}&note=SB%20Boxes%20-%20{name}%20-%20{count}%20boxes
```

---

## NOTES FOR SUB-AGENTS

- **Read this file first** when starting a "continue working" thread
- Pick up the first ⬜ task in the IMPLEMENTATION ORDER section
- Mark it 🔄 while working, ✅ when done
- Follow the tech stack decisions above — do NOT deviate
- Use the exact color codes, team names, and API endpoints specified
- The game is TODAY — speed > perfection. Ship working code.
- Keep components modular and clean for future reuse
- Always test that builds succeed before marking complete
- If you need Supabase credentials, ask the user — they'll set up the project

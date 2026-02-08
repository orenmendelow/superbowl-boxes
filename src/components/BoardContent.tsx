'use client';

import { useState, useMemo } from 'react';
import Scoreboard from '@/components/Scoreboard';
import Grid from '@/components/Grid';
import { Box, Game, QuarterResult, ESPNScore } from '@/lib/types';

interface BoardContentProps {
  initialBoxes: Box[];
  game: Game;
  userId: string | null;
  userName: string | null;
  quarterResults: QuarterResult[];
}

const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'FINAL'];

export default function BoardContent({
  initialBoxes,
  game,
  userId,
  userName,
  quarterResults,
}: BoardContentProps) {
  const [score, setScore] = useState<ESPNScore | null>(null);

  // Build a lookup of quarter results by quarter number
  const postedQuarters = useMemo(() => {
    const map = new Map<number, QuarterResult>();
    quarterResults.forEach((qr) => map.set(qr.quarter, qr));
    return map;
  }, [quarterResults]);

  // Resolve who currently owns the winning box for given score digits
  function findBoxOwner(
    homeDigit: number,
    awayDigit: number,
    boxes: Box[]
  ): string | null {
    if (!game.row_numbers || !game.col_numbers) return null;

    // row_numbers maps row_index → actual digit for home (rows)
    // col_numbers maps col_index → actual digit for away (cols)
    const rowIdx = game.row_numbers.indexOf(homeDigit);
    const colIdx = game.col_numbers.indexOf(awayDigit);
    if (rowIdx === -1 || colIdx === -1) return null;

    const box = boxes.find(
      (b) => b.row_index === rowIdx && b.col_index === colIdx
    );
    return box?.profiles?.full_name?.split(' ')[0] || null;
  }

  const payouts = [
    game.payout_q1,
    game.payout_q2,
    game.payout_q3,
    game.payout_q4,
  ];

  return (
    <>
      <Scoreboard onScoreUpdate={setScore} />

      {/* Quarter Milestones */}
      {game.numbers_assigned && (
        <div className="flex justify-center gap-1.5 sm:gap-2">
          {[1, 2, 3, 4].map((q) => {
            const posted = postedQuarters.get(q);
            const isGameLive = score?.gameState === 'in';
            const isGameOver = score?.gameState === 'post';
            const currentPeriod = score?.period || 0;

            // State: posted (confirmed winner in DB)
            if (posted) {
              return (
                <div
                  key={q}
                  className="flex-1 max-w-[120px] bg-surface rounded-lg border border-sea-green/40 px-2 py-2 text-center"
                >
                  <span className="text-[10px] text-sea-green font-bold">
                    {QUARTER_LABELS[q - 1]}
                  </span>
                  <p className="text-[11px] sm:text-xs font-bold text-sea-green truncate">
                    {posted.profiles?.full_name?.split(' ')[0] || '—'}
                  </p>
                  <p className="text-[9px] text-sea-green/60">
                    ${Number(posted.payout_amount).toFixed(0)}
                  </p>
                </div>
              );
            }

            // State: live — this is the current quarter in progress
            const isLiveQuarter =
              isGameLive && currentPeriod === q;

            // State: quarter ended but not yet posted
            // (game has moved past this quarter, or game is over, but no result row)
            const isEndedUnposted =
              !posted &&
              ((isGameLive && currentPeriod > q) ||
                (isGameOver && !posted));

            if (isLiveQuarter && score) {
              const homeDigit = score.homeScore % 10;
              const awayDigit = score.awayScore % 10;
              const currentWinner = findBoxOwner(
                homeDigit,
                awayDigit,
                initialBoxes
              );

              return (
                <div
                  key={q}
                  className="flex-1 max-w-[120px] bg-sea-green/5 rounded-lg border border-sea-green/50 px-2 py-2 text-center animate-pulse-green-milestone"
                >
                  <span className="text-[10px] text-sea-green font-bold">
                    {QUARTER_LABELS[q - 1]}
                  </span>
                  <p className="text-[11px] sm:text-xs font-bold text-sea-green truncate">
                    {currentWinner || '—'}
                  </p>
                  <p className="text-[9px] text-sea-green/60">
                    ${payouts[q - 1]}
                  </p>
                </div>
              );
            }

            if (isEndedUnposted && score) {
              // Use the score at end of that quarter — we don't have per-quarter
              // snapshots so show current score digits as best approximation
              const homeDigit = score.homeScore % 10;
              const awayDigit = score.awayScore % 10;
              const likelyWinner = findBoxOwner(
                homeDigit,
                awayDigit,
                initialBoxes
              );

              return (
                <div
                  key={q}
                  className="flex-1 max-w-[120px] bg-surface rounded-lg border border-yellow-500/50 px-2 py-2 text-center"
                >
                  <span className="text-[10px] text-yellow-500 font-bold">
                    {QUARTER_LABELS[q - 1]}
                  </span>
                  <p className="text-[11px] sm:text-xs font-bold text-yellow-400 truncate">
                    {likelyWinner || '—'}
                  </p>
                  <p className="text-[9px] text-yellow-500/60">
                    ${payouts[q - 1]}
                  </p>
                </div>
              );
            }

            // State: upcoming / pregame
            return (
              <div
                key={q}
                className="flex-1 max-w-[120px] bg-surface rounded-lg border border-border px-2 py-2 text-center"
              >
                <span className="text-[10px] text-muted font-bold">
                  {QUARTER_LABELS[q - 1]}
                </span>
                <p className="text-[11px] sm:text-xs font-bold text-muted/40 truncate">
                  —
                </p>
                <p className="text-[9px] text-muted/40">
                  ${payouts[q - 1]}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Grid
        initialBoxes={initialBoxes}
        game={game}
        userId={userId}
        userName={userName}
        quarterResults={quarterResults}
        currentAwayScore={score?.awayScore}
        currentHomeScore={score?.homeScore}
      />
    </>
  );
}

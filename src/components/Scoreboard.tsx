'use client';

import { useState, useEffect, useRef } from 'react';
import { ESPNScore } from '@/lib/types';

interface ScoreboardProps {
  onScoreUpdate?: (score: ESPNScore) => void;
}

export default function Scoreboard({ onScoreUpdate }: ScoreboardProps = {}) {
  const [score, setScore] = useState<ESPNScore | null>(null);
  const [loading, setLoading] = useState(true);
  const gameStateRef = useRef<string | null>(null);
  const onScoreUpdateRef = useRef(onScoreUpdate);
  onScoreUpdateRef.current = onScoreUpdate;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    async function fetchScore() {
      try {
        const res = await fetch('/api/score');
        const data = await res.json();
        if (data.score) {
          setScore(data.score);
          onScoreUpdateRef.current?.(data.score);
          gameStateRef.current = data.score.gameState;
        }
      } catch (err) {
        console.error('Failed to fetch score:', err);
      } finally {
        setLoading(false);
      }
      // Schedule next fetch based on current game state
      const delay = gameStateRef.current === 'in' ? 30000 : 300000;
      timeoutId = setTimeout(fetchScore, delay);
    }

    fetchScore();
    return () => clearTimeout(timeoutId);
  }, []);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6 text-center">
        <p className="text-muted animate-pulse">Loading scores...</p>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6 text-center">
        <p className="text-muted">Score unavailable</p>
      </div>
    );
  }

  const quarterLabel = score.gameState === 'post'
    ? 'FINAL'
    : score.gameState === 'pre'
      ? 'PREGAME'
      : `Q${score.period} · ${score.displayClock}`;

  return (
    <div className="bg-surface rounded-xl border border-border p-4 sm:p-6">
      <div className="text-center mb-3">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
          score.gameState === 'in'
            ? 'bg-ne-red/20 text-ne-red animate-pulse'
            : score.gameState === 'post'
              ? 'bg-sea-green/20 text-sea-green'
              : 'bg-surface-2 text-muted'
        }`}>
          {quarterLabel}
        </span>
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Away Team */}
        <div className="flex flex-col items-center gap-1">
          {score.awayLogo && (
            <img src={score.awayLogo} alt={score.awayTeam} className="w-10 h-10 sm:w-14 sm:h-14" />
          )}
          <span className="text-xs sm:text-sm font-bold text-muted">{score.awayTeam}</span>
          <span className="text-3xl sm:text-5xl font-bold">{score.awayScore}</span>
        </div>

        <span className="text-2xl text-muted font-light">—</span>

        {/* Home Team */}
        <div className="flex flex-col items-center gap-1">
          {score.homeLogo && (
            <img src={score.homeLogo} alt={score.homeTeam} className="w-10 h-10 sm:w-14 sm:h-14" />
          )}
          <span className="text-xs sm:text-sm font-bold text-muted">{score.homeTeam}</span>
          <span className="text-3xl sm:text-5xl font-bold">{score.homeScore}</span>
        </div>
      </div>

      {score.lastPlay && score.gameState === 'in' && (
        <p className="text-xs text-muted text-center mt-3 max-w-sm mx-auto">
          {score.lastPlay}
        </p>
      )}
    </div>
  );
}

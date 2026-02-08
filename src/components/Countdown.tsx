'use client';

import { useState, useEffect } from 'react';

const KICKOFF = new Date('2026-02-08T23:30:00Z').getTime();

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft());

  function calcTimeLeft() {
    const diff = KICKOFF - Date.now();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calcTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) {
    return (
      <div className="text-center">
        <p className="text-sea-green font-bold text-xl">🏈 GAME TIME!</p>
      </div>
    );
  }

  const parts = [
    { label: 'DAYS', value: timeLeft.days },
    { label: 'HRS', value: timeLeft.hours },
    { label: 'MIN', value: timeLeft.minutes },
    { label: 'SEC', value: timeLeft.seconds },
  ];

  return (
    <div className="text-center">
      <p className="text-muted text-sm mb-2 uppercase tracking-widest">Kickoff In</p>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {parts.map((p, i) => (
          <div key={p.label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-4xl font-bold font-mono tabular-nums text-foreground">
                {String(p.value).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-muted tracking-wider">{p.label}</span>
            </div>
            {i < parts.length - 1 && (
              <span className="text-2xl sm:text-4xl font-bold text-muted -mt-4">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

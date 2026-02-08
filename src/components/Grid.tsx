'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Box, Game, calculatePrice, QuarterResult } from '@/lib/types';

interface GridProps {
  initialBoxes: Box[];
  game: Game;
  userId: string | null;
  userName: string | null;
  quarterResults: QuarterResult[];
  currentAwayScore?: number;
  currentHomeScore?: number;
}

export default function Grid({
  initialBoxes,
  game,
  userId,
  userName,
  quarterResults,
  currentAwayScore,
  currentHomeScore,
}: GridProps) {
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [reserving, setReserving] = useState(false);
  const [showVenmo, setShowVenmo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('boxes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boxes', filter: `game_id=eq.${game.id}` },
        (payload) => {
          setBoxes((prev) =>
            prev.map((b) => (b.id === (payload.new as Box).id ? { ...b, ...payload.new as Box } : b))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id, supabase]);

  const getBox = useCallback(
    (row: number, col: number) => boxes.find((b) => b.row_index === row && b.col_index === col),
    [boxes]
  );

  const selectedCount = selectedIds.size;
  const totalPrice = calculatePrice(selectedCount);

  // Determine the current "winning" cell based on live scores
  const winningRow = currentHomeScore !== undefined ? currentHomeScore % 10 : null;
  const winningCol = currentAwayScore !== undefined ? currentAwayScore % 10 : null;

  function toggleBox(box: Box) {
    if (!userId) {
      setError('Please sign in to select boxes');
      return;
    }
    if (box.status !== 'available') return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(box.id)) {
        next.delete(box.id);
      } else {
        next.add(box.id);
      }
      return next;
    });
    setError(null);
  }

  async function reserveBoxes() {
    if (selectedIds.size === 0) return;
    setReserving(true);
    setError(null);

    try {
      const boxIds = Array.from(selectedIds);
      const { error: updateError } = await supabase
        .from('boxes')
        .update({
          user_id: userId,
          status: 'reserved',
          reserved_at: new Date().toISOString(),
        })
        .in('id', boxIds)
        .eq('status', 'available');

      if (updateError) throw updateError;

      setSelectedIds(new Set());
      setShowVenmo(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reserve boxes. Some may have been taken.');
    } finally {
      setReserving(false);
    }
  }

  const userBoxCount = boxes.filter(
    (b) => b.user_id === userId && (b.status === 'reserved' || b.status === 'confirmed')
  ).length;

  const confirmedCount = boxes.filter((b) => b.status === 'confirmed').length;
  const reservedCount = boxes.filter((b) => b.status === 'reserved').length;
  const availableCount = 100 - confirmedCount - reservedCount;
  const totalPot = calculatePrice(confirmedCount + reservedCount);

  // Quarter winning rows
  const quarterWinners = new Map<string, number[]>();
  quarterResults.forEach((qr) => {
    const key = `${qr.home_last_digit}-${qr.away_last_digit}`;
    if (!quarterWinners.has(key)) quarterWinners.set(key, []);
    quarterWinners.get(key)!.push(qr.quarter);
  });

  const venmoNote = encodeURIComponent(`SB Boxes - ${userName || 'Guest'} - ${selectedCount || userBoxCount} boxes`);
  const venmoAmount = totalPrice || calculatePrice(userBoxCount);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
        <div className="text-center">
          <span className="text-muted">Available</span>
          <p className="font-bold text-sea-green">{availableCount}</p>
        </div>
        <div className="text-center">
          <span className="text-muted">Reserved</span>
          <p className="font-bold text-yellow-500">{reservedCount}</p>
        </div>
        <div className="text-center">
          <span className="text-muted">Confirmed</span>
          <p className="font-bold text-emerald-500">{confirmedCount}</p>
        </div>
        <div className="text-center">
          <span className="text-muted">Pot</span>
          <p className="font-bold text-foreground">${totalPot}</p>
        </div>
        {userId && (
          <div className="text-center">
            <span className="text-muted">Your Boxes</span>
            <p className="font-bold text-sea-green">{userBoxCount}</p>
          </div>
        )}
      </div>

      {/* Quarter Results */}
      {quarterResults.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {quarterResults.map((qr) => (
            <div key={qr.quarter} className="bg-surface rounded-lg border border-border px-3 py-2 text-xs text-center">
              <span className="text-muted">Q{qr.quarter}</span>
              <p className="font-bold text-sea-green">{qr.profiles?.full_name || 'Unknown'}</p>
              <p className="text-muted">${Number(qr.payout_amount).toFixed(0)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-auto grid-scroll">
        <div className="min-w-[360px] sm:min-w-[500px]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8 sm:w-12 p-1">
                  <div className="text-[10px] sm:text-xs text-muted">
                    <span className="text-ne-red">NE</span>→<br/>
                    <span className="text-sea-green">SEA</span>↓
                  </div>
                </th>
                {Array.from({ length: 10 }, (_, i) => (
                  <th key={i} className="p-1 text-center">
                    <div
                      className="rounded-md py-1 text-xs sm:text-sm font-bold"
                      style={{ background: '#c60c30', color: 'white' }}
                    >
                      {game.row_numbers ? game.row_numbers[i] : '?'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="p-1">
                    <div
                      className="rounded-md py-1 text-center text-xs sm:text-sm font-bold"
                      style={{ background: '#69be28', color: '#002a5c' }}
                    >
                      {game.col_numbers ? game.col_numbers[rowIdx] : '?'}
                    </div>
                  </td>
                  {Array.from({ length: 10 }, (_, colIdx) => {
                    const box = getBox(rowIdx, colIdx);
                    if (!box) return <td key={colIdx} className="p-0.5" />;

                    const isSelected = selectedIds.has(box.id);
                    const isMine = box.user_id === userId && userId !== null;
                    const isAvailable = box.status === 'available';
                    const isReserved = box.status === 'reserved';
                    const isConfirmed = box.status === 'confirmed';

                    // Check if this is the live "winning" box
                    const actualRow = game.row_numbers ? game.row_numbers[rowIdx] : null;
                    const actualCol = game.col_numbers ? game.col_numbers[colIdx] : null;
                    const isLiveWinner =
                      winningRow !== null &&
                      winningCol !== null &&
                      actualRow === winningRow &&
                      actualCol === winningCol;

                    // Check if this box won a quarter
                    const qKey = actualRow !== null && actualCol !== null
                      ? `${actualRow}-${actualCol}`
                      : null;
                    const wonQuarters = qKey ? quarterWinners.get(qKey) : null;

                    let bgClass = 'bg-surface-2 hover:bg-border cursor-pointer';
                    let borderClass = 'border border-border';
                    let animClass = '';

                    if (isSelected) {
                      bgClass = 'bg-sea-green/30 cursor-pointer';
                      borderClass = 'border-2 border-sea-green';
                    } else if (isConfirmed && isMine) {
                      bgClass = 'bg-sea-green/20';
                      borderClass = 'border-2 border-sea-green';
                    } else if (isConfirmed) {
                      bgClass = 'bg-emerald-900/40';
                      borderClass = 'border border-emerald-700/50';
                    } else if (isReserved && isMine) {
                      bgClass = 'bg-yellow-500/20';
                      borderClass = 'border-2 border-yellow-500';
                      animClass = 'animate-pulse-gold';
                    } else if (isReserved) {
                      bgClass = 'bg-yellow-900/20';
                      borderClass = 'border border-yellow-700/30';
                    } else if (!isAvailable) {
                      bgClass = 'bg-surface';
                      borderClass = 'border border-border';
                    }

                    if (isLiveWinner) {
                      animClass = 'animate-pulse-green';
                      borderClass = 'border-2 border-sea-green';
                    }

                    if (wonQuarters) {
                      borderClass = 'border-2 border-yellow-400';
                    }

                    const displayName = box.profiles?.full_name
                      ? box.profiles.full_name.split(' ')[0]
                      : null;

                    return (
                      <td key={colIdx} className="p-0.5">
                        <button
                          onClick={() => isAvailable && toggleBox(box)}
                          disabled={!isAvailable && !isSelected}
                          className={`
                            w-full aspect-square rounded-md flex flex-col items-center justify-center
                            text-[8px] sm:text-[10px] leading-tight transition-all
                            ${bgClass} ${borderClass} ${animClass}
                            ${isAvailable ? '' : 'cursor-default'}
                          `}
                          title={
                            box.profiles?.full_name
                              ? `${box.profiles.full_name} (${box.status})`
                              : isAvailable
                                ? 'Click to select'
                                : ''
                          }
                        >
                          {wonQuarters && (
                            <span className="text-[7px] text-yellow-400 font-bold">
                              🏆Q{wonQuarters.join(',')}
                            </span>
                          )}
                          {displayName && (
                            <span className={`font-medium truncate w-full px-0.5 ${
                              isMine ? 'text-sea-green' : 'text-foreground/70'
                            }`}>
                              {displayName}
                            </span>
                          )}
                          {isReserved && (
                            <span className="text-yellow-500 text-[7px]">pending</span>
                          )}
                          {isSelected && (
                            <span className="text-sea-green text-[7px] font-bold">✓</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selection panel */}
      {selectedCount > 0 && (
        <div className="bg-surface border border-sea-green/50 rounded-xl p-4 text-center space-y-3">
          <p className="font-bold">
            {selectedCount} box{selectedCount !== 1 ? 'es' : ''} selected · <span className="text-sea-green">${totalPrice}</span>
          </p>
          <p className="text-xs text-muted">
            {selectedCount >= 20
              ? `Bulk pricing: $3/box`
              : selectedCount >= 10
                ? `Bulk pricing: $3.50/box`
                : `$5/box · Get 10 for $35 · 20 for $60`}
          </p>
          <button
            onClick={reserveBoxes}
            disabled={reserving}
            className="bg-sea-green text-sea-navy font-bold px-6 py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-50"
          >
            {reserving ? 'Reserving...' : `Reserve & Pay — $${totalPrice}`}
          </button>
        </div>
      )}

      {/* Venmo payment panel */}
      {showVenmo && (
        <div className="bg-surface border border-border rounded-xl p-6 text-center space-y-4">
          <h3 className="text-lg font-bold text-sea-green">✅ Boxes Reserved!</h3>
          <p className="text-sm text-muted">
            Complete your payment via Venmo to confirm your boxes. Admin will confirm once received.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`venmo://paycharge?txn=pay&recipients=orenmendelow&amount=${venmoAmount}&note=${venmoNote}`}
              className="bg-[#008CFF] text-white font-bold px-6 py-2.5 rounded-lg hover:brightness-110 transition inline-block"
            >
              Pay ${venmoAmount} on Venmo
            </a>
            <a
              href={`https://venmo.com/orenmendelow?txn=pay&amount=${venmoAmount}&note=${venmoNote}`}
              target="_blank"
              className="text-sm text-muted underline"
            >
              Open Venmo Web
            </a>
          </div>
          <p className="text-xs text-muted">Venmo: @orenmendelow</p>
          <button
            onClick={() => setShowVenmo(false)}
            className="text-xs text-muted hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-ne-red/10 border border-ne-red/30 rounded-lg p-3 text-center">
          <p className="text-sm text-ne-red">{error}</p>
        </div>
      )}
    </div>
  );
}

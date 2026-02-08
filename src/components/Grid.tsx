'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Box, Game, calculatePrice, QuarterResult } from '@/lib/types';

// 20 distinct player colors — visible on dark backgrounds, border/bg/text all match
const PLAYER_COLORS = [
  { text: '#6dce62', bg: 'rgba(109,206,98,0.18)', border: 'rgba(109,206,98,0.45)' },   // green
  { text: '#5db8e0', bg: 'rgba(93,184,224,0.18)', border: 'rgba(93,184,224,0.45)' },    // sky blue
  { text: '#e0734f', bg: 'rgba(224,115,79,0.18)', border: 'rgba(224,115,79,0.45)' },    // coral
  { text: '#a68ee0', bg: 'rgba(166,142,224,0.18)', border: 'rgba(166,142,224,0.45)' },  // lavender
  { text: '#e0b84f', bg: 'rgba(224,184,79,0.18)', border: 'rgba(224,184,79,0.45)' },    // gold
  { text: '#5ccead', bg: 'rgba(92,206,173,0.18)', border: 'rgba(92,206,173,0.45)' },    // mint
  { text: '#e06690', bg: 'rgba(224,102,144,0.18)', border: 'rgba(224,102,144,0.45)' },  // pink
  { text: '#73a8d4', bg: 'rgba(115,168,212,0.18)', border: 'rgba(115,168,212,0.45)' },  // steel
  { text: '#c99b6d', bg: 'rgba(201,155,109,0.18)', border: 'rgba(201,155,109,0.45)' },  // tan
  { text: '#8fbf6a', bg: 'rgba(143,191,106,0.18)', border: 'rgba(143,191,106,0.45)' },  // olive
  { text: '#d4785a', bg: 'rgba(212,120,90,0.18)', border: 'rgba(212,120,90,0.45)' },    // terra cotta
  { text: '#7bbfc8', bg: 'rgba(123,191,200,0.18)', border: 'rgba(123,191,200,0.45)' },  // teal
  { text: '#b580b8', bg: 'rgba(181,128,184,0.18)', border: 'rgba(181,128,184,0.45)' },  // mauve
  { text: '#7ec4a0', bg: 'rgba(126,196,160,0.18)', border: 'rgba(126,196,160,0.45)' },  // sea foam
  { text: '#d9936d', bg: 'rgba(217,147,109,0.18)', border: 'rgba(217,147,109,0.45)' },  // copper
  { text: '#95a8c8', bg: 'rgba(149,168,200,0.18)', border: 'rgba(149,168,200,0.45)' },  // slate
  { text: '#b3c45e', bg: 'rgba(179,196,94,0.18)', border: 'rgba(179,196,94,0.45)' },   // lime
  { text: '#c88fb5', bg: 'rgba(200,143,181,0.18)', border: 'rgba(200,143,181,0.45)' },  // plum
  { text: '#6dbdbd', bg: 'rgba(109,189,189,0.18)', border: 'rgba(109,189,189,0.45)' },  // cyan
  { text: '#daa05e', bg: 'rgba(218,160,94,0.18)', border: 'rgba(218,160,94,0.45)' },   // amber
];

function getPlayerColorMap(boxes: Box[]): Map<string, { text: string; bg: string; border: string }> {
  const colorMap = new Map<string, { text: string; bg: string; border: string }>();
  let idx = 0;

  for (const box of boxes) {
    if (box.user_id && !colorMap.has(box.user_id)) {
      colorMap.set(box.user_id, PLAYER_COLORS[idx % PLAYER_COLORS.length]);
      idx++;
    }
  }

  return colorMap;
}

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
  const [cancelling, setCancelling] = useState(false);
  const [showVenmo, setShowVenmo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const playerColorMap = useMemo(() => getPlayerColorMap(boxes), [boxes]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('boxes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boxes', filter: `game_id=eq.${game.id}` },
        (payload) => {
          const updated = payload.new as Box;
          setBoxes((prev) =>
            prev.map((b) =>
              b.id === updated.id
                ? { ...b, ...updated, profiles: updated.profiles ?? b.profiles }
                : b
            )
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

  async function cancelMyReservations() {
    if (!userId) return;
    setCancelling(true);
    setError(null);

    try {
      const myReservedIds = boxes
        .filter((b) => b.user_id === userId && b.status === 'reserved')
        .map((b) => b.id);

      if (myReservedIds.length === 0) return;

      const { error: updateError } = await supabase
        .from('boxes')
        .update({
          user_id: null,
          status: 'available',
          reserved_at: null,
        })
        .in('id', myReservedIds)
        .eq('status', 'reserved');

      if (updateError) throw updateError;

      setShowVenmo(false);
      // Optimistic update
      setBoxes((prev) =>
        prev.map((b) =>
          myReservedIds.includes(b.id)
            ? { ...b, user_id: null, status: 'available' as const, reserved_at: null, profiles: null }
            : b
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservations');
    } finally {
      setCancelling(false);
    }
  }

  const userReservedCount = boxes.filter(
    (b) => b.user_id === userId && b.status === 'reserved'
  ).length;

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

  const venmoNote = `SB Boxes - ${userName || 'Guest'} - ${userReservedCount || selectedCount} boxes`;
  const venmoAmount = calculatePrice(userReservedCount) || totalPrice;
  const venmoUrl = new URL('https://venmo.com/orenmendelow');
  venmoUrl.searchParams.set('txn', 'pay');
  venmoUrl.searchParams.set('amount', String(venmoAmount));
  venmoUrl.searchParams.set('note', venmoNote);

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



      {/* Grid */}
      <div className="overflow-auto grid-scroll -mx-2 px-2 pb-2">
        <div
          className="grid gap-[2px] sm:gap-1 mx-auto"
          style={{
            gridTemplateColumns: `28px repeat(10, 1fr)`,
            gridTemplateRows: `28px repeat(10, 1fr)`,
            maxWidth: '540px',
          }}
        >
          {/* Corner cell */}
          <div className="flex items-center justify-center text-[8px] sm:text-[10px] text-muted leading-tight text-center">
            <span><span className="text-ne-red">NE</span>→<br/><span className="text-sea-green">SEA</span>↓</span>
          </div>

          {/* Column headers (NE / home) */}
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={`col-${i}`}
              className="flex items-center justify-center rounded text-[10px] sm:text-xs font-bold"
              style={{ background: '#c60c30', color: 'white' }}
            >
              {game.row_numbers ? game.row_numbers[i] : '?'}
            </div>
          ))}

          {/* Rows */}
          {Array.from({ length: 10 }, (_, rowIdx) => (
            <React.Fragment key={`row-${rowIdx}`}>
              {/* Row header (SEA / away) */}
              <div
                key={`row-header-${rowIdx}`}
                className="flex items-center justify-center rounded text-[10px] sm:text-xs font-bold"
                style={{ background: '#69be28', color: '#002a5c' }}
              >
                {game.col_numbers ? game.col_numbers[rowIdx] : '?'}
              </div>

              {/* Cells */}
              {Array.from({ length: 10 }, (_, colIdx) => {
                const box = getBox(rowIdx, colIdx);
                if (!box) return <div key={`${rowIdx}-${colIdx}`} />;

                const isSelected = selectedIds.has(box.id);
                const isMine = box.user_id === userId && userId !== null;
                const isAvailable = box.status === 'available';
                const isReserved = box.status === 'reserved';
                const isConfirmed = box.status === 'confirmed';

                const actualRow = game.row_numbers ? game.row_numbers[rowIdx] : null;
                const actualCol = game.col_numbers ? game.col_numbers[colIdx] : null;
                const isLiveWinner =
                  winningRow !== null &&
                  winningCol !== null &&
                  actualRow === winningRow &&
                  actualCol === winningCol;

                const qKey = actualRow !== null && actualCol !== null
                  ? `${actualRow}-${actualCol}`
                  : null;
                const wonQuarters = qKey ? quarterWinners.get(qKey) : null;

                const playerColor = box.user_id ? playerColorMap.get(box.user_id) : null;

                let bgClass = 'bg-surface-2 hover:bg-border cursor-pointer active:scale-95';
                let bgStyle: React.CSSProperties = {};
                let borderClass = 'border border-border';
                let animClass = '';

                if (isSelected) {
                  bgClass = 'bg-sea-green/30 cursor-pointer active:scale-95';
                  borderClass = 'border-2 border-sea-green';
                } else if ((isConfirmed || isReserved) && isMine) {
                  // Your boxes: clean white — stands out, no color conflict
                  bgClass = '';
                  bgStyle = { background: 'rgba(255,255,255,0.12)' };
                  borderClass = 'border-2';
                  bgStyle.borderColor = 'rgba(255,255,255,0.4)';
                } else if (isConfirmed || isReserved) {
                  // Other people's boxes: uniform player color (bg + border)
                  bgClass = '';
                  bgStyle = {
                    background: playerColor?.bg || 'rgba(255,255,255,0.06)',
                    borderColor: playerColor?.border || 'rgba(255,255,255,0.15)',
                  };
                  borderClass = 'border';
                } else if (!isAvailable) {
                  bgClass = 'bg-surface';
                  borderClass = 'border border-border';
                }

                if (isLiveWinner) {
                  animClass = 'animate-pulse-green';
                  borderClass = 'border-2 border-sea-green';
                  bgStyle.borderColor = undefined; // let the class handle it
                }
                if (wonQuarters) {
                  borderClass = 'border-2 border-yellow-400';
                  bgStyle.borderColor = undefined;
                }

                const displayName = box.profiles?.full_name
                  ? box.profiles.full_name.split(' ')[0]
                  : null;

                return (
                  <button
                    key={`${rowIdx}-${colIdx}`}
                    onClick={() => isAvailable && toggleBox(box)}
                    disabled={!isAvailable && !isSelected}
                    className={`
                      aspect-square rounded flex flex-col items-center justify-center
                      text-[7px] sm:text-[9px] leading-tight transition-all overflow-hidden
                      ${bgClass} ${borderClass} ${animClass}
                      ${isAvailable ? '' : 'cursor-default'}
                    `}
                    style={bgStyle}
                    title={
                      box.profiles?.full_name
                        ? `${box.profiles.full_name} (${box.status})`
                        : isAvailable ? 'Tap to select' : ''
                    }
                  >
                    {wonQuarters && (
                      <span className="text-[6px] text-yellow-400 font-bold leading-none">★</span>
                    )}
                    {displayName && (
                      <span
                        className="font-medium truncate w-full px-px text-center"
                        style={{ color: isMine ? '#ffffff' : playerColor?.text }}
                      >
                        {displayName}
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-sea-green font-bold leading-none">✓</span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
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

      {/* Pending boxes / Venmo payment panel */}
      {(showVenmo || userReservedCount > 0) && (
        <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 text-center space-y-4">
          <h3 className="text-lg font-bold text-yellow-500">{userReservedCount} Box{userReservedCount !== 1 ? 'es' : ''} Pending Payment</h3>
          <p className="text-sm text-muted">
            Complete your payment via Venmo. Admin will confirm once received.
          </p>
          <div className="flex flex-col items-center gap-3">
            <a
              href={venmoUrl.toString()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#008CFF] text-white font-bold px-6 py-2.5 rounded-lg hover:brightness-110 transition inline-block w-full sm:w-auto"
            >
              Pay ${venmoAmount} on Venmo
            </a>
          </div>
          <p className="text-xs text-muted">Venmo: @orenmendelow</p>
          <div className="border-t border-border pt-3">
            <button
              onClick={cancelMyReservations}
              disabled={cancelling}
              className="text-ne-red text-sm hover:underline disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : '✕ Cancel My Reservations'}
            </button>
          </div>
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

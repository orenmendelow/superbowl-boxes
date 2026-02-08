'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Box, Game, QuarterResult, Profile, calculatePrice } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface AdminProps {
  game: Game;
  boxes: Box[];
  quarterResults: QuarterResult[];
  profiles: Profile[];
  gameId: string;
}

export default function AdminDashboard({ game, boxes, quarterResults, profiles, gameId }: AdminProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const confirmedBoxes = boxes.filter((b) => b.status === 'confirmed');
  const reservedBoxes = boxes.filter((b) => b.status === 'reserved');
  const availableBoxes = boxes.filter((b) => b.status === 'available');

  const totalPot = calculatePrice(confirmedBoxes.length + reservedBoxes.length);
  const confirmedRevenue = calculatePrice(confirmedBoxes.length);

  // Group reserved boxes by user
  const reservedByUser = new Map<string, Box[]>();
  reservedBoxes.forEach((box) => {
    if (box.user_id) {
      if (!reservedByUser.has(box.user_id)) reservedByUser.set(box.user_id, []);
      reservedByUser.get(box.user_id)!.push(box);
    }
  });

  async function confirmPayment(userId: string) {
    setLoading(`confirm-${userId}`);
    setError(null);

    const { error: updateError } = await supabase
      .from('boxes')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'reserved')
      .eq('game_id', gameId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Payment confirmed!');
      router.refresh();
    }
    setLoading(null);
  }

  async function releaseBoxes(userId: string) {
    setLoading(`release-${userId}`);
    setError(null);

    const { error: updateError } = await supabase
      .from('boxes')
      .update({ status: 'available', user_id: null, reserved_at: null })
      .eq('user_id', userId)
      .eq('status', 'reserved')
      .eq('game_id', gameId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Boxes released!');
      router.refresh();
    }
    setLoading(null);
  }

  async function assignNumbers() {
    setLoading('assign');
    setError(null);

    const shuffle = () => {
      const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const row_numbers = shuffle();
    const col_numbers = shuffle();

    const { error: updateError } = await supabase
      .from('game')
      .update({
        row_numbers,
        col_numbers,
        numbers_assigned: true,
        status: 'numbers_assigned',
      })
      .eq('id', gameId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(`Numbers assigned! Rows: [${row_numbers}] Cols: [${col_numbers}]`);
      router.refresh();
    }
    setLoading(null);
  }

  async function recordQuarter(quarter: number, homeScore: number, awayScore: number) {
    setLoading(`q${quarter}`);
    setError(null);

    const homeLastDigit = homeScore % 10;
    const awayLastDigit = awayScore % 10;

    // Find winning box
    if (!game.row_numbers || !game.col_numbers) {
      setError('Numbers not yet assigned');
      setLoading(null);
      return;
    }

    const rowIdx = game.row_numbers.indexOf(homeLastDigit);
    const colIdx = game.col_numbers.indexOf(awayLastDigit);

    const winningBox = boxes.find((b) => b.row_index === rowIdx && b.col_index === colIdx);
    const payoutPct = [0, game.payout_q1, game.payout_q2, game.payout_q3, game.payout_q4][quarter];
    const payoutAmount = totalPot * Number(payoutPct);

    const { error: insertError } = await supabase
      .from('quarter_results')
      .upsert({
        game_id: gameId,
        quarter,
        home_score: homeScore,
        away_score: awayScore,
        home_last_digit: homeLastDigit,
        away_last_digit: awayLastDigit,
        winning_box_id: winningBox?.id || null,
        winning_user_id: winningBox?.user_id || null,
        payout_amount: payoutAmount,
      }, { onConflict: 'game_id,quarter' });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(`Q${quarter} result recorded! Winner gets $${payoutAmount.toFixed(0)}`);
      router.refresh();
    }
    setLoading(null);
  }

  async function resetNumbers() {
    setLoading('reset-numbers');
    setError(null);

    const { error: updateError } = await supabase
      .from('game')
      .update({
        row_numbers: null,
        col_numbers: null,
        numbers_assigned: false,
        status: 'selling',
      })
      .eq('id', gameId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Numbers reset! Grid is back to "?" mode.');
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header userName="Admin" />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <a href="/board" className="text-sm text-sea-green hover:underline">View Board →</a>
        </div>

        {error && (
          <div className="bg-ne-red/10 border border-ne-red/30 rounded-lg p-3">
            <p className="text-sm text-ne-red">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-sea-green/10 border border-sea-green/30 rounded-lg p-3">
            <p className="text-sm text-sea-green">{success}</p>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Available', value: availableBoxes.length, color: 'text-muted' },
            { label: 'Reserved', value: reservedBoxes.length, color: 'text-yellow-500' },
            { label: 'Confirmed', value: confirmedBoxes.length, color: 'text-emerald-500' },
            { label: 'Revenue', value: `$${confirmedRevenue}`, color: 'text-sea-green' },
            { label: 'Total Pot', value: `$${totalPot}`, color: 'text-foreground' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-muted">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Payout breakdown */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-bold mb-3">Payout Breakdown (Pot: ${totalPot})</h2>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            {['Q1 (10%)', 'Q2 (20%)', 'Q3 (20%)', 'Q4 (50%)'].map((label, i) => {
              const pcts = [0.1, 0.2, 0.2, 0.5];
              return (
                <div key={label} className="bg-surface-2 rounded-lg p-2">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="font-bold">${(totalPot * pcts[i]).toFixed(0)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Game Status */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">Game Status: <span className="text-sea-green">{game.status}</span></h2>
          <div className="flex flex-wrap gap-2">
            {['selling', 'numbers_assigned', 'live', 'final'].map((s) => (
              <span
                key={s}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  game.status === s
                    ? 'bg-sea-green text-sea-navy'
                    : 'bg-surface-2 text-muted'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted">Status updates automatically: selling → numbers assigned → live (ESPN) → final (ESPN)</p>
        </div>

        {/* Number Assignment */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">Number Assignment</h2>
          {game.numbers_assigned ? (
            <div className="space-y-2">
              <p className="text-sm text-sea-green">Numbers assigned</p>
              <p className="text-xs text-muted font-mono">
                Rows (NE): [{game.row_numbers?.join(', ')}]
              </p>
              <p className="text-xs text-muted font-mono">
                Cols (SEA): [{game.col_numbers?.join(', ')}]
              </p>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="bg-surface-2 text-muted font-medium px-3 py-1.5 rounded-lg text-xs hover:text-foreground transition mt-2"
                >
                  ↩ Reset Numbers
                </button>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-ne-red">Are you sure?</span>
                  <button
                    onClick={() => { resetNumbers(); setConfirmReset(false); }}
                    disabled={loading === 'reset-numbers'}
                    className="bg-ne-red text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:brightness-110 transition disabled:opacity-50"
                  >
                    {loading === 'reset-numbers' ? 'Resetting...' : 'Yes, Reset'}
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="bg-surface-2 text-muted px-3 py-1.5 rounded-lg text-xs hover:text-foreground transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={assignNumbers}
              disabled={loading === 'assign'}
              className="bg-ne-red text-white font-bold px-4 py-2 rounded-lg hover:brightness-110 transition disabled:opacity-50"
            >
              {loading === 'assign' ? 'Assigning...' : 'Randomize Numbers'}
            </button>
          )}
        </div>

        {/* Quarter Results */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">Quarter Results</h2>
          {[1, 2, 3, 4].map((q) => {
            const result = quarterResults.find((r) => r.quarter === q);
            return (
              <QuarterControl
                key={q}
                quarter={q}
                result={result || null}
                loading={loading === `q${q}`}
                onRecord={(h, a) => recordQuarter(q, h, a)}
              />
            );
          })}
        </div>

        {/* Pending Payments */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">Pending Payments ({reservedByUser.size} users)</h2>
          {reservedByUser.size === 0 ? (
            <p className="text-sm text-muted">No pending payments</p>
          ) : (
            Array.from(reservedByUser.entries()).map(([userId, userBoxes]) => {
              const profile = userBoxes[0]?.profiles;
              const count = userBoxes.length;
              const amount = calculatePrice(count);
              const reservedAt = userBoxes[0]?.reserved_at;
              const minutesAgo = reservedAt
                ? Math.floor((Date.now() - new Date(reservedAt).getTime()) / 60000)
                : 0;

              return (
                <div
                  key={userId}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg ${
                    minutesAgo > 10 ? 'bg-ne-red/10 border border-ne-red/30' : 'bg-surface-2'
                  }`}
                >
                  <div>
                    <p className="font-medium">{profile?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted">
                      {profile?.email} · {count} boxes · ${amount} · {minutesAgo}m ago
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmPayment(userId)}
                      disabled={loading === `confirm-${userId}`}
                      className="bg-sea-green text-sea-navy font-bold px-3 py-1.5 rounded-lg text-xs hover:brightness-110 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => releaseBoxes(userId)}
                      disabled={loading === `release-${userId}`}
                      className="bg-ne-red text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:brightness-110 disabled:opacity-50"
                    >
                      Release
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* All users */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-bold">All Users ({profiles.length})</h2>
          <div className="space-y-1 text-sm">
            {profiles.map((p) => {
              const userBoxes = boxes.filter((b) => b.user_id === p.id);
              const confirmed = userBoxes.filter((b) => b.status === 'confirmed').length;
              const reserved = userBoxes.filter((b) => b.status === 'reserved').length;
              return (
                <div key={p.id} className="flex justify-between items-center p-2 rounded-lg bg-surface-2">
                  <span>{p.full_name}</span>
                  <span className="text-xs text-muted">
                    {confirmed > 0 && <span className="text-emerald-500">{confirmed} confirmed</span>}
                    {reserved > 0 && <span className="text-yellow-500 ml-2">{reserved} pending</span>}
                    {confirmed === 0 && reserved === 0 && '0 boxes'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function QuarterControl({
  quarter,
  result,
  loading,
  onRecord,
}: {
  quarter: number;
  result: QuarterResult | null;
  loading: boolean;
  onRecord: (homeScore: number, awayScore: number) => void;
}) {
  const [homeScore, setHomeScore] = useState(result?.home_score?.toString() || '');
  const [awayScore, setAwayScore] = useState(result?.away_score?.toString() || '');

  if (result) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
        <div>
          <span className="font-medium">Q{quarter}</span>
          <span className="text-muted ml-2">
            SEA {result.away_score} - NE {result.home_score}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sea-green text-sm font-medium">
            {result.profiles?.full_name || 'No winner'}
          </p>
          <p className="text-xs text-muted">${Number(result.payout_amount).toFixed(0)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-2">
      <span className="font-medium w-8">Q{quarter}</span>
      <input
        type="number"
        placeholder="SEA"
        value={awayScore}
        onChange={(e) => setAwayScore(e.target.value)}
        className="w-16 bg-background border border-border rounded px-2 py-1 text-sm"
      />
      <span className="text-muted">-</span>
      <input
        type="number"
        placeholder="NE"
        value={homeScore}
        onChange={(e) => setHomeScore(e.target.value)}
        className="w-16 bg-background border border-border rounded px-2 py-1 text-sm"
      />
      <button
        onClick={() => onRecord(parseInt(homeScore) || 0, parseInt(awayScore) || 0)}
        disabled={loading || !homeScore || !awayScore}
        className="bg-sea-green text-sea-navy font-bold px-3 py-1 rounded text-xs hover:brightness-110 disabled:opacity-50"
      >
        {loading ? '...' : 'Record'}
      </button>
    </div>
  );
}

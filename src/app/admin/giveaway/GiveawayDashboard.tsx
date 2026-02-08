'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Box, Profile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface GiveawayProps {
  boxes: Box[];
  profiles: Profile[];
  gameId: string;
}

export default function GiveawayDashboard({ boxes, profiles, gameId }: GiveawayProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [alloc, setAlloc] = useState<Record<string, number>>({});
  const [confirmGiveaway, setConfirmGiveaway] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const availableBoxes = boxes.filter((b) => b.status === 'available');
  const allocTotal = Object.values(alloc).reduce((s, n) => s + n, 0);
  const remaining = availableBoxes.length - allocTotal;

  function adjustAlloc(userId: string, delta: number) {
    setAlloc((prev) => {
      const current = prev[userId] || 0;
      const next = Math.max(0, current + delta);
      const totalOthers = Object.entries(prev).reduce((s, [k, v]) => k === userId ? s : s + v, 0);
      const capped = Math.min(next, availableBoxes.length - totalOthers);
      const copy = { ...prev };
      if (capped === 0) {
        delete copy[userId];
      } else {
        copy[userId] = capped;
      }
      return copy;
    });
    setConfirmGiveaway(false);
  }

  function giveAllRemainingTo(userId: string) {
    setAlloc((prev) => {
      const totalOthers = Object.entries(prev).reduce((s, [k, v]) => k === userId ? s : s + v, 0);
      const maxForUser = availableBoxes.length - totalOthers;
      const copy = { ...prev };
      if (maxForUser <= 0) {
        delete copy[userId];
      } else {
        copy[userId] = maxForUser;
      }
      return copy;
    });
    setConfirmGiveaway(false);
  }

  async function distributeGiveaway() {
    if (allocTotal === 0) return;
    setLoading(true);
    setError(null);

    const emptyIds = availableBoxes.map((b) => b.id);
    let cursor = 0;
    const now = new Date().toISOString();

    for (const [userId, count] of Object.entries(alloc)) {
      if (count <= 0) continue;
      const batchIds = emptyIds.slice(cursor, cursor + count);
      cursor += count;

      const { error: updateError } = await supabase
        .from('boxes')
        .update({
          user_id: userId,
          status: 'confirmed',
          reserved_at: now,
          confirmed_at: now,
        })
        .in('id', batchIds)
        .eq('status', 'available');

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    }

    const summary = Object.entries(alloc)
      .filter(([, c]) => c > 0)
      .map(([uid, c]) => `${profiles.find((p) => p.id === uid)?.full_name || 'Unknown'}: ${c}`)
      .join(', ');
    setSuccess(`Gave away ${allocTotal} boxes! (${summary})`);
    setAlloc({});
    setConfirmGiveaway(false);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header userName="Admin" />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Give Away Empty Boxes</h1>
          <a href="/admin" className="text-sm text-sea-green hover:underline">← Back to Admin</a>
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

        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              <span className="font-bold text-sea-green">{availableBoxes.length}</span>
              <span className="text-muted"> boxes available to distribute</span>
            </p>
          </div>

          {availableBoxes.length === 0 ? (
            <p className="text-sm text-muted">All boxes are claimed — nothing to give away.</p>
          ) : (
            <>
              <p className="text-xs text-muted">
                Use +/− to allocate boxes per user, then confirm. Boxes will be marked confirmed with no payment.
              </p>

              <div className="space-y-1">
                {profiles.map((p) => {
                  const userAlloc = alloc[p.id] || 0;
                  const userExisting = boxes.filter(
                    (b) => b.user_id === p.id && (b.status === 'confirmed' || b.status === 'reserved')
                  ).length;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{p.full_name}</span>
                        <span className="text-xs text-muted">
                          {userExisting} box{userExisting !== 1 ? 'es' : ''} already
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustAlloc(p.id, -5)}
                          disabled={userAlloc === 0}
                          className="w-7 h-7 rounded bg-surface border border-border text-xs font-bold text-muted hover:text-foreground disabled:opacity-30 transition"
                          title="−5"
                        >
                          −5
                        </button>
                        <button
                          onClick={() => adjustAlloc(p.id, -1)}
                          disabled={userAlloc === 0}
                          className="w-7 h-7 rounded bg-surface border border-border text-lg font-bold text-muted hover:text-foreground disabled:opacity-30 transition leading-none"
                        >
                          −
                        </button>
                        <span
                          className={`w-8 text-center text-sm font-bold tabular-nums ${
                            userAlloc > 0 ? 'text-sea-green' : 'text-muted'
                          }`}
                        >
                          {userAlloc}
                        </span>
                        <button
                          onClick={() => adjustAlloc(p.id, 1)}
                          disabled={remaining <= 0}
                          className="w-7 h-7 rounded bg-surface border border-border text-lg font-bold text-muted hover:text-foreground disabled:opacity-30 transition leading-none"
                        >
                          +
                        </button>
                        <button
                          onClick={() => adjustAlloc(p.id, 5)}
                          disabled={remaining <= 0}
                          className="w-7 h-7 rounded bg-surface border border-border text-xs font-bold text-muted hover:text-foreground disabled:opacity-30 transition"
                          title="+5"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => giveAllRemainingTo(p.id)}
                          disabled={remaining <= 0 && userAlloc === 0}
                          className="ml-1 px-2 h-7 rounded bg-surface border border-border text-[10px] font-medium text-muted hover:text-sea-green disabled:opacity-30 transition whitespace-nowrap"
                          title="Give all remaining to this user"
                        >
                          All
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary & Confirm */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border">
                <p className="text-sm">
                  <span className="text-sea-green font-bold">{allocTotal}</span>
                  <span className="text-muted"> allocated · </span>
                  <span className="font-bold">{remaining}</span>
                  <span className="text-muted"> remaining</span>
                </p>
                <div className="flex gap-2">
                  {allocTotal > 0 && (
                    <button
                      onClick={() => { setAlloc({}); setConfirmGiveaway(false); }}
                      className="text-muted text-xs hover:text-foreground transition"
                    >
                      Clear
                    </button>
                  )}
                  {!confirmGiveaway ? (
                    <button
                      onClick={() => setConfirmGiveaway(true)}
                      disabled={allocTotal === 0}
                      className="bg-sea-green text-sea-navy font-bold px-4 py-2 rounded-lg text-sm hover:brightness-110 transition disabled:opacity-50"
                    >
                      Give Away {allocTotal} Boxes
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ne-red">Sure?</span>
                      <button
                        onClick={distributeGiveaway}
                        disabled={loading}
                        className="bg-ne-red text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:brightness-110 transition disabled:opacity-50"
                      >
                        {loading ? 'Assigning...' : `Yes, give ${allocTotal} boxes`}
                      </button>
                      <button
                        onClick={() => setConfirmGiveaway(false)}
                        className="bg-surface-2 text-muted px-3 py-1.5 rounded-lg text-xs hover:text-foreground transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

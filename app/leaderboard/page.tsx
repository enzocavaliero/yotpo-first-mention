'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  domain: string;
  brand: string;
  score: number;
  placing: 'Gold' | 'Silver' | 'Bronze';
  checkedAt: string;
  email?: string;
}

function downloadCSV(entries: LeaderboardEntry[]) {
  const header = ['Rank', 'Email', 'Brand', 'Domain', 'Score', 'Tier', 'Checked At'].join(',');
  const rows = entries.map((e, i) => [
    i + 1,
    e.email ?? '',
    e.brand,
    e.domain,
    e.score,
    e.placing,
    e.checkedAt ? new Date(e.checkedAt).toLocaleString('en-AU') : '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `yotpo-discover-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Responsive hook
// ─────────────────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared layout primitives
// ─────────────────────────────────────────────────────────────────────────────

function GrainyBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#ECEAE6' }}>
      <div style={{
        position: 'absolute', inset: '-10%',
        backgroundImage: [
          'radial-gradient(circle at 30% 95%,  rgba(255,110,60,0.85),  transparent 55%)',
          'radial-gradient(circle at 55% 105%, rgba(255,175,90,0.70),  transparent 50%)',
          'radial-gradient(circle at 85% 90%,  rgba(70,130,200,0.55),  transparent 45%)',
          'radial-gradient(circle at 102% 70%, rgba(120,200,150,0.45), transparent 35%)',
        ].join(', '),
        filter: 'blur(40px) saturate(115%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.45,
        mixBlendMode: 'multiply',
      }} />
    </div>
  );
}

function GridLines() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {Array.from({ length: 11 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${((i + 1) / 12) * 100}%`,
          width: 1, background: 'rgba(0,0,0,0.05)',
        }} />
      ))}
    </div>
  );
}

function Eyebrow({ children, color = 'rgba(0,0,0,0.5)' }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: 11, letterSpacing: '0.18em',
      textTransform: 'uppercase', color, fontWeight: 500,
    }}>{children}</div>
  );
}

function FooterRail({ compact }: { compact?: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: compact ? 16 : 22,
      left: compact ? 24 : 48,
      right: compact ? 24 : 48,
      zIndex: 10,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 11, letterSpacing: '0.02em',
      fontFamily: '"Geist", system-ui, sans-serif', color: '#0A0A0A',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/discover-logo-black.png" alt="Discover" style={{ height: 18, width: 'auto' }} />
      <span style={{ fontWeight: 600 }}>yotpo<span style={{ opacity: 0.5 }}>.</span></span>
      <span style={{ opacity: 0.6 }}>2026</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Podium card
// ─────────────────────────────────────────────────────────────────────────────

const PODIUM_STYLES = [
  { bg: '#FF6E3D', textColor: '#fff',    rankColor: 'rgba(255,255,255,0.7)', height: 280 },
  { bg: '#E8E5E0', textColor: '#0A0A0A', rankColor: 'rgba(0,0,0,0.4)',       height: 220 },
  { bg: '#F2DFCF', textColor: '#0A0A0A', rankColor: 'rgba(0,0,0,0.4)',       height: 200 },
];

function PodiumCard({ entry, rankIdx, isYou }: { entry: LeaderboardEntry; rankIdx: number; isYou: boolean }) {
  const s = PODIUM_STYLES[rankIdx];
  const rankLabel = `#${String(rankIdx + 1).padStart(2, '0')}`;

  return (
    <div style={{
      flex: 1,
      height: s.height,
      background: s.bg,
      borderRadius: 20,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          fontSize: 13, letterSpacing: '0.08em', fontWeight: 500,
          color: s.rankColor,
        }}>{rankLabel}</span>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: s.textColor, fontSize: 16, fontWeight: 300, lineHeight: 1,
        }}>+</div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 'clamp(20px, 2.2vw, 30px)',
            lineHeight: 1, letterSpacing: '-0.01em',
            color: s.textColor,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{entry.brand}</div>
          {isYou && (
            <div style={{
              flexShrink: 0,
              background: s.textColor === '#fff' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)',
              color: s.textColor,
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              fontSize: 9, letterSpacing: '0.12em', fontWeight: 500,
              padding: '3px 7px', borderRadius: 999,
              textTransform: 'uppercase',
            }}>YOU</div>
          )}
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 'clamp(52px, 5.5vw, 76px)',
          lineHeight: 1, letterSpacing: '-0.03em',
          color: s.textColor,
          fontVariantNumeric: 'tabular-nums',
        }}>{entry.score}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset modal
// ─────────────────────────────────────────────────────────────────────────────

function ResetModal({ onConfirm, onCancel, resetting }: {
  onConfirm: () => void;
  onCancel: () => void;
  resetting: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        padding: '32px 28px', maxWidth: 400, width: '100%',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.35)',
        fontFamily: '"Geist", system-ui, sans-serif',
      }}>
        <div style={{
          fontFamily: '"Geist Mono", ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(0,0,0,0.4)', marginBottom: 12,
        }}>Confirm reset</div>
        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.015em', marginBottom: 12,
        }}>Clear all scores?</div>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5, marginBottom: 28 }}>
          This will download the current list then permanently clear all leaderboard entries.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={resetting}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 999,
              background: '#0A0A0A', color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 500,
              fontFamily: '"Geist", system-ui, sans-serif',
              opacity: resetting ? 0.6 : 1,
              cursor: resetting ? 'not-allowed' : 'pointer',
            }}
          >
            {resetting ? 'Downloading & resetting…' : 'Yes, reset and download list'}
          </button>
          <button
            onClick={onCancel}
            disabled={resetting}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 999,
              background: 'transparent', border: '1px solid rgba(0,0,0,0.2)',
              color: '#0A0A0A', fontSize: 14, fontWeight: 500,
              fontFamily: '"Geist", system-ui, sans-serif',
              cursor: resetting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard inner (uses useSearchParams — must be inside Suspense)
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardInner() {
  const searchParams = useSearchParams();
  const youDomain = searchParams.get('you') ?? '';
  const isMobile = useIsMobile();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeStr, setTimeStr] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    setTimeStr(fmt());
    const id = setInterval(() => setTimeStr(fmt()), 10_000);
    return () => clearInterval(id);
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      const data = await res.json();
      setEntries(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const id = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(id);
  }, [fetchLeaderboard]);

  const handleReset = async () => {
    setResetting(true);
    try {
      if (entries.length > 0) downloadCSV(entries);
      await fetch('/api/reset', { method: 'POST' });
      setEntries([]);
    } catch {
      // fail silently
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  const normDomain = (d: string) =>
    d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase();

  const isYou = (entry: LeaderboardEntry) =>
    youDomain ? normDomain(entry.domain) === normDomain(youDomain) : false;

  const top3 = entries.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumRankIdx = [1, 0, 2];

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ position: 'relative', minHeight: '100dvh', color: '#0A0A0A' }}>
        <GrainyBg />

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'rgba(236,234,230,0.9)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          padding: '14px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/discover-logo-black.png" alt="Discover" style={{ height: 22, width: 'auto', display: 'block' }} />
            <Link href="/" style={{
              padding: '7px 14px', borderRadius: 999,
              background: '#0A0A0A', color: '#fff',
              fontSize: 12, fontWeight: 500,
              fontFamily: '"Geist", system-ui, sans-serif',
              textDecoration: 'none', letterSpacing: '0.01em',
            }}>← Check your score</Link>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => entries.length > 0 && downloadCSV(entries)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 999,
                background: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.12)',
                color: 'rgba(0,0,0,0.6)', fontSize: 11, fontWeight: 500,
                fontFamily: '"Geist Mono", ui-monospace, monospace',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: entries.length > 0 ? 'pointer' : 'not-allowed',
                opacity: entries.length > 0 ? 1 : 0.4,
              }}
            >Download list</button>
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 999,
                background: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.12)',
                color: 'rgba(0,0,0,0.6)', fontSize: 11, fontWeight: 500,
                fontFamily: '"Geist Mono", ui-monospace, monospace',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >Reset</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ position: 'relative', zIndex: 3, padding: '24px 20px 80px' }}>
          {/* Heading */}
          <div style={{ marginBottom: 24 }}>
            <Eyebrow color="rgba(0,0,0,0.55)">
              04 — Leaderboard{timeStr ? ` · ${timeStr}` : ''}
            </Eyebrow>
            <h1 style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 44, lineHeight: 0.94,
              fontWeight: 400, letterSpacing: '-0.025em', margin: '10px 0 0',
            }}>
              Live from<br /><em style={{ fontStyle: 'italic' }}>First Mention.</em>
            </h1>
          </div>

          {/* Ranked table */}
          <div style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 20px 60px -15px rgba(0,0,0,0.16)',
            overflow: 'hidden',
          }}>
            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '52px 1fr 56px',
              padding: '12px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.07)',
              background: 'rgba(0,0,0,0.015)',
            }}>
              {['Rank', 'Brand', 'Score'].map(h => (
                <div key={h} style={{
                  fontFamily: '"Geist Mono", ui-monospace, monospace',
                  fontSize: 10, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)', fontWeight: 500,
                  textAlign: h === 'Score' ? 'right' : 'left',
                }}>{h}</div>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{
                padding: '40px 20px', textAlign: 'center',
                fontFamily: '"Geist", system-ui, sans-serif',
                color: 'rgba(0,0,0,0.3)', fontSize: 15,
              }}>Loading…</div>
            )}

            {/* Empty */}
            {!loading && entries.length === 0 && (
              <div style={{
                padding: '48px 20px', textAlign: 'center',
                fontFamily: '"Geist", system-ui, sans-serif',
                color: 'rgba(0,0,0,0.3)', fontSize: 15,
              }}>No entries yet.</div>
            )}

            {/* Rows */}
            {entries.map((entry, idx) => {
              const you = isYou(entry);
              const isTop3 = idx < 3;
              return (
                <div
                  key={entry.domain}
                  style={{
                    display: 'grid', gridTemplateColumns: '52px 1fr 56px',
                    alignItems: 'center',
                    minHeight: isTop3 ? 64 : 54,
                    padding: '0 20px',
                    borderBottom: idx < entries.length - 1 ? '1px solid rgba(0,0,0,0.055)' : 'none',
                    background: you ? 'rgba(255,110,60,0.045)' : 'transparent',
                  }}
                >
                  <div>
                    <span style={{
                      fontFamily: '"Geist Mono", ui-monospace, monospace',
                      fontSize: 13, color: 'rgba(0,0,0,0.32)', fontWeight: 500,
                      letterSpacing: '0.04em',
                    }}>#{String(idx + 1).padStart(2, '0')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, minWidth: 0 }}>
                    <div style={{
                      fontFamily: '"Instrument Serif", serif',
                      fontSize: isTop3 ? 20 : 17,
                      fontWeight: 400, letterSpacing: '-0.01em',
                      color: '#0A0A0A',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{entry.brand}</div>
                    {you && (
                      <div style={{
                        flexShrink: 0,
                        background: '#0A0A0A', color: '#fff',
                        fontFamily: '"Geist Mono", ui-monospace, monospace',
                        fontSize: 8, letterSpacing: '0.12em', fontWeight: 500,
                        padding: '2px 6px', borderRadius: 999,
                        textTransform: 'uppercase',
                      }}>YOU</div>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontFamily: '"Geist Mono", ui-monospace, monospace',
                    fontSize: isTop3 ? 18 : 15,
                    fontWeight: 500, color: '#0A0A0A',
                  }}>
                    {entry.score}
                    <span style={{ fontSize: '0.7em', color: 'rgba(0,0,0,0.3)', marginLeft: 1 }}>%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <FooterRail compact />

        {showResetConfirm && (
          <ResetModal
            onConfirm={handleReset}
            onCancel={() => setShowResetConfirm(false)}
            resetting={resetting}
          />
        )}
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', color: '#0A0A0A' }}>
      <GrainyBg />
      <GridLines />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '28px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/discover-logo-black.png" alt="Discover" style={{ height: 38, width: 'auto', display: 'block' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Eyebrow color="rgba(0,0,0,0.45)">London · 2026</Eyebrow>
          <Link href="/" style={{
            padding: '7px 16px', borderRadius: 999,
            background: '#0A0A0A', color: '#fff',
            fontSize: 12, fontWeight: 500,
            fontFamily: '"Geist", system-ui, sans-serif',
            textDecoration: 'none', letterSpacing: '0.01em',
          }}>← Check your score</Link>
          <button
            onClick={() => entries.length > 0 && downloadCSV(entries)}
            style={{
              padding: '7px 14px', borderRadius: 999,
              background: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.12)',
              color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: 500,
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: entries.length > 0 ? 'pointer' : 'not-allowed',
              opacity: entries.length > 0 ? 1 : 0.4,
            }}
          >Download list</button>
          <button
            onClick={() => setShowResetConfirm(true)}
            style={{
              padding: '7px 14px', borderRadius: 999,
              background: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.12)',
              color: 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: 500,
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >Reset</button>
        </div>
      </div>

      {/* Main content grid */}
      <div style={{
        position: 'relative', zIndex: 3,
        height: '100vh',
        padding: '110px 48px 60px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(20px, 3vw, 48px)',
        alignItems: 'start',
      }}>

        {/* LEFT — heading + podium */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vh, 36px)' }}>
            <Eyebrow color="rgba(0,0,0,0.55)">
              04 — Today&apos;s Leaderboard{timeStr ? ` · Updated ${timeStr}` : ''}
            </Eyebrow>
            <h1 style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 'clamp(52px, 6.5vw, 92px)', lineHeight: 0.94,
              fontWeight: 400, letterSpacing: '-0.025em', margin: '12px 0 0',
            }}>
              Live from<br /><em style={{ fontStyle: 'italic' }}>First Mention.</em>
            </h1>
          </div>

          {!loading && entries.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 10,
              flex: 1, maxHeight: 300,
            }}>
              {podiumOrder.map((entry, slotIdx) => {
                const rankIdx = podiumRankIdx[slotIdx];
                if (!entry) {
                  return <div key={slotIdx} style={{ flex: 1, height: PODIUM_STYLES[rankIdx].height }} />;
                }
                return (
                  <PodiumCard
                    key={entry.domain}
                    entry={entry}
                    rankIdx={rankIdx}
                    isYou={isYou(entry)}
                  />
                );
              })}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              fontFamily: '"Instrument Serif", serif',
              fontSize: 'clamp(22px,2.4vw,32px)', color: 'rgba(0,0,0,0.3)',
            }}>
              No scores yet. Be first!
            </div>
          )}
        </div>

        {/* RIGHT — ranked table */}
        <div style={{
          background: '#fff',
          borderRadius: 'clamp(16px, 1.6vw, 22px)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.16)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 170px)',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '64px 1fr 80px',
            padding: '16px 32px',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            background: 'rgba(0,0,0,0.015)',
            flexShrink: 0,
          }}>
            {['Rank', 'Brand', 'Score'].map(h => (
              <div key={h} style={{
                fontFamily: '"Geist Mono", ui-monospace, monospace',
                fontSize: 11, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)', fontWeight: 500,
                textAlign: h === 'Score' ? 'right' : 'left',
              }}>{h}</div>
            ))}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{
                padding: '40px 32px', textAlign: 'center',
                fontFamily: '"Geist", system-ui, sans-serif',
                color: 'rgba(0,0,0,0.3)', fontSize: 15,
              }}>Loading…</div>
            )}

            {!loading && entries.length === 0 && (
              <div style={{
                padding: '48px 32px', textAlign: 'center',
                fontFamily: '"Geist", system-ui, sans-serif',
                color: 'rgba(0,0,0,0.3)', fontSize: 15,
              }}>No entries yet.</div>
            )}

            {entries.map((entry, idx) => {
              const you = isYou(entry);
              const isTop3 = idx < 3;

              return (
                <div
                  key={entry.domain}
                  style={{
                    display: 'grid', gridTemplateColumns: '64px 1fr 80px',
                    alignItems: 'center',
                    minHeight: isTop3 ? 80 : 66,
                    padding: '0 32px',
                    borderBottom: idx < entries.length - 1 ? '1px solid rgba(0,0,0,0.055)' : 'none',
                    background: you ? 'rgba(255,110,60,0.045)' : 'transparent',
                  }}
                >
                  <div>
                    <span style={{
                      fontFamily: '"Geist Mono", ui-monospace, monospace',
                      fontSize: 15, color: 'rgba(0,0,0,0.32)', fontWeight: 500,
                      letterSpacing: '0.04em',
                    }}>#{String(idx + 1).padStart(2, '0')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16, minWidth: 0 }}>
                    <div style={{
                      fontFamily: '"Instrument Serif", serif',
                      fontSize: isTop3 ? 'clamp(22px, 2.2vw, 30px)' : 'clamp(18px, 1.8vw, 24px)',
                      fontWeight: 400, letterSpacing: '-0.01em',
                      color: '#0A0A0A',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{entry.brand}</div>
                    {you && (
                      <div style={{
                        flexShrink: 0,
                        background: '#0A0A0A', color: '#fff',
                        fontFamily: '"Geist Mono", ui-monospace, monospace',
                        fontSize: 9, letterSpacing: '0.12em', fontWeight: 500,
                        padding: '3px 8px', borderRadius: 999,
                        textTransform: 'uppercase',
                      }}>YOU</div>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontFamily: '"Geist Mono", ui-monospace, monospace',
                    fontSize: isTop3 ? 22 : 18,
                    fontWeight: 500, color: '#0A0A0A',
                  }}>
                    {entry.score}
                    <span style={{ fontSize: '0.7em', color: 'rgba(0,0,0,0.3)', marginLeft: 2 }}>%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <FooterRail />

      {showResetConfirm && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
          resetting={resetting}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  return (
    <Suspense fallback={
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ECEAE6' }}>
        <div style={{ fontFamily: '"Geist", system-ui, sans-serif', color: 'rgba(0,0,0,0.35)', fontSize: 15 }}>
          Loading…
        </div>
      </div>
    }>
      <LeaderboardInner />
    </Suspense>
  );
}

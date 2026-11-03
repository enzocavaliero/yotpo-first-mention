'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AppState = 'idle' | 'loading' | 'result' | 'error';

interface BrandResult {
  domain: string;
  brand: string;
  score: number;
  placing: 'Gold' | 'Silver' | 'Bronze';
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LOADING_PHRASES = [
  'Crawling your domain',
  'Asking ChatGPT',
  'Asking Gemini',
  'Asking AI Mode',
  'Comparing across your vertical…',
  'Crunching the numbers',
];

const RING_COLOR: Record<string, string> = {
  Gold:   '#E0A93A',
  Silver: '#FF6E3D',
  Bronze: '#B97B49',
};

const TIER_COPY: Record<string, string> = {
  Gold:   'AI cites you reliably. Keep the schema fresh and off-site mentions flowing.',
  Silver: 'Solid foundation. AI knows your name, but rarely recommends you yet.',
  Bronze: 'AI barely sees you. Schema, reviews and off-site mentions move the needle fastest.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared layout primitives
// ─────────────────────────────────────────────────────────────────────────────

function GrainyBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#ECEAE6' }}>
      {/* blurred colour blobs */}
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
      {/* film grain */}
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

function Logo() {
  return (
    <div style={{ position: 'absolute', top: 28, left: 40, zIndex: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/discover-logo-black.png" alt="Discover" style={{ height: 24, width: 'auto', display: 'block' }} />
    </div>
  );
}

function FooterRail() {
  return (
    <div style={{
      position: 'absolute', bottom: 22, left: 40, right: 40, zIndex: 10,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 11, letterSpacing: '0.02em',
      fontFamily: '"Geist", system-ui, sans-serif', color: '#0A0A0A',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/discover-logo-black.png" alt="Discover" style={{ height: 16, width: 'auto' }} />
      <span style={{ fontWeight: 600 }}>yotpo<span style={{ opacity: 0.5 }}>.</span></span>
      <span style={{ opacity: 0.6 }}>2026</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Medal SVG (faithful port from design)
// ─────────────────────────────────────────────────────────────────────────────

function Medal({ tier, size = 200 }: { tier: 'gold' | 'silver' | 'bronze'; size?: number }) {
  const palettes = {
    gold:   { face: ['#FFF1B8','#F2C84A','#B27E1A','#553402'], rim: ['#FFE38C','#C68C20','#5E3D08'], glyph: '#5A3A07', shine: '#FFFAE0' },
    silver: { face: ['#FBFBFB','#DADADA','#8E8E8E','#383838'], rim: ['#F0F0F0','#9C9C9C','#3F3F3F'], glyph: '#2A2A2A', shine: '#FFFFFF' },
    bronze: { face: ['#F8D9B6','#D08851','#7E4A20','#3E1F08'], rim: ['#E7A678','#8C5524','#451E07'], glyph: '#39190A', shine: '#FFE5C7' },
  };
  const p = palettes[tier] ?? palettes.silver;
  const id = `medal-${tier}-${size}`;
  const num = tier === 'gold' ? '1' : tier === 'silver' ? '2' : '3';

  return (
    <svg width={size} height={size * 1.42} viewBox="0 0 200 284" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <radialGradient id={`${id}-f`} cx="36%" cy="30%" r="85%">
          {p.face.map((c, i) => <stop key={i} offset={['0%','30%','72%','100%'][i]} stopColor={c} />)}
        </radialGradient>
        <linearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1">
          {p.rim.map((c, i) => <stop key={i} offset={['0%','50%','100%'][i]} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor={p.shine} stopOpacity="0.7" />
          <stop offset="55%" stopColor={p.shine} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-sR`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#D43048" />
          <stop offset="100%" stopColor="#8E1A2A" />
        </linearGradient>
        <linearGradient id={`${id}-sB`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3F84E8" />
          <stop offset="100%" stopColor="#1B4FAB" />
        </linearGradient>
        <filter id={`${id}-bl`}><feGaussianBlur stdDeviation="2.5" /></filter>
      </defs>
      {/* Ribbon left */}
      <polygon points="38,0 66,0 102,96 88,103"  fill={`url(#${id}-sR)`} />
      <polygon points="66,0 80,0 110,90 102,96"  fill="#FAFAFA" />
      <polygon points="80,0 98,0 116,84 110,90"  fill={`url(#${id}-sB)`} />
      <polygon points="98,0 100,0 116,84 110,90" fill="rgba(0,0,0,0.12)" />
      {/* Ribbon right */}
      <polygon points="162,0 134,0 98,96 112,103"  fill={`url(#${id}-sB)`} />
      <polygon points="134,0 120,0 90,90 98,96"    fill="#FAFAFA" />
      <polygon points="120,0 102,0 84,84 90,90"    fill={`url(#${id}-sR)`} />
      <polygon points="102,0 100,0 84,84 90,90"    fill="rgba(0,0,0,0.12)" />
      <polygon points="88,103 112,103 100,116"     fill="rgba(0,0,0,0.35)" />
      {/* Disc shadow */}
      <ellipse cx="100" cy="268" rx="58" ry="6" fill="rgba(0,0,0,0.22)" filter={`url(#${id}-bl)`} />
      {/* Disc */}
      <circle cx="100" cy="196" r="72" fill={`url(#${id}-r)`} />
      <circle cx="100" cy="196" r="63" fill={`url(#${id}-f)`} />
      <circle cx="100" cy="196" r="63" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
      <circle cx="100" cy="196" r="62" fill="none" stroke={p.shine} strokeWidth="0.6" opacity="0.55" />
      {/* Laurel */}
      <g opacity="0.42" fill={p.glyph}>
        {Array.from({ length: 7 }, (_, i) => {
          const a = (-75 + i * 18) * Math.PI / 180;
          return <ellipse key={`l${i}`} cx={100 + 47 * Math.sin(a)} cy={196 + 47 * Math.cos(a)} rx="4" ry="2.2"
            transform={`rotate(${-(-75 + i * 18) + 90} ${100 + 47 * Math.sin(a)} ${196 + 47 * Math.cos(a)})`} />;
        })}
        {Array.from({ length: 7 }, (_, i) => {
          const a = (75 - i * 18) * Math.PI / 180;
          return <ellipse key={`r${i}`} cx={100 + 47 * Math.sin(a)} cy={196 + 47 * Math.cos(a)} rx="4" ry="2.2"
            transform={`rotate(${-(75 - i * 18) + 90} ${100 + 47 * Math.sin(a)} ${196 + 47 * Math.cos(a)})`} />;
        })}
      </g>
      <text x="100" y="218" textAnchor="middle" fontFamily='"Instrument Serif", serif' fontSize="64" fill={p.glyph}>{num}</text>
      <text x="100" y="218.6" textAnchor="middle" fontFamily='"Instrument Serif", serif' fontSize="64" fill={p.shine} opacity="0.18">{num}</text>
      <ellipse cx="74"  cy="162" rx="32" ry="11" fill={`url(#${id}-s)`} />
      <ellipse cx="132" cy="232" rx="18" ry="3.5" fill="#fff" opacity="0.18" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 1: Enter Brand
// ─────────────────────────────────────────────────────────────────────────────

function Screen1({ email, setEmail, onSubmit }: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (email.trim()) onSubmit(); };

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', color: '#0A0A0A' }}>
      <GrainyBg />
      <GridLines />
      <Logo />

      <div style={{
        position: 'relative', zIndex: 3, height: '100%',
        display: 'grid', gridTemplateColumns: '1.05fr 1fr',
        alignItems: 'center', gap: 'clamp(24px,4vw,80px)',
        padding: 'clamp(80px,9vh,130px) clamp(40px,6vw,100px) clamp(70px,8vh,120px)',
      }}>
        {/* LEFT */}
        <div style={{ maxWidth: 640 }}>
          <Eyebrow color="rgba(0,0,0,0.55)">01 — AI Visibility Audit</Eyebrow>
          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 'clamp(54px,7.2vw,108px)', lineHeight: 0.94,
            fontWeight: 400, letterSpacing: '-0.025em', margin: '14px 0 0',
          }}>
            How visible<br />is your brand<br />
            <em style={{ fontStyle: 'italic' }}>to AI?</em>
          </h1>
          <div style={{ marginTop: 'clamp(28px,4vh,44px)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { name: 'ChatGPT', dot: '#10A37F' },
              { name: 'Gemini',  dot: '#4285F4' },
              { name: 'AI Mode', dot: '#FF6E3D' },
            ].map(c => (
              <div key={c.name} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(8px)',
                padding: '8px 14px', borderRadius: 999,
                fontSize: 12, fontWeight: 500, border: '1px solid rgba(255,255,255,0.6)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: c.dot, flexShrink: 0 }} />
                {c.name}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — card */}
        <form onSubmit={handleSubmit} style={{
          background: '#fff',
          borderRadius: 'clamp(18px,1.8vw,26px)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.8) inset',
          padding: 'clamp(22px,2.4vw,36px)',
          maxWidth: 500, width: '100%', justifySelf: 'end',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'clamp(18px,2vw,26px)' }}>
            <Eyebrow>Brand audit</Eyebrow>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#0A0A0A',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 300, lineHeight: 1,
            }}>+</div>
          </div>

          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 'clamp(28px,2.8vw,38px)', lineHeight: 1,
            letterSpacing: '-0.015em', marginBottom: 'clamp(18px,2vw,26px)',
          }}>
            Enter your<br />work email.
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#F2F0EC', borderRadius: 14,
            padding: '14px 16px', marginBottom: 14, cursor: 'text',
            boxShadow: focused ? '0 0 0 2px rgba(255,110,60,0.35)' : 'none',
            transition: 'box-shadow 0.18s',
          }}>
            <span style={{ color: 'rgba(0,0,0,0.3)', fontSize: 15, flexShrink: 0, lineHeight: 1 }}>@</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="you@yourbrand.com.au"
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: 17, color: '#0A0A0A', fontWeight: 500,
                fontFamily: '"Geist", system-ui, sans-serif',
                minWidth: 0,
              }}
              autoComplete="email"
              spellCheck={false}
              autoFocus
            />
            {/* orange caret indicator */}
            <span style={{ width: 6, height: 18, background: '#FF6E3D', flexShrink: 0 }} />
          </label>

          <button type="submit" style={{
            width: '100%', padding: '16px 18px', borderRadius: 14, border: 'none',
            background: '#0A0A0A', color: '#fff', fontSize: 15, fontWeight: 500,
            letterSpacing: '0.01em', fontFamily: '"Geist", system-ui, sans-serif',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Run the audit</span>
            <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 14 }}>→</span>
          </button>

          <div style={{
            marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <Link href="/leaderboard" style={{
              color: '#0A0A0A', fontWeight: 500, fontSize: 12,
              textDecoration: 'none', fontFamily: '"Geist", system-ui, sans-serif',
            }}>
              See live leaderboard →
            </Link>
          </div>
        </form>
      </div>

      <FooterRail />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 2: Analysing (radar animation)
// ─────────────────────────────────────────────────────────────────────────────

function Screen2({ email }: { email: string }) {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    setPhraseIdx(0);
    const id = setInterval(() => setPhraseIdx(p => (p + 1) % LOADING_PHRASES.length), 1050);
    return () => clearInterval(id);
  }, []);

  const steps = LOADING_PHRASES.slice(0, 5).map((label, i) => ({
    label: ['Crawl', 'ChatGPT', 'Gemini', 'AI Mode', 'Compare vertical'][i],
    done: phraseIdx > i,
    active: phraseIdx === i || (i === 4 && phraseIdx >= 4),
  }));

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', color: '#0A0A0A' }}>
      <GrainyBg />
      <GridLines />
      <Logo />

      <div style={{
        position: 'relative', zIndex: 3, height: '100%',
        padding: 'clamp(80px,9vh,130px) clamp(40px,6vw,100px) clamp(70px,8vh,120px)',
        display: 'grid',
        gridTemplateColumns: '1fr 1.1fr',
        gridTemplateRows: 'auto 1fr auto',
        columnGap: 'clamp(24px,4vw,80px)',
        alignItems: 'start',
      }}>

        {/* Left: heading + cycling phrase */}
        <div style={{ gridColumn: 1, gridRow: '1 / span 2', alignSelf: 'center' }}>
          <Eyebrow color="rgba(0,0,0,0.55)">02 — Running</Eyebrow>
          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 'clamp(54px,7.2vw,108px)', lineHeight: 0.94,
            fontWeight: 400, letterSpacing: '-0.025em', margin: '14px 0 32px',
          }}>
            Comparing<br />
            <em style={{ fontStyle: 'italic' }}>across</em><br />
            your vertical…
          </h1>
          <div style={{ overflow: 'hidden', minHeight: 60 }}>
            <div key={phraseIdx} style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 'clamp(24px,2.6vw,38px)', lineHeight: 1.1,
              letterSpacing: '-0.015em',
              animation: 'phraseFade 1.05s ease both',
            }}>{LOADING_PHRASES[phraseIdx]}</div>
            <div style={{
              marginTop: 8, fontFamily: '"Geist Mono", monospace',
              fontSize: 12, color: 'rgba(0,0,0,0.55)',
            }}>{email}</div>
          </div>
        </div>

        {/* Right: radar */}
        <div style={{
          gridColumn: 2, gridRow: '1 / span 2',
          position: 'relative',
          width: 'clamp(280px,38vw,460px)', aspectRatio: '1',
          justifySelf: 'center', alignSelf: 'center',
        }}>
          <svg viewBox="-200 -200 400 400" width="100%" height="100%" style={{ overflow: 'visible' }}>
            {[56, 92, 130, 168].map((r, i) => (
              <circle key={i} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
            ))}
          </svg>
          {/* pulsing center */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#FF6E3D',
              animation: 'centerPulse 1.8s ease-out infinite, dotBeat 1.4s ease-in-out infinite',
            }} />
          </div>
        </div>

        {/* Bottom: step tracker */}
        <div style={{
          gridColumn: '1 / span 2', gridRow: 3,
          background: '#fff', borderRadius: 18,
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.12)',
          padding: 'clamp(14px,1.8vw,22px) clamp(18px,2.4vw,28px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          {steps.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: s.done || s.active ? 1 : 0.4 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: s.done ? '#0A0A0A' : s.active ? '#FF6E3D' : 'transparent',
                border: !s.done && !s.active ? '1.5px dashed rgba(0,0,0,0.35)' : 'none',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
              }}>{s.done ? '✓' : ''}</div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <FooterRail />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 3: Visibility Score
// ─────────────────────────────────────────────────────────────────────────────

function Screen3({ result, onReset, onLeaderboard }: {
  result: BrandResult;
  onReset: () => void;
  onLeaderboard: () => void;
}) {
  const [display, setDisplay] = useState(0);
  const tier = result.placing.toLowerCase() as 'gold' | 'silver' | 'bronze';
  const ringColor = RING_COLOR[result.placing] ?? '#FF6E3D';

  const ringSize = 240;
  const stroke   = 16;
  const r        = (ringSize - stroke) / 2;
  const c        = 2 * Math.PI * r;
  const offset   = c - (Math.min(display, 100) / 100) * c;

  useEffect(() => {
    const start = Date.now();
    const dur   = 1800;
    let raf: number;
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      setDisplay((1 - Math.pow(1 - t, 3)) * result.score);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => { raf = requestAnimationFrame(tick); }, 280);
    return () => { clearTimeout(delay); cancelAnimationFrame(raf); };
  }, [result.score]);

  const tierBlurb = tier === 'gold'
    ? 'Strong AI visibility in your category.'
    : tier === 'silver'
    ? 'Solid foundation. AI knows you, but rarely recommends you yet.'
    : 'You have a foothold. Most lift comes from off-site mentions.';

  return (
    <div className="fade-in-up" style={{ position: 'relative', height: '100vh', overflow: 'hidden', color: '#0A0A0A' }}>
      <GrainyBg />
      <GridLines />
      <Logo />

      <div style={{
        position: 'relative', zIndex: 3, height: '100%',
        padding: 'clamp(80px,9vh,130px) clamp(40px,6vw,100px) clamp(70px,8vh,120px)',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        alignItems: 'center', gap: 'clamp(24px,4vw,80px)',
      }}>

        {/* LEFT */}
        <div style={{ maxWidth: 540 }}>
          <Eyebrow color="rgba(0,0,0,0.55)">03 — Result · {result.brand}</Eyebrow>
          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 'clamp(48px,6.4vw,88px)', lineHeight: 0.94,
            fontWeight: 400, letterSpacing: '-0.025em', margin: '14px 0 0',
            fontVariantNumeric: 'tabular-nums',
          }}>
            You&apos;re at <em style={{ fontStyle: 'italic' }}>{Math.round(display)}</em><br />
            out of 100.
          </h1>
          <p style={{
            marginTop: 22, fontSize: 'clamp(14px,1.1vw,16px)',
            lineHeight: 1.55, color: 'rgba(0,0,0,0.65)', maxWidth: 460,
          }}>{TIER_COPY[result.placing]}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
            <button onClick={onLeaderboard} style={{
              padding: '14px 22px', borderRadius: 999, border: 'none',
              background: '#0A0A0A', color: '#fff',
              fontSize: 14, fontWeight: 500, fontFamily: '"Geist", system-ui, sans-serif',
            }}>View leaderboard →</button>
            <button onClick={onReset} style={{
              padding: '14px 22px', borderRadius: 999,
              background: 'transparent', border: '1px solid rgba(0,0,0,0.2)', color: '#0A0A0A',
              fontSize: 14, fontWeight: 500, fontFamily: '"Geist", system-ui, sans-serif',
            }}>Check another brand</button>
          </div>
        </div>

        {/* RIGHT — card */}
        <div style={{
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.8)',
          borderRadius: 'clamp(18px,1.8vw,26px)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.2)',
          padding: 'clamp(22px,2.4vw,36px)',
          maxWidth: 520, width: '100%', justifySelf: 'end',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <Eyebrow>AI Visibility Score</Eyebrow>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#0A0A0A',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 300,
            }}>+</div>
          </div>

          {/* Score ring */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 8px' }}>
            <div style={{ position: 'relative', width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={ringSize/2} cy={ringSize/2} r={r}
                  stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} fill="none" />
                <circle cx={ringSize/2} cy={ringSize/2} r={r}
                  stroke={ringColor} strokeWidth={stroke} fill="none"
                  strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  fontFamily: '"Instrument Serif", serif',
                  fontSize: 88, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}>{Math.round(display)}</div>
                <div style={{
                  fontFamily: '"Geist Mono", monospace', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6, opacity: 0.6,
                }}>out of 100</div>
              </div>
            </div>
          </div>

          {/* Medal row */}
          <div style={{
            marginTop: 12, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <Medal tier={tier} size={88} />
            <div>
              <div style={{
                fontFamily: '"Instrument Serif", serif',
                fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1, letterSpacing: '-0.02em',
              }}>{result.placing}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.6)', lineHeight: 1.4, maxWidth: 220 }}>
                {tierBlurb}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FooterRail />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>('idle');
  const [email,    setEmail]    = useState('');
  const [result,   setResult]   = useState<BrandResult | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setAppState('loading');
    try {
      const [res] = await Promise.all([
        fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        }),
        new Promise(r => setTimeout(r, 5800)),
      ]);
      if (!res.ok) throw new Error();
      const data: BrandResult = await res.json();
      setResult(data);
      setAppState('result');
    } catch {
      setAppState('error');
    }
  };

  const handleReset = () => { setAppState('idle'); setEmail(''); setResult(null); };
  const handleLeaderboard = () => router.push(result ? `/leaderboard?you=${encodeURIComponent(result.domain)}` : '/leaderboard');

  if (appState === 'loading') return <Screen2 email={email} />;
  if (appState === 'result' && result) return <Screen3 result={result} onReset={handleReset} onLeaderboard={handleLeaderboard} />;
  if (appState === 'error') return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ECEAE6' }}>
      <div style={{ textAlign: 'center', fontFamily: '"Geist", system-ui, sans-serif' }}>
        <p style={{ color: 'rgba(0,0,0,0.6)', marginBottom: 16 }}>Something went wrong. Please try again.</p>
        <button onClick={handleReset} style={{
          padding: '12px 24px', borderRadius: 999, background: '#0A0A0A', color: '#fff',
          border: 'none', fontSize: 14, fontFamily: 'inherit',
        }}>Try again</button>
      </div>
    </div>
  );
  return <Screen1 email={email} setEmail={setEmail} onSubmit={handleSubmit} />;
}

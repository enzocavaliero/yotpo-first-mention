import { NextResponse } from 'next/server';
import { createClient } from '@vercel/edge-config';
import brandsData from '@/data/brands.json';

interface Brand {
  domain: string;
  brand: string;
  score: number;
  placing: string;
}

interface LeaderboardEntry extends Brand {
  checkedAt: string;
  email?: string;
}

/**
 * Normalize a bare domain string: strip www., trailing slashes/paths.
 * Input should already have http(s):// removed.
 */
function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .replace(/\?.*$/, '');
}

/**
 * Extract the domain part from a work email address.
 * "john.smith@mycompany.com.au" → "mycompany.com.au"
 */
function domainFromEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const atIdx = trimmed.lastIndexOf('@');
  if (atIdx < 1) return null;
  const domain = trimmed.slice(atIdx + 1).trim();
  return domain || null;
}

function domainToBrand(domain: string): string {
  const name  = domain.split('.')[0];
  const words = name.replace(/-/g, ' ').replace(/_/g, ' ').split(/\s+/);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const client = createClient(process.env.EDGE_CONFIG!);
  const data   = await client.get<LeaderboardEntry[]>('leaderboard');
  return data ?? [];
}

async function saveLeaderboard(entries: LeaderboardEntry[]): Promise<void> {
  const res = await fetch(
    `https://api.vercel.com/v1/edge-config/${process.env.EC_ID}/items?teamId=${process.env.TEAM_ID}`,
    {
      method:  'PATCH',
      headers: {
        Authorization:  `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ operation: 'upsert', key: 'leaderboard', value: entries }],
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Edge Config write failed: ${err}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const rawEmail = String(body.email);
    const emailDomain = domainFromEmail(rawEmail);

    if (!emailDomain) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const normalized = normalizeDomain(emailDomain);
    if (!normalized) {
      return NextResponse.json({ error: 'Could not extract domain from email' }, { status: 400 });
    }

    // Look up in static brand data.
    // Try exact match first, then progressively strip subdomains
    // e.g. pt.naos.com → naos.com so subdomain emails still resolve correctly.
    const brands = brandsData as Brand[];
    const domainCandidates = (d: string): string[] => {
      const parts = d.split('.');
      return parts.map((_, i) => parts.slice(i).join('.')).filter(c => c.includes('.'));
    };
    const found = domainCandidates(normalized)
      .map(candidate => brands.find(b => normalizeDomain(b.domain) === candidate))
      .find(Boolean);

    let result: Brand;
    if (found) {
      result = found;
    } else {
      // Unknown brand — assign a random silver score (40–59) matching the Silver tier
      const score = Math.floor(Math.random() * 20) + 40;
      result = {
        domain:  normalized,
        brand:   domainToBrand(normalized),
        score,
        placing: 'Silver',
      };
    }

    // Update leaderboard (upsert by domain)
    const entry: LeaderboardEntry = { ...result, email: rawEmail.trim().toLowerCase(), checkedAt: new Date().toISOString() };
    const leaderboard = await getLeaderboard();

    const existingIdx = leaderboard.findIndex(
      e => normalizeDomain(e.domain) === normalized
    );
    if (existingIdx >= 0) {
      leaderboard[existingIdx] = entry;
    } else {
      leaderboard.push(entry);
    }

    leaderboard.sort((a, b) => b.score - a.score);
    await saveLeaderboard(leaderboard);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Lookup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

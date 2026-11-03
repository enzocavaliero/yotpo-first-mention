import { NextResponse } from 'next/server';
import { createClient } from '@vercel/edge-config';

export async function GET() {
  try {
    const client = createClient(process.env.EDGE_CONFIG!);
    const leaderboard = (await client.get('leaderboard')) ?? [];
    return NextResponse.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json([]);
  }
}

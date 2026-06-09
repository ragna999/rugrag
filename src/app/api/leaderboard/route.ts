import { NextResponse } from 'next/server';
import { getLatestTokens, getTokensByCreator } from '@/lib/clanker';
import { analyzeCreator, CreatorAnalysis } from '@/lib/scorer';

export async function GET() {
  try {
    const tokens = await getLatestTokens(20);

    const deployerMap = new Map<string, typeof tokens>();
    for (const token of tokens) {
      const addr = token.msg_sender;
      if (!addr) continue;
      const existing = deployerMap.get(addr) || [];
      existing.push(token);
      deployerMap.set(addr, existing);
    }

    const analyses: (CreatorAnalysis & { tokenCount: number })[] = [];
    const entries = Array.from(deployerMap.entries()).slice(0, 10);

    for (const [wallet, creatorTokens] of entries) {
      try {
        const analysis = await analyzeCreator(creatorTokens, wallet);
        analyses.push({ ...analysis, tokenCount: creatorTokens.length });
      } catch {
        // skip
      }
    }

    analyses.sort((a, b) => b.rugScore - a.rugScore);

    return NextResponse.json({
      leaderboard: analyses.map(a => ({
        wallet: a.wallet,
        rugScore: a.rugScore,
        verdict: a.verdict,
        totalTokens: a.totalTokensDeployed,
        aliveTokens: a.aliveTokens,
        totalVolumeUsd: a.totalVolumeUsd,
        totalMarketCapUsd: a.totalMarketCapUsd,
        flags: a.flags.slice(0, 3),
        farcasterUser: a.farcasterUser,
      })),
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ leaderboard: [], error: 'Failed' }, { status: 500 });
  }
}

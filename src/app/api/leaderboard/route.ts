import { NextResponse } from 'next/server';
import { getTrendingTokens, getTokensByCreator } from '@/lib/clanker';
import { analyzeCreator, CreatorAnalysis } from '@/lib/scorer';

// GET /api/leaderboard
// Returns top Clanker token creators ranked by trust score
export async function GET() {
  try {
    // Get top tokens by volume to find active creators
    const topTokens = await getTrendingTokens(50);
    
    // Collect unique deployer addresses
    const deployerMap = new Map<string, typeof topTokens>();
    for (const token of topTokens) {
      const addr = token.msg_sender;
      if (!addr) continue;
      const existing = deployerMap.get(addr) || [];
      existing.push(token);
      deployerMap.set(addr, existing);
    }
    
    // Analyze each unique creator (limit to top 15 for performance)
    const analyses: (CreatorAnalysis & { tokenCount: number })[] = [];
    const entries = Array.from(deployerMap.entries()).slice(0, 15);
    
    for (const [wallet, tokens] of entries) {
      try {
        // Use the tokens we already have for quick analysis
        const analysis = await analyzeCreator(tokens, wallet);
        analyses.push({ ...analysis, tokenCount: tokens.length });
      } catch {
        // Skip failed analyses
      }
    }
    
    // Sort by rug score (highest first)
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
        flags: a.flags.slice(0, 3), // top 3 flags only
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
    return NextResponse.json(
      { error: 'Failed to generate leaderboard' },
      { status: 500 }
    );
  }
}

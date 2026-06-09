import { NextRequest, NextResponse } from 'next/server';
import { getTokensByCreator } from '@/lib/clanker';
import { analyzeCreator } from '@/lib/scorer';

// GET /api/creator/{wallet}
// Analyzes a token creator's history and returns a trust score
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    
    if (!wallet || wallet.length < 3) {
      return NextResponse.json(
        { error: 'Invalid wallet address or query' },
        { status: 400 }
      );
    }

    // Fetch all tokens by this creator
    const searchResult = await getTokensByCreator(wallet, 50, 0);
    const tokens = searchResult.tokens || [];
    
    // Run analysis
    const analysis = await analyzeCreator(
      tokens,
      searchResult.searchedAddress || wallet,
      searchResult.user ? {
        username: searchResult.user.username,
        displayName: searchResult.user.displayName,
        pfpUrl: searchResult.user.pfpUrl,
      } : undefined
    );

    return NextResponse.json(analysis, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Creator analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze creator' },
      { status: 500 }
    );
  }
}

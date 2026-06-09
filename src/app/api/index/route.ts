import { NextRequest, NextResponse } from 'next/server';
import { getRecentTokens, getRecentClankerTokens, getRecentBankrTokens, getTrendingTokens } from '@/lib/clanker';
import { calculateRugScore } from '@/lib/scorer';

// GET /api/index
// Returns live token index data for the homepage
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all | clanker | bankr
    const sort = searchParams.get('sort') || 'recent'; // recent | trending
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 50);

    let tokens;
    if (sort === 'trending') {
      tokens = await getTrendingTokens(limit);
    } else if (filter === 'bankr') {
      tokens = await getRecentBankrTokens(limit);
    } else if (filter === 'clanker') {
      tokens = await getRecentClankerTokens(limit);
    } else {
      tokens = await getRecentTokens(limit);
    }

    // Enrich each token with creator score
    const enriched = tokens.map(token => {
      const market = token.related?.market;
      const launchpad = getLaunchpad(token);
      
      // Quick creator score (single token = limited analysis)
      const { score, flags } = calculateRugScore([token]);
      
      return {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contract_address,
        img: token.img_url,
        launchpad,
        deployedAt: token.created_at,
        deployer: token.msg_sender,
        pair: token.pair,
        market: {
          mcap: market?.marketCap || 0,
          price: market?.price || 0,
          priceChange24h: market?.priceChange24h || 0,
          priceChange1h: market?.priceChange1h || 0,
          volume24h: market?.volume24h || 0,
          txCount24h: market?.txCount24h || 0,
          liquidityUsd: market?.liquidityUsd || 0,
        },
        creatorScore: score,
        flags: flags.slice(0, 2),
      };
    });

    return NextResponse.json({
      tokens: enriched,
      filter,
      sort,
      count: enriched.length,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Index API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch index data' },
      { status: 500 }
    );
  }
}

function getLaunchpad(token: { social_interface?: string; type?: string }): string {
  const iface = token.social_interface?.toLowerCase() || '';
  if (iface === 'bankr' || iface === 'clawdbot') return 'Bankr';
  if (token.type?.includes('v4')) return 'Clanker';
  if (token.type?.includes('v3')) return 'Clanker';
  return 'Clanker';
}

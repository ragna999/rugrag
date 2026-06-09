import { NextRequest, NextResponse } from 'next/server';
import { getActiveTokens, getRecentActiveTokens, getTrendingTokens, normalizeMarket } from '@/lib/clanker';
import { calculateRugScore } from '@/lib/scorer';

function getLaunchpad(token: { social_interface?: string }): string {
  const iface = token.social_interface?.toLowerCase() || '';
  if (iface === 'bankr' || iface === 'clawdbot') return 'Bankr';
  return 'Clanker';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const sort = searchParams.get('sort') || 'trending';
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 50);

    let tokens;
    if (sort === 'trending') {
      tokens = await getTrendingTokens(limit);
    } else {
      tokens = await getRecentActiveTokens(limit);
    }

    if (filter === 'bankr') {
      tokens = tokens.filter(t => {
        const iface = t.social_interface?.toLowerCase() || '';
        return iface === 'bankr' || iface === 'clawdbot';
      });
    }

    const enriched = tokens.map(token => {
      const market = normalizeMarket(token);
      const launchpad = getLaunchpad(token);
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
        market: market || {
          mcap: 0, price: 0, priceChange24h: 0, priceChange1h: 0,
          volume24h: 0, txCount24h: 0, liquidityUsd: 0,
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
    console.error('Index error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

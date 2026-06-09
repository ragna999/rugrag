import { NextRequest, NextResponse } from 'next/server';
import { getActiveTokens, getRecentActiveTokens, getTrendingTokens } from '@/lib/clanker';
import { calculateRugScore } from '@/lib/scorer';

function getLaunchpad(token: { social_interface?: string; type?: string }): string {
  const iface = token.social_interface?.toLowerCase() || '';
  if (iface === 'bankr' || iface === 'clawdbot') return 'Bankr';
  return 'Clanker';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const sort = searchParams.get('sort') || 'recent';
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 50);

    let tokens;
    if (sort === 'trending') {
      tokens = await getTrendingTokens(limit);
    } else if (filter === 'bankr') {
      // Bankr tokens = all active (we'll tag them)
      tokens = await getActiveTokens(limit);
    } else if (filter === 'clanker') {
      tokens = await getActiveTokens(limit);
    } else {
      tokens = sort === 'recent'
        ? await getRecentActiveTokens(limit)
        : await getActiveTokens(limit);
    }

    // Filter by launchpad if needed
    if (filter === 'bankr') {
      tokens = tokens.filter(t => {
        const iface = t.social_interface?.toLowerCase() || '';
        return iface === 'bankr' || iface === 'clawdbot';
      });
    }

    const enriched = tokens.map(token => {
      const market = token.related?.market;
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
    console.error('Index error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

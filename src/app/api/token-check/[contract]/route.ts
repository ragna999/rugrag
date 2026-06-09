import { NextRequest, NextResponse } from 'next/server';
import { getBaseTrendingPools, normalizePool, getBaseNewPools } from '@/lib/geckoterminal';
import { getTokenByAddress, getTokensByCreator } from '@/lib/clanker';
import { analyzeCreator } from '@/lib/scorer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contract: string }> }
) {
  try {
    const { contract } = await params;
    if (!contract || !contract.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const addrLower = contract.toLowerCase();

    // Try GeckoTerminal first (trending + new pools)
    const [trending, newPools] = await Promise.all([
      getBaseTrendingPools(1),
      getBaseNewPools(1),
    ]);
    const allPools = [...trending, ...newPools];

    // Find the pool where base token matches
    const pool = allPools.find(p => {
      const tokenId = p.relationships?.base_token?.data?.id || '';
      const tokenAddr = tokenId.replace('base_', '').toLowerCase();
      return tokenAddr === addrLower || p.attributes?.address?.toLowerCase() === addrLower;
    });

    let token;
    if (pool) {
      token = normalizePool(pool);
    } else {
      // Fallback: try Clanker API
      try {
        const clankerToken = await getTokenByAddress(contract);
        if (clankerToken) {
          const m = clankerToken.related?.market;
          token = {
            name: clankerToken.name,
            symbol: clankerToken.symbol,
            contractAddress: clankerToken.contract_address,
            img: clankerToken.img_url || '',
            poolAddress: clankerToken.pool_address || '',
            launchpad: 'Clanker',
            deployedAt: clankerToken.created_at,
            pair: clankerToken.pair || 'WETH',
            market: {
              mcap: m?.marketCap || 0,
              price: m?.priceUsd || 0,
              priceChange24h: m?.priceChangePercent24h || 0,
              priceChange1h: 0,
              volume24h: m?.volume24h || 0,
              liquidityUsd: m?.liquidityUsd || 0,
            },
            txns: { buys24h: 0, sells24h: 0 },
            sentiment: 'Unknown',
            sentimentType: 'neutral',
            buyPressure: 50,
            score: 50,
            gtUrl: '',
          };
        }
      } catch {
        // ignore
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Try to find creator info from Clanker
    let creator = null;
    try {
      const clankerToken = await getTokenByAddress(contract);
      if (clankerToken?.msg_sender) {
        const searchResult = await getTokensByCreator(clankerToken.msg_sender, 20);
        creator = await analyzeCreator(
          searchResult.tokens || [],
          clankerToken.msg_sender,
          searchResult.user ? {
            username: searchResult.user.username,
            displayName: searchResult.user.displayName,
            pfpUrl: searchResult.user.pfpUrl,
          } : undefined
        );
      }
    } catch {
      // ignore — creator info is optional
    }

    return NextResponse.json({
      token: {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contractAddress,
        deployedAt: token.deployedAt,
        market: token.market,
        pair: token.pair,
        img: token.img,
        poolAddress: token.poolAddress,
        gtUrl: token.gtUrl,
      },
      creator,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

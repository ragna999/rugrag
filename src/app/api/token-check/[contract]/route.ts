import { NextRequest, NextResponse } from 'next/server';
import { getBaseTrendingPools, getBaseNewPools, normalizePool, searchPools } from '@/lib/geckoterminal';
import { getTokenByAddress, getTokensByCreator } from '@/lib/clanker';
import { analyzeCreator } from '@/lib/scorer';
import { getWakeAnalysis } from '@/lib/wake';

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

    const [trending, newPools, wakeResult, searchResults] = await Promise.all([
      getBaseTrendingPools(1),
      getBaseNewPools(1),
      getWakeAnalysis(contract),
      searchPools(contract),
    ]);

    const allPools = [...trending, ...newPools, ...searchResults];
    const pool = allPools.find(p => {
      const tokenId = p.relationships?.base_token?.data?.id || '';
      const tokenAddr = tokenId.replace('base_', '').toLowerCase();
      return tokenAddr === addrLower || p.attributes?.address?.toLowerCase() === addrLower;
    });

    let token = null;
    if (pool) {
      token = normalizePool(pool);
    } else {
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
      } catch { /* ignore */ }
    }

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Creator info
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
    } catch { /* ignore */ }

    // WAKE — only return if we have valid data with score
    let wake = null;
    if (wakeResult && typeof wakeResult.score === 'number') {
      wake = {
        score: wakeResult.score,
        tier: wakeResult.tier || 'unknown',
        tags: wakeResult.tags || [],
        security: {
          level: wakeResult.security_advisory?.level || 'unknown',
          reasons: wakeResult.security_advisory?.reasons || [],
        },
        breakdown: wakeResult.breakdown || {
          market_signals: 0,
          social_signals: 0,
          contract_safety: 0,
          deployer_quality: 0,
          liquidity_health: 0,
        },
        narrative: wakeResult.narrative,
        launchProtocol: wakeResult.launch_protocol,
      };
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
      wake,
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

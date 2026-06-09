import { NextRequest, NextResponse } from 'next/server';
import { getDexTrending, getBoostedBaseTokens, analyzeSentiment, calcScore } from '@/lib/smartmoney';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'trending';

    // Get tokens from DexScreener (real market data)
    const pairs = sort === 'trending'
      ? await getDexTrending()
      : await getBoostedBaseTokens();

    const tokens = pairs.map(pair => {
      const sentiment = analyzeSentiment(pair);
      const score = calcScore(pair);

      return {
        name: pair.baseToken?.name || 'Unknown',
        symbol: pair.baseToken?.symbol || '?',
        contractAddress: pair.baseToken?.address || '',
        img: pair.info?.imageUrl,
        launchpad: 'Clanker', // default
        deployedAt: pair.pairCreatedAt ? new Date(pair.pairCreatedAt * 1000).toISOString() : new Date().toISOString(),
        pair: pair.quoteToken?.symbol || 'WETH',
        market: {
          mcap: pair.marketCap || pair.fdv || 0,
          price: parseFloat(pair.priceUsd || '0'),
          priceChange24h: pair.priceChange?.h24 || 0,
          priceChange1h: pair.priceChange?.h1 || 0,
          volume24h: pair.volume?.h24 || 0,
          liquidityUsd: pair.liquidity?.usd || 0,
        },
        txns: {
          buys24h: pair.txns?.h24?.buys || 0,
          sells24h: pair.txns?.h24?.sells || 0,
        },
        sentiment: sentiment.label,
        sentimentType: sentiment.type,
        buyPressure: sentiment.pressure,
        creatorScore: score,
        dexUrl: pair.url,
      };
    })
    .filter(t => t.market.volume24h > 0) // only tokens with real volume
    .sort((a, b) => b.market.volume24h - a.market.volume24h);

    return NextResponse.json({
      tokens,
      count: tokens.length,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Index error:', error);
    return NextResponse.json({ tokens: [], error: 'Failed' }, { status: 500 });
  }
}

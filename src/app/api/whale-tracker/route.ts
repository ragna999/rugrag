import { NextResponse } from 'next/server';
import { getTrendingTokens } from '@/lib/geckoterminal';

export async function GET() {
  try {
    const tokens = await getTrendingTokens();

    const activity = tokens.map(t => ({
      tokenSymbol: t.symbol,
      tokenName: t.name,
      tokenAddress: t.contractAddress,
      volume24h: t.market.volume24h,
      buys24h: t.txns.buys24h,
      sells24h: t.txns.sells24h,
      buyPressure: t.buyPressure,
      sentiment: t.sentiment,
      sentimentType: t.sentimentType,
      liquidity: t.market.liquidityUsd,
      priceChange24h: t.market.priceChange24h,
      price: t.market.price > 0 ? `$${t.market.price}` : '-',
      dexScreenerUrl: t.gtUrl,
    }));

    return NextResponse.json({
      activity,
      summary: {
        totalVolume: activity.reduce((s, a) => s + a.volume24h, 0),
        totalBuys: activity.reduce((s, a) => s + a.buys24h, 0),
        totalSells: activity.reduce((s, a) => s + a.sells24h, 0),
      },
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Whale tracker error:', error);
    return NextResponse.json({ activity: [], error: 'Failed' }, { status: 500 });
  }
}

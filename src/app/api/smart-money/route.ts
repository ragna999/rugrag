import { NextResponse } from 'next/server';
import { getTrendingTokens } from '@/lib/geckoterminal';

export async function GET() {
  try {
    const tokens = await getTrendingTokens();

    const signals = tokens.map(t => ({
      token: { name: t.name, symbol: t.symbol, address: t.contractAddress },
      price: t.market.price > 0 ? `$${t.market.price}` : '-',
      priceChange24h: t.market.priceChange24h,
      volume24h: t.market.volume24h,
      liquidity: t.market.liquidityUsd,
      marketCap: t.market.mcap,
      buys24h: t.txns.buys24h,
      sells24h: t.txns.sells24h,
      sentiment: t.sentiment,
      sentimentType: t.sentimentType,
      buyPressure: t.buyPressure,
      smartMoneyScore: t.score,
      dexScreenerUrl: t.gtUrl,
    }));

    return NextResponse.json({
      signals,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Smart money error:', error);
    return NextResponse.json({ signals: [], error: 'Failed' }, { status: 500 });
  }
}

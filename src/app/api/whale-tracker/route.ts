import { NextResponse } from 'next/server';
import { getDexTrending, analyzeSentiment } from '@/lib/smartmoney';

export async function GET() {
  try {
    const pairs = await getDexTrending();

    const activity = pairs.map(pair => {
      const sentiment = analyzeSentiment(pair);
      const txns = pair.txns?.h24;

      return {
        tokenSymbol: pair.baseToken?.symbol || '?',
        tokenName: pair.baseToken?.name || 'Unknown',
        tokenAddress: pair.baseToken?.address || '',
        volume24h: pair.volume?.h24 || 0,
        buys24h: txns?.buys || 0,
        sells24h: txns?.sells || 0,
        buyPressure: sentiment.pressure,
        sentiment: sentiment.label,
        sentimentType: sentiment.type,
        liquidity: pair.liquidity?.usd || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        price: pair.priceUsd || '0',
        dexScreenerUrl: pair.url || '',
      };
    })
    .filter(a => a.volume24h > 0)
    .sort((a, b) => b.volume24h - a.volume24h);

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

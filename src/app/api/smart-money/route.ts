import { NextResponse } from 'next/server';
import { getDexTrending, analyzeSentiment, calcScore } from '@/lib/smartmoney';

export async function GET() {
  try {
    const pairs = await getDexTrending();

    const signals = pairs.map(pair => {
      const sentiment = analyzeSentiment(pair);
      const score = calcScore(pair);
      const txns = pair.txns?.h24;

      return {
        token: {
          name: pair.baseToken?.name || 'Unknown',
          symbol: pair.baseToken?.symbol || '?',
          address: pair.baseToken?.address || '',
        },
        price: pair.priceUsd,
        priceChange24h: pair.priceChange?.h24 || 0,
        volume24h: pair.volume?.h24 || 0,
        liquidity: pair.liquidity?.usd || 0,
        marketCap: pair.marketCap || pair.fdv || 0,
        buys24h: txns?.buys || 0,
        sells24h: txns?.sells || 0,
        sentiment: sentiment.label,
        sentimentType: sentiment.type,
        buyPressure: sentiment.pressure,
        smartMoneyScore: score,
        dexScreenerUrl: pair.url,
      };
    })
    .filter(s => s.volume24h > 0)
    .sort((a, b) => b.smartMoneyScore - a.smartMoneyScore);

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

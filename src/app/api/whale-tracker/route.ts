import { NextResponse } from 'next/server';
import { getTrendingTokens } from '@/lib/clanker';
import { getTokenPairs, analyzeTradeSentiment } from '@/lib/smartmoney';

interface WhaleActivity {
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  buyPressure: number;
  sentiment: string;
  sentimentType: string;
  liquidity: number;
  priceChange24h: number;
  price: string;
  dexScreenerUrl: string;
}

// GET /api/whale-tracker
// Shows tokens with heavy trading activity (whale-level volume)
export async function GET() {
  try {
    const tokens = await getTrendingTokens(20);
    const addresses = tokens.map(t => t.contract_address).filter(Boolean);
    const pairs = await getTokenPairs(addresses);

    const activity: WhaleActivity[] = pairs
      .map(pair => {
        const sentiment = analyzeTradeSentiment(pair);
        const txns = pair.txns?.h24;
        const vol = pair.volume?.h24 || 0;
        const liq = pair.liquidity?.usd || 0;

        return {
          tokenSymbol: pair.baseToken?.symbol || '?',
          tokenName: pair.baseToken?.name || 'Unknown',
          tokenAddress: pair.baseToken?.address || '',
          volume24h: vol,
          buys24h: txns?.buys || 0,
          sells24h: txns?.sells || 0,
          buyPressure: sentiment.buyPressure,
          sentiment: sentiment.signal,
          sentimentType: sentiment.sentiment,
          liquidity: liq,
          priceChange24h: pair.priceChange?.h24 || 0,
          price: pair.priceUsd || '0',
          dexScreenerUrl: pair.url || '',
        };
      })
      .filter(a => a.volume24h > 500) // Only tokens with meaningful volume
      .sort((a, b) => b.volume24h - a.volume24h);

    return NextResponse.json({
      activity,
      summary: {
        totalVolume: activity.reduce((s, a) => s + a.volume24h, 0),
        totalBuys: activity.reduce((s, a) => s + a.buys24h, 0),
        totalSells: activity.reduce((s, a) => s + a.sells24h, 0),
        bullishTokens: activity.filter(a => a.sentimentType === 'bullish').length,
      },
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Whale tracker error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

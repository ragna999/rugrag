import { NextResponse } from 'next/server';
import { getTrendingTokens } from '@/lib/clanker';
import { getTokenPairs, analyzeTradeSentiment, calculateTokenScore, SMART_MONEY_WALLETS } from '@/lib/smartmoney';

export async function GET() {
  try {
    // Get tokens that ACTUALLY have volume
    const trendingTokens = await getTrendingTokens(20);
    const tokenAddresses = trendingTokens.map(t => t.contract_address).filter(Boolean);

    // Fetch DexScreener data for real trading data
    const pairs = await getTokenPairs(tokenAddresses);

    const signals = pairs
      .map(pair => {
        const sentiment = analyzeTradeSentiment(pair);
        const score = calculateTokenScore(pair);
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
          marketCap: pair.marketCap || 0,
          buys24h: txns?.buys || 0,
          sells24h: txns?.sells || 0,
          sentiment: sentiment.signal,
          sentimentType: sentiment.sentiment,
          buyPressure: sentiment.buyPressure,
          smartMoneyScore: score,
          dexScreenerUrl: pair.url,
        };
      })
      .filter(s => s.volume24h > 100) // Only show tokens with real volume
      .sort((a, b) => b.smartMoneyScore - a.smartMoneyScore);

    return NextResponse.json({
      signals,
      trackedWallets: SMART_MONEY_WALLETS.length,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Smart money error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// Smart Money tracking layer
// Combines DexScreener data + known wallet tracking

const DEXSCREENER_API = 'https://api.dexscreener.com';

export interface TokenPair {
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd: string;
  priceChange: { h24: number; h1: number; h6: number };
  volume: { h24: number; h6: number; h1: number };
  txns: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
  };
  liquidity: { usd: number; base: number; quote: number };
  marketCap: number;
  pairCreatedAt: number;
  dexId: string;
  url: string;
  chainId?: string;
}

export interface SmartMoneyWallet {
  address: string;
  label: string;
  source: 'bankr' | 'whale' | 'known-trader';
  tags: string[];
}

// Known smart money wallets in the Base/Bankr ecosystem
export const SMART_MONEY_WALLETS: SmartMoneyWallet[] = [
  {
    address: '0x2112b8456AC07c15fA31ddf3Bf713E77716fF3F9',
    label: 'CLAWD Deployer',
    source: 'bankr',
    tags: ['bankr', 'deployer'],
  },
  {
    address: '0x1e660A9A1f1F08AFEF9c03c96D66260122464CF2',
    label: 'CLAWDXCLANKER Deployer',
    source: 'bankr',
    tags: ['bankr', 'deployer'],
  },
];

// Fetch token pairs from DexScreener
export async function getTokenPairs(tokenAddresses: string[]): Promise<TokenPair[]> {
  if (tokenAddresses.length === 0) return [];
  const batch = tokenAddresses.slice(0, 30);
  const res = await fetch(`${DEXSCREENER_API}/latest/dex/tokens/${batch.join(',')}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data?.pairs?.filter((p: TokenPair) => p.dexId === 'uniswap') || [];
}

// Search DexScreener for tokens
export async function searchTokens(query: string): Promise<TokenPair[]> {
  const res = await fetch(`${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data?.pairs?.filter((p: TokenPair) => p.chainId === 'base') || [];
}

// Get pair data by pair address
export async function getPairByAddress(pairAddress: string): Promise<TokenPair | null> {
  const res = await fetch(`${DEXSCREENER_API}/latest/dex/pairs/base/${pairAddress}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.pairs?.[0] || null;
}

// Analyze buy/sell ratio to detect smart money sentiment
export function analyzeTradeSentiment(pair: TokenPair): {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  buyPressure: number;
  signal: string;
} {
  const h1 = pair.txns?.h1;
  if (!h1) return { sentiment: 'neutral', buyPressure: 0, signal: 'No data' };

  const total = h1.buys + h1.sells;
  if (total === 0) return { sentiment: 'neutral', buyPressure: 0, signal: 'No trades' };

  const buyRatio = h1.buys / total;
  const buyPressure = Math.round(buyRatio * 100);

  if (buyRatio >= 0.7) return { sentiment: 'bullish', buyPressure, signal: 'Heavy buying' };
  if (buyRatio >= 0.55) return { sentiment: 'bullish', buyPressure, signal: 'More buyers' };
  if (buyRatio <= 0.3) return { sentiment: 'bearish', buyPressure, signal: 'Heavy selling' };
  if (buyRatio <= 0.45) return { sentiment: 'bearish', buyPressure, signal: 'More sellers' };
  return { sentiment: 'neutral', buyPressure, signal: 'Balanced' };
}

// Calculate "smart money score" based on token metrics
export function calculateTokenScore(pair: TokenPair): number {
  let score = 50;

  const vol24h = pair.volume?.h24 || 0;
  const liq = pair.liquidity?.usd || 0;
  const txns = pair.txns?.h24;
  const priceChange = pair.priceChange?.h24 || 0;

  // Volume/Liquidity ratio (healthy = 0.1-2.0)
  const vlRatio = liq > 0 ? vol24h / liq : 0;
  if (vlRatio > 0.1 && vlRatio < 2) score += 10;
  if (vlRatio > 2) score -= 10;

  // Buy/sell ratio
  if (txns) {
    const total = txns.buys + txns.sells;
    if (total > 0) {
      const buyRatio = txns.buys / total;
      if (buyRatio > 0.6) score += 15;
      if (buyRatio < 0.4) score -= 10;
    }
    if (total > 100) score += 10;
    if (total > 500) score += 5;
  }

  // Price momentum
  if (priceChange > 10) score += 10;
  if (priceChange > 50) score += 5;
  if (priceChange < -30) score -= 15;

  // Liquidity health
  if (liq > 100000) score += 10;
  if (liq > 500000) score += 5;
  if (liq < 5000) score -= 20;

  // Market cap reasonableness
  const mcap = pair.marketCap || 0;
  if (mcap > 10000 && mcap < 10000000) score += 5;

  return Math.max(0, Math.min(100, score));
}

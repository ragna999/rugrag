// DexScreener — primary data source for market data
// Clanker — only for token metadata and creator info

const DEX_API = 'https://api.dexscreener.com';

export interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceNative: string;
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
  fdv: number;
  pairCreatedAt: number;
  url: string;
  info?: { imageUrl?: string; websites?: { url: string }[]; socials?: { type: string; url: string }[] };
  boosts?: { active: number };
}

// Get token profiles (recently updated/boosted tokens on Base)
export async function getBoostedBaseTokens(): Promise<DexPair[]> {
  try {
    // Get latest token profiles
    const res = await fetch(`${DEX_API}/token-profiles/latest/v1`);
    if (!res.ok) return [];
    const profiles = await res.json();

    // Filter Base chain
    const baseAddresses = profiles
      .filter((p: { chainId: string }) => p.chainId === 'base')
      .map((p: { tokenAddress: string }) => p.tokenAddress)
      .slice(0, 15);

    if (baseAddresses.length === 0) return [];

    // Fetch pair data for these tokens
    return getPairsByTokens(baseAddresses);
  } catch {
    return [];
  }
}

// Get pairs for specific token addresses
export async function getPairsByTokens(addresses: string[]): Promise<DexPair[]> {
  if (addresses.length === 0) return [];
  const batch = addresses.slice(0, 30);
  try {
    const res = await fetch(`${DEX_API}/latest/dex/tokens/${batch.join(',')}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.pairs || [])
      .filter((p: DexPair) => p.chainId === 'base' && p.dexId === 'uniswap')
      .filter((p: DexPair) => parseFloat(p.priceUsd || '0') > 0);
  } catch {
    return [];
  }
}

// Search for tokens on Base
export async function searchDexTokens(query: string): Promise<DexPair[]> {
  try {
    const res = await fetch(`${DEX_API}/latest/dex/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.pairs || [])
      .filter((p: DexPair) => p.chainId === 'base');
  } catch {
    return [];
  }
}

// Get pair by address
export async function getDexPair(pairAddress: string): Promise<DexPair | null> {
  try {
    const res = await fetch(`${DEX_API}/latest/dex/pairs/base/${pairAddress}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.pairs?.[0] || null;
  } catch {
    return null;
  }
}

// Get trending tokens on Base from DexScreener
export async function getDexTrending(): Promise<DexPair[]> {
  try {
    const res = await fetch(`${DEX_API}/token-profiles/latest/v1`);
    if (!res.ok) return [];
    const profiles = await res.json();

    const baseAddresses = profiles
      .filter((p: { chainId: string }) => p.chainId === 'base')
      .map((p: { tokenAddress: string }) => p.tokenAddress)
      .slice(0, 20);

    if (baseAddresses.length === 0) return [];

    const pairs = await getPairsByTokens(baseAddresses);

    // Sort by volume (highest first)
    return pairs.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
  } catch {
    return [];
  }
}

// Analyze sentiment from buy/sell ratio
export function analyzeSentiment(pair: DexPair) {
  const h1 = pair.txns?.h1;
  if (!h1) return { type: 'neutral', pressure: 50, label: 'No data' };

  const total = h1.buys + h1.sells;
  if (total === 0) return { type: 'neutral', pressure: 50, label: 'No trades' };

  const ratio = h1.buys / total;
  const pressure = Math.round(ratio * 100);

  if (ratio >= 0.7) return { type: 'bullish', pressure, label: 'Heavy buying' };
  if (ratio >= 0.55) return { type: 'bullish', pressure, label: 'More buyers' };
  if (ratio <= 0.3) return { type: 'bearish', pressure, label: 'Heavy selling' };
  if (ratio <= 0.45) return { type: 'bearish', pressure, label: 'More sellers' };
  return { type: 'neutral', pressure, label: 'Balanced' };
}

// Calculate token quality score
export function calcScore(pair: DexPair): number {
  let score = 50;
  const vol = pair.volume?.h24 || 0;
  const liq = pair.liquidity?.usd || 0;
  const txns = pair.txns?.h24;
  const change = pair.priceChange?.h24 || 0;

  // Volume/Liquidity ratio
  if (liq > 0) {
    const ratio = vol / liq;
    if (ratio > 0.1 && ratio < 2) score += 10;
    if (ratio > 2) score -= 10;
  }

  // Buy/sell
  if (txns) {
    const total = txns.buys + txns.sells;
    if (total > 0) {
      const buyR = txns.buys / total;
      if (buyR > 0.6) score += 15;
      if (buyR < 0.4) score -= 10;
    }
    if (total > 50) score += 10;
  }

  // Price momentum
  if (change > 10) score += 10;
  if (change > 50) score += 5;
  if (change < -30) score -= 15;

  // Liquidity health
  if (liq > 50000) score += 10;
  if (liq > 200000) score += 5;
  if (liq < 5000) score -= 20;

  return Math.max(0, Math.min(100, score));
}

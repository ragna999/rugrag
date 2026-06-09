// GeckoTerminal API — primary data source for Base token market data
// Free, no API key, real USD values

const GT_API = 'https://api.geckoterminal.com/api/v2';

export interface GTPool {
  id: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string;
    quote_token_price_usd: string;
    base_token_price_native_token: string;
    volume_usd: { h24: string; h6: string; h1: string };
    price_change_percentage: { h24: string; h6: string; h1: string };
    txns_count: { h24: { buys: number; sells: number }; h6: { buys: number; sells: number }; h1: { buys: number; sells: number } };
    reserve_in_usd: string;
    market_cap_usd: string;
    fdv_usd: string;
    pool_created_at: string;
  };
  relationships: {
    base_token: { data: { id: string; type: string } };
    dex: { data: { id: string; type: string } };
  };
}

export interface GTToken {
  id: string;
  attributes: {
    name: string;
    symbol: string;
    address: string;
    image_url: string;
    coingecko_coin_id: string;
  };
}

export interface NormalizedToken {
  name: string;
  symbol: string;
  contractAddress: string;
  img: string;
  poolAddress: string;
  launchpad: string;
  deployedAt: string;
  pair: string;
  market: {
    mcap: number;
    price: number;
    priceChange24h: number;
    priceChange1h: number;
    volume24h: number;
    liquidityUsd: number;
  };
  txns: { buys24h: number; sells24h: number };
  sentiment: string;
  sentimentType: string;
  buyPressure: number;
  score: number;
  gtUrl: string;
}

async function fetchGT(path: string) {
  const res = await fetch(`${GT_API}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GeckoTerminal: ${res.status}`);
  return res.json();
}

// Get trending pools on Base
export async function getBaseTrendingPools(page = 1): Promise<GTPool[]> {
  const data = await fetchGT(`/networks/base/trending_pools?page=${page}`);
  return data?.data || [];
}

// Get new pools on Base
export async function getBaseNewPools(page = 1): Promise<GTPool[]> {
  const data = await fetchGT(`/networks/base/new_pools?page=${page}`);
  return data?.data || [];
}

// Get top pools on Base by volume
export async function getBaseTopPools(page = 1): Promise<GTPool[]> {
  const data = await fetchGT(`/networks/base/pools?page=${page}&sort=h24_volume_usd_desc`);
  return data?.data || [];
}

// Search pools
export async function searchPools(query: string): Promise<GTPool[]> {
  const data = await fetchGT(`/search/pools?query=${encodeURIComponent(query)}&network=base`);
  return data?.data || [];
}

// Normalize a GeckoTerminal pool into our standard format
export function normalizePool(pool: GTPool): NormalizedToken {
  const attr = pool.attributes;
  const nameParts = attr.name.split(' / ');
  const baseName = nameParts[0]?.trim() || 'Unknown';
  const quoteName = nameParts[1]?.trim() || 'WETH';

  // Extract token address from pool relationship
  const tokenId = pool.relationships?.base_token?.data?.id || '';
  const tokenAddress = tokenId.replace('base_', '');

  const price = parseFloat(attr.base_token_price_usd || '0');
  const vol24h = parseFloat(attr.volume_usd?.h24 || '0');
  const liq = parseFloat(attr.reserve_in_usd || '0');
  const mcap = parseFloat(attr.market_cap_usd || attr.fdv_usd || '0');
  const change24h = parseFloat(attr.price_change_percentage?.h24 || '0');
  const change1h = parseFloat(attr.price_change_percentage?.h1 || '0');

  const buys = attr.txns_count?.h24?.buys || 0;
  const sells = attr.txns_count?.h24?.sells || 0;
  const total = buys + sells;
  const buyPressure = total > 0 ? Math.round((buys / total) * 100) : 50;

  let sentimentType = 'neutral';
  let sentiment = 'Balanced';
  if (total > 0) {
    const ratio = buys / total;
    if (ratio >= 0.65) { sentimentType = 'bullish'; sentiment = 'Heavy buying'; }
    else if (ratio >= 0.55) { sentimentType = 'bullish'; sentiment = 'More buyers'; }
    else if (ratio <= 0.35) { sentimentType = 'bearish'; sentiment = 'Heavy selling'; }
    else if (ratio <= 0.45) { sentimentType = 'bearish'; sentiment = 'More sellers'; }
  }

  // Quality score
  let score = 50;
  if (liq > 50000) score += 10;
  if (liq > 200000) score += 5;
  if (liq < 5000) score -= 20;
  if (vol24h > 1000) score += 5;
  if (vol24h > 10000) score += 5;
  if (total > 50) score += 5;
  if (total > 200) score += 5;
  if (buyPressure > 60) score += 10;
  if (buyPressure < 40) score -= 10;
  if (change24h > 10) score += 5;
  if (change24h < -30) score -= 15;
  if (liq > 0) {
    const vlRatio = vol24h / liq;
    if (vlRatio > 0.1 && vlRatio < 2) score += 5;
    if (vlRatio > 3) score -= 10;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    name: baseName,
    symbol: baseName.split(' ')[0], // first word as symbol
    contractAddress: tokenAddress,
    img: '',
    poolAddress: attr.address,
    launchpad: 'Base',
    deployedAt: attr.pool_created_at || new Date().toISOString(),
    pair: quoteName,
    market: { mcap, price, priceChange24h: change24h, priceChange1h: change1h, volume24h: vol24h, liquidityUsd: liq },
    txns: { buys24h: buys, sells24h: sells },
    sentiment,
    sentimentType,
    buyPressure,
    score,
    gtUrl: `https://www.geckoterminal.com/base/pools/${attr.address}`,
  };
}

// Get trending tokens (normalized)
export async function getTrendingTokens(): Promise<NormalizedToken[]> {
  const pools = await getBaseTrendingPools(1);
  return pools
    .map(normalizePool)
    .filter(t => t.market.volume24h > 100)
    .sort((a, b) => b.market.volume24h - a.market.volume24h);
}

// Get new tokens (normalized)
export async function getNewTokens(): Promise<NormalizedToken[]> {
  const pools = await getBaseNewPools(1);
  return pools
    .map(normalizePool)
    .filter(t => t.market.volume24h > 0)
    .sort((a, b) => b.market.volume24h - a.market.volume24h);
}

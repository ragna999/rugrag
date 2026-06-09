// Clanker API integration layer

const CLANKER_API = 'https://www.clanker.world/api';

export interface ClankerToken {
  id: number;
  created_at: string;
  contract_address: string;
  name: string;
  symbol: string;
  description?: string;
  img_url?: string;
  pool_address?: string;
  type: string;
  pair: string;
  chain_id: number;
  msg_sender?: string;
  social_interface?: string;
  related?: {
    market?: {
      marketCap?: number;
      priceUsd?: number;
      priceChangePercent24h?: number;
      priceChangePercent1h?: number;
      priceChangePercent6h?: number;
      volume24h?: number;
      txCount24h?: number;
      liquidityUsd?: number;
      marketDataUpdatedAt?: string;
    };
  };
}

export interface ClankerSearchResult {
  tokens: ClankerToken[];
  user?: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    verifiedAddresses: string[];
  };
  searchedAddress: string;
}

// Normalize market data
export function normalizeMarket(token: ClankerToken) {
  const m = token.related?.market;
  if (!m) return null;
  
  // marketCap from Clanker is sometimes in raw units, not USD
  // Use priceUsd as the source of truth
  const price = m.priceUsd || 0;
  const vol = m.volume24h || 0;
  
  // Calculate MCap from price (if we had supply we'd multiply)
  // For now just use the API value but validate it's reasonable
  let mcap = m.marketCap || 0;
  // If marketCap looks like raw units (too high), estimate from volume
  if (mcap > 1000000000 && price < 0.01) {
    // Likely raw units, not USD. Use a rough estimate
    mcap = 0; // Will show as "-"
  }
  
  return {
    mcap,
    price,
    priceChange24h: m.priceChangePercent24h || 0,
    priceChange1h: m.priceChangePercent1h || 0,
    volume24h: vol,
    txCount24h: m.txCount24h || 0,
    liquidityUsd: m.liquidityUsd || 0,
  };
}

async function fetchClanker(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${CLANKER_API}${path}?${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Clanker API: ${res.status}`);
  return res.json();
}

// Get tokens with REAL trading activity (volume > 0)
export async function getActiveTokens(limit = 30): Promise<ClankerToken[]> {
  const data = await fetchClanker('/tokens', {
    sortBy: 'market-cap',
    sort: 'desc',
    limit: '50', // fetch more to filter
    chainId: '8453',
    includeMarket: 'true',
  });
  // Filter: only tokens with actual volume (real trading activity)
  return (data?.data || [])
    .filter((t: ClankerToken) => {
      const m = t.related?.market;
      return m && (m.volume24h || 0) > 10; // at least $10 volume
    })
    .slice(0, limit);
}

// Get recent tokens with activity
export async function getRecentActiveTokens(limit = 30): Promise<ClankerToken[]> {
  const tokens = await getActiveTokens(50);
  return tokens
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

// Get trending tokens (highest volume)
export async function getTrendingTokens(limit = 20): Promise<ClankerToken[]> {
  const data = await fetchClanker('/tokens', {
    sortBy: 'market-cap',
    sort: 'desc',
    limit: '50',
    chainId: '8453',
    includeMarket: 'true',
  });
  return (data?.data || [])
    .filter((t: ClankerToken) => {
      const m = t.related?.market;
      return m && (m.volume24h || 0) > 10;
    })
    .sort((a: ClankerToken, b: ClankerToken) => ((b.related?.market?.volume24h || 0) - (a.related?.market?.volume24h || 0)))
    .slice(0, limit);
}

// Get tokens by creator
export async function getTokensByCreator(query: string, limit = 50): Promise<ClankerSearchResult> {
  return fetchClanker('/search-creator', {
    q: query,
    limit: String(limit),
    sort: 'desc',
    includeMarket: 'true',
    includeUser: 'true',
  });
}

// Get token by address
export async function getTokenByAddress(address: string): Promise<ClankerToken | null> {
  const data = await fetchClanker('/tokens', {
    q: address,
    includeMarket: 'true',
    limit: '5',
  });
  const tokens = data?.data || [];
  return tokens.find((t: ClankerToken) =>
    t.contract_address?.toLowerCase() === address.toLowerCase()
  ) || tokens[0] || null;
}

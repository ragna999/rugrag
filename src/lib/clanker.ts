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
      price?: number;
      priceChange24h?: number;
      priceChange1h?: number;
      volume24h?: number;
      txCount24h?: number;
      liquidityUsd?: number;
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

// Core fetch wrapper
async function fetchClanker(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${CLANKER_API}${path}?${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Clanker API: ${res.status}`);
  return res.json();
}

// Fetch tokens with market data — sort by VOLUME or MARKET CAP (not deployed-at)
export async function getActiveTokens(limit = 30): Promise<ClankerToken[]> {
  const data = await fetchClanker('/tokens', {
    sortBy: 'market-cap',
    sort: 'desc',
    limit: String(limit),
    chainId: '8453',
    includeMarket: 'true',
  });
  // Filter to only tokens WITH actual market data
  return (data?.data || []).filter((t: ClankerToken) => {
    const m = t.related?.market;
    return m && (m.marketCap || 0) > 0;
  });
}

// Fetch recent tokens that have SOME activity (volume > 0)
export async function getRecentActiveTokens(limit = 30): Promise<ClankerToken[]> {
  // Get a larger batch sorted by market cap, then sort by date client-side
  const tokens = await getActiveTokens(50);
  return tokens
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

// Fetch trending tokens (by 24h volume)
export async function getTrendingTokens(limit = 20): Promise<ClankerToken[]> {
  const data = await fetchClanker('/tokens', {
    sortBy: 'market-cap',
    sort: 'desc',
    limit: String(limit),
    chainId: '8453',
    includeMarket: 'true',
  });
  return (data?.data || []).filter((t: ClankerToken) => {
    const m = t.related?.market;
    return m && (m.volume24h || 0) > 0;
  });
}

// Fetch tokens by creator
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

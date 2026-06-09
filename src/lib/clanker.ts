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
      liquidityUsd?: number;
    };
  };
}

export interface ClankerSearchResult {
  tokens: ClankerToken[];
  user?: { fid: number; username: string; displayName: string; pfpUrl: string; verifiedAddresses: string[] };
  searchedAddress: string;
}

export function normalizeMarket(token: ClankerToken) {
  const m = token.related?.market;
  if (!m) return null;
  return {
    mcap: m.marketCap || 0,
    price: m.priceUsd || 0,
    priceChange24h: m.priceChangePercent24h || 0,
    priceChange1h: m.priceChangePercent1h || 0,
    volume24h: m.volume24h || 0,
    liquidityUsd: m.liquidityUsd || 0,
  };
}

async function fetchClanker(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  const url = `${CLANKER_API}${path}?${qs}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Clanker API: ${res.status}`);
  return res.json();
}

// Get tokens (max limit = 20 per Clanker API!)
export async function getAllTokens(limit = 20): Promise<ClankerToken[]> {
  const data = await fetchClanker('/tokens', {
    sortBy: 'market-cap',
    sort: 'desc',
    limit: String(Math.min(limit, 20)), // API max is 20
    includeMarket: 'true',
  });
  return data?.data || [];
}

// Get tokens with volume > 0
export async function getActiveTokens(limit = 20): Promise<ClankerToken[]> {
  const all = await getAllTokens(20);
  return all
    .filter((t: ClankerToken) => (t.related?.market?.volume24h || 0) > 0)
    .slice(0, limit);
}

// Get trending (sorted by volume)
export async function getTrendingTokens(limit = 20): Promise<ClankerToken[]> {
  const all = await getAllTokens(20);
  return all
    .filter((t: ClankerToken) => (t.related?.market?.volume24h || 0) > 0)
    .sort((a: ClankerToken, b: ClankerToken) =>
      (b.related?.market?.volume24h || 0) - (a.related?.market?.volume24h || 0)
    )
    .slice(0, limit);
}

// Get recent active tokens
export async function getRecentActiveTokens(limit = 20): Promise<ClankerToken[]> {
  const active = await getActiveTokens(20);
  return active
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function getTokensByCreator(query: string, limit = 50): Promise<ClankerSearchResult> {
  return fetchClanker('/search-creator', {
    q: query,
    limit: String(limit),
    sort: 'desc',
    includeMarket: 'true',
    includeUser: 'true',
  });
}

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

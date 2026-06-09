// Clanker API — only for token metadata and creator info
// NOT for market data (use DexScreener instead)

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

async function fetchClanker(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${CLANKER_API}${path}?${qs}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Clanker API: ${res.status}`);
  return res.json();
}

// Get latest tokens (for metadata only, not market data)
export async function getLatestTokens(limit = 20): Promise<ClankerToken[]> {
  const data = await fetchClanker('/tokens', {
    sortBy: 'deployed-at',
    sort: 'desc',
    limit: String(Math.min(limit, 20)),
    includeMarket: 'true',
  });
  return data?.data || [];
}

export async function getTokensByCreator(query: string, limit = 20): Promise<ClankerSearchResult> {
  return fetchClanker('/search-creator', {
    q: query,
    limit: String(Math.min(limit, 20)),
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

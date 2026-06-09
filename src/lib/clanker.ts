// Clanker API integration layer
// Docs: https://clanker.gitbook.io/documentation

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
  metadata?: {
    description?: string;
    socialMediaUrls?: string[];
  };
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
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Fetch paginated list of tokens with filters
export async function getTokens(options: {
  q?: string;
  sortBy?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
  chainId?: number;
  includeMarket?: boolean;
  includeUser?: boolean;
  socialInterface?: string;
}) {
  const params = new URLSearchParams();
  if (options.q) params.set('q', options.q);
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sort) params.set('sort', options.sort);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.chainId) params.set('chainId', String(options.chainId));
  if (options.includeMarket) params.set('includeMarket', 'true');
  if (options.includeUser) params.set('includeUser', 'true');
  if (options.socialInterface) params.set('socialInterface', options.socialInterface);

  const res = await fetch(`${CLANKER_API}/tokens?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Clanker API error: ${res.status}`);
  return res.json();
}

// Fetch all tokens by a creator
export async function getTokensByCreator(
  query: string,
  limit = 50,
  offset = 0
): Promise<ClankerSearchResult> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
    sort: 'desc',
    includeMarket: 'true',
    includeUser: 'true',
  });

  const res = await fetch(`${CLANKER_API}/search-creator?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Clanker API error: ${res.status}`);
  return res.json();
}

// Get token by contract address
export async function getTokenByAddress(address: string): Promise<ClankerToken | null> {
  const params = new URLSearchParams({
    q: address,
    includeMarket: 'true',
    limit: '5',
  });

  const res = await fetch(`${CLANKER_API}/tokens?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
  });

  if (!res.ok) return null;
  const data = await res.json();
  const tokens = data?.data || [];
  return tokens.find(
    (t: ClankerToken) => t.contract_address?.toLowerCase() === address.toLowerCase()
  ) || tokens[0] || null;
}

// Get recent tokens (all launchpads)
export async function getRecentTokens(limit = 20): Promise<ClankerToken[]> {
  const data = await getTokens({
    sortBy: 'deployed-at',
    sort: 'desc',
    limit,
    chainId: 8453,
    includeMarket: true,
  });
  return data?.data || [];
}

// Get recent Clanker-native tokens
export async function getRecentClankerTokens(limit = 20): Promise<ClankerToken[]> {
  const data = await getTokens({
    sortBy: 'deployed-at',
    sort: 'desc',
    limit,
    chainId: 8453,
    includeMarket: true,
  });
  // Filter out Bankr tokens
  const tokens = data?.data || [];
  return tokens.filter((t: ClankerToken) => {
    const iface = t.social_interface?.toLowerCase() || '';
    return iface !== 'bankr' && iface !== 'clawdbot';
  });
}

// Get recent Bankr-launched tokens
export async function getRecentBankrTokens(limit = 20): Promise<ClankerToken[]> {
  const data = await getTokens({
    sortBy: 'deployed-at',
    sort: 'desc',
    limit,
    chainId: 8453,
    includeMarket: true,
    socialInterface: 'Bankr',
  });
  return data?.data || [];
}

// Get trending tokens by volume
export async function getTrendingTokens(limit = 20): Promise<ClankerToken[]> {
  const data = await getTokens({
    sortBy: 'market-cap',
    sort: 'desc',
    limit,
    chainId: 8453,
    includeMarket: true,
  });
  return data?.data || [];
}

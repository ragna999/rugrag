'use client';

import { useEffect, useState, useCallback } from 'react';

type Tab = 'all' | 'clanker' | 'bankr';
type Sort = 'recent' | 'trending';

interface TokenData {
  name: string;
  symbol: string;
  contractAddress: string;
  img?: string;
  launchpad: string;
  deployedAt: string;
  deployer?: string;
  pair: string;
  market: {
    mcap: number;
    price: number;
    priceChange24h: number;
    priceChange1h: number;
    volume24h: number;
    txCount24h: number;
    liquidityUsd: number;
  };
  creatorScore: number;
  flags: string[];
}

interface IndexResponse {
  tokens: TokenData[];
  count: number;
  generatedAt: string;
}

function formatUsd(n: number): string {
  if (!n || n === 0) return '-';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toExponential(2)}`;
}

function formatPrice(n: number): string {
  if (!n || n === 0) return '-';
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  if (n >= 0.000001) return `$${n.toFixed(8)}`;
  return `$${n.toExponential(2)}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 65 ? '#22c55e' : score >= 35 ? '#eab308' : '#ef4444';
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {score}
    </span>
  );
}

function LaunchpadBadge({ launchpad }: { launchpad: string }) {
  const isBankr = launchpad === 'Bankr';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
      isBankr
        ? 'bg-blue-500/20 text-blue-400'
        : 'bg-purple-500/20 text-purple-400'
    }`}>
      {launchpad}
    </span>
  );
}

function PriceChange({ value }: { value: number }) {
  if (!value) return <span className="text-gray-500">-</span>;
  const color = value >= 0 ? 'text-green-400' : 'text-red-400';
  const arrow = value >= 0 ? '↑' : '↓';
  return (
    <span className={color}>
      {arrow}{Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'creator' | 'token'>('creator');

  const fetchIndex = useCallback(async () => {
    try {
      const res = await fetch(`/api/index?filter=${tab}&sort=${sort}&limit=30`);
      const data: IndexResponse = await res.json();
      setTokens(data.tokens || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to fetch index:', e);
    } finally {
      setLoading(false);
    }
  }, [tab, sort]);

  useEffect(() => {
    setLoading(true);
    fetchIndex();
    const interval = setInterval(fetchIndex, 30000); // auto-refresh 30s
    return () => clearInterval(interval);
  }, [fetchIndex]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    if (searchMode === 'token') {
      window.location.href = `/token/${searchQuery.trim()}`;
    } else {
      window.location.href = `/creator/${searchQuery.trim()}`;
    }
  };

  // Stats
  const totalMcap = tokens.reduce((s, t) => s + t.market.mcap, 0);
  const totalVol = tokens.reduce((s, t) => s + t.market.volume24h, 0);
  const avgScore = tokens.length > 0
    ? Math.round(tokens.reduce((s, t) => s + t.creatorScore, 0) / tokens.length)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2">
          <span className="text-purple-400">RUGRAG</span>
        </h1>
        <p className="text-gray-400 text-lg">Check Before You Ape 🦧</p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex gap-2 mb-3 justify-center">
          <button
            onClick={() => setSearchMode('creator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              searchMode === 'creator'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-500 border border-white/10'
            }`}
          >
            🔍 Creator
          </button>
          <button
            onClick={() => setSearchMode('token')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              searchMode === 'token'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-500 border border-white/10'
            }`}
          >
            🪙 Token
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={searchMode === 'creator' ? 'Search creator (0x... or Farcaster name)' : 'Search token (0x...)'}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition"
          />
          <button
            onClick={handleSearch}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl text-sm font-medium transition"
          >
            Search
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Tokens Indexed', value: tokens.length.toString() },
          { label: 'Total MCap', value: formatUsd(totalMcap) },
          { label: '24h Volume', value: formatUsd(totalVol) },
          { label: 'Avg Creator Score', value: avgScore.toString() },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[11px] text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['all', 'clanker', 'bankr'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setLoading(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === t
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'all' ? '🌐 All' : t === 'clanker' ? '💜 Clanker' : '💙 Bankr'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(['recent', 'trending'] as Sort[]).map(s => (
              <button
                key={s}
                onClick={() => { setSort(s); setLoading(true); }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  sort === s
                    ? 'bg-white/10 text-white'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {s === 'recent' ? '🕐 Recent' : '🔥 Trending'}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-gray-600">
            {lastUpdate ? `Updated ${lastUpdate}` : ''}
          </span>
        </div>
      </div>

      {/* Token Feed */}
      {loading && tokens.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Loading index...</div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_80px_100px_90px_90px_60px_70px] md:grid-cols-[1fr_90px_110px_100px_100px_80px_80px] gap-2 px-4 py-3 border-b border-white/10 text-[11px] text-gray-500 font-medium uppercase tracking-wider">
            <span>Token</span>
            <span>MCap</span>
            <span>Price</span>
            <span>24h Vol</span>
            <span>Liq</span>
            <span>Score</span>
            <span>Age</span>
          </div>

          {/* Token Rows */}
          <div className="divide-y divide-white/5">
            {tokens.map((token, i) => (
              <a
                key={`${token.contractAddress}-${i}`}
                href={`/token/${token.contractAddress}`}
                className="grid grid-cols-[1fr_80px_100px_90px_90px_60px_70px] md:grid-cols-[1fr_90px_110px_100px_100px_80px_80px] gap-2 px-4 py-3 hover:bg-white/[0.03] transition items-center group"
              >
                {/* Token Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {token.img ? (
                    <img src={token.img} alt="" className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0">
                      {token.symbol?.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate group-hover:text-purple-400 transition">
                        {token.symbol}
                      </span>
                      <LaunchpadBadge launchpad={token.launchpad} />
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{token.name}</p>
                  </div>
                </div>

                {/* MCap */}
                <span className="text-sm">{formatUsd(token.market.mcap)}</span>

                {/* Price */}
                <div>
                  <p className="text-sm">{formatPrice(token.market.price)}</p>
                  <PriceChange value={token.market.priceChange24h} />
                </div>

                {/* Volume */}
                <span className="text-sm">{formatUsd(token.market.volume24h)}</span>

                {/* Liquidity */}
                <span className="text-sm">{formatUsd(token.market.liquidityUsd)}</span>

                {/* Score */}
                <ScoreDot score={token.creatorScore} />

                {/* Age */}
                <span className="text-[11px] text-gray-500">{timeAgo(token.deployedAt)}</span>
              </a>
            ))}
          </div>

          {tokens.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-500">
              No tokens found for this filter
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-[11px] text-gray-600 mt-6">
        Auto-refreshes every 30s • Data from Clanker API • Built by Ragna
      </p>
    </div>
  );
}

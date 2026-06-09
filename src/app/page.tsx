'use client';

import { useState } from 'react';

type Verdict = 'LEGIT' | 'SUSPICIOUS' | 'RUGGER';

interface TokenAnalysis {
  name: string;
  symbol: string;
  contractAddress: string;
  deployedAt: string;
  mcapNow?: number;
  volume24h?: number;
  liquidityUsd?: number;
  status: 'alive' | 'dead' | 'low-volume';
  ageHours: number;
  creatorHeld: boolean;
}

interface CreatorAnalysis {
  wallet: string;
  totalTokensDeployed: number;
  aliveTokens: number;
  deadTokens: number;
  totalVolumeUsd: number;
  totalMarketCapUsd: number;
  averageTokenLifespanHours: number;
  rugScore: number;
  verdict: Verdict;
  tokens: TokenAnalysis[];
  flags: string[];
  farcasterUser?: {
    username: string;
    displayName: string;
    pfpUrl: string;
  };
}

interface TokenCheckResult {
  token: {
    name: string;
    symbol: string;
    contractAddress: string;
    deployedAt?: string;
    market?: {
      marketCap?: number;
      price?: number;
      volume24h?: number;
      liquidityUsd?: number;
    };
    pair?: string;
  };
  creator: CreatorAnalysis | null;
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const colors = {
    LEGIT: 'bg-green-500/20 text-green-400 border-green-500/30',
    SUSPICIOUS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    RUGGER: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${colors[verdict]}`}>
      {verdict === 'LEGIT' && '✅ '}
      {verdict === 'SUSPICIOUS' && '⚠️ '}
      {verdict === 'RUGGER' && '🚨 '}
      {verdict}
    </span>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 65 ? '#22c55e' : score >= 35 ? '#eab308' : '#ef4444';
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a2e" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function formatUsd(n?: number): string {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatHours(h: number): string {
  if (h < 1) return `${(h * 60).toFixed(0)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  if (h < 720) return `${(h / 24).toFixed(1)}d`;
  return `${(h / 720).toFixed(1)}mo`;
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'alive' ? 'bg-green-400' : status === 'low-volume' ? 'bg-yellow-400' : 'bg-red-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'creator' | 'token'>('creator');
  const [loading, setLoading] = useState(false);
  const [creatorData, setCreatorData] = useState<CreatorAnalysis | null>(null);
  const [tokenData, setTokenData] = useState<TokenCheckResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setCreatorData(null);
    setTokenData(null);

    try {
      if (mode === 'token') {
        const res = await fetch(`/api/token-check/${query.trim()}`);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        setTokenData(await res.json());
      } else {
        const res = await fetch(`/api/creator/${query.trim()}`);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        setCreatorData(await res.json());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-purple-400">RUGRAG</span>
          <span className="text-gray-400 text-2xl ml-3">Check Before You Ape</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Check token deployer reputation before you buy. Rug scores, deployment history, and trust verdicts for every Clanker creator on Base.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="flex gap-2 mb-4 justify-center">
          <button
            onClick={() => setMode('creator')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'creator'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            🔍 Check Creator
          </button>
          <button
            onClick={() => setMode('token')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'token'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            🪙 Check Token
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={
              mode === 'creator'
                ? 'Enter wallet address (0x...) or Farcaster username'
                : 'Enter token contract address (0x...)'
            }
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white px-6 py-3.5 rounded-xl font-medium transition"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
        )}
      </div>

      {/* Creator Result */}
      {creatorData && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
            <div className="flex items-start gap-8">
              <ScoreCircle score={creatorData.rugScore} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <VerdictBadge verdict={creatorData.verdict} />
                  {creatorData.farcasterUser && (
                    <span className="text-sm text-gray-400">
                      @{creatorData.farcasterUser.username}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-mono mb-4 break-all">
                  {creatorData.wallet}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{creatorData.totalTokensDeployed}</p>
                    <p className="text-xs text-gray-500">Tokens Deployed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{creatorData.aliveTokens}</p>
                    <p className="text-xs text-gray-500">Alive</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{creatorData.deadTokens}</p>
                    <p className="text-xs text-gray-500">Dead</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatUsd(creatorData.totalVolumeUsd)}</p>
                    <p className="text-xs text-gray-500">24h Volume</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Flags */}
            {creatorData.flags.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-2">Analysis Flags</p>
                <div className="flex flex-wrap gap-2">
                  {creatorData.flags.map((flag, i) => (
                    <span
                      key={i}
                      className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Token List */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="font-medium">Deployed Tokens</h3>
            </div>
            <div className="divide-y divide-white/5">
              {creatorData.tokens.map((token, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <StatusDot status={token.status} />
                    <div>
                      <p className="font-medium">{token.name}</p>
                      <p className="text-xs text-gray-500">{token.symbol}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p>{formatUsd(token.mcapNow)}</p>
                      <p className="text-xs text-gray-500">MCap</p>
                    </div>
                    <div className="text-right">
                      <p>{formatUsd(token.volume24h)}</p>
                      <p className="text-xs text-gray-500">Vol 24h</p>
                    </div>
                    <div className="text-right">
                      <p>{formatHours(token.ageHours)}</p>
                      <p className="text-xs text-gray-500">Age</p>
                    </div>
                    <a
                      href={`https://www.clanker.world/clanker/${token.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-xs"
                    >
                      View →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Token Check Result */}
      {tokenData && (
        <div className="max-w-4xl mx-auto">
          {/* Token Info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold mb-1">{tokenData.token.name}</h2>
            <p className="text-gray-400 mb-4">{tokenData.token.symbol}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-lg font-bold">{formatUsd(tokenData.token.market?.marketCap)}</p>
                <p className="text-xs text-gray-500">Market Cap</p>
              </div>
              <div>
                <p className="text-lg font-bold">{formatUsd(tokenData.token.market?.volume24h)}</p>
                <p className="text-xs text-gray-500">Volume 24h</p>
              </div>
              <div>
                <p className="text-lg font-bold">{formatUsd(tokenData.token.market?.liquidityUsd)}</p>
                <p className="text-xs text-gray-500">Liquidity</p>
              </div>
              <div>
                <p className="text-lg font-bold">{tokenData.token.pair || 'WETH'}</p>
                <p className="text-xs text-gray-500">Pair</p>
              </div>
            </div>
          </div>

          {/* Creator Info */}
          {tokenData.creator && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h3 className="text-lg font-medium mb-4">Creator Analysis</h3>
              <div className="flex items-start gap-8">
                <ScoreCircle score={tokenData.creator.rugScore} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <VerdictBadge verdict={tokenData.creator.verdict} />
                  </div>
                  <p className="text-sm text-gray-500 font-mono mb-3">
                    {tokenData.creator.wallet}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xl font-bold">{tokenData.creator.totalTokensDeployed}</p>
                      <p className="text-xs text-gray-500">Total Tokens</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-green-400">{tokenData.creator.aliveTokens}</p>
                      <p className="text-xs text-gray-500">Alive</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-red-400">{tokenData.creator.deadTokens}</p>
                      <p className="text-xs text-gray-500">Dead</p>
                    </div>
                  </div>
                  {tokenData.creator.flags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tokenData.creator.flags.map((flag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!creatorData && !tokenData && !loading && (
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg mb-2">Search for a wallet address or token contract</p>
          <p className="text-sm">Enter a 0x address or Farcaster username to check creator reputation</p>
        </div>
      )}
    </div>
  );
}

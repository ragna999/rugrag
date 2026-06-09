'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface WalletData {
  address: string;
  analysis: {
    wallet: string;
    totalTokensDeployed: number;
    aliveTokens: number;
    deadTokens: number;
    totalVolumeUsd: number;
    totalMarketCapUsd: number;
    rugScore: number;
    verdict: string;
    tokens: { name: string; symbol: string; contractAddress: string; status: string; mcapNow?: number; volume24h?: number; ageHours: number }[];
    flags: string[];
    farcasterUser?: { username: string; displayName: string; pfpUrl: string };
  } | null;
  tokenCheck: boolean; // true if this wallet deployed tokens
}

function formatUsd(n?: number): string {
  if (!n) return '-';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatHours(h: number): string {
  if (h < 1) return `${(h * 60).toFixed(0)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  if (h < 720) return `${(h / 24).toFixed(1)}d`;
  return `${(h / 720).toFixed(1)}mo`;
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    LEGIT: 'bg-green-500/20 text-green-400 border-green-500/30',
    SUSPICIOUS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    RUGGER: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${colors[verdict] || ''}`}>
      {verdict}
    </span>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 65 ? '#22c55e' : score >= 35 ? '#eab308' : '#ef4444';
  const r = 45;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1a1a2e" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const params = useParams();
  const address = params?.address as string;
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;
    setLoading(true);

    // Try to find this wallet as a creator
    fetch(`/api/creator/${address}`)
      .then(r => {
        if (!r.ok) throw new Error('Not a creator');
        return r.json();
      })
      .then(analysis => {
        setData({
          address,
          analysis,
          tokenCheck: analysis.totalTokensDeployed > 0,
        });
        setLoading(false);
      })
      .catch(() => {
        // Not a known creator, show basic info
        setData({
          address,
          analysis: null,
          tokenCheck: false,
        });
        setLoading(false);
      });
  }, [address]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading wallet...</div>;
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>;
  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Wallet Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl">
            🦊
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {data.analysis?.farcasterUser
                ? `@${data.analysis.farcasterUser.username}`
                : 'Wallet'}
            </h1>
            <p className="text-sm text-gray-500 font-mono break-all">{address}</p>
          </div>
        </div>

        {data.analysis ? (
          <div className="flex items-start gap-8 mt-6">
            <ScoreCircle score={data.analysis.rugScore} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <VerdictBadge verdict={data.analysis.verdict} />
                <span className="text-sm text-gray-400">
                  {data.analysis.totalTokensDeployed} tokens deployed
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xl font-bold text-green-400">{data.analysis.aliveTokens}</p>
                  <p className="text-xs text-gray-500">Alive</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xl font-bold text-red-400">{data.analysis.deadTokens}</p>
                  <p className="text-xs text-gray-500">Dead</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xl font-bold">{formatUsd(data.analysis.totalVolumeUsd)}</p>
                  <p className="text-xs text-gray-500">24h Volume</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xl font-bold">{formatUsd(data.analysis.totalMarketCapUsd)}</p>
                  <p className="text-xs text-gray-500">Total MCap</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center py-8">
            <p className="text-gray-400 mb-2">This wallet has no known token deployments on Clanker</p>
            <p className="text-sm text-gray-500">Try searching for a token deployer address</p>
          </div>
        )}

        {/* Flags */}
        {data.analysis && data.analysis.flags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm font-medium text-gray-400 mb-2">Analysis</p>
            <div className="flex flex-wrap gap-2">
              {data.analysis.flags.map((f, i) => (
                <span key={i} className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tokens List */}
      {data.analysis && data.analysis.tokens.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="font-medium">Deployed Tokens</h3>
          </div>
          <div className="divide-y divide-white/5">
            {data.analysis.tokens.map((token, i) => (
              <a
                key={i}
                href={`/token/${token.contractAddress}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    token.status === 'alive' ? 'bg-green-400' :
                    token.status === 'low-volume' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="font-medium">{token.name}</p>
                    <p className="text-xs text-gray-500">{token.symbol}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-right w-20">
                    <p>{formatUsd(token.mcapNow)}</p>
                    <p className="text-[10px] text-gray-500">MCap</p>
                  </div>
                  <div className="text-right w-20">
                    <p>{formatUsd(token.volume24h)}</p>
                    <p className="text-[10px] text-gray-500">Vol 24h</p>
                  </div>
                  <div className="text-right w-16">
                    <p>{formatHours(token.ageHours)}</p>
                    <p className="text-[10px] text-gray-500">Age</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="mt-6 flex gap-3 justify-center">
        <a
          href={`https://basescan.org/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-purple-400 hover:text-purple-300 transition"
        >
          View on BaseScan ↗
        </a>
        <a
          href={`https://www.clanker.world/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-purple-400 hover:text-purple-300 transition"
        >
          Clanker.world ↗
        </a>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

interface CreatorData {
  wallet: string;
  totalTokensDeployed: number;
  aliveTokens: number;
  deadTokens: number;
  totalVolumeUsd: number;
  totalMarketCapUsd: number;
  averageTokenLifespanHours: number;
  rugScore: number;
  verdict: 'LEGIT' | 'SUSPICIOUS' | 'RUGGER';
  tokens: TokenAnalysis[];
  flags: string[];
  farcasterUser?: { username: string; displayName: string; pfpUrl: string };
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
      {verdict === 'LEGIT' && '✅ '}{verdict === 'SUSPICIOUS' && '⚠️ '}{verdict === 'RUGGER' && '🚨 '}{verdict}
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

export default function CreatorPage() {
  const params = useParams();
  const wallet = params?.wallet as string;
  const [data, setData] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    fetch(`/api/creator/${wallet}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch creator');
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [wallet]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading creator...</div>;
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>;
  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Creator Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
        <div className="flex items-start gap-8">
          <ScoreCircle score={data.rugScore} />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <VerdictBadge verdict={data.verdict} />
              {data.farcasterUser && (
                <span className="text-sm text-gray-400">@{data.farcasterUser.username}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-mono break-all mb-6">{data.wallet}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold">{data.totalTokensDeployed}</p>
                <p className="text-xs text-gray-500">Tokens Deployed</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-400">{data.aliveTokens}</p>
                <p className="text-xs text-gray-500">Alive</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-red-400">{data.deadTokens}</p>
                <p className="text-xs text-gray-500">Dead</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold">{formatUsd(data.totalVolumeUsd)}</p>
                <p className="text-xs text-gray-500">24h Volume</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flags */}
        {data.flags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm font-medium text-gray-400 mb-2">Analysis</p>
            <div className="flex flex-wrap gap-2">
              {data.flags.map((f, i) => (
                <span key={i} className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Token List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-medium">All Deployed Tokens</h3>
        </div>
        <div className="divide-y divide-white/5">
          {data.tokens.map((token, i) => (
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
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  wallet: string;
  rugScore: number;
  verdict: string;
  totalTokens: number;
  aliveTokens: number;
  totalVolumeUsd: number;
  totalMarketCapUsd: number;
  flags: string[];
  farcasterUser?: {
    username: string;
    displayName: string;
  };
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, string> = {
    LEGIT: 'bg-green-500/20 text-green-400',
    SUSPICIOUS: 'bg-yellow-500/20 text-yellow-400',
    RUGGER: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[verdict] || 'bg-gray-500/20 text-gray-400'}`}>
      {verdict}
    </span>
  );
}

function formatUsd(n: number): string {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        setData(d.leaderboard || []);
        setLoading(false);
      })
      .catch(e => {
        setError('Failed to load leaderboard');
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Creator Leaderboard</h1>
        <p className="text-gray-400">
          Top Clanker token creators ranked by trust score. Updated periodically.
        </p>
      </div>

      {loading && (
        <div className="text-center py-20 text-gray-500">Loading leaderboard...</div>
      )}

      {error && (
        <div className="text-center py-20 text-red-400">{error}</div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">#</th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">Creator</th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">Score</th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">Verdict</th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">Tokens</th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">Alive</th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">Volume 24h</th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">MCap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((entry, i) => (
                  <tr key={i} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                    <td className="px-6 py-4">
                      <a
                        href={`/?q=${entry.wallet}`}
                        className="hover:text-purple-400 transition"
                      >
                        {entry.farcasterUser ? (
                          <div>
                            <p className="font-medium">@{entry.farcasterUser.username}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                            </p>
                          </div>
                        ) : (
                          <p className="font-mono text-sm">
                            {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                          </p>
                        )}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="text-lg font-bold"
                        style={{
                          color: entry.rugScore >= 65 ? '#22c55e' : entry.rugScore >= 35 ? '#eab308' : '#ef4444',
                        }}
                      >
                        {entry.rugScore}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <VerdictBadge verdict={entry.verdict} />
                    </td>
                    <td className="px-6 py-4">{entry.totalTokens}</td>
                    <td className="px-6 py-4 text-green-400">{entry.aliveTokens}</td>
                    <td className="px-6 py-4">{formatUsd(entry.totalVolumeUsd)}</td>
                    <td className="px-6 py-4">{formatUsd(entry.totalMarketCapUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No leaderboard data available yet.
        </div>
      )}
    </div>
  );
}

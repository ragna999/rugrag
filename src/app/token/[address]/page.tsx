'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface TokenInfo {
  name: string;
  symbol: string;
  contractAddress: string;
  deployedAt?: string;
  market?: { mcap?: number; price?: number; volume24h?: number; liquidityUsd?: number; priceChange24h?: number };
  pair?: string;
  img?: string;
  gtUrl?: string;
}

interface CreatorInfo {
  wallet: string;
  totalTokensDeployed: number;
  aliveTokens: number;
  deadTokens: number;
  rugScore: number;
  verdict: string;
  tokens: { name: string; symbol: string; contractAddress: string; status: string; mcapNow?: number; volume24h?: number; ageHours: number }[];
  flags: string[];
}

interface WakeData {
  score: number;
  tier: string;
  tags: string[];
  security: { level: string; reasons: string[] };
  breakdown: { market_signals: number; social_signals: number; contract_safety: number; deployer_quality: number; liquidity_health: number };
  narrative?: string;
  launchProtocol?: string;
}

interface CheckResult {
  token: TokenInfo;
  creator: CreatorInfo | null;
  wake: WakeData | null;
}

function fmt(n?: number): string {
  if (!n) return '-';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(6)}`;
}

function fmtHours(h: number): string {
  if (h < 1) return `${(h * 60).toFixed(0)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  if (h < 720) return `${(h / 24).toFixed(1)}d`;
  return `${(h / 720).toFixed(1)}mo`;
}

function Ring({ score, label, color, sub }: { score: number; label: string; color: string; sub?: string }) {
  const r = 32, c = 2 * Math.PI * r, offset = c - (score / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#1a1a2e" strokeWidth="5" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <p className="text-xs font-medium mt-1 text-center">{label}</p>
      {sub && <p className="text-[10px] text-gray-500 text-center">{sub}</p>}
    </div>
  );
}

export default function TokenPage() {
  const params = useParams();
  const address = params?.address as string;
  const [data, setData] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/token-check/${address}`)
      .then(r => { if (!r.ok) throw new Error('Token not found'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [address]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-400 text-lg mb-4">{error}</p>
      <a href="/" className="text-purple-400 hover:underline">← Back to index</a>
    </div>
  );
  if (!data || !data.token) return null;

  const t = data.token;
  const m = t.market || {};

  // Calculate token trading score (same as index)
  let tradingScore = 50;
  const vol = m.volume24h || 0;
  const liq = m.liquidityUsd || 0;
  if (liq > 50000) tradingScore += 10;
  if (liq > 200000) tradingScore += 5;
  if (liq < 5000) tradingScore -= 20;
  if (vol > 1000) tradingScore += 5;
  if (vol > 10000) tradingScore += 5;
  if (liq > 0) { const r = vol / liq; if (r > 0.1 && r < 2) tradingScore += 5; if (r > 3) tradingScore -= 10; }
  tradingScore = Math.max(0, Math.min(100, tradingScore));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Token Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">{t.name || 'Unknown'}</h1>
            <p className="text-gray-400 text-lg">{t.symbol || '?'}</p>
            <p className="text-xs text-gray-600 font-mono mt-2">{t.contractAddress}</p>
          </div>
          {t.gtUrl && (
            <a href={t.gtUrl} target="_blank" rel="noopener noreferrer" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition">
              GeckoTerminal ↗
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4"><p className="text-xl font-bold">{fmt(m.mcap)}</p><p className="text-xs text-gray-500">Market Cap</p></div>
          <div className="bg-white/5 rounded-xl p-4"><p className="text-xl font-bold">{fmt(m.volume24h)}</p><p className="text-xs text-gray-500">Volume 24h</p></div>
          <div className="bg-white/5 rounded-xl p-4"><p className="text-xl font-bold">{m.price ? `$${m.price.toFixed(8)}` : '-'}</p><p className="text-xs text-gray-500">Price</p></div>
          <div className="bg-white/5 rounded-xl p-4"><p className="text-xl font-bold">{fmt(m.liquidityUsd)}</p><p className="text-xs text-gray-500">Liquidity</p></div>
        </div>
      </div>

      {/* Score Comparison */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
        <h2 className="text-xl font-bold mb-6">Scores</h2>
        <div className="flex items-start justify-center gap-8 flex-wrap">
          <Ring
            score={tradingScore}
            label="Trading"
            color={tradingScore >= 65 ? '#22c55e' : tradingScore >= 35 ? '#eab308' : '#ef4444'}
            sub="Volume & liquidity"
          />
          {data.wake && typeof data.wake.score === 'number' && (
            <Ring
              score={data.wake.score}
              label="WAKE"
              color={data.wake.score >= 65 ? '#22c55e' : data.wake.score >= 35 ? '#eab308' : '#ef4444'}
              sub={`Token quality (${data.wake.tier})`}
            />
          )}
          {data.creator && (
            <Ring
              score={data.creator.rugScore}
              label="Creator"
              color={data.creator.rugScore >= 65 ? '#22c55e' : data.creator.rugScore >= 35 ? '#eab308' : '#ef4444'}
              sub={`${data.creator.verdict} deployer`}
            />
          )}
        </div>
        <p className="text-xs text-gray-500 text-center mt-4">
          Trading = market activity • WAKE = token security & quality • Creator = deployer reputation
        </p>
      </div>

      {/* WAKE Detail */}
      {data.wake && typeof data.wake.score === 'number' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
          <h2 className="text-lg font-bold mb-4">🦉 WAKE Breakdown</h2>
          {data.wake.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {data.wake.tags.map((tag, i) => (
                <span key={i} className="text-[11px] bg-white/5 border border-white/10 rounded px-2 py-0.5">{tag}</span>
              ))}
            </div>
          )}
          {data.wake.breakdown && (
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { label: 'Market', v: data.wake.breakdown.market_signals },
                { label: 'Social', v: data.wake.breakdown.social_signals },
                { label: 'Contract', v: data.wake.breakdown.contract_safety },
                { label: 'Deployer', v: data.wake.breakdown.deployer_quality },
                { label: 'Liquidity', v: data.wake.breakdown.liquidity_health },
              ].map((b, i) => (
                <div key={i} className="text-center">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${((b.v || 0) / 20) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">{b.label}</p>
                  <p className="text-sm font-bold">{b.v || 0}/20</p>
                </div>
              ))}
            </div>
          )}
          {data.wake.narrative && <p className="text-sm text-gray-300">{data.wake.narrative}</p>}
        </div>
      )}

      {/* Creator Detail */}
      {data.creator && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
          <h2 className="text-lg font-bold mb-4">Creator Analysis</h2>
          <div className="flex items-start gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
              data.creator.verdict === 'LEGIT' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
              data.creator.verdict === 'RUGGER' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
              'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            }`}>{data.creator.verdict}</span>
            <a href={`/creator/${data.creator.wallet}`} className="text-sm text-gray-400 font-mono hover:text-purple-400">{data.creator.wallet}</a>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 mb-4">
            <div><p className="text-lg font-bold">{data.creator.totalTokensDeployed}</p><p className="text-xs text-gray-500">Total Tokens</p></div>
            <div><p className="text-lg font-bold text-green-400">{data.creator.aliveTokens}</p><p className="text-xs text-gray-500">Alive</p></div>
            <div><p className="text-lg font-bold text-red-400">{data.creator.deadTokens}</p><p className="text-xs text-gray-500">Dead</p></div>
          </div>
          {data.creator.flags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.creator.flags.map((f, i) => (
                <span key={i} className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">{f}</span>
              ))}
            </div>
          )}
          {/* Creator's Other Tokens */}
          {data.creator.tokens?.length > 1 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-sm font-medium text-gray-400 mb-3">Other tokens by this creator</p>
              <div className="space-y-2">
                {data.creator.tokens.filter(tk => tk.contractAddress.toLowerCase() !== address.toLowerCase()).slice(0, 5).map((tk, i) => (
                  <a key={i} href={`/token/${tk.contractAddress}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${tk.status === 'alive' ? 'bg-green-400' : tk.status === 'low-volume' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                      <span className="text-sm">{tk.symbol}</span>
                      <span className="text-xs text-gray-500">{tk.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{fmt(tk.mcapNow)}</span>
                      <span>{fmtHours(tk.ageHours)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <a href="/" className="text-purple-400 hover:underline text-sm">← Back to index</a>
      </div>
    </div>
  );
}

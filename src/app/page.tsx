'use client';

import { useEffect, useState, useCallback } from 'react';

type Sort = 'trending' | 'new';

interface TokenData {
  name: string;
  symbol: string;
  contractAddress: string;
  img: string;
  launchpad: string;
  pair: string;
  market: {
    mcap: number;
    price: number;
    priceChange24h: number;
    priceChange1h: number;
    volume24h: number;
    liquidityUsd: number;
  };
  txns: { buys24h: number; sells24h: number };
  sentiment: string;
  sentimentType: string;
  buyPressure: number;
  score: number;
  gtUrl: string;
}

function fmt(n: number): string {
  if (!n || n === 0) return '-';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(6)}`;
}

function Sc({ v }: { v: number }) {
  const c = v >= 65 ? '#22c55e' : v >= 35 ? '#eab308' : '#ef4444';
  return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold" style={{ backgroundColor: `${c}20`, color: c }}>{v}</span>;
}

function Chg({ v }: { v: number }) {
  if (!v) return <span className="text-gray-600">-</span>;
  return <span className={v >= 0 ? 'text-green-400' : 'text-red-400'}>{v >= 0 ? '+' : ''}{v.toFixed(1)}%</span>;
}

function Sent({ l, t }: { l: string; t: string }) {
  const c = t === 'bullish' ? 'bg-green-500/10 text-green-400 border-green-500/20' : t === 'bearish' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  return <span className={`px-2 py-0.5 rounded text-[10px] border ${c}`}>{l}</span>;
}

export default function Home() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');
  const [sort, setSort] = useState<Sort>('trending');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/index?sort=${sort}`);
      const data = await res.json();
      setTokens(data.tokens || []);
      setUpdated(new Date().toLocaleTimeString());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [sort]);

  useEffect(() => {
    setLoading(true);
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const search = () => {
    if (!q.trim()) return;
    location.href = `/token/${q.trim()}`;
  };

  const totalVol = tokens.reduce((s, t) => s + t.market.volume24h, 0);
  const avgScore = tokens.length ? Math.round(tokens.reduce((s, t) => s + t.score, 0) / tokens.length) : 0;
  const bullish = tokens.filter(t => t.sentimentType === 'bullish').length;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2"><span className="text-purple-400">RUG</span>RAG</h1>
        <p className="text-gray-400 text-lg">Check Before You Ape 🦧</p>
      </div>

      <div className="max-w-xl mx-auto mb-8">
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Token contract address (0x...)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
          <button onClick={search} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl text-sm font-medium">Search</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
          <p className="text-lg font-bold">{tokens.length}</p><p className="text-[11px] text-gray-500">Active Tokens</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
          <p className="text-lg font-bold">{fmt(totalVol)}</p><p className="text-[11px] text-gray-500">24h Volume</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
          <p className="text-lg font-bold">{avgScore}</p><p className="text-[11px] text-gray-500">Avg Score</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
          <p className="text-lg font-bold text-green-400">{bullish}</p><p className="text-[11px] text-gray-500">Bullish</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['trending', 'new'] as Sort[]).map(s => (
            <button key={s} onClick={() => { setSort(s); setLoading(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${sort === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {s === 'trending' ? '🔥 Trending' : '🆕 New'}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-gray-600">{updated ? `Updated ${updated}` : ''}</span>
      </div>

      {loading && tokens.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No active tokens</div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1fr_100px_100px_100px_80px_70px_100px_80px] gap-2 px-4 py-3 border-b border-white/10 text-[11px] text-gray-500 font-medium uppercase tracking-wider">
            <span>Token</span><span>MCap</span><span>Price</span><span>24h Vol</span><span>Liq</span><span>Score</span><span>Sentiment</span><span>B/S</span>
          </div>
          <div className="divide-y divide-white/5">
            {tokens.map((t, i) => (
              <a key={`${t.contractAddress}-${i}`} href={`/token/${t.contractAddress}`}
                className="grid grid-cols-[1fr_90px_90px_90px_70px_60px_90px] md:grid-cols-[1fr_100px_100px_100px_80px_70px_100px_80px] gap-2 px-4 py-3 hover:bg-white/[0.03] transition items-center group">
                <div className="flex items-center gap-3 min-w-0">
                  {t.img ? <img src={t.img} alt="" className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">{t.symbol?.slice(0, 2)}</div>}
                  <div className="min-w-0">
                    <span className="font-medium text-sm truncate group-hover:text-purple-400 transition block">{t.symbol}</span>
                    <p className="text-[11px] text-gray-500 truncate">{t.name}</p>
                  </div>
                </div>
                <span className="text-sm">{fmt(t.market.mcap)}</span>
                <div><p className="text-sm">{fmt(t.market.price)}</p><Chg v={t.market.priceChange24h} /></div>
                <span className="text-sm font-medium">{fmt(t.market.volume24h)}</span>
                <span className="text-sm">{fmt(t.market.liquidityUsd)}</span>
                <Sc v={t.score} />
                <Sent l={t.sentiment} t={t.sentimentType} />
                <div className="flex items-center gap-1">
                  <span className="text-green-400 text-xs">{t.txns.buys24h}B</span>
                  <span className="text-gray-600 text-xs">/</span>
                  <span className="text-red-400 text-xs">{t.txns.sells24h}S</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-gray-600 mt-6">Data from GeckoTerminal (CoinGecko) • Auto-refreshes 30s • Built by Ragna</p>
    </div>
  );
}

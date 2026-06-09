'use client';

import { useEffect, useState, useCallback } from 'react';

type Tab = 'all' | 'clanker' | 'bankr';
type Sort = 'recent' | 'trending';
type Section = 'feed' | 'smart' | 'whales';

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

interface SmartMoneySignal {
  token: { name: string; symbol: string; address: string };
  price: string;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  buys24h: number;
  sells24h: number;
  sentiment: string;
  sentimentType: 'bullish' | 'bearish' | 'neutral';
  buyPressure: number;
  smartMoneyScore: number;
  dexScreenerUrl: string;
}

interface WhaleActivity {
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  buyPressure: number;
  sentiment: string;
  sentimentType: string;
  liquidity: number;
  priceChange24h: number;
  price: string;
  dexScreenerUrl: string;
}

function fmt(n: number): string {
  if (!n || n === 0) return '-';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(6)}`;
}

function fmtPrice(n: number): string {
  if (!n || n === 0) return '-';
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Score({ v }: { v: number }) {
  const c = v >= 65 ? '#22c55e' : v >= 35 ? '#eab308' : '#ef4444';
  return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold" style={{ backgroundColor: `${c}20`, color: c }}>{v}</span>;
}

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color}`}>{text}</span>;
}

function Chg({ v }: { v: number }) {
  if (!v) return <span className="text-gray-600">-</span>;
  return <span className={v >= 0 ? 'text-green-400' : 'text-red-400'}>{v >= 0 ? '+' : ''}{v.toFixed(1)}%</span>;
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-green-400 text-xs">{pct}%</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<Sort>('trending');
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [signals, setSignals] = useState<SmartMoneySignal[]>([]);
  const [whales, setWhales] = useState<WhaleActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');
  const [q, setQ] = useState('');
  const [qMode, setQMode] = useState<'creator' | 'token' | 'wallet'>('creator');
  const [sec, setSec] = useState<Section>('feed');

  const load = useCallback(async () => {
    try {
      const [i, s, w] = await Promise.all([
        fetch(`/api/index?filter=${tab}&sort=${sort}&limit=30`).then(r => r.json()),
        fetch('/api/smart-money').then(r => r.json()),
        fetch('/api/whale-tracker').then(r => r.json()),
      ]);
      setTokens(i.tokens || []);
      setSignals(s.signals || []);
      setWhales(w.activity || []);
      setUpdated(new Date().toLocaleTimeString());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab, sort]);

  useEffect(() => {
    setLoading(true);
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const search = () => {
    if (!q.trim()) return;
    const v = q.trim();
    if (qMode === 'token') location.href = `/token/${v}`;
    else if (qMode === 'wallet') location.href = `/wallet/${v}`;
    else location.href = `/creator/${v}`;
  };

  const totalVol = tokens.reduce((s, t) => s + t.market.volume24h, 0);
  const avgScore = tokens.length ? Math.round(tokens.reduce((s, t) => s + t.creatorScore, 0) / tokens.length) : 0;
  const bullish = signals.filter(s => s.sentimentType === 'bullish').length;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2"><span className="text-purple-400">RUG</span>RAG</h1>
        <p className="text-gray-400 text-lg">Check Before You Ape 🦧</p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex gap-2 mb-3 justify-center">
          {(['creator', 'token', 'wallet'] as const).map(m => (
            <button key={m} onClick={() => setQMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${qMode === m ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
              {m === 'creator' ? '🔍 Creator' : m === 'token' ? '🪙 Token' : '🦊 Wallet'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
            placeholder={qMode === 'creator' ? '0x... or Farcaster name' : qMode === 'token' ? 'Token contract 0x...' : 'Wallet 0x...'}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
          <button onClick={search} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl text-sm font-medium">Search</button>
        </div>
      </div>

      {/* Stats */}
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
          <p className="text-lg font-bold text-green-400">{bullish}</p><p className="text-[11px] text-gray-500">Bullish Signals</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {([
            { k: 'feed' as Section, i: '📊', l: 'Token Feed' },
            { k: 'smart' as Section, i: '🧠', l: 'Smart Money' },
            { k: 'whales' as Section, i: '🐋', l: 'Whale Activity' },
          ]).map(s => (
            <button key={s.k} onClick={() => setSec(s.k)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${sec === s.k ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {s.i} {s.l}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-gray-600">{updated ? `Updated ${updated}` : ''}</span>
      </div>

      {/* ===== TOKEN FEED ===== */}
      {sec === 'feed' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {(['all', 'clanker', 'bankr'] as Tab[]).map(t => (
                <button key={t} onClick={() => { setTab(t); setLoading(true); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {t === 'all' ? '🌐 All' : t === 'clanker' ? '💜 Clanker' : '💙 Bankr'}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['recent', 'trending'] as Sort[]).map(s => (
                <button key={s} onClick={() => { setSort(s); setLoading(true); }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${sort === s ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                  {s === 'recent' ? '🕐 Recent' : '🔥 Trending'}
                </button>
              ))}
            </div>
          </div>

          {loading && tokens.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Loading...</div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No active tokens found</div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
              <div className="hidden md:grid md:grid-cols-[1fr_100px_110px_100px_100px_80px_80px] gap-2 px-4 py-3 border-b border-white/10 text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                <span>Token</span><span>MCap</span><span>Price</span><span>24h Vol</span><span>Liq</span><span>Score</span><span>Age</span>
              </div>
              <div className="divide-y divide-white/5">
                {tokens.map((t, i) => (
                  <a key={`${t.contractAddress}-${i}`} href={`/token/${t.contractAddress}`}
                    className="grid grid-cols-[1fr_80px_100px_90px_90px_60px_70px] md:grid-cols-[1fr_100px_110px_100px_100px_80px_80px] gap-2 px-4 py-3 hover:bg-white/[0.03] transition items-center group">
                    <div className="flex items-center gap-3 min-w-0">
                      {t.img ? <img src={t.img} alt="" className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">{t.symbol?.slice(0, 2)}</div>}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate group-hover:text-purple-400 transition">{t.symbol}</span>
                          <Badge text={t.launchpad} color={t.launchpad === 'Bankr' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'} />
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{t.name}</p>
                      </div>
                    </div>
                    <span className="text-sm">{fmt(t.market.mcap)}</span>
                    <div><p className="text-sm">{fmtPrice(t.market.price)}</p><Chg v={t.market.priceChange24h} /></div>
                    <span className="text-sm">{fmt(t.market.volume24h)}</span>
                    <span className="text-sm">{fmt(t.market.liquidityUsd)}</span>
                    <Score v={t.creatorScore} />
                    <span className="text-[11px] text-gray-500">{timeAgo(t.deployedAt)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== SMART MONEY ===== */}
      {sec === 'smart' && (
        <div>
          {loading && signals.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Loading...</div>
          ) : signals.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No signals</div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
              <div className="hidden md:grid md:grid-cols-[1fr_100px_90px_100px_80px_100px_120px] gap-2 px-4 py-3 border-b border-white/10 text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                <span>Token</span><span>Price</span><span>24h</span><span>Volume</span><span>Score</span><span>Sentiment</span><span>Buys/Sells</span>
              </div>
              <div className="divide-y divide-white/5">
                {signals.map((s, i) => (
                  <a key={i} href={`/token/${s.token.address}`}
                    className="grid grid-cols-[1fr_90px_80px_90px_60px_100px] md:grid-cols-[1fr_100px_90px_100px_80px_100px_120px] gap-2 px-4 py-3 hover:bg-white/[0.03] transition items-center group">
                    <div><span className="font-medium text-sm group-hover:text-purple-400">{s.token.symbol}</span><p className="text-[11px] text-gray-500 truncate">{s.token.name}</p></div>
                    <span className="text-sm">{s.price ? `$${parseFloat(s.price).toFixed(6)}` : '-'}</span>
                    <Chg v={s.priceChange24h} />
                    <span className="text-sm">{fmt(s.volume24h)}</span>
                    <Score v={s.smartMoneyScore} />
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${s.sentimentType === 'bullish' ? 'bg-green-500/10 text-green-400 border-green-500/20' : s.sentimentType === 'bearish' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{s.sentiment}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-xs">{s.buys24h}B</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-red-400 text-xs">{s.sells24h}S</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${s.buyPressure}%` }} /></div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          <p className="mt-4 text-xs text-gray-500 text-center">🧠 Score based on buy/sell pressure, volume/liquidity ratio, price momentum. 65+ = smart money interest.</p>
        </div>
      )}

      {/* ===== WHALE ACTIVITY ===== */}
      {sec === 'whales' && (
        <div>
          {loading && whales.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Scanning...</div>
          ) : whales.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No whale activity</div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
              <div className="hidden md:grid md:grid-cols-[1fr_100px_100px_80px_100px_120px] gap-2 px-4 py-3 border-b border-white/10 text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                <span>Token</span><span>Volume 24h</span><span>Liquidity</span><span>24h</span><span>Sentiment</span><span>Buys/Sells</span>
              </div>
              <div className="divide-y divide-white/5">
                {whales.map((w, i) => (
                  <a key={i} href={`/token/${w.tokenAddress}`}
                    className="grid grid-cols-[1fr_100px_100px_80px_100px] md:grid-cols-[1fr_100px_100px_80px_100px_120px] gap-2 px-4 py-3 hover:bg-white/[0.03] transition items-center group">
                    <div><span className="font-medium text-sm group-hover:text-purple-400">{w.tokenSymbol}</span><p className="text-[11px] text-gray-500 truncate">{w.tokenName}</p></div>
                    <span className="text-sm font-bold">{fmt(w.volume24h)}</span>
                    <span className="text-sm">{fmt(w.liquidity)}</span>
                    <Chg v={w.priceChange24h} />
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${w.sentimentType === 'bullish' ? 'bg-green-500/10 text-green-400 border-green-500/20' : w.sentimentType === 'bearish' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{w.sentiment}</span>
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-green-400 text-xs">{w.buys24h}B</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-red-400 text-xs">{w.sells24h}S</span>
                      <Bar pct={w.buyPressure} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          <p className="mt-4 text-xs text-gray-500 text-center">🐋 Tokens with highest 24h trading volume. Heavy volume + high buy pressure = potential whale accumulation.</p>
        </div>
      )}

      <p className="text-center text-[11px] text-gray-600 mt-6">Auto-refreshes 30s • Clanker + DexScreener + Base RPC • Built by Ragna</p>
    </div>
  );
}

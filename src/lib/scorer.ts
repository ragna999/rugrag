// Rug Score Algorithm
// Analyzes a token creator's history to determine trustworthiness
// Score: 0 (definite rugger) to 100 (fully legit)

import { ClankerToken } from './clanker';

export interface CreatorAnalysis {
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
  farcasterUser?: {
    username: string;
    displayName: string;
    pfpUrl: string;
  };
}

export interface TokenAnalysis {
  name: string;
  symbol: string;
  contractAddress: string;
  deployedAt: string;
  mcapPeak?: number;
  mcapNow?: number;
  volume24h?: number;
  liquidityUsd?: number;
  status: 'alive' | 'dead' | 'low-volume';
  ageHours: number;
  creatorHeld: boolean; // heuristic: if volume > 0 and mcap > 0
}

// Determine if a token is "alive" based on market data
function getTokenStatus(token: ClankerToken): 'alive' | 'dead' | 'low-volume' {
  const market = token.related?.market;
  if (!market) return 'dead';
  
  const mcap = market.marketCap || 0;
  const vol = market.volume24h || 0;
  const liq = market.liquidityUsd || 0;
  
  // Dead: no liquidity or extremely low mcap
  if (liq < 100 || mcap < 100) return 'dead';
  
  // Low volume: has liquidity but barely trading
  if (vol < 10) return 'low-volume';
  
  return 'alive';
}

// Calculate age in hours from deployment
function getAgeHours(createdAt: string): number {
  const deployed = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - deployed) / (1000 * 60 * 60);
}

// Main rug score calculation
export function calculateRugScore(tokens: ClankerToken[]): {
  score: number;
  flags: string[];
} {
  let score = 50; // Start neutral
  const flags: string[] = [];
  
  if (tokens.length === 0) {
    return { score: 50, flags: ['⚠️ No deployment history found'] };
  }
  
  const statuses = tokens.map(t => ({
    status: getTokenStatus(t),
    age: getAgeHours(t.created_at),
    market: t.related?.market,
    token: t,
  }));
  
  const alive = statuses.filter(s => s.status === 'alive');
  const dead = statuses.filter(s => s.status === 'dead');
  const lowVol = statuses.filter(s => s.status === 'low-volume');
  
  // === RED FLAGS (decrease score) ===
  
  // Many tokens, most dead
  if (tokens.length > 5 && dead.length / tokens.length > 0.7) {
    score -= 25;
    flags.push(`🚨 ${(dead.length / tokens.length * 100).toFixed(0)}% of tokens are dead`);
  }
  
  // Tokens dying within 1 hour
  const quickDeaths = dead.filter(s => s.age < 1);
  if (quickDeaths.length > 0) {
    score -= quickDeaths.length * 10;
    flags.push(`🚨 ${quickDeaths.length} token(s) died within 1 hour`);
  }
  
  // Deploy spam (>10 tokens)
  if (tokens.length > 10) {
    score -= 15;
    flags.push(`⚠️ Deployed ${tokens.length} tokens (possible spam)`);
  }
  
  // Very low volume across all tokens
  const totalVol = statuses.reduce((sum, s) => sum + (s.market?.volume24h || 0), 0);
  if (tokens.length > 3 && totalVol < 100) {
    score -= 15;
    flags.push('⚠️ Very low total volume across all tokens');
  }
  
  // No liquidity left
  const totalLiq = statuses.reduce((sum, s) => sum + (s.market?.liquidityUsd || 0), 0);
  if (tokens.length > 2 && totalLiq < 50) {
    score -= 20;
    flags.push('🚨 Almost no liquidity remaining');
  }
  
  // === GREEN FLAGS (increase score) ===
  
  // High alive ratio
  if (tokens.length >= 3 && alive.length / tokens.length > 0.5) {
    score += 20;
    flags.push(`✅ ${(alive.length / tokens.length * 100).toFixed(0)}% of tokens still alive`);
  }
  
  // Consistent volume
  if (alive.length >= 2) {
    const aliveVol = alive.reduce((sum, s) => sum + (s.market?.volume24h || 0), 0);
    if (aliveVol > 1000) {
      score += 15;
      flags.push(`✅ Active trading: $${aliveVol.toFixed(0)} volume/24h`);
    }
  }
  
  // Long-lived tokens (>7 days)
  const longLived = statuses.filter(s => s.status !== 'dead' && s.age > 168);
  if (longLived.length > 0) {
    score += longLived.length * 5;
    flags.push(`✅ ${longLived.length} token(s) alive for 7+ days`);
  }
  
  // Few tokens (not a spammer)
  if (tokens.length <= 3) {
    score += 10;
    flags.push('✅ Conservative deployer (≤3 tokens)');
  }
  
  // Has Farcaster social context
  const hasSocial = tokens.some(t => t.msg_sender);
  if (hasSocial) {
    score += 5;
    flags.push('✅ Has social context (Farcaster/X)');
  }
  
  // High market cap tokens
  const maxMcap = Math.max(...statuses.map(s => s.market?.marketCap || 0));
  if (maxMcap > 100000) {
    score += 10;
    flags.push(`✅ Highest token reached $${(maxMcap / 1000).toFixed(0)}K market cap`);
  }
  
  // Large total volume
  if (totalVol > 100000) {
    score += 10;
    flags.push(`✅ Strong total volume: $${(totalVol / 1000).toFixed(0)}K`);
  }
  
  // Clamp score 0-100
  score = Math.max(0, Math.min(100, score));
  
  return { score, flags };
}

// Full creator analysis
export async function analyzeCreator(
  tokens: ClankerToken[],
  wallet: string,
  farcasterUser?: { username: string; displayName: string; pfpUrl: string }
): Promise<CreatorAnalysis> {
  const { score, flags } = calculateRugScore(tokens);
  
  // Determine verdict
  let verdict: CreatorAnalysis['verdict'];
  if (score >= 65) verdict = 'LEGIT';
  else if (score >= 35) verdict = 'SUSPICIOUS';
  else verdict = 'RUGGER';
  
  // Analyze each token
  const tokenAnalyses: TokenAnalysis[] = tokens.map(t => {
    const status = getTokenStatus(t);
    const market = t.related?.market;
    return {
      name: t.name,
      symbol: t.symbol,
      contractAddress: t.contract_address,
      deployedAt: t.created_at,
      mcapNow: market?.marketCap,
      volume24h: market?.volume24h,
      liquidityUsd: market?.liquidityUsd,
      status,
      ageHours: getAgeHours(t.created_at),
      creatorHeld: status !== 'dead', // heuristic
    };
  });
  
  const alive = tokenAnalyses.filter(t => t.status === 'alive');
  const dead = tokenAnalyses.filter(t => t.status === 'dead');
  
  const totalVolume = tokens.reduce(
    (sum, t) => sum + (t.related?.market?.volume24h || 0), 0
  );
  const totalMcap = tokens.reduce(
    (sum, t) => sum + (t.related?.market?.marketCap || 0), 0
  );
  
  const ages = tokenAnalyses.map(t => t.ageHours);
  const avgLifespan = ages.length > 0
    ? ages.reduce((a, b) => a + b, 0) / ages.length
    : 0;
  
  return {
    wallet,
    totalTokensDeployed: tokens.length,
    aliveTokens: alive.length,
    deadTokens: dead.length,
    totalVolumeUsd: totalVolume,
    totalMarketCapUsd: totalMcap,
    averageTokenLifespanHours: avgLifespan,
    rugScore: score,
    verdict,
    tokens: tokenAnalyses,
    flags,
    farcasterUser,
  };
}

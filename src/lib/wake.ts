// WAKE Token Spotter — Bankr ecosystem token analysis
// Free, no auth, Base chain only
// https://wakeonbase.com

const WAKE_API = 'https://wakeonbase.com/api/spotter';

export interface WakeAnalysis {
  cached: boolean;
  fresh_analysis: boolean;
  address: string;
  symbol: string;
  network: string;
  score: number;
  tier: string;
  tags: string[];
  security_advisory: {
    level: string;
    reasons: string[];
    message: string | null;
  };
  breakdown: {
    market_signals: number;
    social_signals: number;
    contract_safety: number;
    deployer_quality: number;
    liquidity_health: number;
  };
  narrative?: string;
  launch_protocol?: string;
}

export async function getWakeAnalysis(tokenAddress: string): Promise<WakeAnalysis | null> {
  try {
    const res = await fetch(`${WAKE_API}/${tokenAddress.toLowerCase()}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Get tier color for UI
export function getWakeTierColor(tier: string): string {
  switch (tier) {
    case 'solid': return 'text-green-400';
    case 'promising': return 'text-emerald-400';
    case 'mixed': return 'text-yellow-400';
    case 'risky': return 'text-orange-400';
    case 'avoid': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

// Get security level color
export function getSecurityColor(level: string): string {
  switch (level) {
    case 'clear': return 'text-green-400';
    case 'caution': return 'text-yellow-400';
    case 'danger': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

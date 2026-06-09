// On-chain wallet tracking layer
// Uses Base RPC to monitor wallet activity on Clanker/Bankr tokens

const BASE_RPC = 'https://mainnet.base.org';

// Uniswap V4 PoolManager on Base
const POOL_MANAGER = '0x498581fF71F2b0731b698679272AE5e53B788C1C';

// Uniswap V4 Swap event signature
// Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)
const SWAP_TOPIC = '0x19b47279256b2a23a1665c810c5d6bcbf2b8b6e5b0c0e0b0a0c0e0f0a0b0c0d0';

// ERC-20 Transfer event
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface WalletTrade {
  txHash: string;
  blockNumber: number;
  timestamp: string;
  tokenAddress: string;
  tokenSymbol: string;
  action: 'buy' | 'sell' | 'transfer';
  amountUsd?: number;
  from: string;
  to: string;
}

export interface WalletProfile {
  address: string;
  totalTrades: number;
  uniqueTokensTraded: number;
  firstSeen: string;
  lastActive: string;
  trades: WalletTrade[];
  tokensTraded: { address: string; symbol: string; count: number }[];
}

// Make RPC call to Base
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Get current block number
export async function getLatestBlock(): Promise<number> {
  const hex = await rpcCall('eth_blockNumber', []);
  return parseInt(hex as string, 16);
}

// Get block timestamp
export async function getBlockTimestamp(blockNumber: number): Promise<number> {
  const block = await rpcCall('eth_getBlockByNumber', [
    '0x' + blockNumber.toString(16),
    false,
  ]) as { timestamp: string };
  return parseInt(block.timestamp, 16);
}

// Get recent Transfer events for a token
export async function getTokenTransfers(
  tokenAddress: string,
  fromBlock: number,
  toBlock: number
): Promise<{ from: string; to: string; value: string; txHash: string; blockNumber: number }[]> {
  try {
    const logs = await rpcCall('eth_getLogs', [{
      fromBlock: '0x' + fromBlock.toString(16),
      toBlock: '0x' + toBlock.toString(16),
      address: tokenAddress,
      topics: [TRANSFER_TOPIC],
    }]) as { topics: string[]; data: string; transactionHash: string; blockNumber: string }[];

    return logs.map(log => ({
      from: '0x' + log.topics[1].slice(26),
      to: '0x' + log.topics[2].slice(26),
      value: log.data,
      txHash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16),
    }));
  } catch {
    return [];
  }
}

// Get recent trades for a wallet across multiple tokens
export async function getWalletActivity(
  walletAddress: string,
  tokenAddresses: string[],
  blockRange = 10000 // ~2 hours on Base
): Promise<WalletTrade[]> {
  const latestBlock = await getLatestBlock();
  const fromBlock = latestBlock - blockRange;
  const walletLower = walletAddress.toLowerCase();

  const trades: WalletTrade[] = [];

  // Check each token for transfers involving this wallet
  const promises = tokenAddresses.slice(0, 10).map(async (tokenAddr) => {
    const transfers = await getTokenTransfers(tokenAddr, fromBlock, latestBlock);
    const relevant = transfers.filter(
      t => t.from.toLowerCase() === walletLower || t.to.toLowerCase() === walletLower
    );
    return relevant.map(t => ({
      txHash: t.txHash,
      blockNumber: t.blockNumber,
      timestamp: new Date().toISOString(), // simplified
      tokenAddress: tokenAddr,
      tokenSymbol: 'TOKEN', // will be enriched
      action: t.to.toLowerCase() === walletLower ? 'buy' as const : 'sell' as const,
      from: t.from,
      to: t.to,
    }));
  });

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled') {
      trades.push(...r.value);
    }
  }

  return trades.sort((a, b) => b.blockNumber - a.blockNumber);
}

// Check if a wallet has interacted with known Clanker pools
export async function checkWalletPoolInteraction(
  walletAddress: string,
  poolAddresses: string[]
): Promise<{ pool: string; hasInteraction: boolean }[]> {
  const latestBlock = await getLatestBlock();
  const fromBlock = latestBlock - 50000; // ~10 hours
  const walletHex = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');

  const results = await Promise.allSettled(
    poolAddresses.slice(0, 5).map(async (pool) => {
      try {
        const logs = await rpcCall('eth_getLogs', [{
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: '0x' + latestBlock.toString(16),
          address: pool,
          topics: [null, '0x' + walletHex],
        }]);
        return { pool, hasInteraction: (logs as unknown[]).length > 0 };
      } catch {
        return { pool, hasInteraction: false };
      }
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ pool: string; hasInteraction: boolean }> => r.status === 'fulfilled')
    .map(r => r.value);
}

// Simple wallet scoring based on available data
export function scoreWallet(trades: WalletTrade[]): {
  score: number;
  label: string;
  tags: string[];
} {
  const tags: string[] = [];
  let score = 50;

  if (trades.length === 0) {
    return { score: 50, label: 'Unknown', tags: ['no-data'] };
  }

  // Active trader
  if (trades.length > 10) {
    score += 10;
    tags.push('active-trader');
  }

  // Diverse portfolio
  const uniqueTokens = new Set(trades.map(t => t.tokenAddress)).size;
  if (uniqueTokens > 5) {
    score += 10;
    tags.push('diverse');
  }

  // Recent activity
  const recentTrades = trades.filter(t => {
    const age = Date.now() - new Date(t.timestamp).getTime();
    return age < 24 * 60 * 60 * 1000; // last 24h
  });
  if (recentTrades.length > 0) {
    score += 5;
    tags.push('recently-active');
  }

  // Buy vs sell ratio
  const buys = trades.filter(t => t.action === 'buy').length;
  const sells = trades.filter(t => t.action === 'sell').length;
  if (buys > sells * 1.5) {
    score += 10;
    tags.push('net-buyer');
  } else if (sells > buys * 1.5) {
    score -= 10;
    tags.push('net-seller');
  }

  let label = 'Trader';
  if (score >= 70) label = 'Smart Money';
  else if (score >= 55) label = 'Active';
  else if (score < 40) label = 'Risky';

  return { score: Math.max(0, Math.min(100, score)), label, tags };
}

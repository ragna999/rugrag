import { NextRequest, NextResponse } from 'next/server';
import { getRecentTokens } from '@/lib/clanker';
import { getTokenTransfers, getLatestBlock } from '@/lib/onchain';

interface WhaleTrade {
  txHash: string;
  tokenAddress: string;
  tokenSymbol: string;
  from: string;
  to: string;
  action: 'buy' | 'sell';
  blockNumber: number;
  explorerUrl: string;
}

// GET /api/whale-tracker
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 20);

    const tokens = await getRecentTokens(10);
    const latestBlock = await getLatestBlock();
    const fromBlock = latestBlock - 5000;

    const whaleTrades: WhaleTrade[] = [];

    const promises = tokens.slice(0, 5).map(async (token) => {
      try {
        const transfers = await getTokenTransfers(
          token.contract_address,
          fromBlock,
          latestBlock
        );

        for (const t of transfers.slice(0, 5)) {
          const value = parseInt(t.value, 16);
          if (value > 0) {
            whaleTrades.push({
              txHash: t.txHash,
              tokenAddress: token.contract_address,
              tokenSymbol: token.symbol,
              from: `${t.from.slice(0, 6)}...${t.from.slice(-4)}`,
              to: `${t.to.slice(0, 6)}...${t.to.slice(-4)}`,
              action: 'buy',
              blockNumber: t.blockNumber,
              explorerUrl: `https://basescan.org/tx/${t.txHash}`,
            });
          }
        }
      } catch {
        // skip
      }
    });

    await Promise.allSettled(promises);
    whaleTrades.sort((a, b) => b.blockNumber - a.blockNumber);

    return NextResponse.json({
      trades: whaleTrades.slice(0, limit),
      tokensMonitored: Math.min(tokens.length, 5),
      blockRange: `${fromBlock} - ${latestBlock}`,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Whale tracker error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

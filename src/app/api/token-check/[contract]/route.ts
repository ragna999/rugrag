import { NextRequest, NextResponse } from 'next/server';
import { getTokenByAddress, getTokensByCreator } from '@/lib/clanker';
import { analyzeCreator } from '@/lib/scorer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contract: string }> }
) {
  try {
    const { contract } = await params;
    if (!contract || !contract.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const token = await getTokenByAddress(contract);
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const m = token.related?.market;
    const deployer = token.msg_sender;

    let creator = null;
    if (deployer) {
      try {
        const searchResult = await getTokensByCreator(deployer, 20);
        creator = await analyzeCreator(
          searchResult.tokens || [],
          deployer,
          searchResult.user ? {
            username: searchResult.user.username,
            displayName: searchResult.user.displayName,
            pfpUrl: searchResult.user.pfpUrl,
          } : undefined
        );
      } catch (e) {
        console.error('Creator analysis failed:', e);
      }
    }

    return NextResponse.json({
      token: {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contract_address,
        deployedAt: token.created_at,
        market: {
          mcap: m?.marketCap || 0,
          price: m?.priceUsd || 0,
          volume24h: m?.volume24h || 0,
          priceChange24h: m?.priceChangePercent24h || 0,
        },
        pair: token.pair,
      },
      creator,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getTokenByAddress, getTokensByCreator, normalizeMarket } from '@/lib/clanker';
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

    const market = normalizeMarket(token);
    const deployer = token.msg_sender;

    let creator = null;
    if (deployer) {
      try {
        const searchResult = await getTokensByCreator(deployer, 50);
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
        market,
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

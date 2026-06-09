import { NextRequest, NextResponse } from 'next/server';
import { getTokenByAddress, getTokensByCreator } from '@/lib/clanker';
import { analyzeCreator } from '@/lib/scorer';

// GET /api/token-check/{contract}
// Check a token's creator reputation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contract: string }> }
) {
  try {
    const { contract } = await params;
    
    if (!contract || !contract.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid contract address' },
        { status: 400 }
      );
    }

    // Find the token
    const token = await getTokenByAddress(contract);
    if (!token) {
      return NextResponse.json(
        { error: 'Token not found on Clanker' },
        { status: 404 }
      );
    }

    // Get the deployer address
    const deployer = token.msg_sender;
    if (!deployer) {
      return NextResponse.json({
        token: {
          name: token.name,
          symbol: token.symbol,
          contractAddress: token.contract_address,
          market: token.related?.market,
        },
        creator: null,
        message: 'Deployer address not available',
      });
    }

    // Analyze the creator
    const searchResult = await getTokensByCreator(deployer, 50, 0);
    const analysis = await analyzeCreator(
      searchResult.tokens || [],
      deployer,
      searchResult.user ? {
        username: searchResult.user.username,
        displayName: searchResult.user.displayName,
        pfpUrl: searchResult.user.pfpUrl,
      } : undefined
    );

    return NextResponse.json({
      token: {
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contract_address,
        deployedAt: token.created_at,
        market: token.related?.market,
        pair: token.pair,
      },
      creator: analysis,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json(
      { error: 'Failed to check token' },
      { status: 500 }
    );
  }
}

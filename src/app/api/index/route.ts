import { NextRequest, NextResponse } from 'next/server';
import { getTrendingTokens, getNewTokens } from '@/lib/geckoterminal';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'trending';

    const tokens = sort === 'new'
      ? await getNewTokens()
      : await getTrendingTokens();

    return NextResponse.json({
      tokens,
      count: tokens.length,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Index error:', error);
    return NextResponse.json({ tokens: [], error: 'Failed' }, { status: 500 });
  }
}

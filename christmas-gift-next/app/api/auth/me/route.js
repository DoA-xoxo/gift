import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../lib/auth.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const token = request.cookies.get('event_session')?.value;
  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ loggedIn: false }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ loggedIn: false }, { status: 500 });

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  let accountQuery = supabase.from('event_users').select('id,nickname');
  accountQuery = session.id ? accountQuery.eq('id', session.id) : accountQuery.eq('nickname', session.nickname);
  const { data: account, error: accountError } = await accountQuery.maybeSingle();

  if (accountError || !account) return NextResponse.json({ loggedIn: false }, { status: 401 });

  const { data: wallet, error: walletError } = await supabase
    .from('point_wallets')
    .select('balance')
    .eq('account_id', account.id)
    .maybeSingle();

  if (walletError) {
    console.error('Shared point balance lookup failed:', walletError.message);
    return NextResponse.json({ error: '포인트 잔액을 불러오지 못했어요.' }, { status: 500 });
  }

  return NextResponse.json({
    loggedIn: true,
    nickname: account.nickname,
    points: Number(wallet?.balance ?? 0),
  });
}

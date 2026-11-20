import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '../../../../lib/admin-auth.js';

export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    if (!verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
      return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Supabase 환경변수를 확인해 주세요.' }, { status: 500 });

    const [{ data: users, error: usersError }, { data: wallets, error: walletsError }, { data: transactions, error: txError }] = await Promise.all([
      supabase.from('event_users').select('id,nickname').order('nickname', { ascending: true }),
      supabase.from('point_wallets').select('account_id,balance'),
      supabase.from('point_transactions').select('id,account_id,amount,transaction_type,source_site,description,created_at').order('created_at', { ascending: false }).limit(500),
    ]);

    if (usersError || walletsError || txError) {
      console.error('Shared points admin load failed:', usersError || walletsError || txError);
      return NextResponse.json({ error: '회원 또는 포인트 거래 내역을 불러오지 못했습니다.' }, { status: 500 });
    }

    const balanceById = new Map((wallets || []).map(row => [row.account_id, Number(row.balance || 0)]));
    const nicknameById = new Map((users || []).map(row => [row.id, row.nickname]));
    return NextResponse.json({
      users: (users || []).map(user => ({ id: user.id, nickname: user.nickname, balance: balanceById.get(user.id) || 0 })),
      transactions: (transactions || []).map(tx => ({ ...tx, nickname: nicknameById.get(tx.account_id) || '(회원 정보 없음)' })),
    });
  } catch (error) {
    console.error('Shared points admin GET failed:', error);
    return NextResponse.json({ error: '포인트 관리 정보를 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
      return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const accountId = typeof body.accountId === 'string' ? body.accountId : '';
    const amount = Number(body.amount);
    const direction = body.direction;
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 120) : '';

    if (!accountId || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000 || !['grant', 'deduct'].includes(direction)) {
      return NextResponse.json({ error: '회원, 처리 종류, 포인트 수량을 확인해 주세요.' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Supabase 환경변수를 확인해 주세요.' }, { status: 500 });

    const { data: member, error: memberError } = await supabase
      .from('event_users').select('id,nickname').eq('id', accountId).maybeSingle();
    if (memberError || !member) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });

    const { data: balance, error: changeError } = await supabase.rpc('change_shared_points', {
      p_account_id: accountId,
      p_delta: direction === 'grant' ? amount : -amount,
      p_source_site: 'admin',
      p_transaction_type: direction === 'grant' ? 'admin_grant' : 'admin_deduct',
      p_description: description || (direction === 'grant' ? '관리자 포인트 지급' : '관리자 포인트 회수'),
      p_idempotency_key: `admin:${randomUUID()}`,
    });

    if (changeError) {
      console.error('Shared points admin change failed:', changeError);
      const message = /insufficient|잔액|balance/i.test(changeError.message || '')
        ? '회원의 공통 포인트 잔액이 부족합니다.'
        : '포인트 변경에 실패했습니다. 서버 로그를 확인해 주세요.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true, nickname: member.nickname, balance: Number(balance) });
  } catch (error) {
    console.error('Shared points admin POST failed:', error);
    return NextResponse.json({ error: '포인트 변경 요청을 처리하지 못했습니다.' }, { status: 500 });
  }
}

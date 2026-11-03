import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, createHmac } from 'node:crypto';
import { verifySessionToken } from '../../../../lib/auth.js';

export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function createSessionToken(id, nickname) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters');
  const payload = Buffer.from(JSON.stringify({
    id, nickname,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    nonce: randomBytes(16).toString('hex'),
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export async function POST(request) {
  try {
    const session = verifySessionToken((await cookies()).get('event_session')?.value);
    if (!session) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

    const body = await request.json();
    const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
    if (!/^[a-zA-Z0-9가-힣_-]{1,20}$/.test(nickname)) {
      return NextResponse.json({ error: '아이디는 한글, 영문, 숫자, _ 또는 -로 1~20자 입력해 주세요.' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: '서버 환경변수를 확인해 주세요.' }, { status: 500 });

    let accountQuery = supabase.from('event_users').select('id,nickname');
    accountQuery = session.id ? accountQuery.eq('id', session.id) : accountQuery.eq('nickname', session.nickname);
    const { data: account, error: accountError } = await accountQuery.maybeSingle();
    if (accountError || !account) return NextResponse.json({ error: '계정 정보를 찾을 수 없어요. 다시 로그인해 주세요.' }, { status: 404 });
    const currentNickname = account.nickname;
    if (nickname === currentNickname) return NextResponse.json({ error: '현재 아이디와 같아요.' }, { status: 400 });

    const { data: duplicate, error: duplicateError } = await supabase
      .from('event_users').select('id').eq('nickname_normalized', nickname.toLocaleLowerCase()).maybeSingle();
    if (duplicateError) return NextResponse.json({ error: '아이디 중복 여부를 확인하지 못했어요.' }, { status: 500 });
    if (duplicate && duplicate.id !== account.id) return NextResponse.json({ error: '이미 사용 중인 아이디예요.' }, { status: 409 });

    const { data: stateRow, error: stateError } = await supabase
      .from('event_state').select('state').eq('id', 1).single();
    if (stateError || !stateRow?.state) return NextResponse.json({ error: '랭킹 데이터를 불러오지 못했어요.' }, { status: 500 });

    const state = stateRow.state;
    const ranks = {
      human: [...(state.ranks?.human || [])],
      soldier: [...(state.ranks?.soldier || [])],
      mouse: [...(state.ranks?.mouse || [])],
    };
    for (const team of Object.keys(ranks)) {
      ranks[team] = ranks[team].map(item => item.name === currentNickname ? { ...item, name: nickname } : item);
    }

    const { error: updateAccountError } = await supabase
      .from('event_users').update({ nickname }).eq('id', account.id);
    if (updateAccountError) {
      if (updateAccountError.code === '23505') return NextResponse.json({ error: '이미 사용 중인 아이디예요.' }, { status: 409 });
      return NextResponse.json({ error: '계정 아이디 변경에 실패했어요.' }, { status: 500 });
    }

    const { data: updatedLogs, error: logsError } = await supabase
      .from('event_action_logs').update({ nickname }).eq('nickname', currentNickname).select('id');
    if (logsError) {
      await supabase.from('event_users').update({ nickname: currentNickname }).eq('id', account.id);
      return NextResponse.json({ error: '작업 기록의 아이디 변경에 실패했어요.' }, { status: 500 });
    }

    const { error: saveStateError } = await supabase
      .from('event_state').update({ state: { ...state, ranks } }).eq('id', 1);
    if (saveStateError) {
      const ids = (updatedLogs || []).map(row => row.id);
      if (ids.length) await supabase.from('event_action_logs').update({ nickname: currentNickname }).in('id', ids);
      await supabase.from('event_users').update({ nickname: currentNickname }).eq('id', account.id);
      return NextResponse.json({ error: '랭킹 저장에 실패했어요. 변경 상태를 확인한 후 다시 시도해 주세요.' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, nickname });
    response.cookies.set('event_session', createSessionToken(account.id, nickname), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error('Shared nickname update failed:', error);
    return NextResponse.json({ error: '아이디 변경 요청을 처리하지 못했어요.' }, { status: 500 });
  }
}

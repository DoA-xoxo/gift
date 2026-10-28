
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, createHmac } from 'node:crypto';
import { verifySessionToken } from '../../../../lib/auth.js';

export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createSessionToken(nickname) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is missing');

  const payload = Buffer.from(
    JSON.stringify({
      nickname,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      nonce: randomBytes(16).toString('hex'),
    })
  ).toString('base64url');

  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('event_session')?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요해요.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const nickname =
      typeof body?.nickname === 'string'
        ? body.nickname.trim()
        : '';

    if (
      nickname.length < 1 ||
      nickname.length > 20 ||
      !/^[a-zA-Z0-9가-힣_-]+$/.test(nickname)
    ) {
      return NextResponse.json(
        { error: '닉네임은 한글, 영문, 숫자, _ 또는 -로 1~20자 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (nickname === session.nickname) {
      return NextResponse.json(
        { error: '현재 닉네임과 같아요.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json(
        { error: '서버 환경변수를 확인해 주세요.' },
        { status: 500 }
      );
    }

    const { data: user, error: findError } = await supabase
      .from('event_users')
      .select('nickname')
      .eq('nickname', session.nickname)
      .maybeSingle();

    if (findError || !user) {
      return NextResponse.json(
        { error: '계정 정보를 찾을 수 없어요. 다시 로그인해 주세요.' },
        { status: 404 }
      );
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from('event_users')
      .select('nickname')
      .eq('nickname', nickname)
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json(
        { error: '닉네임을 확인하지 못했어요.' },
        { status: 500 }
      );
    }

    if (duplicate) {
      return NextResponse.json(
        { error: '이미 사용 중인 닉네임이에요.' },
        { status: 409 }
      );
    }

    const { data: stateRow, error: stateError } = await supabase
      .from('event_state')
      .select('state')
      .eq('id', 1)
      .single();

    if (stateError || !stateRow?.state) {
      return NextResponse.json(
        { error: '랭킹 데이터를 불러오지 못했어요.' },
        { status: 500 }
      );
    }

    const state = stateRow.state;
    const ranks = {
      human: [...(state.ranks?.human || [])],
      soldier: [...(state.ranks?.soldier || [])],
      mouse: [...(state.ranks?.mouse || [])],
    };

    for (const team of Object.keys(ranks)) {
      ranks[team] = ranks[team].map(item =>
        item.name === session.nickname
          ? { ...item, name: nickname }
          : item
      );
    }

    const { error: updateUserError } = await supabase
      .from('event_users')
      .update({ nickname })
      .eq('nickname', session.nickname);

    if (updateUserError) {
      if (updateUserError.code === '23505') {
        return NextResponse.json(
          { error: '이미 사용 중인 닉네임이에요.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: '계정 닉네임 변경에 실패했어요.' },
        { status: 500 }
      );
    }

    const { error: saveStateError } = await supabase
      .from('event_state')
      .update({ state: { ...state, ranks } })
      .eq('id', 1);


    // 작업 기록의 닉네임도 함께 변경
    const { data: updatedLogs, error: updateLogsError } = await supabase
      .from('event_action_logs')
      .update({ nickname })
      .eq('nickname', session.nickname)
      .select('id');

    if (updateLogsError) {
      await supabase
        .from('event_users')
        .update({ nickname: session.nickname })
        .eq('nickname', nickname);

      return NextResponse.json(
        { error: '작업 기록의 닉네임 변경에 실패했어요.' },
        { status: 500 }
      );
    }

    const updatedLogIds = (updatedLogs || []).map(log => log.id);

    const { error: saveStateError } = await supabase
      .from('event_state')
      .update({ state: { ...state, ranks } })
      .eq('id', 1);

    if (saveStateError) {
      // 이번 요청에서 변경한 작업 기록만 원래 닉네임으로 복구
      if (updatedLogIds.length > 0) {
        await supabase
          .from('event_action_logs')
          .update({ nickname: session.nickname })
          .in('id', updatedLogIds);
      }

      await supabase
        .from('event_users')
        .update({ nickname: session.nickname })
        .eq('nickname', nickname);

      return NextResponse.json(
        { error: '랭킹 저장에 실패해 변경을 취소했어요. 다시 시도해 주세요.' },
        { status: 500 }
      );
    }


    const response = NextResponse.json({
      success: true,
      nickname,
    });

    response.cookies.set(
      'event_session',
      createSessionToken(nickname),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error('Nickname rename failed:', error);

    return NextResponse.json(
      { error: '닉네임 변경 요청을 처리하지 못했어요.' },
      { status: 500 }
    );
  }
}

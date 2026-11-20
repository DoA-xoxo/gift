

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { verifySessionToken } from '../../../lib/auth.js';

export const runtime = 'nodejs';

const TEAMS = ['human', 'soldier', 'mouse'];
const MAX_CONTRIBUTION = 1000;
const MAX_SABOTAGE = 100;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json(
        { error: '서버 환경변수를 확인해 주세요.' },
        { status: 500 }
      );
    }

    let accountQuery = supabase.from('event_users').select('id,nickname');
    accountQuery = session.id ? accountQuery.eq('id', session.id) : accountQuery.eq('nickname', session.nickname);
    const { data: account, error: accountError } = await accountQuery.maybeSingle();
    if (accountError || !account) {
      return NextResponse.json({ error: '계정 정보를 찾을 수 없어요. 다시 로그인해 주세요.' }, { status: 401 });
    }
    const actorNickname = account.nickname;

    const { data: row, error: readError } = await supabase
      .from('event_state')
      .select('state')
      .eq('id', 1)
      .single();

    if (readError || !row?.state) {
      return NextResponse.json(
        { error: '공유 데이터를 불러오지 못했어요.' },
        { status: 500 }
      );
    }

    const state = row.state;
    const progress = { ...state.progress };
    const ranks = {
      human: [...(state.ranks?.human || [])],
      soldier: [...(state.ranks?.soldier || [])],
      mouse: [...(state.ranks?.mouse || [])],
    };

    if (body?.action === 'contribute') {
      const { team, points } = body;

      if (
        !TEAMS.includes(team) ||
        !Number.isSafeInteger(points) ||
        points < 1 ||
        points > MAX_CONTRIBUTION
      ) {
        return NextResponse.json(
          { error: '팀 또는 기여 포인트가 올바르지 않아요. 한 번에 최대 1,000 포인트까지 사용할 수 있어요.' },
          { status: 400 }
        );
      }

      progress[team] = Math.min(
        100,
        +(progress[team] + points * 0.05).toFixed(1)
      );

      const index = ranks[team].findIndex(
        r => r.name === actorNickname
      );

      if (index >= 0) {
        ranks[team][index] = {
          ...ranks[team][index],
          points: ranks[team][index].points + points,
        };
      } else {
        ranks[team].push({
          name: actorNickname,
          points,
        });
      }

      ranks[team].sort((a, b) => b.points - a.points);
    } else if (body?.action === 'sabotage') {
      const { target, points } = body;

      if (
        !TEAMS.includes(target) ||
        !Number.isSafeInteger(points) ||
        points < 1 ||
        points > MAX_SABOTAGE
      ) {
        return NextResponse.json(
          { error: '팀 또는 방해 포인트가 올바르지 않아요. 한 번에 최대 100 포인트까지 사용할 수 있어요.' },
          { status: 400 }
        );
      }
      
  // 제작도가 100%인 팀은 방해할 수 없음
  if (progress[target] >= 100) {
    return NextResponse.json(
      { error: '이미 선물 제작을 완료한 팀은 방해할 수 없어요! 🎁' },
      { status: 400 }
    );
  }
      
      progress[target] = Math.max(
        0,
        +(progress[target] - points * 0.01).toFixed(1)
      );
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 요청이에요.' },
        { status: 400 }
      );
    }

    const actionType = body.action === 'contribute' ? 'gift_contribution' : 'gift_sabotage';
    const spentPoints = body.points;
    const requestKey = randomUUID();

    const { error: debitError } = await supabase.rpc('change_shared_points', {
      p_account_id: account.id,
      p_delta: -spentPoints,
      p_source_site: 'gift',
      p_transaction_type: actionType,
      p_description: body.action === 'contribute'
        ? `${actorNickname} 님의 ${TEAMS.find(t => t.id === body.team).name} 팀 기여`
        : `${actorNickname} 님의 ${TEAMS.find(t => t.id === body.target).name} 팀 방해`,
      p_idempotency_key: `gift:${requestKey}`,
    });

    if (debitError) {
      console.error('Shared point debit failed:', debitError.message);
      const message = /insufficient|balance|negative/i.test(debitError.message)
        ? '공통 포인트 잔액이 부족해요.'
        : '포인트 차감에 실패했어요. 잠시 후 다시 시도해 주세요.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { error: saveError } = await supabase
      .from('event_state')
      .update({ state: { ...state, progress, ranks } })
      .eq('id', 1);

    if (saveError) {
      const { error: refundError } = await supabase.rpc('change_shared_points', {
        p_account_id: account.id,
        p_delta: spentPoints,
        p_source_site: 'gift',
        p_transaction_type: 'gift_action_refund',
        p_description: '이벤트 데이터 저장 실패로 포인트 환불',
        p_idempotency_key: `gift:refund:${requestKey}`,
      });
      if (refundError) console.error('Shared point refund failed:', refundError.message);

      return NextResponse.json(
        { error: refundError
          ? '저장에 실패했고 자동 환불도 완료되지 않았어요. 관리자에게 문의해 주세요.'
          : '공유 데이터 저장에 실패해 포인트를 환불했어요.' },
        { status: 500 }
      );
    }

    const { data: updatedWallet, error: balanceError } = await supabase
      .from('point_wallets')
      .select('balance')
      .eq('account_id', account.id)
      .single();

    if (balanceError) console.error('Shared point balance refresh failed:', balanceError.message);

    const logAction =
      body?.action === 'contribute' ? 'contribute' : 'sabotage';

    const logTeam =
      logAction === 'contribute' ? body.team : body.target;

    const { error: logError } = await supabase
      .from('event_action_logs')
      .insert({
        nickname: actorNickname,
        action: logAction,
        team: logTeam,
        points: body.points,
      });

    if (logError) {
      console.error('Event action log failed:', logError.message);
    }

    return NextResponse.json({
      success: true,
      progress,
      ranks,
      balance: Number(updatedWallet?.balance ?? 0),
    });
  } catch (error) {
    console.error('Event action failed:', error);
    return NextResponse.json(
      { error: '요청을 처리하지 못했어요.' },
      { status: 400 }
    );
  }
}

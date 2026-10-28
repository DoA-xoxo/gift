
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

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
          { error: '팀 또는 기여 포인트가 올바르지 않아요. 한 번에 최대 1,000포인트까지 사용할 수 있어요.' },
          { status: 400 }
        );
      }

      progress[team] = Math.min(
        100,
        +(progress[team] + points / 10).toFixed(1)
      );

      const index = ranks[team].findIndex(
        r => r.name === session.nickname
      );

      if (index >= 0) {
        ranks[team][index] = {
          ...ranks[team][index],
          points: ranks[team][index].points + points,
        };
      } else {
        ranks[team].push({
          name: session.nickname,
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
          { error: '팀 또는 방해 포인트가 올바르지 않아요. 한 번에 최대 100포인트까지 사용할 수 있어요.' },
          { status: 400 }
        );
      }

      progress[target] = Math.max(
        0,
        +(progress[target] - points * 0.05).toFixed(1)
      );
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 요청이에요.' },
        { status: 400 }
      );
    }

    const { error: saveError } = await supabase
      .from('event_state')
      .update({ state: { ...state, progress, ranks } })
      .eq('id', 1);

    if (saveError) {
      return NextResponse.json(
        { error: '공유 데이터 저장에 실패했어요.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress,
      ranks,
    });
  } catch (error) {
    console.error('Event action failed:', error);
    return NextResponse.json(
      { error: '요청을 처리하지 못했어요.' },
      { status: 400 }
    );
  }
}


import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminToken,
  ADMIN_COOKIE_NAME,
} from '../../../../lib/admin-auth.js';

export const runtime = 'nodejs';

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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!verifyAdminToken(token)) {
      return NextResponse.json(
        { error: '관리자 로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase 서버 환경변수를 확인해 주세요.' },
        { status: 500 }
      );
    }

    const { data: stateRow, error: stateError } = await supabase
      .from('event_state')
      .select('state')
      .eq('id', 1)
      .single();

    if (stateError) {
      return NextResponse.json(
        { error: '이벤트 현황을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    const { data: logs, error: logsError } = await supabase
      .from('event_action_logs')
      .select('id, nickname, action, team, points, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (logsError) {
      return NextResponse.json(
        { error: '사용 내역을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    const users = {};

    for (const log of logs || []) {
      if (!users[log.nickname]) {
        users[log.nickname] = {
          nickname: log.nickname,
          contributePoints: 0,
          sabotagePoints: 0,
          actions: 0,
          teams: [],
        };
      }

      const user = users[log.nickname];
      user.actions += 1;

      if (!user.teams.includes(log.team)) {
        user.teams.push(log.team);
      }

      if (log.action === 'contribute') {
        user.contributePoints += log.points;
      } else if (log.action === 'sabotage') {
        user.sabotagePoints += log.points;
      }
    }

    return NextResponse.json({
      progress: stateRow.state?.progress || {
        human: 0,
        soldier: 0,
        mouse: 0,
      },
      ranks: stateRow.state?.ranks || {
        human: [],
        soldier: [],
        mouse: [],
      },
      users: Object.values(users).sort(
        (a, b) =>
          b.contributePoints + b.sabotagePoints -
          (a.contributePoints + a.sabotagePoints)
      ),
      logs: logs || [],
    });
  } catch {
    return NextResponse.json(
      { error: '관리자 현황을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}


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

export async function POST() {
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

    const { data: row, error: readError } = await supabase
      .from('event_state')
      .select('state')
      .eq('id', 1)
      .single();

    if (readError || !row?.state) {
      return NextResponse.json(
        { error: '기존 이벤트 현황을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    const newState = {
      ...row.state,
      progress: { human: 0, soldier: 0, mouse: 0 },
      ranks: { human: [], soldier: [], mouse: [] },
    };

    const { error: updateError } = await supabase
      .from('event_state')
      .update({ state: newState })
      .eq('id', 1);

    if (updateError) {
      return NextResponse.json(
        { error: '이벤트 현황 초기화에 실패했습니다.' },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabase
      .from('event_action_logs')
      .delete()
      .gt('id', 0);

    if (deleteError) {
      console.error('Admin log reset failed:', deleteError.message);

      return NextResponse.json(
        {
          success: true,
          warning: '현황은 초기화했지만 사용 내역 삭제는 실패했습니다.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '초기화 요청을 처리하지 못했습니다.' },
      { status: 500 }
    );
  }
}

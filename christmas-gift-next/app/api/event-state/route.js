
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

export async function GET() {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json(
        { error: '서버 환경변수를 확인해 주세요.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('event_state')
      .select('state')
      .eq('id', 1)
      .single();

    if (error) {
      return NextResponse.json(
        { error: '공유 데이터를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data.state);
  } catch {
    return NextResponse.json(
      { error: '요청을 처리하지 못했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json(
        { error: '서버 환경변수를 확인해 주세요.' },
        { status: 500 }
      );
    }

    const body = await request.json();

    const validTeams = ['human', 'soldier', 'mouse'];
    const validProgress =
      body?.progress &&
      validTeams.every(
        (team) =>
          typeof body.progress[team] === 'number' &&
          Number.isFinite(body.progress[team]) &&
          body.progress[team] >= 0 &&
          body.progress[team] <= 100
      );

    const validRanks =
      body?.ranks &&
      validTeams.every(
        (team) =>
          Array.isArray(body.ranks[team]) &&
          body.ranks[team].every(
            (r) =>
              typeof r.name === 'string' &&
              typeof r.points === 'number' &&
              Number.isFinite(r.points) &&
              r.points >= 0
          )
      );

    if (!validProgress || !validRanks) {
      return NextResponse.json(
        { error: '데이터 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('event_state')
      .update({ state: body })
      .eq('id', 1);

    if (error) {
      return NextResponse.json(
        { error: '공유 데이터 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '요청을 처리하지 못했습니다.' },
      { status: 400 }
    );
  }
}

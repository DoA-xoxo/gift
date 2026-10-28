
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


export async function POST() {
  return NextResponse.json(
    { error: '이 방식의 데이터 수정은 비활성화되었습니다.' },
    { status: 405 }
  );
}

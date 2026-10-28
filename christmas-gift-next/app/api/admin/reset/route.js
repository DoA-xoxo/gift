
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { password } = await request.json();

    const adminPassword = process.env.ADMIN_PASSWORD;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

const missing = [];

if (!adminPassword) missing.push('ADMIN_PASSWORD');
if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
if (!secretKey) missing.push('SUPABASE_SECRET_KEY');

if (missing.length > 0) {
  return NextResponse.json(
    {
      error: '누락된 서버 환경변수: ' + missing.join(', '),
    },
    { status: 500 }
  );
}

    if (
      typeof password !== 'string' ||
      password.length === 0 ||
      password !== adminPassword
    ) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase
      .from('event_state')
      .update({
        state: {
          progress: {
            human: 0,
            soldier: 0,
            mouse: 0,
          },
          ranks: {
            human: [],
            soldier: [],
            mouse: [],
          },
        },
      })
      .eq('id', 1);

    if (error) {
      console.error('Admin reset failed:', error.message);

      return NextResponse.json(
        { error: '데이터 초기화에 실패했습니다.' },
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

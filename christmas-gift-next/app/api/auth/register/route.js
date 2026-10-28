
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

export const runtime = 'nodejs';

const scrypt = promisify(scryptCallback);

export async function POST(request) {
  try {
    const body = await request.json();
    const nickname = body?.nickname?.trim();
    const password = body?.password;

    if (
      typeof nickname !== 'string' ||
      nickname.length < 1 ||
      nickname.length > 20 ||
      !/^[a-zA-Z0-9가-힣_-]+$/.test(nickname)
    ) {
      return NextResponse.json(
        { error: '닉네임은 1~20자의 한글, 영문, 숫자, _ 또는 -만 사용할 수 있어요.' },
        { status: 400 }
      );
    }

    if (
      typeof password !== 'string' ||
      password.length < 4 ||
      password.length > 128
    ) {
      return NextResponse.json(
        { error: '비밀번호는 4~128자로 입력해 주세요.' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: '서버 환경변수를 확인해 주세요.' },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scrypt(password, salt, 64);
    const passwordHash =
      `${salt}:${Buffer.from(derivedKey).toString('hex')}`;

    const { error } = await supabase
      .from('event_users')
      .insert({
        nickname,
        password_hash: passwordHash,
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 사용 중인 닉네임이에요.' },
          { status: 409 }
        );
      }

      console.error('Account registration failed:', error.code);

      return NextResponse.json(
        { error: '계정을 등록하지 못했어요.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: '요청을 처리하지 못했어요.' },
      { status: 400 }
    );
  }
}

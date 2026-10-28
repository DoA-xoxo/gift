
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  scrypt as scryptCallback,
  timingSafeEqual,
  createHmac,
} from 'node:crypto';
import { promisify } from 'node:util';

export const runtime = 'nodejs';

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = 'event_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function signSession(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');

  return `${encoded}.${signature}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nickname =
      typeof body?.nickname === 'string' ? body.nickname.trim() : '';
    const password = body?.password;

    if (
      !nickname ||
      nickname.length > 20 ||
      typeof password !== 'string' ||
      password.length > 128
    ) {
      return NextResponse.json(
        { error: '닉네임 또는 비밀번호를 확인해 주세요.' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sessionSecret = process.env.AUTH_SECRET;

    if (!url || !key || !sessionSecret || sessionSecret.length < 32) {
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

    const { data, error } = await supabase
      .from('event_users')
      .select('nickname, password_hash')
      .eq('nickname', nickname)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: '로그인을 처리하지 못했어요.' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '닉네임 또는 비밀번호가 올바르지 않아요.' },
        { status: 401 }
      );
    }

    const [salt, savedHash, extra] = data.password_hash.split(':');

    if (
      extra !== undefined ||
      !/^[a-f0-9]{32}$/.test(salt || '') ||
      !/^[a-f0-9]{128}$/.test(savedHash || '')
    ) {
      return NextResponse.json(
        { error: '계정 정보를 확인할 수 없어요.' },
        { status: 500 }
      );
    }

    const derivedKey = Buffer.from(
      await scrypt(password, salt, 64)
    );
    const expectedHash = Buffer.from(savedHash, 'hex');

    if (
      derivedKey.length !== expectedHash.length ||
      !timingSafeEqual(derivedKey, expectedHash)
    ) {
      return NextResponse.json(
        { error: '닉네임 또는 비밀번호가 올바르지 않아요.' },
        { status: 401 }
      );
    }

    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const token = signSession(
      { nickname: data.nickname, exp: expiresAt },
      sessionSecret
    );

    const response = NextResponse.json({
      success: true,
      nickname: data.nickname,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: '요청을 처리하지 못했어요.' },
      { status: 400 }
    );
  }
}

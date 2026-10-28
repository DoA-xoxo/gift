
import { NextResponse } from 'next/server';
import {
  createAdminToken,
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_SECONDS,
} from '../../../../lib/admin-auth.js';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || !process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json(
        { error: '관리자 서버 환경변수를 확인해 주세요.' },
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

    const token = createAdminToken();
    const response = NextResponse.json({ success: true });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_SESSION_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: '로그인 요청을 처리하지 못했습니다.' },
      { status: 400 }
    );
  }
}

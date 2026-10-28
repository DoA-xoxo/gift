
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
} from '../../../../lib/admin-auth.js';

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}

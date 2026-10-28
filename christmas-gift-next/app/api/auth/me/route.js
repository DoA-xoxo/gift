
import { NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../lib/auth.js';

export async function GET(request) {
  const token = request.cookies.get('event_session')?.value;

  if (!token) {
    return NextResponse.json(
      { loggedIn: false },
      { status: 401 }
    );
  }

  const session = verifySessionToken(token);

  if (!session) {
    return NextResponse.json(
      { loggedIn: false },
      { status: 401 }
    );
  }

  return NextResponse.json({
    loggedIn: true,
    nickname: session.nickname,
  });
}

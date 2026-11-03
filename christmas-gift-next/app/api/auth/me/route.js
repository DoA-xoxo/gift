import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../lib/auth.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const token = request.cookies.get('event_session')?.value;
  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ loggedIn: false }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ loggedIn: false }, { status: 500 });
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  let accountQuery = supabase.from('event_users').select('nickname');
  accountQuery = session.id ? accountQuery.eq('id', session.id) : accountQuery.eq('nickname', session.nickname);
  const { data, error } = await accountQuery.maybeSingle();
  if (error || !data) return NextResponse.json({ loggedIn: false }, { status: 401 });
  return NextResponse.json({ loggedIn: true, nickname: data.nickname });
}

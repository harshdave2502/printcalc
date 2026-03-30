import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'harshdave35@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PrintCalcAdmin@2024';
const SESSION_TOKEN = 'printcalc_admin_session';

// GET — check if authenticated
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_TOKEN);
  if (token?.value === process.env.ADMIN_SESSION_SECRET || token?.value === 'admin_authenticated_2024') {
    return NextResponse.json({ authed: true });
  }
  return NextResponse.json({ authed: false });
}

// POST — login
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // Check against env vars or defaults
  const validEmail = process.env.ADMIN_EMAIL || ADMIN_EMAIL;
  const validPassword = process.env.ADMIN_PASSWORD || ADMIN_PASSWORD;

  if (email === validEmail && password === validPassword) {
    const sessionValue = process.env.ADMIN_SESSION_SECRET || 'admin_authenticated_2024';
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_TOKEN, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
}

// DELETE — logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_TOKEN);
  return response;
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Store new password in admin_settings in Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabase.from('admin_settings').upsert({ key: 'admin_password_hash', value: password }, { onConflict: 'key' });
  // Note: In production use proper bcrypt hashing

  return NextResponse.json({ success: true });
}

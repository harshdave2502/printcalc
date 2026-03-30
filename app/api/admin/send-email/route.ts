import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { type, email, business_name } = await req.json();

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@printcalc.app';

  if (!RESEND_KEY) {
    // Log but don't fail — email is optional for now
    console.log(`[EMAIL] Would send ${type} email to ${email}`);
    return NextResponse.json({ success: true, note: 'No Resend key configured' });
  }

  let subject = '';
  let html = '';

  if (type === 'approved') {
    subject = `✅ Your PrintCalc account is approved — ${business_name}`;
    html = `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #1A1A1A; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <div style="width: 12px; height: 12px; background: #C84B31; border-radius: 50%; margin: 0 auto 16px;"></div>
          <h1 style="font-size: 24px; font-weight: 600; color: #fff; margin-bottom: 8px;">You're approved! 🎉</h1>
          <p style="color: #888; font-size: 14px;">Your PrintCalc account is now active</p>
        </div>
        <div style="background: #F9F9F9; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <p style="font-size: 15px; color: #1A1A1A; margin-bottom: 12px;">Hi <strong>${business_name}</strong>,</p>
          <p style="font-size: 14px; color: #555; line-height: 1.7; margin-bottom: 16px;">
            Your PrintCalc account has been approved and is now active. You can now log in and start using your printing calculator.
          </p>
          <a href="https://printcalc-beta.vercel.app/login" style="display: inline-block; background: #C84B31; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Login to PrintCalc →
          </a>
        </div>
        <p style="font-size: 12px; color: #AAA; text-align: center;">PrintCalc · The Printing Industry Calculator</p>
      </div>
    `;
  } else if (type === 'pending') {
    subject = `⏳ Your PrintCalc application is under review`;
    html = `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 22px; font-weight: 600; color: #1A1A1A;">Application received!</h1>
        <p style="font-size: 14px; color: #555; line-height: 1.7; margin-top: 12px;">
          Hi <strong>${business_name}</strong>, we've received your PrintCalc signup. Our team will review and approve your account within 24 hours.
        </p>
        <p style="font-size: 14px; color: #555; margin-top: 12px;">We'll send you another email when your account is ready.</p>
        <p style="font-size: 12px; color: #AAA; margin-top: 24px;">PrintCalc · The Printing Industry Calculator</p>
      </div>
    `;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: email, subject, html }),
    });
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Email error:', err);
    return NextResponse.json({ success: false, error: String(err) });
  }
}

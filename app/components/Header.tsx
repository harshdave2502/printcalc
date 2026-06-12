'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TOKENS } from '../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// Shared Header used by EVERY subscriber-facing page.
// One look, one place to update. Light theme. Helvetica.
// ─────────────────────────────────────────────────────────────────────────

const FONT_DISPLAY = TOKENS.fonts.display;

const NAV_LINKS = [
  { href: '/products', label: 'Products' },
  { href: '/projects', label: 'Projects' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/orders', label: 'Orders' },
  { href: '/dashboard', label: 'Dashboard' },
];

export default function Header({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname() || '';

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${TOKENS.colors.border}`,
      padding: '14px 0',
    }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24, flexWrap: 'wrap',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36,
              background: TOKENS.colors.gradient,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff', fontWeight: 800,
            }}>📐</div>
            <span style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 19, fontWeight: 800,
              color: TOKENS.colors.text,
              letterSpacing: '-0.02em',
            }}>PrintCalc</span>
          </Link>
          {subtitle && (
            <>
              <div style={{ width: 1, height: 20, background: TOKENS.colors.border }} />
              <span style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 14, fontWeight: 700,
                color: TOKENS.colors.text,
              }}>{subtitle}</span>
            </>
          )}
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link key={l.href} href={l.href} style={{
                fontSize: 14,
                fontWeight: 700,
                fontFamily: FONT_DISPLAY,
                textDecoration: 'none',
                color: active ? TOKENS.colors.primary : TOKENS.colors.textMuted,
                padding: '7px 12px',
                borderRadius: 8,
                background: active ? 'rgba(124,58,237,0.08)' : 'transparent',
                transition: 'all 0.15s ease',
              }}>
                {l.label}
              </Link>
            );
          })}
          <a href="/logout" style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT_DISPLAY,
            textDecoration: 'none',
            color: TOKENS.colors.textDim,
            padding: '7px 12px',
            marginLeft: 6,
          }}>Logout</a>
        </div>
      </div>
    </nav>
  );
}

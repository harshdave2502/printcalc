// ─────────────────────────────────────────────────────────────────────
// Design tokens — shared across new product pages.
// Matches the existing landing page's premium dark-purple SaaS aesthetic.
// ─────────────────────────────────────────────────────────────────────

export const TOKENS = {
  // Brand palette
  colors: {
    bgDeep: '#0A0815',
    bgPanel: '#130F2A',
    bgPanel2: '#1A1338',
    bgCard: 'rgba(30, 22, 64, 0.55)',
    bgCardHover: 'rgba(40, 30, 80, 0.7)',
    border: 'rgba(124, 58, 237, 0.18)',
    borderHover: 'rgba(148, 97, 251, 0.45)',
    borderStrong: 'rgba(124, 58, 237, 0.4)',
    primary: '#7C3AED',
    primaryLight: '#9461FB',
    accent: '#A78BFA',
    pink: '#D946EF',
    cyan: '#06B6D4',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    text: '#FFFFFF',
    textMuted: '#9CA3AF',
    textDim: '#6B7280',
    glow: 'rgba(124, 58, 237, 0.35)',
    glowStrong: 'rgba(124, 58, 237, 0.5)',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #9461FB 50%, #D946EF 100%)',
    gradientSubtle: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(217,70,239,0.10) 100%)',
  },

  // Typography
  fonts: {
    display: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif",
    body: "'DM Sans', -apple-system, system-ui, sans-serif",
    mono: "'Geist Mono', ui-monospace, monospace",
  },

  // Spacing scale (pixels)
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  },

  // Radius
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    '2xl': 22,
    full: 9999,
  },

  // Shadows
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.15)',
    md: '0 8px 24px rgba(0,0,0,0.25)',
    lg: '0 20px 60px rgba(0,0,0,0.4)',
    glow: '0 0 30px rgba(124,58,237,0.35)',
    glowLg: '0 0 60px rgba(124,58,237,0.5)',
  },

  // Easing & timing
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// CSS for the page wrapper — provides the dark gradient background + grid
export const PAGE_BG_CSS = `
  body {
    background: ${TOKENS.colors.bgDeep};
    color: ${TOKENS.colors.text};
    font-family: ${TOKENS.fonts.body};
    font-feature-settings: 'cv11', 'ss01', 'ss03';
  }
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: ${TOKENS.colors.bgDeep}; }
  *::-webkit-scrollbar-thumb { background: ${TOKENS.colors.bgPanel2}; border-radius: 4px; }
  *::-webkit-scrollbar-thumb:hover { background: ${TOKENS.colors.primary}; }
  @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pc-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pc-pulse-glow { 0%, 100% { box-shadow: 0 0 30px rgba(124,58,237,0.3); } 50% { box-shadow: 0 0 50px rgba(124,58,237,0.55); } }
  @keyframes pc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes pc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

// Background ambient layer — gradient blobs + grid
export function AmbientBg() {
  return null; // Used inline in components
}

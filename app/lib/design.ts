// ─────────────────────────────────────────────────────────────────────
// Design tokens — shared across all PrintCalc pages.
// LIGHT THEME — clean white with purple brand accents.
// ─────────────────────────────────────────────────────────────────────

export const TOKENS = {
  // Brand palette
  colors: {
    // Backgrounds (light)
    bgDeep: '#FAFAFC',           // page background — soft off-white
    bgPanel: '#FFFFFF',          // header / modal / panels
    bgPanel2: '#F5F4F9',         // alt panel / shaded sections
    bgCard: '#FFFFFF',           // cards stand out on the bgDeep
    bgCardHover: '#F8F7FC',      // subtle hover

    // Borders
    border: '#E7E4F2',           // default neutral border
    borderHover: '#CBC0EA',      // accentuated on hover
    borderStrong: '#A78BFA',     // for emphasis

    // Brand
    primary: '#7C3AED',
    primaryLight: '#9461FB',
    accent: '#7C3AED',           // text accent (kept dark for readability)
    pink: '#D946EF',
    cyan: '#06B6D4',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',

    // Text
    text: '#1A1330',             // body text — deep ink, not pure black
    textMuted: '#5B5870',        // secondary
    textDim: '#9CA3AF',          // tertiary / labels

    // Effects
    glow: 'rgba(124, 58, 237, 0.10)',
    glowStrong: 'rgba(124, 58, 237, 0.18)',

    // Gradients (used sparingly on buttons + highlights)
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #9461FB 50%, #D946EF 100%)',
    gradientSubtle: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(217,70,239,0.04) 100%)',
  },

  // Typography
  fonts: {
    display: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif",
    body: "'DM Sans', -apple-system, system-ui, sans-serif",
    mono: "'Geist Mono', ui-monospace, monospace",
  },

  // Spacing scale (pixels)
  space: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96,
  },

  // Radius
  radius: {
    sm: 6, md: 10, lg: 14, xl: 18, '2xl': 22, full: 9999,
  },

  // Shadows — softer for light theme
  shadow: {
    sm: '0 1px 3px rgba(20, 14, 50, 0.06)',
    md: '0 4px 12px rgba(20, 14, 50, 0.08)',
    lg: '0 12px 32px rgba(20, 14, 50, 0.12)',
    glow: '0 8px 24px rgba(124, 58, 237, 0.20)',
    glowLg: '0 16px 40px rgba(124, 58, 237, 0.25)',
  },

  // Easing & timing
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// CSS for the page wrapper — provides the light background + grid texture
export const PAGE_BG_CSS = `
  body {
    background: ${TOKENS.colors.bgDeep};
    color: ${TOKENS.colors.text};
    font-family: ${TOKENS.fonts.body};
    font-feature-settings: 'cv11', 'ss01', 'ss03';
  }
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: ${TOKENS.colors.bgPanel2}; }
  *::-webkit-scrollbar-thumb { background: ${TOKENS.colors.border}; border-radius: 4px; }
  *::-webkit-scrollbar-thumb:hover { background: ${TOKENS.colors.borderStrong}; }
  @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pc-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pc-pulse-glow { 0%, 100% { box-shadow: 0 0 30px rgba(124,58,237,0.12); } 50% { box-shadow: 0 0 50px rgba(124,58,237,0.22); } }
  @keyframes pc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes pc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

export function AmbientBg() {
  return null;
}

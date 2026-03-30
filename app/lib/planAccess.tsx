// ─── PLAN ENFORCEMENT UTILITY ────────────────────────────────────────
// Import this wherever you need to check plan access
// Usage: const access = getPlanAccess(subscriber?.plan, subscriber?.status)

export type Plan = 'free' | 'solo' | 'press_pro' | 'enterprise';
export type Status = 'pending' | 'active' | 'disabled' | 'suspended';

export interface PlanAccess {
  // Calculator
  canUseCalculator: boolean;
  // Embed
  canUseEmbed: boolean;
  canCustomizeBranding: boolean;
  // Customers
  maxCustomers: number; // 0 = no access, -1 = unlimited
  canSetCustomerRates: boolean;
  // Quotes & Orders
  canManageQuotes: boolean;
  canManageOrders: boolean;
  maxQuotesPerMonth: number; // -1 = unlimited
  // Dashboard
  canAccessDashboard: boolean;
  // API (future)
  canUseAPI: boolean;
  // Info
  plan: Plan;
  isActive: boolean;
  upgradeNeeded: Plan | null; // which plan to upgrade to for more features
}

export function getPlanAccess(plan: string = 'free', status: string = 'pending'): PlanAccess {
  const isActive = status === 'active';

  // Base: nothing works if not active
  if (!isActive) {
    return {
      canUseCalculator: false,
      canUseEmbed: false,
      canCustomizeBranding: false,
      maxCustomers: 0,
      canSetCustomerRates: false,
      canManageQuotes: false,
      canManageOrders: false,
      maxQuotesPerMonth: 0,
      canAccessDashboard: false,
      canUseAPI: false,
      plan: plan as Plan,
      isActive: false,
      upgradeNeeded: null,
    };
  }

  switch (plan) {
    case 'solo':
      return {
        canUseCalculator: true,
        canUseEmbed: true,
        canCustomizeBranding: false,
        maxCustomers: 10,
        canSetCustomerRates: false,
        canManageQuotes: true,
        canManageOrders: true,
        maxQuotesPerMonth: -1,
        canAccessDashboard: true,
        canUseAPI: false,
        plan: 'solo',
        isActive: true,
        upgradeNeeded: 'press_pro',
      };

    case 'press_pro':
      return {
        canUseCalculator: true,
        canUseEmbed: true,
        canCustomizeBranding: true,
        maxCustomers: -1,
        canSetCustomerRates: true,
        canManageQuotes: true,
        canManageOrders: true,
        maxQuotesPerMonth: -1,
        canAccessDashboard: true,
        canUseAPI: false,
        plan: 'press_pro',
        isActive: true,
        upgradeNeeded: 'enterprise',
      };

    case 'enterprise':
      return {
        canUseCalculator: true,
        canUseEmbed: true,
        canCustomizeBranding: true,
        maxCustomers: -1,
        canSetCustomerRates: true,
        canManageQuotes: true,
        canManageOrders: true,
        maxQuotesPerMonth: -1,
        canAccessDashboard: true,
        canUseAPI: true,
        plan: 'enterprise',
        isActive: true,
        upgradeNeeded: null,
      };

    case 'free':
    default:
      return {
        canUseCalculator: true,
        canUseEmbed: false,
        canCustomizeBranding: false,
        maxCustomers: 5,
        canSetCustomerRates: false,
        canManageQuotes: true,
        canManageOrders: true,
        maxQuotesPerMonth: -1,
        canAccessDashboard: true,
        canUseAPI: false,
        plan: 'free',
        isActive: true,
        upgradeNeeded: 'solo',
      };
  }
}

// ─── UPGRADE PROMPT COMPONENT ─────────────────────────────────────────
// Use this inline wherever a feature is locked
export function UpgradePrompt({ feature, requiredPlan, currentPlan }: {
  feature: string;
  requiredPlan: Plan;
  currentPlan: Plan;
}) {
  const planNames: Record<Plan, string> = {
    free: 'Free',
    solo: 'Solo',
    press_pro: 'Press Pro',
    enterprise: 'Enterprise',
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(217,70,239,0.05))',
      border: '1.5px solid rgba(124,58,237,0.3)',
      borderRadius: 12,
      padding: '20px 24px',
      textAlign: 'center' as const,
      margin: '8px 0',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
        {feature} requires {planNames[requiredPlan]}
      </p>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
        You are on the {planNames[currentPlan]} plan. Upgrade to unlock this feature.
      </p>
      <a
        href="/#pricing"
        style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #7C3AED, #9461FB)',
          color: '#fff',
          padding: '8px 20px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Upgrade to {planNames[requiredPlan]} →
      </a>
    </div>
  );
}

// ─── PLAN BADGE COMPONENT ─────────────────────────────────────────────
export function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    free:       { label: 'Free',       bg: '#F5F5F5', color: '#888' },
    solo:       { label: 'Solo',       bg: '#EEF4FA', color: '#185FA5' },
    press_pro:  { label: 'Press Pro',  bg: '#F5F0FF', color: '#6B46C1' },
    enterprise: { label: 'Enterprise', bg: '#FFF0F0', color: '#C84B31' },
  };
  const c = config[plan] || config.free;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 4, background: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  );
}

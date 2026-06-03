'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import { TOKENS } from '../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// Projects list — multi-product quotes for designers / traders / corporates
// ─────────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  project_number: string;
  name: string;
  customer_name: string;
  customer_company: string;
  total_amount: number;
  currency_symbol: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Draft:     { bg: 'rgba(156,163,175,0.18)', fg: '#9CA3AF' },
  Sent:      { bg: 'rgba(59,130,246,0.18)',  fg: '#60A5FA' },
  Approved:  { bg: 'rgba(16,185,129,0.18)',  fg: '#34D399' },
  Converted: { bg: 'rgba(124,58,237,0.22)',  fg: '#A78BFA' },
  Expired:   { bg: 'rgba(239,68,68,0.18)',   fg: '#F87171' },
};

export default function ProjectsListPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'Draft' | 'Sent' | 'Approved' | 'Converted'>('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setHasSession(false); setLoading(false); return; }
      setHasSession(true);
      const { data } = await supabase
        .from('projects')
        .select('id, project_number, name, customer_name, customer_company, total_amount, currency_symbol, status, created_at')
        .eq('subscriber_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!mounted) return;
      setProjects(data || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function createNewProject() {
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCreating(false); router.push('/login'); return; }
    const projectNumber = genProjectNum();
    const d = new Date(); d.setDate(d.getDate() + 30);
    const { data, error } = await supabase
      .from('projects')
      .insert({
        subscriber_id: session.user.id,
        project_number: projectNumber,
        name: 'New Project',
        status: 'Draft',
        valid_until: d.toISOString().split('T')[0],
      })
      .select('id')
      .single();
    setCreating(false);
    if (error) { alert('Could not create project: ' + error.message); return; }
    if (data) router.push(`/projects/${data.id}`);
  }

  const filtered = useMemo(() => {
    let list = projects;
    if (filter !== 'all') list = list.filter(p => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.customer_company.toLowerCase().includes(q) ||
        p.project_number?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [projects, filter, search]);

  const stats = useMemo(() => {
    const total = projects.length;
    const drafts = projects.filter(p => p.status === 'Draft').length;
    const sent = projects.filter(p => p.status === 'Sent').length;
    const converted = projects.filter(p => p.status === 'Converted').length;
    const revenue = projects
      .filter(p => p.status === 'Converted' || p.status === 'Approved')
      .reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    const currency = projects[0]?.currency_symbol || '$';
    return { total, drafts, sent, converted, revenue, currency };
  }, [projects]);

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body, position: 'relative', overflow: 'hidden' }}>
      <PageStyles />
      <Ambient />
      <Header />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 32px 60px', position: 'relative', zIndex: 1 }}>
        <Hero onCreate={createNewProject} creating={creating} />

        {hasSession === false && (
          <SignInPrompt onLogin={() => router.push('/login')} />
        )}

        {hasSession && loading && <LoadingSkeleton />}

        {hasSession && !loading && projects.length === 0 && (
          <EmptyState onCreate={createNewProject} creating={creating} />
        )}

        {hasSession && !loading && projects.length > 0 && (
          <>
            <Stats stats={stats} />
            <Filters search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} count={filtered.length} />
            <ProjectTable projects={filtered} />
          </>
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function genProjectNum() {
  const d = new Date();
  return `P${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(n: number, currency: string) {
  return `${currency}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ──────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────

function Header() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '14px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, background: TOKENS.colors.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: TOKENS.shadow.glow }}>📦</div>
            <span style={{ fontFamily: TOKENS.fonts.display, fontSize: 19, fontWeight: 800, color: TOKENS.colors.text, letterSpacing: '-0.02em' }}>PrintCalc</span>
          </Link>
          <div style={{ width: 1, height: 20, background: TOKENS.colors.border }} />
          <span style={{ fontSize: 14, color: '#1A1330', fontWeight: 600 }}>Project Builder</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/dashboard" style={navLinkStyle()}>Dashboard</Link>
          <Link href="/products" style={navLinkStyle()}>Products</Link>
          <Link href="/quotes" style={navLinkStyle()}>Quotes</Link>
        </div>
      </div>
    </nav>
  );
}

function Ambient() {
  return (
    <>
      <div style={{ position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 700, background: 'radial-gradient(ellipse, rgba(217,70,239,0.06) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

function Hero({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap', animation: 'pc-fade-up 0.5s ease both' }}>
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(217,70,239,0.12)', border: `1px solid rgba(217,70,239,0.4)`, borderRadius: 100, padding: '6px 14px', fontSize: 12, color: TOKENS.colors.pink, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📦 Mode 3 · Project Builder
        </div>
        <h1 style={{ fontFamily: TOKENS.fonts.display, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, marginBottom: 8 }}>
          Bundle products into one <span style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #D946EF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>project quote</span>
        </h1>
        <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
          Perfect for branded identity packages, corporate kits, or any multi-item job. Add your own reseller margin on top of the calculated cost.
        </p>
      </div>
      <button onClick={onCreate} disabled={creating} style={primary()}>
        {creating ? 'Creating…' : '+ New Project'}
      </button>
    </div>
  );
}

function Stats({ stats }: { stats: { total: number; drafts: number; sent: number; converted: number; revenue: number; currency: string } }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24, animation: 'pc-fade-up 0.5s 0.1s ease both' }}>
      <StatCard label="Total Projects" value={String(stats.total)} accent={TOKENS.colors.accent} />
      <StatCard label="Drafts" value={String(stats.drafts)} accent="#9CA3AF" />
      <StatCard label="Sent" value={String(stats.sent)} accent="#60A5FA" />
      <StatCard label="Converted" value={String(stats.converted)} accent={TOKENS.colors.pink} />
      <StatCard label="Revenue" value={fmtAmount(stats.revenue, stats.currency)} accent="#34D399" big />
    </div>
  );
}

function StatCard({ label, value, accent, big }: { label: string; value: string; accent: string; big?: boolean }) {
  return (
    <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.lg, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: TOKENS.fonts.display, fontSize: big ? 24 : 22, fontWeight: 800, color: accent, letterSpacing: '-0.025em' }}>{value}</div>
    </div>
  );
}

function Filters({ search, setSearch, filter, setFilter, count }: { search: string; setSearch: (s: string) => void; filter: string; setFilter: (s: any) => void; count: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, animation: 'pc-fade-up 0.5s 0.15s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.lg, padding: '11px 15px' }}>
        <span style={{ fontSize: 16, color: TOKENS.colors.textMuted }}>🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by project name, customer, or number…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: TOKENS.colors.text, fontSize: 14, fontFamily: 'inherit' }} />
        <span style={{ fontSize: 12, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono }}>{count} project{count !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['all', 'Draft', 'Sent', 'Approved', 'Converted'].map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f}</Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px',
      borderRadius: TOKENS.radius.full,
      border: `1px solid ${active ? TOKENS.colors.primary : TOKENS.colors.border}`,
      background: active ? `${TOKENS.colors.primary}22` : 'transparent',
      color: active ? TOKENS.colors.primary : TOKENS.colors.textMuted,
      fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.18s ease',
    }}>{children}</button>
  );
}

function ProjectTable({ projects }: { projects: Project[] }) {
  return (
    <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, overflow: 'hidden', animation: 'pc-fade-up 0.5s 0.2s ease both' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 100px 140px 120px', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${TOKENS.colors.border}`, fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="pc-project-head">
        <div>Project #</div>
        <div>Name</div>
        <div>Customer</div>
        <div style={{ textAlign: 'right' }}>Total</div>
        <div>Status</div>
        <div>Created</div>
      </div>
      {projects.map((p) => {
        const sc = STATUS_COLORS[p.status] || STATUS_COLORS.Draft;
        return (
          <Link key={p.id} href={`/projects/${p.id}`} style={{
            display: 'grid', gridTemplateColumns: '120px 1fr 1fr 100px 140px 120px', gap: 12,
            padding: '14px 20px',
            borderBottom: `1px solid ${TOKENS.colors.border}`,
            textDecoration: 'none', color: 'inherit', alignItems: 'center',
            transition: 'background 0.15s ease',
          }} className="pc-project-row">
            <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, color: TOKENS.colors.pink }}>{p.project_number}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: TOKENS.colors.textMuted }}>
              {p.customer_name || '—'}{p.customer_company ? ` · ${p.customer_company}` : ''}
            </div>
            <div style={{ textAlign: 'right', fontFamily: TOKENS.fonts.mono, fontSize: 13, fontWeight: 600 }}>
              {fmtAmount(p.total_amount, p.currency_symbol)}
            </div>
            <div>
              <span style={{ background: sc.bg, color: sc.fg, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4 }}>{p.status}</span>
            </div>
            <div style={{ fontSize: 12, color: TOKENS.colors.textDim }}>{formatDate(p.created_at)}</div>
          </Link>
        );
      })}
      <style>{`
        @media (max-width: 900px) {
          .pc-project-head { display: none !important; }
          .pc-project-row { grid-template-columns: 1fr !important; gap: 6 !important; padding: 14px 16px !important; }
          .pc-project-row > div:nth-child(4) { text-align: left !important; }
        }
        .pc-project-row:hover { background: rgba(124,58,237,0.06); }
      `}</style>
    </div>
  );
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius['2xl'], padding: 56, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: TOKENS.colors.gradientSubtle, opacity: 0.4, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 56, marginBottom: 18 }}>📦</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 26, fontWeight: 700, marginBottom: 12 }}>Your first project</h2>
        <p style={{ color: TOKENS.colors.textMuted, fontSize: 15, maxWidth: 520, margin: '0 auto 28px', lineHeight: 1.6 }}>
          A <strong style={{ color: TOKENS.colors.text }}>project</strong> bundles multiple printed products into one quote — for example, a brand-launch kit with visiting cards + letterheads + envelopes. Add your reseller margin on top.
        </p>
        <button onClick={onCreate} disabled={creating} style={primary()}>
          {creating ? 'Creating…' : '+ Create First Project'}
        </button>
        <div style={{ marginTop: 22, fontSize: 12, color: TOKENS.colors.textDim }}>
          💡 Designers, traders, and corporate sales — this mode is for you
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: 60, background: 'linear-gradient(110deg, rgba(243,242,247,0.6) 0%, rgba(232,228,242,0.6) 50%, rgba(243,242,247,0.6) 100%)', backgroundSize: '200% 100%', animation: 'pc-shimmer 1.5s linear infinite', borderRadius: TOKENS.radius.lg }} />
      ))}
    </div>
  );
}

function SignInPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
      <p style={{ color: TOKENS.colors.textMuted, marginBottom: 16 }}>Sign in to view your projects</p>
      <button onClick={onLogin} style={primary()}>Sign In</button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────

function primary(): React.CSSProperties {
  return {
    padding: '11px 22px',
    background: 'linear-gradient(135deg, #A78BFA 0%, #D946EF 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: TOKENS.fonts.display,
    borderRadius: TOKENS.radius.md,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(217,70,239,0.35)',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function navLinkStyle(): React.CSSProperties {
  return { fontSize: 14, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 500 };
}

function PageStyles() {
  return (
    <style>{`
      @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pc-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      input::placeholder { color: ${TOKENS.colors.textDim}; }
      input:focus { border-color: ${TOKENS.colors.borderStrong} !important; }
      *::-webkit-scrollbar { width: 8px; }
      *::-webkit-scrollbar-track { background: ${TOKENS.colors.bgPanel2}; }
      *::-webkit-scrollbar-thumb { background: ${TOKENS.colors.border}; border-radius: 4px; }
      button:hover:not(:disabled) { filter: brightness(1.05); transform: translateY(-1px); }
      button:active:not(:disabled) { transform: translateY(0); }
    `}</style>
  );
}

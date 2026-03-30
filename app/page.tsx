'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const FEATURES = [
  { icon: '⚡', title: 'Instant Quotes', desc: 'Calculate paper, printing, lamination, UV and binding costs in seconds. No manual work.' },
  { icon: '🎨', title: 'White Label', desc: 'Put your business name and logo on the calculator. Your brand, your customers.' },
  { icon: '👥', title: 'Customer Portal', desc: 'Give each customer their own login. They get quotes 24/7 without calling you.' },
  { icon: '💰', title: 'Per-Customer Rates', desc: 'Set different rates for wholesale, retail and corporate clients. Full control.' },
  { icon: '📋', title: 'Quotes & Orders', desc: 'Generate professional quotes, track orders and manage payments in one place.' },
  { icon: '🌍', title: 'Multi-Currency', desc: 'Works in USD, INR, GBP, AED, EUR and more. Perfect for global businesses.' },
];
const HOW_IT_WORKS = [
  { step: '01', icon: '🔧', title: 'Set your rates', desc: 'Enter your paper costs, printing rates, lamination and finishing prices in minutes.' },
  { step: '02', icon: '🔗', title: 'Invite your customers', desc: 'Share a link with your clients. Each gets their own portal with your custom rates.' },
  { step: '03', icon: '🚀', title: 'Quotes flow in', desc: 'Customers calculate and request quotes themselves. No more calls at odd hours.' },
];
const TESTIMONIALS = [
  { name: 'Rajesh Mehta', role: 'Owner, Mehta Offset Printers', location: 'Mumbai', av: 'R', text: 'Before PrintCalc, my staff spent 20 minutes on every quote call. Now customers get rates instantly. Total game changer.' },
  { name: 'Sarah Chen', role: 'Freelance Print Designer', location: 'Singapore', av: 'S', text: 'I use it every day for client estimates. The calculations are spot-on and the PDF quotes look incredibly professional.' },
  { name: 'Omar Al-Rashid', role: 'Director, Gulf Print Solutions', location: 'Dubai', av: 'O', text: 'The per-customer pricing is brilliant. Different rates for different clients, managed beautifully from one dashboard.' },
];
const STATS = [
  { v: '10,000+', l: 'Quotes Generated' },
  { v: '500+', l: 'Print Businesses' },
  { v: '40+', l: 'Countries' },
  { v: '< 2 min', l: 'Avg Quote Time' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeT, setActiveT] = useState(0);
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveT(p => (p + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    supabase.from('admin_settings').select('*').then(({ data }) => {
      if (data) {
        const s: Record<string,string> = {};
        data.forEach((r: any) => { s[r.key] = r.value; });
        setSettings(s);
      }
      setSettingsLoaded(true);
    });
  }, []);

  const cur = settings.currency || '$';
  const promoActive = settings.promo_active === 'true';
  const promoText = settings.promo_text || '🎉 First month FREE for all plans — limited time offer!';
  const promoDays = settings.promo_days || '30';

  const PLANS = [
    {
      name: settings.name_free || 'Free',
      price: `${cur}0`,
      period: '/mo forever',
      desc: 'Try PrintCalc with your own rates. No credit card needed.',
      features: ['Full calculator access', 'Paper, Printing & Full Job tabs', 'Unlimited quotes (own use)', 'Dashboard access', '5 customers max'],
      cta: 'Start Free',
      href: '/signup',
      hot: false,
      badge: null,
    },
    {
      name: settings.name_solo || 'Solo',
      price: promoActive ? 'FREE' : `${cur}${settings.price_solo || '6'}`,
      period: promoActive ? `first ${promoDays} days` : '/mo',
      originalPrice: promoActive ? `${cur}${settings.price_solo || '6'}/mo after` : null,
      desc: 'For print shops giving customers self-service quotes via embed link.',
      features: ['Everything in Free', 'iFrame embed calculator', 'Up to 10 customers', 'Customer calculator links', 'Email support'],
      cta: promoActive ? 'Apply Free →' : 'Get Solo',
      href: '/signup',
      hot: false,
      badge: promoActive ? '🎉 FREE Trial' : null,
    },
    {
      name: settings.name_press_pro || 'Press Pro',
      price: promoActive ? 'FREE' : `${cur}${settings.price_press_pro || '24'}`,
      period: promoActive ? `first ${promoDays} days` : '/mo',
      originalPrice: promoActive ? `${cur}${settings.price_press_pro || '24'}/mo after` : null,
      desc: 'For professional print shops with multiple customers and custom rates.',
      features: ['Everything in Solo', 'Unlimited customers', 'Per-customer rate cards', 'Custom branding on embed', 'Quotes & Orders management', 'Priority support'],
      cta: promoActive ? 'Apply Free →' : 'Get Press Pro',
      href: '/signup',
      hot: true,
      badge: 'Most Popular',
    },
    {
      name: 'Enterprise',
      price: settings.price_enterprise || 'Contact us',
      period: '',
      desc: 'For large print operations needing API access and dedicated support.',
      features: ['Everything in Press Pro', 'API access', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'],
      cta: 'Contact Us',
      href: 'mailto:sales@printcalc.app',
      hot: false,
      badge: null,
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{font-family:'Inter',sans-serif;background:#0D0B1A;color:#fff;overflow-x:hidden;}
        :root{
          --dp:#0D0B1A;--dm:#130F2A;--d2:#1E1640;--pm:#7C3AED;--pl:#9461FB;--pa:#A78BFA;
          --pk:#D946EF;--gr:#6B7280;--gr2:#9CA3AF;--bd:rgba(124,58,237,0.2);
          --glow:rgba(124,58,237,0.35);--card:rgba(30,22,64,0.8);
        }
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:var(--dp);}::-webkit-scrollbar-thumb{background:var(--d2);border-radius:3px;}
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:18px 0;transition:all 0.3s;}
        .nav.on{background:rgba(13,11,26,0.93);backdrop-filter:blur(20px);padding:12px 0;border-bottom:1px solid var(--bd);}
        .ni{max-width:1140px;margin:0 auto;padding:0 32px;display:flex;align-items:center;justify-content:space-between;}
        .logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
        .logo-box{width:34px;height:34px;background:linear-gradient(135deg,var(--pm),var(--pl));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;}
        .logo-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.02em;}
        .nl{display:flex;align-items:center;gap:24px;}
        .nl a{font-size:14px;color:var(--gr2);text-decoration:none;font-weight:500;transition:color 0.2s;}
        .nl a:hover{color:#fff;}
        .nbtn{font-size:14px;color:var(--pa);background:transparent;border:1px solid var(--bd);padding:8px 18px;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:500;text-decoration:none;transition:all 0.2s;}
        .nbtn:hover{border-color:var(--pl);color:#fff;}
        .ncta{font-size:14px;font-weight:600;color:#fff;background:linear-gradient(135deg,var(--pm),var(--pl));padding:9px 22px;border-radius:8px;text-decoration:none;transition:all 0.2s;box-shadow:0 0 20px var(--glow);}
        .ncta:hover{transform:translateY(-1px);box-shadow:0 0 35px var(--glow);}
        @media(max-width:768px){.nl{display:none;}}
        .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:130px 24px 80px;position:relative;overflow:hidden;}
        .hg1{position:absolute;top:-80px;left:50%;transform:translateX(-50%);width:900px;height:700px;background:radial-gradient(ellipse,rgba(124,58,237,0.3) 0%,transparent 65%);pointer-events:none;}
        .hg2{position:absolute;bottom:50px;right:-100px;width:400px;height:400px;background:radial-gradient(ellipse,rgba(217,70,239,0.12) 0%,transparent 65%);pointer-events:none;}
        .hgrid{position:absolute;inset:0;background-image:linear-gradient(rgba(124,58,237,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.05) 1px,transparent 1px);background-size:72px 72px;pointer-events:none;}
        .hbadge{display:inline-flex;align-items:center;gap:8px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);border-radius:100px;padding:6px 18px;font-size:13px;color:var(--pa);font-weight:500;margin-bottom:28px;animation:fu 0.5s ease both;}
        .bdot{width:6px;height:6px;border-radius:50%;background:var(--pk);box-shadow:0 0 8px var(--pk);animation:bl 2s infinite;}
        @keyframes bl{0%,100%{opacity:1}50%{opacity:0.35}}
        .htitle{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(38px,6.5vw,74px);font-weight:800;line-height:1.07;letter-spacing:-0.03em;color:#fff;margin-bottom:22px;animation:fu 0.5s 0.1s ease both;max-width:840px;}
        .hgrad{background:linear-gradient(135deg,var(--pa) 0%,var(--pk) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hsub{font-size:clamp(15px,2vw,18px);color:var(--gr2);max-width:540px;line-height:1.7;margin-bottom:38px;animation:fu 0.5s 0.2s ease both;}
        .hacts{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;animation:fu 0.5s 0.3s ease both;}
        .bp{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--pm),var(--pl));color:#fff;padding:13px 30px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;transition:all 0.2s;box-shadow:0 0 28px var(--glow);font-family:'Plus Jakarta Sans',sans-serif;}
        .bp:hover{transform:translateY(-2px);box-shadow:0 0 48px var(--glow);filter:brightness(1.08);}
        .bs{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#fff;padding:13px 30px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;border:1px solid rgba(124,58,237,0.4);transition:all 0.2s;font-family:'Plus Jakarta Sans',sans-serif;}
        .bs:hover{border-color:var(--pl);background:rgba(124,58,237,0.12);}
        .hnote{font-size:13px;color:var(--gr);margin-top:14px;animation:fu 0.5s 0.4s ease both;}
        @keyframes fu{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        .hprev{margin-top:56px;max-width:800px;width:100%;animation:fu 0.7s 0.55s ease both;position:relative;}
        .pglow{position:absolute;inset:-1px;border-radius:21px;background:linear-gradient(135deg,var(--pm),var(--pk),var(--d2));z-index:-1;opacity:0.45;filter:blur(0.5px);}
        .pcard{background:rgba(19,15,42,0.97);border:1px solid var(--bd);border-radius:20px;padding:26px;backdrop-filter:blur(16px);}
        .pbar{display:flex;align-items:center;gap:6px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--bd);}
        .pdot{width:11px;height:11px;border-radius:50%;}
        .ptabs{display:flex;gap:4px;margin-left:12px;}
        .pt{padding:5px 13px;border-radius:6px;font-size:12px;font-weight:500;}
        .pt.a{background:var(--pm);color:#fff;}.pt.i{color:var(--gr2);}
        .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
        .pf{background:rgba(124,58,237,0.1);border:1px solid var(--bd);border-radius:10px;padding:11px 13px;}
        .pfl{font-size:10px;font-weight:600;color:var(--gr);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;}
        .pfv{font-size:13px;font-weight:500;color:#fff;}
        .pres{background:linear-gradient(135deg,var(--pm),var(--d2));border-radius:11px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;}
        .prl{font-size:11px;color:rgba(255,255,255,0.55);margin-bottom:2px;}.prn{font-size:11px;color:rgba(255,255,255,0.3);}
        .prv{font-size:30px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-0.02em;}
        .stats{background:var(--dm);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);padding:40px 32px;}
        .si{max-width:1140px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;}
        .sit{text-align:center;}
        .sv{font-family:'Plus Jakarta Sans',sans-serif;font-size:36px;font-weight:800;background:linear-gradient(135deg,#fff 0%,var(--pa) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.02em;}
        .sl{font-size:13px;color:var(--gr);margin-top:4px;}
        @media(max-width:600px){.si{grid-template-columns:repeat(2,1fr);}}
        .sec{padding:90px 32px;}
        .sci{max-width:1140px;margin:0 auto;}
        .slbl{font-size:12px;font-weight:600;color:var(--pl);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
        .slbl::before{content:'';width:18px;height:2px;background:linear-gradient(90deg,var(--pm),var(--pk));border-radius:1px;}
        .stit{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(26px,3.8vw,44px);font-weight:800;letter-spacing:-0.025em;color:#fff;margin-bottom:12px;line-height:1.15;}
        .ssub{font-size:16px;color:var(--gr2);line-height:1.7;max-width:480px;}
        .fg{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:52px;}
        .fc{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:26px;transition:all 0.25s;position:relative;overflow:hidden;}
        .fc::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--pm),var(--pk));opacity:0;transition:opacity 0.25s;}
        .fc:hover{border-color:var(--pl);transform:translateY(-4px);box-shadow:0 16px 48px rgba(124,58,237,0.18);}
        .fc:hover::after{opacity:1;}
        .fi{width:46px;height:46px;background:rgba(124,58,237,0.18);border:1px solid var(--bd);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:21px;margin-bottom:16px;}
        .ft{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;color:#fff;margin-bottom:8px;}
        .fd{font-size:14px;color:var(--gr2);line-height:1.65;}
        @media(max-width:1024px){.fg{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:600px){.fg{grid-template-columns:1fr;}}
        .hwbg{background:var(--dm);}
        .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin-top:52px;position:relative;}
        .sg::before{content:'';position:absolute;top:38px;left:calc(16%+38px);right:calc(16%+38px);height:1px;background:linear-gradient(90deg,transparent,var(--pl),transparent);}
        .sc2{text-align:center;}
        .scc{width:76px;height:76px;margin:0 auto 20px;background:linear-gradient(135deg,var(--pm),var(--d2));border:1px solid rgba(124,58,237,0.45);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 28px rgba(124,58,237,0.28);position:relative;z-index:1;}
        .sico{font-size:22px;}.sn{font-size:9px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:0.1em;margin-top:2px;}
        .stitle{font-family:'Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:700;color:#fff;margin-bottom:9px;}
        .sdesc{font-size:14px;color:var(--gr2);line-height:1.65;}
        @media(max-width:768px){.sg{grid-template-columns:1fr;}.sg::before{display:none;}}

        /* PRICING — 4 column */
        .pg{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:52px;align-items:start;}
        .pl2{border-radius:18px;padding:28px;border:1px solid var(--bd);background:var(--card);position:relative;transition:all 0.25s;}
        .pl2:hover{transform:translateY(-4px);box-shadow:0 20px 56px rgba(124,58,237,0.18);}
        .pl2.h{background:linear-gradient(145deg,var(--d2) 0%,rgba(19,15,42,0.9) 100%);border-color:var(--pl);box-shadow:0 0 36px rgba(124,58,237,0.22);}
        .pchip{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--pm),var(--pk));color:#fff;font-size:11px;font-weight:700;padding:4px 14px;border-radius:100px;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;}
        .pbadge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-size:11px;font-weight:700;padding:4px 14px;border-radius:100px;white-space:nowrap;}
        .pname{font-family:'Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:800;color:#fff;margin-bottom:6px;}
        .pprice{font-family:'Plus Jakarta Sans',sans-serif;font-size:32px;font-weight:800;letter-spacing:-0.03em;margin:14px 0 2px;color:#fff;}
        .pprice.g{background:linear-gradient(135deg,var(--pa),var(--pk));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .pprice.promo{background:linear-gradient(135deg,#4ade80,#22c55e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .pper{font-size:12px;color:var(--gr);margin-bottom:3px;}
        .porig{font-size:11px;color:var(--gr);text-decoration:line-through;margin-bottom:8px;}
        .pdesc{font-size:12px;color:var(--gr2);line-height:1.55;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--bd);}
        .plist{list-style:none;margin-bottom:22px;}
        .plist li{font-size:12px;color:var(--gr2);padding:5px 0;display:flex;align-items:center;gap:8px;}
        .plist li::before{content:'✓';font-weight:700;color:var(--pa);font-size:11px;flex-shrink:0;}
        .pl2.h .plist li::before{color:var(--pk);}
        .pcta{display:block;text-align:center;padding:11px;border-radius:9px;font-size:13px;font-weight:600;text-decoration:none;transition:all 0.2s;font-family:'Plus Jakarta Sans',sans-serif;}
        .pcp{background:linear-gradient(135deg,var(--pm),var(--pl));color:#fff;box-shadow:0 0 18px var(--glow);}
        .pcp:hover{filter:brightness(1.1);transform:translateY(-1px);}
        .pco{border:1px solid var(--bd);color:#fff;}
        .pco:hover{border-color:var(--pl);background:rgba(124,58,237,0.12);}
        .pcg{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;}
        .pcg:hover{filter:brightness(1.1);transform:translateY(-1px);}
        @media(max-width:1024px){.pg{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:600px){.pg{grid-template-columns:1fr;}}

        /* PROMO BANNER */
        .promo-bar{background:linear-gradient(135deg,#14532d,#166534);border-bottom:1px solid #16a34a33;padding:12px 24px;text-align:center;position:sticky;top:0;z-index:99;}
        .promo-inner{max-width:1140px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;}
        .promo-text{font-size:13px;font-weight:500;color:#86efac;}
        .promo-cta{font-size:12px;font-weight:700;color:#fff;background:#16a34a;padding:5px 14px;border-radius:6px;text-decoration:none;white-space:nowrap;}
        .promo-cta:hover{background:#15803d;}

        .tbg{background:var(--dm);}
        .tw{max-width:700px;margin:48px auto 0;}
        .tc{background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:38px;text-align:center;}
        .tst{color:var(--pl);font-size:17px;letter-spacing:2px;margin-bottom:18px;}
        .tt{font-size:clamp(15px,2vw,19px);color:#fff;line-height:1.7;margin-bottom:26px;opacity:0.9;font-style:italic;}
        .ta{display:flex;align-items:center;justify-content:center;gap:13px;}
        .tav{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--pm),var(--pk));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;}
        .tname{font-weight:600;color:#fff;font-size:14px;}.trole{font-size:12px;color:var(--gr);}
        .tdots{display:flex;justify-content:center;gap:7px;margin-top:20px;}
        .td{width:7px;height:7px;border-radius:50%;background:var(--d2);cursor:pointer;transition:all 0.2s;}
        .td.a{background:var(--pl);width:22px;border-radius:3px;}
        .ctasec{padding:96px 32px;text-align:center;background:linear-gradient(180deg,var(--dp) 0%,var(--dm) 100%);position:relative;overflow:hidden;}
        .ctag{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(124,58,237,0.25) 0%,transparent 65%);pointer-events:none;}
        .ctai{max-width:580px;margin:0 auto;position:relative;}
        .ctit{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(28px,4.5vw,50px);font-weight:800;letter-spacing:-0.03em;color:#fff;margin-bottom:14px;line-height:1.1;}
        .csub{font-size:17px;color:var(--gr2);margin-bottom:34px;line-height:1.65;}
        .foot{background:#090714;padding:52px 32px 26px;border-top:1px solid var(--bd);}
        .footi{max-width:1140px;margin:0 auto;}
        .ftop{display:flex;justify-content:space-between;gap:36px;margin-bottom:44px;flex-wrap:wrap;}
        .fbname{font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#fff;display:flex;align-items:center;gap:9px;margin-bottom:9px;}
        .fbtag{font-size:13px;color:var(--gr);max-width:210px;line-height:1.6;}
        .fcol h5{font-size:11px;font-weight:600;color:var(--gr2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;}
        .fcol a{display:block;font-size:13px;color:var(--gr);text-decoration:none;margin-bottom:9px;transition:color 0.2s;}
        .fcol a:hover{color:var(--pa);}
        .fbot{border-top:1px solid rgba(255,255,255,0.05);padding-top:22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;}
        .fcopy{font-size:12px;color:var(--gr);}
        .fpay{display:flex;gap:6px;align-items:center;}
        .fpb{font-size:11px;font-weight:500;color:var(--gr);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);padding:3px 9px;border-radius:5px;}
      `}</style>

      {/* PROMO BANNER — shown only when promo is active */}
      {settingsLoaded && promoActive && (
        <div className="promo-bar">
          <div className="promo-inner">
            <span className="promo-text">{promoText}</span>
            <a href="/signup" className="promo-cta">Apply now →</a>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className={`nav ${scrolled ? 'on' : ''}`} style={{top: promoActive ? 44 : 0}}>
        <div className="ni">
          <a href="/" className="logo">
            <div className="logo-box">🖨️</div>
            <span className="logo-name">PrintCalc</span>
          </a>
          <div className="nl">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="/login" className="nbtn">Login</a>
            <a href="/signup" className="ncta">Start Free →</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" style={{paddingTop: promoActive ? 174 : 130}}>
        <div className="hg1" /><div className="hg2" /><div className="hgrid" />
        <div className="hbadge">
          <div className="bdot" />
          {promoActive ? `🎉 ${promoDays}-day free trial — no credit card needed` : 'Free plan available — no credit card required'}
        </div>
        <h1 className="htitle">Print pricing that<br /><span className="hgrad">works while you sleep</span></h1>
        <p className="hsub">The all-in-one calculator for print businesses. Set your rates, invite customers, and let them get instant quotes 24/7 — without calling you.</p>
        <div className="hacts">
          <a href="/signup" className="bp">{promoActive ? `Start free — ${promoDays} days trial →` : 'Start for free →'}</a>
          <a href="#how-it-works" className="bs">See how it works</a>
        </div>
        <p className="hnote">{promoActive ? `All plans free for ${promoDays} days · Approval required · Setup in 10 minutes` : 'Free forever plan · Setup in 10 minutes · No technical skills needed'}</p>
        <div className="hprev">
          <div className="pglow" />
          <div className="pcard">
            <div className="pbar">
              <div className="pdot" style={{background:'#FF5F57'}} />
              <div className="pdot" style={{background:'#FEBC2E'}} />
              <div className="pdot" style={{background:'#28C840'}} />
              <div className="ptabs">
                <div className="pt a">📄 Paper</div>
                <div className="pt i">🖨️ Printing</div>
                <div className="pt i">✅ Full Job</div>
              </div>
            </div>
            <div className="pgrid">
              {[{l:'Paper Type',v:'Art Card 300 GSM'},{l:'Final Size',v:'A4 · 8.3 × 11.7"'},{l:'Quantity',v:'5,000 sheets'},{l:'Finishing',v:'Matt Lam + UV'}].map(f=>(
                <div key={f.l} className="pf"><div className="pfl">{f.l}</div><div className="pfv">{f.v}</div></div>
              ))}
            </div>
            <div className="pres">
              <div><div className="prl">Total price (incl. tax)</div><div className="prn">Calculated in 0.2 seconds ⚡</div></div>
              <div className="prv">{cur}248.50</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats">
        <div className="si">
          {STATS.map(s=><div key={s.l} className="sit"><div className="sv">{s.v}</div><div className="sl">{s.l}</div></div>)}
        </div>
      </div>

      {/* FEATURES */}
      <section className="sec" id="features">
        <div className="sci">
          <p className="slbl">Features</p>
          <h2 className="stit">Everything your print<br />business needs</h2>
          <p className="ssub">From instant cost calculations to customer portals — PrintCalc handles the entire quoting workflow.</p>
          <div className="fg">
            {FEATURES.map(f=>(
              <div key={f.title} className="fc">
                <div className="fi">{f.icon}</div>
                <div className="ft">{f.title}</div>
                <div className="fd">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec hwbg" id="how-it-works">
        <div className="sci">
          <p className="slbl">How it works</p>
          <h2 className="stit">Up and running<br />in 10 minutes</h2>
          <p className="ssub">No technical setup. No complicated onboarding. Just sign up and start calculating.</p>
          <div className="sg">
            {HOW_IT_WORKS.map(s=>(
              <div key={s.step} className="sc2">
                <div className="scc"><span className="sico">{s.icon}</span><span className="sn">STEP {s.step}</span></div>
                <div className="stitle">{s.title}</div>
                <div className="sdesc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="sec" id="pricing">
        <div className="sci">
          <p className="slbl">Pricing</p>
          <h2 className="stit">
            {promoActive ? <>All plans <span className="hgrad">FREE</span> right now</> : <>Start free.<br />Scale when ready.</>}
          </h2>
          <p className="ssub">
            {promoActive
              ? `First ${promoDays} days free on all plans. Approval required. No credit card needed.`
              : 'No contracts. No hidden fees. Cancel anytime.'}
          </p>

          {promoActive && (
            <div style={{display:'inline-flex',alignItems:'center',gap:10,background:'rgba(22,163,74,0.15)',border:'1px solid rgba(22,163,74,0.4)',borderRadius:12,padding:'12px 20px',marginTop:16,flexWrap:'wrap' as const}}>
              <span style={{fontSize:20}}>🎉</span>
              <span style={{fontSize:14,color:'#86efac',fontWeight:500}}>{promoText}</span>
            </div>
          )}

          <div className="pg">
            {PLANS.map(plan=>(
              <div key={plan.name} className={`pl2 ${plan.hot?'h':''}`}>
                {plan.hot && !promoActive && <div className="pchip">Most Popular</div>}
                {plan.badge && plan.badge !== 'Most Popular' && <div className="pbadge">{plan.badge}</div>}
                {plan.hot && promoActive && <div className="pchip">Most Popular</div>}
                <div className="pname">{plan.name}</div>
                <div className={`pprice ${plan.hot?'g':''} ${promoActive&&plan.name!=='Free'&&plan.name!=='Enterprise'?'promo':''}`}>
                  {plan.price}
                </div>
                {plan.period && <div className="pper">{plan.period}</div>}
                {plan.originalPrice && <div className="porig">{plan.originalPrice}</div>}
                <div className="pdesc">{plan.desc}</div>
                <ul className="plist">{plan.features.map(f=><li key={f}>{f}</li>)}</ul>
                <a href={plan.href} className={`pcta ${plan.hot ? 'pcp' : promoActive && plan.name !== 'Free' && plan.name !== 'Enterprise' ? 'pcg' : 'pco'}`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          <p style={{textAlign:'center',fontSize:13,color:'var(--gr)',marginTop:22}}>
            {promoActive
              ? `⚡ All plans require approval · Response within 24 hours · All prices in USD after trial`
              : 'Payments via Razorpay · GooglePay · UPI · Cards · All prices in USD'}
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="sec tbg" id="testimonials">
        <div className="sci" style={{textAlign:'center'}}>
          <p className="slbl" style={{justifyContent:'center'}}>Testimonials</p>
          <h2 className="stit">Loved by print<br />businesses worldwide</h2>
          <div className="tw">
            <div className="tc">
              <div className="tst">★★★★★</div>
              <p className="tt">"{TESTIMONIALS[activeT].text}"</p>
              <div className="ta">
                <div className="tav">{TESTIMONIALS[activeT].av}</div>
                <div>
                  <div className="tname">{TESTIMONIALS[activeT].name}</div>
                  <div className="trole">{TESTIMONIALS[activeT].role} · {TESTIMONIALS[activeT].location}</div>
                </div>
              </div>
            </div>
            <div className="tdots">{TESTIMONIALS.map((_,i)=><div key={i} className={`td ${i===activeT?'a':''}`} onClick={()=>setActiveT(i)} />)}</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ctasec">
        <div className="ctag" />
        <div className="ctai">
          <h2 className="ctit">Ready to save hours every week?</h2>
          <p className="csub">Join hundreds of print businesses already using PrintCalc to quote faster and win more customers.</p>
          <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/signup" className="bp">{promoActive ? `Apply for free trial →` : 'Get started free →'}</a>
            <a href="/login" className="bs">Login to dashboard</a>
          </div>
          <p style={{fontSize:13,color:'var(--gr)',marginTop:18}}>
            {promoActive ? `Free for ${promoDays} days · Approval required · No credit card` : 'No credit card · Free forever plan · Ready in 10 minutes'}
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="footi">
          <div className="ftop">
            <div>
              <div className="fbname">
                <div style={{width:28,height:28,background:'linear-gradient(135deg,var(--pm),var(--pl))',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🖨️</div>
                PrintCalc
              </div>
              <p className="fbtag">The print industry calculator trusted by businesses in 40+ countries.</p>
            </div>
            <div style={{display:'flex',gap:44,flexWrap:'wrap'}}>
              <div className="fcol">
                <h5>Product</h5>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#how-it-works">How it works</a>
                <a href="/signup">Sign up free</a>
              </div>
              <div className="fcol">
                <h5>Account</h5>
                <a href="/login">Printer Login</a>
                <a href="/signup">Create account</a>
                <a href="/customer/login">Customer login</a>
                <a href="/dashboard">Dashboard</a>
              </div>
              <div className="fcol">
                <h5>Company</h5>
                <a href="#">About us</a>
                <a href="mailto:support@printcalc.app">Contact</a>
                <a href="#">Privacy policy</a>
                <a href="#">Terms of service</a>
              </div>
            </div>
          </div>
          <div className="fbot">
            <p className="fcopy">© {new Date().getFullYear()} PrintCalc. All rights reserved.</p>
            <div className="fpay">
              <span style={{fontSize:12,color:'var(--gr)'}}>Payments via</span>
              {['Razorpay','GPay','UPI','Cards'].map(p=><span key={p} className="fpb">{p}</span>)}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

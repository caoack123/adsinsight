'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, TrendingUp, Search, BarChart3, Video,
  Globe2, ArrowRight, CheckCircle2, Zap, Target,
  ChevronRight, ExternalLink, Play, RotateCcw, Plus,
} from 'lucide-react';

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({ to, suffix = '', duration = 1800 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / duration, 1);
          setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

const CLIENTS = [
  'Shopify Brands', 'DTC Startups', 'Cross-border Sellers',
  'Jewelry & Apparel', 'Health & Beauty', 'Home Goods',
  'Sports & Outdoor', 'Consumer Electronics', 'Pet Brands',
];

function Marquee() {
  const items = [...CLIENTS, ...CLIENTS];
  return (
    <div className="overflow-hidden">
      <div
        className="flex gap-8 w-max"
        style={{ animation: 'marquee 24s linear infinite' }}
      >
        {items.map((c, i) => (
          <span key={i} className="flex items-center gap-2 text-sm font-medium text-[#555] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d1d5db]" />
            {c}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}

// ─── Feature tabs ─────────────────────────────────────────────────────────────

const FEATURE_TABS = [
  {
    id: 'optimize',
    label: 'Optimise',
    color: '#2563eb',
    bg: '#eff6ff',
    headline: 'CAMPAIGN\nOPTIMIZER',
    sub: 'AI scans every campaign, ranks the highest-impact changes, and executes them on your approval — no spreadsheets, no guesswork.',
    bullets: [
      'Ranked suggestions with expected ROAS impact',
      'One-click apply with instant rollback',
      'Auto-generate new campaign blueprints',
    ],
    mockup: (
      <div className="space-y-2.5">
        {[
          { pri: 'HIGH', label: 'SCALE_UP', text: 'Snow Boots ROAS 5.49x — increase budget +50%', impact: '+$1.2K/mo', applied: false },
          { pri: 'HIGH', label: 'PAUSE', text: 'Generic Jewelry ROAS 0.45x — pause ad group', impact: 'Save $794/mo', applied: true },
          { pri: 'MED',  label: 'BIDDING', text: 'Switch to tROAS 250% — leave manual CPC behind', impact: '+0.8x ROAS', applied: false },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-black/[0.06]">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
              s.pri === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
            }`}>{s.pri}</span>
            <span className="text-xs font-mono text-[#888] shrink-0 hidden sm:block">{s.label}</span>
            <span className="text-xs text-[#333] flex-1 min-w-0 truncate">{s.text}</span>
            <span className="text-xs font-semibold text-emerald-600 shrink-0">{s.impact}</span>
            {s.applied
              ? <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium shrink-0"><CheckCircle2 size={10} /> Applied</span>
              : <button className="text-xs bg-[#2563eb] text-white px-3 py-1 rounded-full font-medium shrink-0 flex items-center gap-1"><Play size={9} /> Apply</button>
            }
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'feed',
    label: 'Feed',
    color: '#059669',
    bg: '#f0fdf4',
    headline: 'FEED\nOPTIMIZER',
    sub: 'Score every product title against real search term data. AI rewrites underperformers using your actual winners — higher CTR, lower CPC.',
    bullets: [
      'Per-SKU quality score 0–100',
      'Claude-generated rewrite suggestions',
      'Bulk export ready for merchant feed',
    ],
    mockup: (
      <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#333]">Product Feed · 847 SKUs</span>
          <span className="text-xs text-[#888]">134 need attention</span>
        </div>
        {[
          { name: 'Ice Crystal Ring Set', score: 42, ctr: '0.8%', badge: 'Needs work' },
          { name: 'Snow Boot Waterproof Mens', score: 91, ctr: '3.2%', badge: 'Excellent' },
          { name: 'Hip Hop Bracelet Gold Chain', score: 58, ctr: '1.4%', badge: 'Fair' },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.04] last:border-0">
            <div className="w-8 h-8 rounded-lg bg-[#f3f4f6] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#111] truncate">{p.name}</p>
              <p className="text-xs text-[#888]">CTR {p.ctr}</p>
            </div>
            <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              p.score >= 80 ? 'bg-emerald-100 text-emerald-700'
              : p.score >= 55 ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-600'
            }`}>{p.score}/100</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'intel',
    label: 'Intel',
    color: '#d97706',
    bg: '#fffbeb',
    headline: 'MARKET\nINTELLIGENCE',
    sub: 'Reddit community analysis + YouTube competitor research surfaces what your audience is actually saying — before you spend a dollar on creative.',
    bullets: [
      'Reddit sentiment + pain point extraction',
      'YouTube competitor creative audit',
      'Content gaps and engagement hooks',
    ],
    mockup: (
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe2 size={13} className="text-orange-500" />
            <span className="text-xs font-semibold text-[#111]">Reddit Intel · &quot;iced out jewelry&quot;</span>
            <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">87 Sentiment</span>
          </div>
          <div className="space-y-1.5">
            {['Buyers want authenticity proof before purchasing', 'Price anchoring to hype brands works well', '"Gift for him" is the #1 use case mentioned'].map((t, i) => (
              <div key={i} className="flex gap-2 text-xs text-[#555]">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Video size={13} className="text-red-500" />
            <span className="text-xs font-semibold text-[#111]">YouTube Hook Analysis</span>
          </div>
          <p className="text-xs text-[#555]">Top 3 competitors open with unboxing + price reveal within 4s. No brand uses lifestyle hook yet — gap opportunity.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    color: '#7c3aed',
    bg: '#f5f3ff',
    headline: 'SEARCH TERMS\nANALYSIS',
    sub: "Map your entire search universe: scale the winners, cut the waste, and target the gaps your competitors haven't claimed yet.",
    bullets: [
      'ROAS segmentation by search term',
      'Intent classification (brand / generic / competitor)',
      'Negative keyword export for wasted spend',
    ],
    mockup: (
      <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-black/[0.06]">
          <div className="flex gap-2 text-xs">
            {['All Terms', '▲ Winners', '▼ Wasters', '? Untested'].map((t, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-full font-medium cursor-pointer ${i === 1 ? 'bg-[#111] text-white' : 'text-[#888]'}`}>{t}</span>
            ))}
          </div>
        </div>
        {[
          { q: 'snow boots waterproof men', roas: '5.8x', cost: '$148', intent: 'Generic', color: 'text-emerald-600 bg-emerald-50' },
          { q: 'iced out rings hip hop', roas: '3.2x', cost: '$89', intent: 'Generic', color: 'text-emerald-600 bg-emerald-50' },
          { q: 'jewelry', roas: '0.09x', cost: '$281', intent: 'Generic', color: 'text-red-500 bg-red-50' },
          { q: 'cheap rings', roas: '0x', cost: '$168', intent: 'Generic', color: 'text-red-500 bg-red-50' },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-black/[0.04] last:border-0">
            <span className="text-xs text-[#333] flex-1 font-mono">{r.q}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.roas}</span>
            <span className="text-xs text-[#888]">{r.cost}</span>
          </div>
        ))}
      </div>
    ),
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    bg: '#eff6ff',
    logo: 'CROWN ICE',
    quote: "Before AdInsight, our team was spending hours every week exporting CSVs and building pivot tables. Now the AI flags issues before we even open the account.",
    name: 'Alex Chen',
    role: 'Paid Media Lead',
  },
  {
    bg: '#fdf4ff',
    logo: 'VELDT BRAND',
    quote: "The campaign optimizer found $3k/month in wasted spend in our first week. The one-click apply with rollback gave us the confidence to actually act on the suggestions.",
    name: 'Sarah Kim',
    role: 'Growth Director',
  },
  {
    bg: '#fff7ed',
    logo: 'ALPINE GEAR',
    quote: "The Reddit intelligence module completely changed how we brief creatives. Real audience language, real pain points — not focus group fluff.",
    name: 'Marco Rivera',
    role: 'CMO',
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('optimize');
  const tab = FEATURE_TABS.find(t => t.id === activeTab) ?? FEATURE_TABS[0];

  return (
    <div className="bg-white text-[#0a0a0a] overflow-x-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── ANNOUNCEMENT BAR ──────────────────────────────────────────────── */}
      <div className="bg-[#f0f0ff] border-b border-[#e0e0ff] px-4 py-2.5 text-center">
        <p className="text-xs font-medium text-[#3730a3]">
          Bagel Digital is now running AI-optimised campaigns for 20+ brands across the US.{' '}
          <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
            See how it works →
          </a>
        </p>
      </div>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#f0f0f0]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <span className="text-xs font-black text-white">B</span>
            </div>
            <span className="text-sm font-bold tracking-tight">Bagel Digital</span>
            <span className="hidden sm:block text-xs text-[#999] font-normal">· AI Operation Center</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {['Features', 'How it works', 'Results'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-[#555] hover:text-[#111] transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
               className="hidden sm:block text-sm text-[#555] hover:text-[#111] transition-colors">
              bageldigital.ai
            </a>
            <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0a0a0a] text-white text-sm font-semibold hover:bg-[#222] transition-colors">
              Work with us <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-0 px-6 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e0e7ff] bg-[#f5f3ff] text-[#4f46e5] text-xs font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] animate-pulse" />
            Internal AI Platform · Bagel Digital
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-6 uppercase"
              style={{ letterSpacing: '-0.03em' }}>
            Run smarter<br />
            <span className="text-[#2563eb]">Google Ads</span><br />
            with AI
          </h1>

          <p className="text-lg text-[#555] max-w-xl mx-auto leading-relaxed mb-10">
            AdInsight AI is Bagel Digital&apos;s proprietary operation center — six AI modules that analyse, optimise, and generate campaign strategy faster than any human team.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
            <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2563eb] text-white text-sm font-bold hover:bg-[#1d4ed8] transition-colors shadow-lg shadow-blue-200">
              Get a free AI audit <ArrowRight size={14} />
            </a>
            <a href="#features" className="flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#e5e7eb] text-[#333] text-sm font-semibold hover:border-[#d1d5db] transition-colors">
              See capabilities <ChevronRight size={14} />
            </a>
          </div>
        </div>

        {/* ── Hero mosaic ─────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-6 grid-rows-2 gap-3 h-[280px] sm:h-[320px]">
            {/* Row 1 */}
            <div className="col-span-1 row-span-1 rounded-2xl bg-[#dbeafe] flex items-center justify-center">
              <Sparkles size={28} className="text-blue-600" />
            </div>
            <div className="col-span-2 row-span-1 rounded-2xl bg-[#2563eb] flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-black text-white tabular-nums">3.8x</p>
                <p className="text-xs text-blue-200 font-medium">Avg ROAS</p>
              </div>
            </div>
            <div className="col-span-1 row-span-1 rounded-2xl bg-[#f0fdf4] flex items-center justify-center">
              <TrendingUp size={28} className="text-emerald-600" />
            </div>
            <div className="col-span-2 row-span-1 rounded-2xl overflow-hidden bg-[#111] flex items-center justify-between px-5">
              <div>
                <p className="text-xs text-[#999] mb-1">Campaign health</p>
                <p className="text-2xl font-black text-white">74<span className="text-lg text-[#666]">/100</span></p>
              </div>
              <div className="space-y-1.5">
                {['█████████░', '███████░░░', '████░░░░░░'].map((b, i) => (
                  <p key={i} className={`text-xs font-mono ${i === 0 ? 'text-emerald-400' : i === 1 ? 'text-amber-400' : 'text-red-400'}`}>{b}</p>
                ))}
              </div>
            </div>

            {/* Row 2 */}
            <div className="col-span-2 row-span-1 rounded-2xl bg-[#fef3c7] flex items-center justify-between px-5">
              <div>
                <p className="text-xs text-[#92400e] font-medium mb-1">Wasted spend found</p>
                <p className="text-2xl font-black text-[#92400e]">$794</p>
                <p className="text-xs text-[#b45309]">this month</p>
              </div>
              <Search size={32} className="text-amber-400" />
            </div>
            <div className="col-span-1 row-span-1 rounded-2xl bg-[#ede9fe] flex items-center justify-center">
              <Target size={28} className="text-violet-600" />
            </div>
            <div className="col-span-1 row-span-1 rounded-2xl bg-[#fce7f3] flex items-center justify-center">
              <Globe2 size={28} className="text-pink-600" />
            </div>
            <div className="col-span-2 row-span-1 rounded-2xl bg-[#0a0a0a] flex items-center justify-between px-5">
              <div>
                <p className="text-xs text-[#666] mb-1">Suggestions ready</p>
                <p className="text-2xl font-black text-white">9</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded font-medium">3 urgent</span>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold">Apply all</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────────────── */}
      <section className="py-12 border-t border-b border-[#f0f0f0] mt-12">
        <p className="text-center text-xs font-semibold text-[#999] tracking-widest uppercase mb-8">
          Built for brands across every e-commerce vertical
        </p>
        <Marquee />
      </section>

      {/* ── FEATURE TABS ──────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#2563eb] tracking-widest uppercase mb-3">Platform</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight uppercase" style={{ letterSpacing: '-0.02em' }}>
              Your whole ads program.<br />
              <span className="text-[#999]">Finally automated.</span>
            </h2>
          </div>

          {/* Tab selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-[#f5f5f5] border border-[#ececec]">
              {FEATURE_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                  style={activeTab === t.id
                    ? { background: '#0a0a0a', color: '#fff' }
                    : { color: '#666' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab panel */}
          <div
            key={tab.id}
            className="rounded-3xl p-8 sm:p-12"
            style={{ background: tab.bg }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              {/* Left */}
              <div>
                <h3
                  className="text-5xl sm:text-6xl font-black leading-[0.95] mb-6 uppercase whitespace-pre-line"
                  style={{ letterSpacing: '-0.03em', color: tab.color }}
                >
                  {tab.headline}
                </h3>
                <p className="text-base text-[#444] leading-relaxed mb-8">{tab.sub}</p>
                <ul className="space-y-3">
                  {tab.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#333]">
                      <CheckCircle2 size={16} style={{ color: tab.color, flexShrink: 0, marginTop: 2 }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full text-white text-sm font-bold transition-colors"
                  style={{ background: tab.color }}
                >
                  Learn more <ArrowRight size={13} />
                </a>
              </div>
              {/* Right — mockup */}
              <div>{tab.mockup}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#fafafa] border-t border-[#f0f0f0]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#999] tracking-widest uppercase mb-3">Process</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight uppercase" style={{ letterSpacing: '-0.02em' }}>
              Human strategy.<br />
              <span className="text-[#2563eb]">Machine speed.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { n: '01', color: '#dbeafe', tc: '#1d4ed8', title: 'Connect your data', desc: 'Google Ads scripts sync campaigns, search terms and change history automatically. No CSV exports, no manual uploads.' },
              { n: '02', color: '#ede9fe', tc: '#5b21b6', title: 'AI analyses everything', desc: 'Gemini and Claude run structured analysis across your full account — finding the exact risks and opportunities that matter.' },
              { n: '03', color: '#d1fae5', tc: '#065f46', title: 'You approve. It executes.', desc: 'Every suggestion has a rationale and expected impact. One click applies it. Every action is fully reversible.' },
            ].map(s => (
              <div key={s.n} className="rounded-2xl p-7" style={{ background: s.color }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 mb-5">
                  <span className="text-sm font-black" style={{ color: s.tc }}>{s.n}</span>
                </div>
                <h3 className="text-lg font-black text-[#0a0a0a] mb-3 leading-snug">{s.title}</h3>
                <p className="text-sm text-[#444] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section id="results" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#999] tracking-widest uppercase mb-3">Results</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight uppercase" style={{ letterSpacing: '-0.02em' }}>
              The numbers behind<br />
              <span className="text-[#2563eb]">AI-driven campaigns</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { to: 94, suffix: '%', label: 'Accuracy vs. manual ROAS forecasting', color: '#dbeafe', tc: '#1e40af' },
              { to: 60, suffix: '%', label: 'Average reduction in wasted ad spend', color: '#d1fae5', tc: '#065f46' },
              { to: 3, suffix: 'x', label: 'Faster campaign optimisation cycle', color: '#ede9fe', tc: '#5b21b6' },
              { to: 12, suffix: '+', label: 'AI-powered modules in one platform', color: '#fef3c7', tc: '#92400e' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-7 text-center" style={{ background: s.color }}>
                <p className="text-5xl font-black tabular-nums mb-2" style={{ color: s.tc }}>
                  <Counter to={s.to} suffix={s.suffix} />
                </p>
                <p className="text-xs text-[#555] leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI STACK ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-semibold text-[#666] tracking-widest uppercase mb-2">Powered by</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Frontier models,<br />ads-specific prompts.
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { name: 'Claude Sonnet 4.5', use: 'Campaign reasoning', color: '#c084fc' },
              { name: 'Claude Opus 4', use: 'Deep strategy', color: '#a78bfa' },
              { name: 'Gemini 2.5 Flash', use: 'Structured data + video', color: '#34d399' },
              { name: 'Gemini 2.5 Pro', use: 'Creative analysis', color: '#6ee7b7' },
            ].map(m => (
              <div key={m.name} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <Zap size={12} style={{ color: m.color, flexShrink: 0 }} />
                <div>
                  <p className="text-xs font-bold text-white">{m.name}</p>
                  <p className="text-xs text-[#666]">{m.use}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#999] tracking-widest uppercase mb-3">Testimonials</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              From teams who used to do<br />
              <span className="text-[#999]">a lot of unnecessary manual work</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-2xl p-7 flex flex-col" style={{ background: t.bg }}>
                <p className="text-sm font-black text-[#0a0a0a] tracking-widest mb-5">{t.logo}</p>
                <p className="text-sm text-[#333] leading-relaxed flex-1 mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0a0a0a]/10 flex items-center justify-center text-xs font-bold text-[#0a0a0a]">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111]">{t.name}</p>
                    <p className="text-xs text-[#666]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-[#666] tracking-widest uppercase mb-5">Ready?</p>
          <h2 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-6 uppercase" style={{ letterSpacing: '-0.03em' }}>
            Run your campaigns<br />
            <span className="text-[#2563eb]">at AI speed</span>
          </h2>
          <p className="text-base text-[#888] mb-10 leading-relaxed max-w-lg mx-auto">
            Talk to Bagel Digital. We&apos;ll audit your account, show you exactly what our AI finds, and build a roadmap for your growth — no commitment required.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#2563eb] text-white text-base font-bold hover:bg-[#1d4ed8] transition-colors">
              Get a free AI audit <ArrowRight size={16} />
            </a>
            <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-8 py-4 rounded-full border-2 border-[#333] text-[#999] hover:text-white hover:border-[#555] text-base font-semibold transition-colors">
              Learn more <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1a1a1a] bg-[#0a0a0a] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <span className="text-xs font-black text-white">B</span>
            </div>
            <span className="text-sm font-bold text-[#888]">Bagel Digital</span>
          </div>
          <p className="text-xs text-[#444]">AdInsight AI — Proprietary platform. &copy; {new Date().getFullYear()} Bagel Digital. All rights reserved.</p>
          <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
             className="text-xs text-[#555] hover:text-[#888] flex items-center gap-1 transition-colors">
            bageldigital.ai <ExternalLink size={10} />
          </a>
        </div>
      </footer>
    </div>
  );
}

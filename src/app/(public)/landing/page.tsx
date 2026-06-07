'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, TrendingUp, Search, BarChart3, Video,
  Globe2, ArrowRight, CheckCircle2, Zap, Target,
  ChevronRight, Play, ExternalLink,
} from 'lucide-react';

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({ to, suffix = '', duration = 1800 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(ease * to));
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

// ─── Feature data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
    tag: 'Campaign Intelligence',
    title: 'AI Campaign Optimizer',
    desc: 'Analyses every live campaign against historical change data and surfaces ranked, ready-to-apply optimisations — bid strategy shifts, budget reallocation, negative keyword gaps — in seconds.',
    bullets: ['Auto-apply with one click', 'Instant rollback safety', 'New campaign blueprints'],
  },
  {
    icon: BarChart3,
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
    tag: 'Feed Quality',
    title: 'Feed Optimizer',
    desc: 'Scores every product title across CTR, keyword density and search intent alignment. AI rewrites underperformers using your top search term data — no copywriter needed.',
    bullets: ['Per-SKU quality scoring', 'Claude-generated rewrites', 'Bulk export to merchant feed'],
  },
  {
    icon: Search,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    tag: 'Search Intelligence',
    title: 'Search Terms Analysis',
    desc: 'Maps your entire search term universe: winners to scale, wasted spend to cut, gaps your competitors haven't touched yet. Updated on every data sync.',
    bullets: ['ROAS segmentation by term', 'Intent classification', 'Negative keyword export'],
  },
  {
    icon: Globe2,
    color: '#f97316',
    glow: 'rgba(249,115,22,0.15)',
    tag: 'Community Intel',
    title: 'Reddit Community Intelligence',
    desc: 'Scrapes real Reddit discussions to decode audience language, surface pain points, and map competitor perception — the unfiltered voice of your market.',
    bullets: ['Sentiment scoring', 'Audience pain-point extraction', 'Content gap mapping'],
  },
  {
    icon: Video,
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.15)',
    tag: 'Video Research',
    title: 'YouTube Market Intel',
    desc: 'Analyses competitor YouTube channels, top-performing ad creatives and audience comments to extract the hooks, formats and offers that are working right now.',
    bullets: ['Hook & CTA analysis', 'Competitor creative audit', 'Trend detection'],
  },
  {
    icon: TrendingUp,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.15)',
    tag: 'Creative Analysis',
    title: 'Video ABCD Scoring',
    desc: 'Benchmarks every video ad against Google\'s ABCD creative framework using Gemini Vision — Attention, Branding, Connection, Direction — with a prioritised improvement plan.',
    bullets: ['Frame-by-frame Gemini analysis', 'ABCD score + breakdown', 'Actionable recut brief'],
  },
];

const STATS = [
  { value: 12, suffix: '+', label: 'AI-Powered Modules' },
  { value: 94, suffix: '%', label: 'Avg. ROAS accuracy vs. manual' },
  { value: 3, suffix: 'x', label: 'Faster campaign optimisation' },
  { value: 60, suffix: '%', label: 'Reduction in wasted spend' },
];

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Connect your data',
    desc: 'Google Ads scripts sync campaign metrics, search terms and change history. Social scrapers pull Reddit discussions and competitor YouTube data.',
  },
  {
    n: '02',
    title: 'AI analyses everything',
    desc: 'Gemini and Claude models run structured analysis across your full account — finding patterns, risks and opportunities humans would take hours to spot.',
  },
  {
    n: '03',
    title: 'You approve, it executes',
    desc: 'Every suggestion ships with a rationale, an expected impact and a one-click apply. Every action is reversible. Nothing runs without your sign-off.',
  },
];

// ─── Noise texture SVG (inline) ───────────────────────────────────────────────

const NoiseBg = () => (
  <svg className="pointer-events-none absolute inset-0 opacity-[0.03]" width="100%" height="100%">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

// ─── Main landing page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">
      <NoiseBg />

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Bagel logo mark */}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <span className="text-xs font-black text-white">B</span>
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white">Bagel Digital</span>
              <span className="ml-2 text-xs text-white/30 font-normal">AI Operation Center</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs text-white/50 hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#how" className="text-xs text-white/50 hover:text-white transition-colors hidden sm:block">How it works</a>
            <a
              href="https://bageldigital.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-[#050508] text-xs font-semibold hover:bg-white/90 transition-colors"
            >
              Work with us <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-28 px-6 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, #3b82f6 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)' }}
          />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Bagel Digital · Internal AI Platform
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6"
            style={{ background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            The AI engine behind<br />
            <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              every campaign we run
            </span>
          </h1>

          {/* Sub */}
          <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
            AdInsight AI is our proprietary operation center — a full stack of AI modules that analyses, optimises and generates Google Ads strategy at a speed and depth no human team alone can match.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="https://bageldigital.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
            >
              Work with Bagel Digital <ArrowRight size={14} />
            </a>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
            >
              See capabilities <ChevronRight size={14} />
            </a>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div
            className="absolute inset-x-0 -bottom-10 h-40 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to bottom, transparent, #050508)' }}
          />
          <div
            className="rounded-2xl border border-white/[0.08] overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px -20px rgba(0,0,0,0.8), 0 0 60px rgba(59,130,246,0.08)' }}
          >
            {/* Fake browser chrome */}
            <div className="bg-[#0d0d12] border-b border-white/[0.06] px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-5 rounded-md bg-white/[0.04] flex items-center px-3">
                  <span className="text-xs text-white/20">adinsight.bageldigital.ai</span>
                </div>
              </div>
            </div>
            {/* Dashboard mockup */}
            <div className="bg-[#08080e] p-6 space-y-4">
              {/* Top stat row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Blended ROAS', val: '3.82x', up: true, delta: '+0.4x' },
                  { label: 'Total Spend', val: '$4,845', up: null, delta: '30d' },
                  { label: 'Revenue', val: '$18,503', up: true, delta: '+12%' },
                  { label: 'Optimisations', val: '9 ready', up: null, delta: '3 high-pri' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <p className="text-xs text-white/35 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-white tabular-nums">{s.val}</p>
                    <p className={`text-xs mt-0.5 ${s.up ? 'text-emerald-400' : 'text-white/25'}`}>{s.delta}</p>
                  </div>
                ))}
              </div>
              {/* Suggestion cards */}
              <div className="space-y-2">
                {[
                  { pri: 'high', type: 'PAUSE_AD_GROUP', campaign: 'Search - Generic Jewelry', action: 'Pause "Jewelry General" group — ROAS 0.45x, burning $794/mo', impact: 'Save ~$794/mo' },
                  { pri: 'high', type: 'SCALE_UP', campaign: 'Shopping - Ice Jewelry › Snow Boots', action: 'Increase budget +50% — ROAS 5.49x, capped by spend limit', impact: '+$1.2K est. revenue' },
                  { pri: 'medium', type: 'CHANGE_BIDDING_STRATEGY', campaign: 'Search - Generic Jewelry', action: 'Switch to tROAS 250% — Manual CPC is leaving efficiency on the table', impact: '+0.8x ROAS est.' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      s.pri === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    }`}>
                      {s.pri.toUpperCase()}
                    </span>
                    <span className="text-xs text-white/25 font-mono shrink-0 hidden sm:block">{s.type}</span>
                    <span className="text-xs text-white/60 flex-1 min-w-0 truncate">{s.action}</span>
                    <span className="text-xs text-emerald-400 shrink-0">{s.impact}</span>
                    <div className="shrink-0 px-3 py-1 rounded-full bg-blue-600/80 text-white text-xs font-medium">Apply</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-white/[0.05]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-black tabular-nums text-white mb-1">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs text-white/35 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-blue-400 font-medium tracking-widest uppercase mb-3">Platform Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Six AI modules.<br />
              <span className="text-white/35">One unified operation center.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="relative rounded-2xl border border-white/[0.06] p-6 cursor-default transition-all duration-300"
                style={{
                  background: hovered === i
                    ? `radial-gradient(circle at 50% 0%, ${f.glow} 0%, transparent 60%), #0d0d14`
                    : '#0a0a10',
                  boxShadow: hovered === i ? `0 0 40px ${f.glow}` : 'none',
                  borderColor: hovered === i ? `${f.color}30` : 'rgba(255,255,255,0.06)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}20`, border: `1px solid ${f.color}30` }}
                >
                  <f.icon size={18} style={{ color: f.color }} />
                </div>

                {/* Tag */}
                <p className="text-xs font-medium mb-2" style={{ color: f.color }}>{f.tag}</p>

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-2 leading-snug">{f.title}</h3>

                {/* Desc */}
                <p className="text-sm text-white/40 leading-relaxed mb-4">{f.desc}</p>

                {/* Bullets */}
                <ul className="space-y-1.5">
                  {f.bullets.map((b, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-white/50">
                      <CheckCircle2 size={11} style={{ color: f.color, flexShrink: 0 }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-violet-400 font-medium tracking-widest uppercase mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Human strategy.<br />
              <span className="text-white/35">Machine execution speed.</span>
            </h2>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="relative text-center lg:text-left">
                  <div className="inline-flex w-10 h-10 rounded-2xl items-center justify-center border border-white/10 bg-white/[0.03] mb-5">
                    <span className="text-sm font-black text-white/30">{step.n}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI STACK CALLOUT ───────────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl border border-white/[0.07] p-8 sm:p-12 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d0d18 0%, #0a0a14 100%)' }}
          >
            <div
              className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
            />
            <div className="relative">
              <p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-4">AI Stack</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-4 leading-snug">
                Built on models that<br />actually understand ads.
              </h3>
              <p className="text-sm text-white/40 max-w-2xl mb-8 leading-relaxed">
                Every analysis in AdInsight AI runs on frontier models — Claude for deep reasoning and text generation, Gemini for structured data extraction and video understanding. Both are prompted specifically for Google Ads context, cross-border e-commerce and US market dynamics.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Claude Sonnet 4.5', sub: 'Campaign reasoning & copy' },
                  { label: 'Claude Opus 4', sub: 'Complex strategy analysis' },
                  { label: 'Gemini 2.5 Flash', sub: 'Structured data + video' },
                  { label: 'Gemini 2.5 Pro', sub: 'Deep creative analysis' },
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                    <Zap size={12} className="text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">{m.label}</p>
                      <p className="text-xs text-white/30">{m.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY BAGEL ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs text-emerald-400 font-medium tracking-widest uppercase mb-4">Why Bagel Digital</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-6">
              We don't just use AI.<br />
              <span className="text-white/35">We built the infrastructure.</span>
            </h2>
            <p className="text-sm text-white/45 leading-relaxed mb-8">
              Most agencies bolt AI onto existing workflows as a buzzword. We built AdInsight AI from the ground up — a purpose-built stack for Google Ads operations that turns raw account data into prioritised, executable strategy at machine speed.
            </p>
            <a
              href="https://bageldigital.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#050508] text-sm font-bold hover:bg-white/90 transition-colors"
            >
              Visit Bagel Digital <ArrowRight size={14} />
            </a>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Target,
                color: '#3b82f6',
                title: 'Strategy-first AI',
                desc: 'Every module is designed around the real decisions an account manager needs to make — not vanity metrics.',
              },
              {
                icon: Zap,
                color: '#10b981',
                title: 'Human approval at every step',
                desc: 'AI surfaces the action. You decide. Every apply is reversible. We trust the models, but we verify the outcomes.',
              },
              {
                icon: BarChart3,
                color: '#f59e0b',
                title: 'Continuous learning loop',
                desc: 'Each campaign outcome — applied suggestions, rolled-back tests — feeds back into our analysis models over time.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}18`, border: `1px solid ${item.color}25` }}
                >
                  <item.icon size={15} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-1">{item.title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="rounded-3xl border border-white/[0.07] p-12 sm:p-16 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0c0c1a 0%, #080812 100%)' }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(59,130,246,0.2) 0%, transparent 60%)' }}
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 text-blue-400 text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                AI-Driven Agency
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                Ready to run your campaigns<br />at AI speed?
              </h2>
              <p className="text-sm text-white/40 mb-8 leading-relaxed">
                Talk to the Bagel Digital team. We&apos;ll audit your account, show you exactly what our AI finds, and build a roadmap for your growth.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a
                  href="https://bageldigital.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]"
                >
                  Get a free AI audit <ArrowRight size={14} />
                </a>
                <a
                  href="https://bageldigital.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
                >
                  Learn more <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <span className="text-xs font-black text-white">B</span>
            </div>
            <span className="text-sm font-bold text-white/50">Bagel Digital</span>
          </div>
          <p className="text-xs text-white/20">
            AdInsight AI — Proprietary platform. &copy; {new Date().getFullYear()} Bagel Digital.
          </p>
          <a
            href="https://bageldigital.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
          >
            bageldigital.ai <ExternalLink size={10} />
          </a>
        </div>
      </footer>
    </div>
  );
}

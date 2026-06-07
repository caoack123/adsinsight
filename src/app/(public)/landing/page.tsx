'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, TrendingUp, TrendingDown, Search, BarChart3, Video,
  Globe2, ArrowRight, CheckCircle2, Zap, Target,
  ChevronRight, ExternalLink, Play, AlertTriangle,
  MessageSquare, ThumbsUp, Eye, DollarSign, PlayCircle,
  SmilePlus, Meh, Frown, Lightbulb, MoveRight,
} from 'lucide-react';

/* ─── Animated counter ──────────────────────────────────────────────────────── */
function Counter({ to, suffix = '', duration = 1800 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (n: number) => { const p = Math.min((n-t0)/duration,1); setVal(Math.round((1-Math.pow(1-p,3))*to)); if(p<1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    io.observe(el); return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Scroll-reveal wrapper ─────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}
      style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(28px)', transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

/* ─── Global CSS animations ─────────────────────────────────────────────────── */
const GLOBAL_CSS = `
@keyframes float1 { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-12px) rotate(-3deg)} }
@keyframes float2 { 0%,100%{transform:translateY(0) rotate(2deg)} 50%{transform:translateY(-18px) rotate(2deg)} }
@keyframes float3 { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-8px) rotate(-1deg)} }
@keyframes float4 { 0%,100%{transform:translateY(0) rotate(4deg)} 50%{transform:translateY(-14px) rotate(4deg)} }
@keyframes marquee-left  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes marquee-right { from{transform:translateX(-50%)} to{transform:translateX(0)} }
@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.anim-float1{animation:float1 6s ease-in-out infinite}
.anim-float2{animation:float2 7s ease-in-out infinite}
.anim-float3{animation:float3 5s ease-in-out infinite}
.anim-float4{animation:float4 8s ease-in-out infinite}
.marquee-left {animation:marquee-left 28s linear infinite}
.marquee-right{animation:marquee-right 22s linear infinite}
`;

/* ─── Floating insight card atoms ───────────────────────────────────────────── */
function AbcdCard() {
  return (
    <div className="w-64 bg-white rounded-2xl shadow-xl border border-black/[0.07] p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center"><Video size={12} className="text-red-500" /></div>
          <span className="text-xs font-bold text-[#111]">Video ABCD Score</span>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">82/100</span>
      </div>
      {/* Fake thumbnail */}
      <div className="w-full h-28 rounded-xl mb-3 overflow-hidden relative"
           style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
            <Play size={16} className="text-white ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-xs font-bold text-white leading-tight">Ice Jewelry UGC<br/>Hook Test v3</div>
        </div>
      </div>
      {/* ABCD bars */}
      {[
        { letter:'A', label:'Attention',  score:88, color:'#2563eb' },
        { letter:'B', label:'Branding',   score:74, color:'#7c3aed' },
        { letter:'C', label:'Connection', score:81, color:'#059669' },
        { letter:'D', label:'Direction',  score:79, color:'#d97706' },
      ].map(b => (
        <div key={b.letter} className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-black w-3 shrink-0" style={{ color: b.color }}>{b.letter}</span>
          <div className="flex-1 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width:`${b.score}%`, background: b.color }} />
          </div>
          <span className="text-xs text-[#888] w-6 text-right">{b.score}</span>
        </div>
      ))}
    </div>
  );
}

function RedditCard() {
  return (
    <div className="w-60 bg-white rounded-2xl shadow-xl border border-black/[0.07] p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center"><Globe2 size={12} className="text-orange-500" /></div>
          <span className="text-xs font-bold text-[#111]">Reddit Intel</span>
        </div>
        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">89 pulse</span>
      </div>
      <p className="text-[11px] font-semibold text-[#555] mb-2">Top pain points · r/malefashion</p>
      {[
        '"Sizing always runs small"',
        '"Can\'t find good packaging"',
        '"No celebrity backing = fake?"',
      ].map((t,i) => (
        <div key={i} className="flex gap-2 text-[11px] text-[#444] mb-1.5">
          <span className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" />
          {t}
        </div>
      ))}
      <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
        <p className="text-[11px] text-[#888]">87 posts · 340 comments analysed</p>
      </div>
    </div>
  );
}

function CampaignCard() {
  return (
    <div className="w-72 bg-white rounded-2xl shadow-xl border border-black/[0.07] p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-[#111]">Campaign Optimizer</span>
        <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
          <AlertTriangle size={9} /> 3 urgent
        </span>
      </div>
      {[
        { pri:'HIGH', icon:TrendingUp,  color:'#2563eb', bg:'#dbeafe', text:'Scale Snow Boots +50% budget', val:'+$1.2K/mo', done:false },
        { pri:'HIGH', icon:TrendingDown,color:'#dc2626', bg:'#fee2e2', text:'Pause Generic Jewelry ROAS 0.45x', val:'Save $794', done:true  },
        { pri:'MED',  icon:Target,      color:'#7c3aed', bg:'#ede9fe', text:'Switch to tROAS 250%', val:'+0.8x ROAS', done:false },
      ].map((s,i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center gap-2.5 mb-2 last:mb-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.bg }}>
              <Icon size={12} style={{ color: s.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#222] truncate">{s.text}</p>
              <p className="text-[10px] text-emerald-600 font-medium">{s.val}</p>
            </div>
            {s.done
              ? <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={11} className="text-emerald-600" /></span>
              : <button className="shrink-0 text-[10px] bg-[#0a0a0a] text-white px-2 py-1 rounded-full font-bold">Apply</button>
            }
          </div>
        );
      })}
    </div>
  );
}

function FeedCard() {
  return (
    <div className="w-56 bg-white rounded-2xl shadow-xl border border-black/[0.07] p-4 select-none">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center"><BarChart3 size={12} className="text-emerald-600" /></div>
        <span className="text-xs font-bold text-[#111]">Feed Optimizer</span>
      </div>
      {[
        { name:'Snow Boot Waterproof', score:91, color:'#059669', bg:'#d1fae5' },
        { name:'Ice Crystal Ring Set', score:38, color:'#dc2626', bg:'#fee2e2' },
        { name:'Hip Hop Gold Chain',   score:62, color:'#d97706', bg:'#fef3c7' },
      ].map((p,i) => (
        <div key={i} className="flex items-center gap-2.5 mb-2.5 last:mb-0">
          <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: p.bg }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-[#222] truncate">{p.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex-1 h-1 bg-[#f3f4f6] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width:`${p.score}%`, background: p.color }} />
              </div>
              <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.score}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── YouTube Intel card ────────────────────────────────────────────────────── */
function YoutubeIntelCard() {
  return (
    <div className="w-72 bg-white rounded-2xl shadow-xl border border-black/[0.07] p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center"><PlayCircle size={12} className="text-red-500" /></div>
          <span className="text-xs font-bold text-[#111]">YouTube Intel</span>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">324 comments</span>
      </div>
      {/* Fake video thumbnail */}
      <div className="w-full h-24 rounded-xl mb-3 overflow-hidden relative"
           style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <Play size={14} className="text-white ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[11px] font-semibold text-white/90 leading-tight">Review: Top 5 Ice Jewelry Brands 2024</p>
          <p className="text-[10px] text-white/50 mt-0.5">148K views · competitor</p>
        </div>
      </div>
      {/* Sentiment bars */}
      <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider mb-2">Comment sentiment</p>
      {[
        { label:'Positive', pct:71, color:'#059669', bg:'#d1fae5', icon:SmilePlus },
        { label:'Neutral',  pct:21, color:'#d97706', bg:'#fef3c7', icon:Meh       },
        { label:'Negative', pct:8,  color:'#dc2626', bg:'#fee2e2', icon:Frown      },
      ].map(s => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex items-center gap-2 mb-1.5">
            <Icon size={11} style={{ color: s.color, flexShrink: 0 }} />
            <div className="flex-1 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width:`${s.pct}%`, background: s.color }} />
            </div>
            <span className="text-[10px] font-bold w-7 text-right" style={{ color: s.color }}>{s.pct}%</span>
          </div>
        );
      })}
      {/* Top insight */}
      <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex gap-2">
        <Lightbulb size={11} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#555] leading-relaxed">
          Top objection: <strong className="text-[#111]">&ldquo;looks cheap in person&rdquo;</strong> — 38 comments
        </p>
      </div>
    </div>
  );
}

/* ─── YouTube Ads bridge card ────────────────────────────────────────────────── */
function AdsActionCard() {
  return (
    <div className="w-72 bg-white rounded-2xl shadow-xl border border-black/[0.07] p-4 select-none">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center"><Sparkles size={11} className="text-blue-600" /></div>
        <span className="text-xs font-bold text-[#111]">AI Generated Actions</span>
      </div>
      <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider mb-2">From YouTube insight → Ads</p>
      {[
        {
          from: '"looks cheap in person"',
          to: 'Add RSA headline: "Premium 925 Silver — Feel the Difference"',
          color: '#2563eb', bg: '#eff6ff', icon: MessageSquare,
        },
        {
          from: '"where do I buy this?"',
          to: 'New campaign: Brand + "buy [brand name]" exact match',
          color: '#7c3aed', bg: '#ede9fe', icon: Target,
        },
        {
          from: '"shipping took forever"',
          to: 'Add callout extension: "Ships in 24h · Free returns"',
          color: '#059669', bg: '#d1fae5', icon: Zap,
        },
      ].map((a, i) => {
        const Icon = a.icon;
        return (
          <div key={i} className="rounded-xl p-2.5 mb-2 last:mb-0" style={{ background: a.bg }}>
            <p className="text-[10px] text-[#888] mb-1 truncate">💬 {a.from}</p>
            <div className="flex items-start gap-1.5">
              <Icon size={10} style={{ color: a.color, flexShrink:0, marginTop:1 }} />
              <p className="text-[11px] font-semibold leading-tight" style={{ color: a.color }}>{a.to}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Auto-scroll insight rows ──────────────────────────────────────────────── */
const ROW1 = [
  { icon: TrendingUp,   color:'#059669', bg:'#d1fae5', label:'Snow Boots ROAS',              val:'5.49x',    delta:'+2.2x',     positive:true  },
  { icon: PlayCircle,   color:'#dc2626', bg:'#fee2e2', label:'YT comment signals found',     val:'324',      delta:'4 videos',  positive:null  },
  { icon: Video,        color:'#ef4444', bg:'#fee2e2', label:'Hook Score — UGC v3',           val:'88/100',   delta:'Strong',    positive:true  },
  { icon: DollarSign,   color:'#dc2626', bg:'#fee2e2', label:'Generic Jewelry waste',         val:'$794/mo',  delta:'urgent',    positive:false },
  { icon: Target,       color:'#7c3aed', bg:'#ede9fe', label:'Brand ROAS',                    val:'3.82x',    delta:'+0.4x',     positive:true  },
  { icon: Search,       color:'#2563eb', bg:'#dbeafe', label:'Wasted search terms',           val:'47 terms', delta:'$1.1K',     positive:false },
  { icon: Sparkles,     color:'#d97706', bg:'#fef3c7', label:'AI suggestions ready',          val:'9 total',  delta:'3 high',    positive:null  },
  { icon: BarChart3,    color:'#059669', bg:'#d1fae5', label:'Feed quality avg score',        val:'67/100',   delta:'+8 pts',    positive:true  },
];
const ROW2 = [
  { icon: Eye,          color:'#7c3aed', bg:'#ede9fe', label:'Impression share lost',        val:'28%',      delta:'budget',    positive:false },
  { icon: MessageSquare,color:'#dc2626', bg:'#fee2e2', label:'YT top objection',             val:'"sizing"', delta:'38 comments',positive:false },
  { icon: ThumbsUp,     color:'#2563eb', bg:'#dbeafe', label:'Brand ABCD avg',               val:'79/100',   delta:'B is low',  positive:true  },
  { icon: TrendingDown, color:'#dc2626', bg:'#fee2e2', label:'"cheap rings" spend',          val:'$168',     delta:'0 conv',    positive:false },
  { icon: Zap,          color:'#059669', bg:'#d1fae5', label:'Auto-applied this week',       val:'6 actions',delta:'all good',  positive:true  },
  { icon: PlayCircle,   color:'#ef4444', bg:'#fee2e2', label:'YT → Ads: new headlines gen', val:'4 copies', delta:'ready',     positive:null  },
  { icon: Globe2,       color:'#f97316', bg:'#fff7ed', label:'Reddit pain point',            val:'"sizing"', delta:'not in ads',positive:null  },
  { icon: BarChart3,    color:'#7c3aed', bg:'#ede9fe', label:'PMax vs target ROAS',         val:'2.09x',    delta:'-0.41x',    positive:false },
];

function InsightChip({ item }: { item: typeof ROW1[0] }) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-black/[0.07] shadow-sm shrink-0 select-none">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: item.bg }}>
        <Icon size={14} style={{ color: item.color }} />
      </div>
      <div>
        <p className="text-xs text-[#666] leading-none mb-1">{item.label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-black text-[#111]">{item.val}</p>
          <span className={`text-xs font-semibold ${item.positive === true ? 'text-emerald-600' : item.positive === false ? 'text-red-500' : 'text-[#888]'}`}>
            {item.delta}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);

  const FEATURES = [
    {
      color: '#2563eb', bg: '#eff6ff', label: 'Campaign',
      headline: 'Optimise campaigns\nat AI speed',
      sub: "AI analyses every live campaign against your change history and surfaces ranked, ready-to-apply suggestions — bid shifts, budget reallocation, negative keyword gaps — in seconds.",
      bullets: ['Ranked suggestions with expected ROAS impact', 'One-click apply with instant rollback', 'Auto-generate new campaign blueprints'],
      visual: <CampaignCard />,
    },
    {
      color: '#059669', bg: '#f0fdf4', label: 'Feed',
      headline: 'Score every\nproduct title',
      sub: 'Quality-scores each SKU against CTR, keyword density and search intent. AI rewrites underperformers using your top search term data.',
      bullets: ['Per-SKU quality score 0–100', 'Claude-generated rewrite suggestions', 'Bulk export ready for your merchant feed'],
      visual: <FeedCard />,
    },
    {
      color: '#ef4444', bg: '#fff1f2', label: 'Video ABCD',
      headline: 'Know what makes\nyour ads win',
      sub: "Gemini Vision benchmarks every video ad against Google's ABCD framework — Attention, Branding, Connection, Direction — and delivers a prioritised recut brief.",
      bullets: ['Frame-by-frame Gemini analysis', 'ABCD score with per-dimension breakdown', 'Actionable recut brief generated instantly'],
      visual: <AbcdCard />,
    },
    {
      color: '#dc2626', bg: '#fff1f2', label: 'YouTube Intel',
      headline: 'Turn 1,000 comments\ninto 10 winning ads',
      sub: "Gemini reads every comment on competitor YouTube videos in your niche — extracting objections, purchase triggers and trust gaps — then maps each signal directly to your live Google Ads campaigns.",
      bullets: ['Competitor video comment sentiment analysis', 'Objection → ad copy translation, auto-generated', 'Purchase intent signals mapped to campaign keywords'],
      visual: <YoutubeIntelCard />,
    },
  ];

  const feat = FEATURES[activeTab];

  return (
    <div className="bg-white text-[#0a0a0a] overflow-x-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#fef2f2' }} className="border-b border-red-100 px-4 py-2.5 text-center">
        <p className="text-xs font-medium text-red-700 flex items-center justify-center gap-2">
          <PlayCircle size={13} className="text-red-500 shrink-0" />
          New: YouTube Comment Intelligence now connects directly to Google Ads optimisation — a world first for performance agencies.{' '}
          <a href="#youtube-intel" className="underline hover:no-underline font-semibold">See how →</a>
        </p>
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#f0f0f0]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <span className="text-xs font-black text-white">B</span>
            </div>
            <span className="text-sm font-bold tracking-tight">Bagel Digital</span>
            <span className="hidden sm:block text-xs text-[#bbb] font-normal">AI Operation Center</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-[#555]">
            {['Features','How it works','Results'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`} className="hover:text-[#111] transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0a0a0a] text-white text-sm font-bold hover:bg-[#222] transition-colors">
              Work with us <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-0"
        style={{ background: 'linear-gradient(160deg, #f0ecff 0%, #e8f4ff 40%, #f8f8ff 100%)' }}>

        {/* Background circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(ellipse,#a78bfa 0%,transparent 70%)' }} />
          <div className="absolute top-1/2 -left-32 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse,#60a5fa 0%,transparent 70%)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#d4ceff] text-[#4f46e5] text-xs font-semibold mb-8 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
              Bagel Digital · Internal AI Platform
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-5xl sm:text-6xl lg:text-[80px] font-black leading-[0.95] tracking-tight mb-6"
                style={{ letterSpacing: '-0.03em' }}>
              Run Google Ads<br />
              that actually{' '}
              <em className="not-italic" style={{
                background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>win</em>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="text-lg text-[#555] max-w-xl mx-auto leading-relaxed mb-10">
              AdInsight AI is our proprietary operation center — six AI modules that analyse, optimise and generate campaign strategy at machine speed.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
              <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 px-7 py-3.5 rounded-full text-white text-sm font-bold transition-all hover:-translate-y-0.5"
                 style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
                Get a free AI audit <ArrowRight size={14} />
              </a>
              <a href="#features" className="flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#e0e0e0] bg-white text-[#333] text-sm font-semibold hover:border-[#c0c0c0] transition-colors">
                See capabilities <ChevronRight size={14} />
              </a>
            </div>
            <p className="text-xs text-[#999]">AI-driven agency · No fluff, just results</p>
          </Reveal>
        </div>

        {/* ── Floating card scene ─────────────────────────────────────────── */}
        <div className="relative max-w-6xl mx-auto px-6 mt-16 h-[380px] sm:h-[440px]">
          {/* Centre: main dashboard mockup */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[580px] sm:w-[680px]"
            style={{ animation: 'float3 7s ease-in-out infinite' }}>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-black/[0.09]"
                 style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)' }}>
              {/* Browser chrome */}
              <div className="bg-[#f5f5f5] border-b border-[#e8e8e8] px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  {['#ff6058','#ffbd2e','#28c840'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                </div>
                <div className="flex-1 mx-4 h-5 rounded bg-white border border-[#e0e0e0] flex items-center px-2.5">
                  <span className="text-[11px] text-[#aaa]">adinsight.bageldigital.ai</span>
                </div>
              </div>
              {/* Dashboard body */}
              <div className="bg-white p-5 space-y-4">
                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l:'Total spend (30d)',  v:'$4,845',  d:'+12%',   pos:true },
                    { l:'Blended ROAS',       v:'3.82x',   d:'+0.4x',  pos:true },
                    { l:'AI suggestions',     v:'9 ready', d:'3 high', pos:null },
                  ].map(s => (
                    <div key={s.l} className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] px-3 py-2.5">
                      <p className="text-[10px] text-[#999] mb-1">{s.l}</p>
                      <p className="text-lg font-black text-[#111] tabular-nums">{s.v}</p>
                      <p className={`text-[10px] font-semibold ${s.pos === true ? 'text-emerald-600' : s.pos === false ? 'text-red-500' : 'text-[#888]'}`}>{s.d}</p>
                    </div>
                  ))}
                </div>
                {/* Suggestion list */}
                <div className="space-y-2">
                  {[
                    { pri:'HIGH', c:'#fee2e2', tc:'#dc2626', t:'Pause "Generic Jewelry" — ROAS 0.45x, $794/mo waste', imp:'Save $794', done:true  },
                    { pri:'HIGH', c:'#dbeafe', tc:'#2563eb', t:'Scale Snow Boots budget +50% — ROAS 5.49x, capped',   imp:'+$1.2K',  done:false },
                    { pri:'MED',  c:'#ede9fe', tc:'#7c3aed', t:'Switch Generic Jewelry to tROAS 250%',                imp:'+0.8x',   done:false },
                  ].map((s,i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-[#f3f3f3] px-3.5 py-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: s.c, color: s.tc }}>{s.pri}</span>
                      <span className="text-xs text-[#333] flex-1 truncate">{s.t}</span>
                      <span className="text-[10px] font-semibold text-emerald-600 shrink-0">{s.imp}</span>
                      {s.done
                        ? <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={10} className="text-emerald-600" /></span>
                        : <button className="shrink-0 text-[10px] bg-[#2563eb] text-white px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Play size={8}/> Apply</button>
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Left float: ABCD card */}
          <div className="absolute top-8 -left-4 sm:left-8 hidden sm:block anim-float1">
            <AbcdCard />
          </div>

          {/* Right float: Reddit card */}
          <div className="absolute top-16 -right-4 sm:right-8 hidden sm:block anim-float2">
            <RedditCard />
          </div>
        </div>
      </section>

      {/* ── INSIGHT RIVER ────────────────────────────────────────────────── */}
      <section className="py-16 border-t border-[#f0f0f0] overflow-hidden bg-[#fafafa]">
        <Reveal>
          <p className="text-center text-xs font-semibold text-[#999] tracking-widest uppercase mb-8">
            Live signals from every module
          </p>
        </Reveal>
        {/* Row 1 — scrolls left */}
        <div className="overflow-hidden mb-3">
          <div className="flex gap-3 w-max marquee-left">
            {[...ROW1, ...ROW1].map((item, i) => <InsightChip key={i} item={item} />)}
          </div>
        </div>
        {/* Row 2 — scrolls right */}
        <div className="overflow-hidden">
          <div className="flex gap-3 w-max marquee-right">
            {[...ROW2, ...ROW2].map((item, i) => <InsightChip key={i} item={item} />)}
          </div>
        </div>
      </section>

      {/* ── YOUTUBE INTEL SPOTLIGHT ──────────────────────────────────────── */}
      <section id="youtube-intel" className="py-24 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0f0a1e 0%,#1a0a0a 50%,#0a0f1e 100%)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <Reveal>
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
                <PlayCircle size={14} className="text-red-400" />
                <span className="text-xs font-bold text-red-300">YouTube Intelligence</span>
              </div>
              <span className="text-xs text-white/30">×</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30">
                <BarChart3 size={14} className="text-blue-400" />
                <span className="text-xs font-bold text-blue-300">Google Ads Performance</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-center leading-tight mb-6"
                style={{ letterSpacing: '-0.03em' }}>
              <span className="text-white">What your audience </span>
              <em className="not-italic" style={{
                background: 'linear-gradient(135deg,#f87171 0%,#fb923c 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>says on YouTube</em>
              <br />
              <span className="text-white/40">becomes your next winning ad</span>
            </h2>
          </Reveal>

          <Reveal delay={140}>
            <p className="text-base text-white/50 text-center max-w-2xl mx-auto leading-relaxed mb-16">
              Most agencies keep content research and performance marketing in separate silos.
              We use AI to bridge them — turning YouTube comment intelligence into concrete Google Ads improvements, automatically.
            </p>
          </Reveal>

          {/* Three-column bridge diagram */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-16">
            {/* Left: YouTube analysis */}
            <Reveal delay={0}>
              <div className="rounded-2xl p-6 border border-white/[0.08]"
                   style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <PlayCircle size={16} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">YouTube Comment Analysis</p>
                    <p className="text-xs text-white/40">AI reads what people actually say</p>
                  </div>
                </div>
                {/* Stacked video + sentiment */}
                <div className="space-y-3">
                  {/* Video row */}
                  <div className="flex items-center gap-3 rounded-xl p-2.5 bg-white/[0.05]">
                    <div className="w-12 h-9 rounded-lg shrink-0 flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b)' }}>
                      <Play size={10} className="text-white ml-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/80 truncate">Competitor review: Ice Jewelry</p>
                      <p className="text-[10px] text-white/40">148K views · 324 comments</p>
                    </div>
                  </div>
                  {/* Extracted signals */}
                  {[
                    { text:'"looks cheap in real life"', count:'38 comments', type:'objection', color:'#f87171' },
                    { text:'"where can I actually buy this?"', count:'24 comments', type:'intent', color:'#34d399' },
                    { text:'"sizing is completely off"', count:'19 comments', type:'pain point', color:'#fb923c' },
                    { text:'"need to see celebrity wearing it"', count:'15 comments', type:'trust trigger', color:'#a78bfa' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl p-2.5 bg-white/[0.05]">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 mt-0.5"
                            style={{ background: s.color + '25', color: s.color }}>{s.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 leading-tight">{s.text}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{s.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Centre: AI bridge */}
            <Reveal delay={150}>
              <div className="flex flex-col items-center gap-3 py-6 lg:py-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div className="hidden lg:flex flex-col items-center gap-1">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="w-0.5 h-3 rounded-full bg-white/20" />
                  ))}
                  <MoveRight size={14} className="text-white/40 rotate-90" />
                </div>
                <p className="text-xs font-bold text-white/60 text-center">Gemini AI<br/>maps signals</p>
              </div>
            </Reveal>

            {/* Right: Google Ads actions */}
            <Reveal delay={300}>
              <div className="rounded-2xl p-6 border border-white/[0.08]"
                   style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <BarChart3 size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Google Ads Actions</p>
                    <p className="text-xs text-white/40">Specific, ready-to-apply changes</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      insight: '"looks cheap in real life"',
                      action: 'New RSA headline: "Premium 925 Silver — Feel the Difference"',
                      type: 'Ad copy', color: '#60a5fa', impact: '+11% CTR',
                    },
                    {
                      insight: '"where can I actually buy this?"',
                      action: 'Create brand + navigational search campaign',
                      type: 'New campaign', color: '#34d399', impact: '+$420/mo',
                    },
                    {
                      insight: '"sizing is completely off"',
                      action: 'Add sitelink: "Size Guide — Find Your Perfect Fit"',
                      type: 'Extension', color: '#fb923c', impact: '+6% conv',
                    },
                    {
                      insight: '"need celebrity validation"',
                      action: 'Add callout: "As seen on @creator · 50K+ happy customers"',
                      type: 'Social proof', color: '#c084fc', impact: '+8% ROAS',
                    },
                  ].map((a, i) => (
                    <div key={i} className="rounded-xl p-2.5 bg-white/[0.05]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: a.color + '25', color: a.color }}>{a.type}</span>
                        <span className="text-[10px] font-bold text-emerald-400">{a.impact}</span>
                      </div>
                      <p className="text-xs text-white/70 leading-tight">{a.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Bottom callout */}
          <Reveal delay={200}>
            <div className="rounded-2xl p-6 border border-white/[0.08] text-center max-w-2xl mx-auto"
                 style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-sm text-white/60 leading-relaxed">
                <span className="text-white font-bold">No other performance agency does this.</span>{' '}
                We merge what people say in YouTube comments with what they search on Google — so your ads speak the exact language that already converts.
              </p>
              <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                 style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)', boxShadow: '0 8px 24px rgba(239,68,68,0.3)' }}>
                <PlayCircle size={14} /> See the YouTube intelligence demo
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-[#2563eb] tracking-widest uppercase mb-3">Modules</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight" style={{ letterSpacing: '-0.02em' }}>
                Your whole ads program.<br />
                <span className="text-[#bbb]">Finally connected.</span>
              </h2>
            </div>
          </Reveal>

          {/* Tab pills */}
          <Reveal delay={100}>
            <div className="flex justify-center mb-10">
              <div className="inline-flex gap-1.5 p-1.5 rounded-full bg-[#f5f5f5] border border-[#eee]">
                {FEATURES.map((f, i) => (
                  <button key={i} onClick={() => setActiveTab(i)}
                    className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                    style={activeTab === i ? { background: '#0a0a0a', color: '#fff' } : { color: '#666' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Feature panel */}
          <div key={activeTab} className="rounded-3xl p-8 sm:p-12 transition-all"
               style={{ background: feat.bg, opacity: 1 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-4xl sm:text-5xl font-black leading-tight mb-5 whitespace-pre-line"
                    style={{ letterSpacing: '-0.02em', color: feat.color }}>
                  {feat.headline}
                </h3>
                <p className="text-base text-[#444] leading-relaxed mb-8">{feat.sub}</p>
                <ul className="space-y-3 mb-8">
                  {feat.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#333]">
                      <CheckCircle2 size={16} style={{ color: feat.color, flexShrink:0, marginTop:2 }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold"
                   style={{ background: feat.color }}>
                  Learn more <ArrowRight size={13} />
                </a>
              </div>
              {/* Right: floating visual */}
              <div className="flex items-center justify-center">
                <div className="anim-float3">
                  {feat.visual}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#fafafa] border-t border-[#f0f0f0]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-[#999] tracking-widest uppercase mb-3">Process</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                Human strategy.<br />
                <span style={{ background:'linear-gradient(135deg,#2563eb,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  Machine execution.
                </span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { n:'01', color:'#dbeafe', tc:'#1d4ed8', title:'Connect your data', desc:'Google Ads scripts sync campaigns, search terms and change history automatically. Social scrapers pull Reddit discussions and competitor YouTube data.' },
              { n:'02', color:'#ede9fe', tc:'#5b21b6', title:'AI analyses everything', desc:'Gemini Vision and Claude models run structured analysis across your full account — finding patterns, risks and opportunities in seconds.' },
              { n:'03', color:'#d1fae5', tc:'#065f46', title:'You approve. It executes.', desc:'Every suggestion ships with a rationale and expected impact. One click applies it. Every action is fully reversible.' },
            ].map((s,i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="rounded-2xl p-7 h-full" style={{ background: s.color }}>
                  <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center mb-5">
                    <span className="text-sm font-black" style={{ color: s.tc }}>{s.n}</span>
                  </div>
                  <h3 className="text-lg font-black text-[#0a0a0a] mb-3">{s.title}</h3>
                  <p className="text-sm text-[#444] leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section id="results" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold text-[#999] tracking-widest uppercase mb-3">Results</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                The numbers don&apos;t lie
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { to:94, suffix:'%', label:'vs. manual ROAS forecasting',        color:'#dbeafe', tc:'#1e40af' },
              { to:60, suffix:'%', label:'average reduction in wasted spend',  color:'#d1fae5', tc:'#065f46' },
              { to:3,  suffix:'x', label:'faster campaign optimisation cycle', color:'#ede9fe', tc:'#5b21b6' },
              { to:12, suffix:'+', label:'AI-powered modules in one platform', color:'#fef3c7', tc:'#92400e' },
            ].map((s,i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="rounded-2xl p-7 text-center" style={{ background: s.color }}>
                  <p className="text-5xl font-black tabular-nums mb-2" style={{ color: s.tc }}>
                    <Counter to={s.to} suffix={s.suffix} />
                  </p>
                  <p className="text-xs text-[#555] leading-snug">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI STACK ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
          <Reveal>
            <div>
              <p className="text-xs font-semibold text-[#555] tracking-widest uppercase mb-2">Powered by</p>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Frontier models.<br />Ads-specific prompts.
              </h3>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex flex-wrap gap-3">
              {[
                { name:'Claude Sonnet 4.5', use:'Campaign reasoning', color:'#c084fc' },
                { name:'Claude Opus 4',     use:'Deep strategy',      color:'#a78bfa' },
                { name:'Gemini 2.5 Flash',  use:'Data + video',       color:'#34d399' },
                { name:'Gemini 2.5 Pro',    use:'Creative analysis',  color:'#6ee7b7' },
              ].map(m => (
                <div key={m.name} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                  <Zap size={12} style={{ color: m.color, flexShrink:0 }} />
                  <div>
                    <p className="text-xs font-bold text-white">{m.name}</p>
                    <p className="text-xs text-[#666]">{m.use}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold text-[#999] tracking-widest uppercase mb-3">Testimonials</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                From teams who used to do<br />
                <span className="text-[#bbb]">a lot of unnecessary manual work</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { bg:'#eff6ff', logo:'CROWN ICE',   quote:'Before AdInsight, our team was spending hours every week exporting CSVs and building pivot tables. Now the AI flags issues before we even open the account.',                   name:'Alex Chen',    role:'Paid Media Lead'   },
              { bg:'#fdf4ff', logo:'VELDT BRAND', quote:'The campaign optimizer found $3k/month in wasted spend in our first week. One-click apply with rollback gave us the confidence to actually act on the suggestions.',   name:'Sarah Kim',    role:'Growth Director'  },
              { bg:'#fff7ed', logo:'ALPINE GEAR', quote:'The Reddit intelligence module completely changed how we brief creatives. Real audience language, real pain points — not focus group fluff.',                              name:'Marco Rivera', role:'CMO'              },
            ].map((t,i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="rounded-2xl p-7 flex flex-col h-full" style={{ background: t.bg }}>
                  <p className="text-sm font-black text-[#0a0a0a] tracking-widest mb-5">{t.logo}</p>
                  <p className="text-sm text-[#333] leading-relaxed flex-1 mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center text-xs font-black text-[#333]">{t.name[0]}</div>
                    <div>
                      <p className="text-xs font-bold text-[#111]">{t.name}</p>
                      <p className="text-xs text-[#666]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#f0ecff 0%,#e8f4ff 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-40"
            style={{ background: 'radial-gradient(ellipse,#a78bfa 0%,transparent 70%)' }} />
          <Reveal>
            <p className="text-xs font-semibold text-[#7c3aed] tracking-widest uppercase mb-5 relative">Ready?</p>
            <h2 className="text-5xl sm:text-6xl font-black leading-tight mb-6 relative" style={{ letterSpacing: '-0.03em' }}>
              Run your campaigns<br />
              <span style={{ background:'linear-gradient(135deg,#2563eb,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                at AI speed
              </span>
            </h2>
            <p className="text-base text-[#555] mb-10 leading-relaxed max-w-lg mx-auto relative">
              Talk to Bagel Digital. We&apos;ll audit your account, show you exactly what our AI finds, and build a growth roadmap — no commitment required.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap relative">
              <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 px-8 py-4 rounded-full text-white text-base font-bold transition-all hover:-translate-y-0.5"
                 style={{ background:'linear-gradient(135deg,#2563eb,#7c3aed)', boxShadow:'0 12px 32px rgba(99,102,241,0.35)' }}>
                Get a free AI audit <ArrowRight size={16} />
              </a>
              <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 px-8 py-4 rounded-full border-2 border-[#d4d4d4] bg-white text-[#333] text-base font-semibold hover:border-[#bbb] transition-colors">
                Learn more <ExternalLink size={14} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#f0f0f0] py-10 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <span className="text-xs font-black text-white">B</span>
            </div>
            <span className="text-sm font-bold text-[#555]">Bagel Digital</span>
          </div>
          <p className="text-xs text-[#bbb]">AdInsight AI — Proprietary platform. &copy; {new Date().getFullYear()} Bagel Digital.</p>
          <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
             className="text-xs text-[#bbb] hover:text-[#555] flex items-center gap-1 transition-colors">
            bageldigital.ai <ExternalLink size={10} />
          </a>
        </div>
      </footer>
    </div>
  );
}

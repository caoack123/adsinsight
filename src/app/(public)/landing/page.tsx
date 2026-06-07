'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles, TrendingUp, TrendingDown, Search, BarChart3, Video,
  Globe2, ArrowRight, CheckCircle2, Zap, Target,
  ChevronRight, ExternalLink, Play, AlertTriangle,
  MessageSquare, ThumbsUp, Eye, DollarSign, PlayCircle,
  SmilePlus, Meh, Frown, Lightbulb, MoveRight,
} from 'lucide-react';

/* ─── Bagel logo SVG (donut + gradient) ─────────────────────────────────────── */
function BagelLogo({ size = 28, id = 'a' }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`bg-${id}`} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5AA84" />
          <stop offset="100%" stopColor="#D97248" />
        </linearGradient>
        <mask id={`bm-${id}`}>
          <circle cx="20" cy="20" r="18" fill="white" />
          <circle cx="20" cy="20" r="7" fill="black" />
        </mask>
      </defs>
      <circle cx="20" cy="20" r="18" fill={`url(#bg-${id})`} mask={`url(#bm-${id})`} />
    </svg>
  );
}

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

/* ─── Stagger container — triggers stagger-N classes on viewport entry ─────────── */
function StaggerReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }, { threshold: 0.1 });
    io.observe(el); return () => io.disconnect();
  }, []);
  /* When not visible yet: hide children by overriding animation-play-state */
  return (
    <div ref={ref} className={className}
      style={{ '--stagger-state': vis ? 'running' : 'paused' } as React.CSSProperties}>
      {children}
    </div>
  );
}

/* ─── Scroll-reveal wrapper (Emil: scale(0.97)→1, never scale(0), strong ease-out) */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}
      style={{
        opacity:   vis ? 1 : 0,
        transform: vis ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
        /* Emil: never ease-in. Use strong ease-out so movement starts instantly */
        transition: `opacity 500ms cubic-bezier(0.23,1,0.32,1) ${delay}ms, transform 500ms cubic-bezier(0.23,1,0.32,1) ${delay}ms`,
      }}>
      {children}
    </div>
  );
}

/* ─── Emil Kowalski animation system ─────────────────────────────────────────── */
const GLOBAL_CSS = `
/* Custom easing curves — Emil's philosophy: built-in easings are too weak */
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}

/* Decorative float — only animate transform+opacity (GPU composited) */
@keyframes float1 { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-10px) rotate(-3deg)} }
@keyframes float2 { 0%,100%{transform:translateY(0) rotate(2deg)} 50%{transform:translateY(-14px) rotate(2deg)} }
@keyframes float3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@keyframes float4 { 0%,100%{transform:translateY(0) rotate(4deg)} 50%{transform:translateY(-12px) rotate(4deg)} }

/* Marquee — GPU composited, will-change declared inline */
@keyframes marquee-left  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes marquee-right { from{transform:translateX(-50%)} to{transform:translateX(0)} }

/* Pulse for status dot */
@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.75)} }

/* Stagger in — scale(0.97) start, not scale(0) — nothing in real world appears from nothing */
@keyframes stagger-in {
  from { opacity:0; transform:translateY(8px) scale(0.97); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}

/* Float class bindings — use var(--ease-in-out) for smooth perpetual motion */
.anim-float1 { animation: float1 6s   var(--ease-in-out, ease-in-out) infinite; }
.anim-float2 { animation: float2 7.5s var(--ease-in-out, ease-in-out) infinite; }
.anim-float3 { animation: float3 5.5s var(--ease-in-out, ease-in-out) infinite; }
.anim-float4 { animation: float4 8s   var(--ease-in-out, ease-in-out) infinite; }
.marquee-left  { animation: marquee-left  28s linear infinite; will-change: transform; }
.marquee-right { animation: marquee-right 22s linear infinite; will-change: transform; }

/* Button press feedback — Emil: buttons must feel responsive to press */
.btn-press {
  transition: transform 160ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)),
              box-shadow 160ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)),
              opacity    160ms var(--ease-out, cubic-bezier(0.23,1,0.32,1));
  cursor: pointer;
}
.btn-press:active { transform: scale(0.97); }

/* Card hover lift — perceived depth without changing layout */
.card-lift {
  transition: transform 220ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)),
              box-shadow 220ms var(--ease-out, cubic-bezier(0.23,1,0.32,1));
}
@media (hover: hover) and (pointer: fine) {
  .card-lift:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.10);
  }
}

/* Chip hover lift for insight river */
.chip-lift {
  transition: transform 180ms var(--ease-out, cubic-bezier(0.23,1,0.32,1));
}
@media (hover: hover) and (pointer: fine) {
  .chip-lift:hover { transform: translateY(-2px); }
}

/* Stagger classes — 60ms apart, stays under 300ms total for 5 items
 * animation-play-state controlled by parent CSS var for scroll-triggered start */
.stagger-1 { opacity:0; animation: stagger-in 420ms cubic-bezier(0.23,1,0.32,1) both; animation-delay:  0ms; animation-play-state: var(--stagger-state, paused); }
.stagger-2 { opacity:0; animation: stagger-in 420ms cubic-bezier(0.23,1,0.32,1) both; animation-delay: 60ms; animation-play-state: var(--stagger-state, paused); }
.stagger-3 { opacity:0; animation: stagger-in 420ms cubic-bezier(0.23,1,0.32,1) both; animation-delay:120ms; animation-play-state: var(--stagger-state, paused); }
.stagger-4 { opacity:0; animation: stagger-in 420ms cubic-bezier(0.23,1,0.32,1) both; animation-delay:180ms; animation-play-state: var(--stagger-state, paused); }
.stagger-5 { opacity:0; animation: stagger-in 420ms cubic-bezier(0.23,1,0.32,1) both; animation-delay:240ms; animation-play-state: var(--stagger-state, paused); }

/* Reduced motion — keep opacity fades, remove all position/scale/rotation animations */
@media (prefers-reduced-motion: reduce) {
  .anim-float1,.anim-float2,.anim-float3,.anim-float4 { animation: none; }
  .marquee-left,.marquee-right { animation-duration: 0.01ms !important; }
  .stagger-1,.stagger-2,.stagger-3,.stagger-4,.stagger-5 { animation: none; opacity: 1; }
  .btn-press:active { transform: none; }
  .card-lift:hover  { transform: none; }
}
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

/* ─── Browser chrome wrapper ────────────────────────────────────────────────── */
function BrowserMockup({ children, url = 'adinsight.bageldigital.ai', className = '' }: {
  children: React.ReactNode; url?: string; className?: string;
}) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-black/[0.09] select-none ${className}`}
         style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)' }}>
      <div className="bg-[#f2f2f2] border-b border-[#e4e4e4] px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5 shrink-0">
          {['#ff6058','#ffbd2e','#28c840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
        </div>
        <div className="flex-1 mx-3 h-5 rounded-md bg-white border border-[#ddd] flex items-center px-2">
          <span className="text-[10px] text-[#aaa] truncate">{url}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Video ABCD page mockup ─────────────────────────────────────────────────── */
function VideoAbcdMockup() {
  const videos = [
    {
      title: 'Spring Collection 2026 — Ice Crystal Ring Hero',
      sub: 'Video · Shopping Intent · Rings · Prospecting',
      gradient: 'linear-gradient(135deg,#1e2a4a,#0f172a)',
      label: 'In-stream', badge: '4 K', dur: '30s',
      impr:'185K', vtr:'25%', ctr:'0.8%', cpv:'$0.028', roas:'0.42x', raosRed:true, ctrRed:false,
    },
    {
      title: 'Snow Boots Winter 2026 — Lifestyle UGC',
      sub: 'Video · Shopping Intent · Boots · Retargeting',
      gradient: 'linear-gradient(135deg,#1a1a1a,#2d2d2d)',
      label: 'In-stream', badge: '', dur: '15s',
      impr:'320K', vtr:'40%', ctr:'2.0%', cpv:'$0.030', roas:'1.25x', raosRed:false, ctrRed:false,
    },
    {
      title: 'Iced Out Bracelet — Hip Hop Style',
      sub: 'Video · Brand Awareness · Bracelets · Cold Audience',
      gradient: 'linear-gradient(135deg,#0a1a0a,#1a3a1a)',
      label: 'In-stream', badge: 'vevo', dur: '20s',
      impr:'420K', vtr:'15%', ctr:'0.5%', cpv:'$0.047', roas:'0.07x', raosRed:true, ctrRed:true,
    },
  ];
  return (
    <BrowserMockup>
      <div className="bg-white">
        {/* Page header */}
        <div className="px-5 pt-4 pb-3 border-b border-[#f0f0f0]">
          <h3 className="text-sm font-black text-[#111] mb-0.5">Video Analysis</h3>
          <p className="text-[10px] text-[#999]">Evaluate video ad creatives with Gemini using the Google ABCD framework</p>
        </div>
        {/* Summary tile */}
        <div className="mx-5 mt-3 mb-3 rounded-xl border border-[#f0f0f0] bg-[#fafafa] px-4 py-3 flex items-center gap-4">
          <div>
            <p className="text-[9px] font-bold text-[#999] tracking-widest uppercase mb-1">VIDEO ADS</p>
            <p className="text-2xl font-black text-[#111]">3</p>
            <p className="text-[10px] text-[#999]">Imported</p>
          </div>
        </div>
        {/* ABCD tabs */}
        <div className="flex gap-2 px-5 mb-3">
          {[
            { l:'A', label:'吸引注意', color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe' },
            { l:'B', label:'品牌植入', color:'#059669', bg:'#f0fdf4', border:'#a7f3d0' },
            { l:'C', label:'情感连接', color:'#0ea5e9', bg:'#f0f9ff', border:'#bae6fd' },
            { l:'D', label:'行动引导', color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
          ].map(t => (
            <div key={t.l} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold"
                 style={{ background: t.bg, borderColor: t.border, color: t.color }}>
              <span className="font-black">{t.l}</span> {t.label}
            </div>
          ))}
        </div>
        {/* Video cards */}
        <div className="space-y-0 divide-y divide-[#f5f5f5]">
          {videos.map((v, i) => (
            <div key={i} className="px-5 py-3 flex gap-3.5 items-start">
              {/* Thumbnail */}
              <div className="relative w-28 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                   style={{ background: v.gradient }}>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Play size={10} className="text-white ml-0.5" />
                </div>
                <div className="absolute top-1 left-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">{v.label}</div>
                {v.badge && <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] font-bold px-1 py-0.5 rounded">{v.badge}</div>}
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] font-bold px-1 py-0.5 rounded">{v.dur}</div>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-[#2563eb] leading-tight mb-0.5">{v.title}</p>
                <p className="text-[9px] text-[#999] mb-2">{v.sub}</p>
                {/* Metrics row */}
                <div className="flex gap-4 mb-2">
                  {[
                    { l:'Impressions', v: v.impr,  red: false },
                    { l:'VTR',        v: v.vtr,   red: false },
                    { l:'CTR',        v: v.ctr,   red: v.ctrRed },
                    { l:'CPV',        v: v.cpv,   red: false },
                    { l:'ROAS',       v: v.roas,  red: v.raosRed },
                  ].map(m => (
                    <div key={m.l}>
                      <p className="text-[8px] text-[#bbb] uppercase tracking-wider">{m.l}</p>
                      <p className={`text-[11px] font-black ${m.red ? 'text-red-500' : 'text-[#111]'}`}>{m.v}</p>
                    </div>
                  ))}
                </div>
                {/* CTA */}
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 bg-[#4f46e5] text-white text-[9px] font-bold px-2.5 py-1 rounded-lg">
                    <Sparkles size={8} /> Analyze with Gemini ABCD
                  </button>
                  <span className="text-[9px] text-[#bbb]">Not analyzed</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Bottom paste section */}
        <div className="mx-5 mt-2 mb-4 rounded-xl border border-[#e8f0fe] bg-[#f8faff] px-4 py-3">
          <p className="text-[10px] font-semibold text-[#2563eb] mb-1">🔗 Paste YouTube URL for Quick Analysis</p>
          <p className="text-[9px] text-[#999] mb-2">No need to run in Google Ads — just paste a URL and Gemini scores it instantly</p>
          <div className="h-6 rounded-md border border-[#e0e0e0] bg-white flex items-center px-2">
            <span className="text-[9px] text-[#ccc]">https://www.youtube.com/watch?v=... or paste Video ID</span>
          </div>
        </div>
      </div>
    </BrowserMockup>
  );
}

/* ─── YouTube Intel Team Playbooks mockup ────────────────────────────────────── */
function YoutubePlaybookMockup() {
  const playbooks = [
    {
      icon: '📊', title: 'CMO — Strategic Brief', color: '#7c3aed', bg: '#faf5ff', wide: true,
      bullets: [
        '明确品牌定位：我们是追求极致性能的硬核品牌，还是服务于潮流爱好者的时尚品牌？',
        '发起关于"真实性"的品牌活动，讲述我们的产品设计师也是真正的滑雪爱好者。',
        '利用观众对价格的敏感性，在营销活动中突出产品的"质价比"而非仅仅是"低价"。',
        '监控关于Dope Snow和GSou Snow的讨论，学习他们的成功经验并避免他们的公关风险。',
      ],
    },
    {
      icon: '📢', title: 'Marketing Director — Campaign Plan', color: '#2563eb', bg: '#eff6ff', wide: true,
      bullets: [
        '与在滑雪技巧上受人尊敬的中小型影响者（micro-influencers）合作，而不是只有大量粉丝的时尚博主。',
        '策划一次公关活动，主题是"风格无对错"，正面回应社区中关于"Jerry"的负面评价，倡导包容性。',
        '根据评论中的新趋势：\'小上衣配大裤子\'这一信号，快速与KOL合作，引领这一潮流。',
        '在产品描述和营销材料中，增加更多关于功能性和耐用性的细节，以平衡时尚潮流的宣传。',
      ],
    },
    {
      icon: '🎨', title: 'Creative Team', color: '#f97316', bg: '#fff7ed', wide: false,
      bullets: [
        '启动"穿搭星期五"（Fit Friday）YouTube Shorts系列，每周展示一套完整的滑雪造型。',
        '制作"预算挑战"视频，展示如何在200美元内搭配一整套功能与风格兼备的装备。',
        '采用"视觉对比"钩子，制作展示我们产品优于廉价竞品的短视频（防水性能、拉链质量）。',
      ],
    },
    {
      icon: '🎯', title: 'Ads Team', color: '#059669', bg: '#f0fdf4', wide: false,
      bullets: [
        '投放针对观看过Dope Snow和GSou Snow评测视频用户的再营销广告。',
        '在广告文案中直接回应价格痛点："厌倦了200美元的雪裤？看看我们的选择。"',
        '测试使用用户评论作为广告素材，例如引用"Ts look so tuff🔥"来增强社会认同。',
      ],
    },
    {
      icon: '📦', title: 'Product Team', color: '#e11d48', bg: '#fff1f2', wide: false,
      bullets: [
        '评估在夹克和裤子上增加专用雪票口袋（armpocket for skipasses）的必要性。',
        '根据用户对尺码的频繁提问，优化网站上的尺码指南，提供基于身高体重的推荐模型。',
        '研发更耐磨的适合滑雪运动的羽绒服替代品，解决其易被刮坏的痛点。',
      ],
    },
  ];

  return (
    <BrowserMockup url='adinsight.bageldigital.ai/yt'>
      <div className="bg-white">
        {/* Report header */}
        <div className="px-4 py-2.5 border-b border-[#f0f0f0] flex items-center gap-2.5 flex-wrap bg-[#fafafa]">
          <span className="text-red-500 text-xs">⊙</span>
          <span className="text-[11px] font-bold text-[#111]">&quot;baggy ski&quot;</span>
          <span className="text-[10px] text-[#999]">· United States</span>
          <span className="text-[10px] text-[#999]">· 👁 50 videos</span>
          <span className="text-[10px] text-[#999]">· 💬 421 comments</span>
          <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">中文报告</span>
          <span className="text-[10px] text-[#bbb] ml-auto">5/8/2026, 9:34 PM</span>
          <button className="text-[9px] font-semibold text-[#555] border border-[#e0e0e0] px-2 py-1 rounded-md flex items-center gap-1">
            ↓ Download PDF
          </button>
        </div>
        {/* Title */}
        <div className="px-4 pt-3 pb-2.5 border-b border-[#f0f0f0] flex items-start justify-between gap-3">
          <h2 className="text-sm font-black text-[#111] leading-snug flex-1">
            宽松滑雪时尚主导YouTube，但真实性与性价比的争议引发观众热烈讨论
          </h2>
          <span className="shrink-0 text-[10px] font-bold bg-red-50 text-red-500 border border-red-200 px-2 py-1 rounded-full flex items-center gap-1">
            🔥 火热
          </span>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#f0f0f0] px-4 overflow-x-auto">
          {['Overview','Audience','Creative Intel','Opportunities','Team Playbooks'].map((tab, i) => (
            <div key={tab} className={`text-[10px] font-semibold px-3 py-2.5 border-b-2 whitespace-nowrap ${
              i === 4
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-[#999]'
            }`}>{tab}</div>
          ))}
        </div>
        {/* Playbook grid */}
        <div className="p-4 space-y-3">
          {/* Row 1: CMO + Marketing Director (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            {playbooks.filter(p => p.wide).map(p => (
              <div key={p.title} className="rounded-xl p-3.5" style={{ background: p.bg }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-sm">{p.icon}</span>
                  <span className="text-[11px] font-black" style={{ color: p.color }}>{p.title}</span>
                </div>
                <ul className="space-y-1.5">
                  {p.bullets.map((b, i) => (
                    <li key={i} className="flex gap-1.5 text-[9px] text-[#444] leading-relaxed">
                      <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: p.color }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* Row 2: Creative + Ads + Product (3 col) */}
          <div className="grid grid-cols-3 gap-3">
            {playbooks.filter(p => !p.wide).map(p => (
              <div key={p.title} className="rounded-xl p-3" style={{ background: p.bg }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs">{p.icon}</span>
                  <span className="text-[10px] font-black" style={{ color: p.color }}>{p.title}</span>
                </div>
                <ul className="space-y-1.5">
                  {p.bullets.map((b, i) => (
                    <li key={i} className="flex gap-1.5 text-[9px] text-[#444] leading-relaxed">
                      <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: p.color }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserMockup>
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
    <div className="chip-lift flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-black/[0.07] shadow-sm shrink-0 select-none">
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

  /* Emil: mouse-tracking 3D tilt with asymmetric CSS transition timing
   * Following mouse: 120ms (feels responsive, instant feedback)
   * Returning to rest: 700ms (simulates spring settle — momentum without JS springs)
   */
  const heroRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });
  const handleHeroMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = heroRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2))  / (rect.width  / 2);
    const dy = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
    setTilt({ x: dy * -5, y: dx * 6, active: true });
  }, []);
  const handleHeroMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0, active: false });
  }, []);

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
      headline: 'Score every video\nagainst Google ABCD',
      sub: "Gemini Vision benchmarks every video ad against Google's ABCD framework — Attention, Branding, Connection, Direction — and delivers a prioritised recut brief in seconds.",
      bullets: ['Frame-by-frame Gemini analysis', 'ABCD score with per-dimension breakdown', 'Actionable recut brief generated instantly'],
      visual: <VideoAbcdMockup />,
      wide: true,
    },
    {
      color: '#dc2626', bg: '#fff1f2', label: 'YouTube Intel',
      headline: 'One search.\nFive team briefs.',
      sub: "Gemini reads 50+ videos and 400+ comments from your niche, then auto-generates separate strategic briefs for CMO, Marketing Director, Creative, Ads and Product — in Chinese or English.",
      bullets: ['Competitor video comment sentiment analysis', 'Role-based playbooks for every team member', 'Download as PDF or export to Notion'],
      visual: <YoutubePlaybookMockup />,
      wide: true,
    },
  ];

  const feat = FEATURES[activeTab];

  return (
    <div className="bg-white text-[#0a0a0a] overflow-x-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#FEF0E6' }} className="border-b border-[#F5D5C0] px-4 py-2.5 text-center">
        <p className="text-xs font-medium text-[#A84F28] flex items-center justify-center gap-2">
          <PlayCircle size={13} className="text-[#D97248] shrink-0" />
          New: YouTube Comment Intelligence now connects directly to Google Ads optimisation — a world first for performance agencies.{' '}
          <a href="#youtube-intel" className="underline hover:no-underline font-semibold">See how →</a>
        </p>
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#f0f0f0]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BagelLogo size={28} id="nav" />
            <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', letterSpacing: '-0.01em' }}>bagel digital</span>
            <span className="hidden sm:block text-xs text-[#bbb] font-normal" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>AI Operation Center</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-[#555]">
            {['Features','How it works','Results'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`} className="hover:text-[#111] transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
               className="btn-press flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-bold"
               style={{ background: 'linear-gradient(135deg,#F5AA84,#D97248)', boxShadow: '0 4px 14px rgba(217,114,72,0.35)' }}>
              Work with us <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-0"
        style={{ background: 'linear-gradient(160deg, #FEF4EE 0%, #FDF8F3 45%, #FAFAF9 100%)' }}>

        {/* Background circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-25"
            style={{ background: 'radial-gradient(ellipse,#F5AA84 0%,transparent 70%)' }} />
          <div className="absolute top-1/2 -left-32 w-64 h-64 rounded-full opacity-15"
            style={{ background: 'radial-gradient(ellipse,#F5AA84 0%,transparent 70%)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#F5D5C0] text-[#A84F28] text-xs font-semibold mb-8 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97248]" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
              Bagel Digital · Internal AI Platform
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-5xl sm:text-6xl lg:text-[80px] font-black leading-[0.95] tracking-tight mb-6"
                style={{ letterSpacing: '-0.03em' }}>
              Run Google Ads<br />
              that actually{' '}
              <em className="not-italic" style={{
                background: 'linear-gradient(135deg,#F5AA84 0%,#D97248 100%)',
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
                 className="btn-press flex items-center gap-2 px-7 py-3.5 rounded-full text-white text-sm font-bold"
                 style={{ background: 'linear-gradient(135deg,#F5AA84,#D97248)', boxShadow: '0 8px 24px rgba(217,114,72,0.35)' }}>
                Get a free AI audit <ArrowRight size={14} />
              </a>
              <a href="#features" className="btn-press flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#E8D5C8] bg-white text-[#333] text-sm font-semibold">
                See capabilities <ChevronRight size={14} />
              </a>
            </div>
            <p className="text-xs text-[#999]">AI-driven agency · No fluff, just results</p>
          </Reveal>
        </div>

        {/* ── Floating card scene — mouse-tracking 3D tilt (Emil: spring via CSS) ── */}
        <div ref={heroRef}
          className="relative max-w-6xl mx-auto px-6 mt-14 h-[480px] sm:h-[560px]"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}>
          {/* Centre: Video ABCD mockup with 3D tilt */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[560px] sm:w-[660px]"
            style={{
              transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-4px)`,
              /* Asymmetric: fast follow (120ms), slow spring-settle return (700ms) */
              transition: tilt.active
                ? 'transform 120ms cubic-bezier(0.23,1,0.32,1)'
                : 'transform 700ms cubic-bezier(0.23,1,0.32,1)',
              willChange: 'transform',
            }}>
            <VideoAbcdMockup />
          </div>

          {/* Left float: ABCD score card */}
          <div className="absolute top-10 -left-4 sm:left-4 hidden sm:block anim-float1">
            <AbcdCard />
          </div>

          {/* Right float: Reddit card */}
          <div className="absolute top-20 -right-4 sm:right-4 hidden sm:block anim-float2">
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
            <p className="text-base text-white/50 text-center max-w-xl mx-auto leading-relaxed mb-4">
              One search query generates a full strategic report — with separate AI-written briefs for your CMO, Marketing Director, Creative Team, Ads Team and Product Team. Zero manual work.
            </p>
          </Reveal>

          {/* Proof chips */}
          <Reveal delay={180}>
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {['CMO Strategic Brief','Marketing Director Plan','Creative Team Brief','Ads Team Action Plan','Product Team Insights'].map(t => (
                <span key={t} className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-white/10 text-white/60">
                  ✓ {t}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Actual playbook mockup */}
          <Reveal delay={240}>
            <YoutubePlaybookMockup />
          </Reveal>

          {/* Bottom callout */}
          <Reveal delay={100}>
            <div className="mt-8 rounded-2xl p-5 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4"
                 style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-sm text-white/60 leading-relaxed">
                <span className="text-white font-bold">No other performance agency does this.</span>{' '}
                YouTube comments → five team briefs → Google Ads improvements, all in one click.
              </p>
              <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                 className="btn-press shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white whitespace-nowrap"
                 style={{ background: 'linear-gradient(135deg,#F5AA84,#D97248)', boxShadow: '0 8px 24px rgba(217,114,72,0.3)' }}>
                <PlayCircle size={14} /> See live demo
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
              <p className="text-xs font-semibold text-[#D97248] tracking-widest uppercase mb-3">Modules</p>
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
                    style={activeTab === i ? { background: 'linear-gradient(135deg,#F5AA84,#D97248)', color: '#fff' } : { color: '#666' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Feature panel */}
          <div key={activeTab} className="rounded-3xl p-8 sm:p-10 transition-all"
               style={{ background: feat.bg, opacity: 1 }}>
            {(feat as typeof feat & { wide?: boolean }).wide ? (
              /* Wide layout: text top, mockup below */
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 items-start">
                  <div>
                    <h3 className="text-4xl sm:text-5xl font-black leading-tight mb-5 whitespace-pre-line"
                        style={{ letterSpacing: '-0.02em', color: feat.color }}>
                      {feat.headline}
                    </h3>
                    <p className="text-base text-[#444] leading-relaxed">{feat.sub}</p>
                  </div>
                  <div className="flex flex-col gap-3 justify-center">
                    <ul className="space-y-3">
                      {feat.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-[#333]">
                          <CheckCircle2 size={16} style={{ color: feat.color, flexShrink:0, marginTop:2 }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                       className="btn-press inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold self-start mt-2"
                       style={{ background: feat.color }}>
                      Learn more <ArrowRight size={13} />
                    </a>
                  </div>
                </div>
                <div className="anim-float3">{feat.visual}</div>
              </div>
            ) : (
              /* Default layout: text left, card right */
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
                     className="btn-press inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold"
                     style={{ background: feat.color }}>
                    Learn more <ArrowRight size={13} />
                  </a>
                </div>
                <div className="flex items-center justify-center">
                  <div className="anim-float3">{feat.visual}</div>
                </div>
              </div>
            )}
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
                <span style={{ background:'linear-gradient(135deg,#F5AA84,#D97248)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  Machine execution.
                </span>
              </h2>
            </div>
          </Reveal>
          <StaggerReveal className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { n:'01', color:'#dbeafe', tc:'#1d4ed8', title:'Connect your data', desc:'Google Ads scripts sync campaigns, search terms and change history automatically. Social scrapers pull Reddit discussions and competitor YouTube data.' },
              { n:'02', color:'#ede9fe', tc:'#5b21b6', title:'AI analyses everything', desc:'Gemini Vision and Claude models run structured analysis across your full account — finding patterns, risks and opportunities in seconds.' },
              { n:'03', color:'#d1fae5', tc:'#065f46', title:'You approve. It executes.', desc:'Every suggestion ships with a rationale and expected impact. One click applies it. Every action is fully reversible.' },
            ].map((s,i) => (
              <div key={s.n} className={`stagger-${i+1} card-lift rounded-2xl p-7 h-full`} style={{ background: s.color }}>
                <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center mb-5">
                  <span className="text-sm font-black" style={{ color: s.tc }}>{s.n}</span>
                </div>
                <h3 className="text-lg font-black text-[#0a0a0a] mb-3">{s.title}</h3>
                <p className="text-sm text-[#444] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </StaggerReveal>
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
          <StaggerReveal className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { to:94, suffix:'%', label:'vs. manual ROAS forecasting',        color:'#dbeafe', tc:'#1e40af' },
              { to:60, suffix:'%', label:'average reduction in wasted spend',  color:'#d1fae5', tc:'#065f46' },
              { to:3,  suffix:'x', label:'faster campaign optimisation cycle', color:'#ede9fe', tc:'#5b21b6' },
              { to:12, suffix:'+', label:'AI-powered modules in one platform', color:'#fef3c7', tc:'#92400e' },
            ].map((s,i) => (
              <div key={s.label} className={`stagger-${i+1} card-lift rounded-2xl p-7 text-center`} style={{ background: s.color }}>
                <p className="text-5xl font-black tabular-nums mb-2" style={{ color: s.tc }}>
                  <Counter to={s.to} suffix={s.suffix} />
                </p>
                <p className="text-xs text-[#555] leading-snug">{s.label}</p>
              </div>
            ))}
          </StaggerReveal>
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
          <StaggerReveal className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { bg:'#eff6ff', logo:'CROWN ICE',   quote:'Before AdInsight, our team was spending hours every week exporting CSVs and building pivot tables. Now the AI flags issues before we even open the account.',                   name:'Alex Chen',    role:'Paid Media Lead'   },
              { bg:'#fdf4ff', logo:'VELDT BRAND', quote:'The campaign optimizer found $3k/month in wasted spend in our first week. One-click apply with rollback gave us the confidence to actually act on the suggestions.',   name:'Sarah Kim',    role:'Growth Director'  },
              { bg:'#fff7ed', logo:'ALPINE GEAR', quote:'The Reddit intelligence module completely changed how we brief creatives. Real audience language, real pain points — not focus group fluff.',                              name:'Marco Rivera', role:'CMO'              },
            ].map((t,i) => (
              <div key={i} className={`stagger-${i+1} card-lift rounded-2xl p-7 flex flex-col h-full`} style={{ background: t.bg }}>
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
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#FEF4EE 0%,#FDF0E6 100%)' }}>
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-40"
            style={{ background: 'radial-gradient(ellipse,#F5AA84 0%,transparent 70%)' }} />
          <Reveal>
            <p className="text-xs font-semibold text-[#D97248] tracking-widest uppercase mb-5 relative">Ready?</p>
            <h2 className="text-5xl sm:text-6xl font-black leading-tight mb-6 relative" style={{ letterSpacing: '-0.03em' }}>
              Run your campaigns<br />
              <span style={{ background:'linear-gradient(135deg,#F5AA84,#D97248)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                at AI speed
              </span>
            </h2>
            <p className="text-base text-[#555] mb-10 leading-relaxed max-w-lg mx-auto relative">
              Talk to Bagel Digital. We&apos;ll audit your account, show you exactly what our AI finds, and build a growth roadmap — no commitment required.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap relative">
              <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                 className="btn-press flex items-center gap-2 px-8 py-4 rounded-full text-white text-base font-bold"
                 style={{ background:'linear-gradient(135deg,#F5AA84,#D97248)', boxShadow:'0 12px 32px rgba(217,114,72,0.35)' }}>
                Get a free AI audit <ArrowRight size={16} />
              </a>
              <a href="https://bageldigital.ai" target="_blank" rel="noopener noreferrer"
                 className="btn-press flex items-center gap-2 px-8 py-4 rounded-full border-2 border-[#E8D5C8] bg-white text-[#333] text-base font-semibold">
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
            <BagelLogo size={22} id="footer" />
            <span className="text-sm font-bold text-[#555]" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>bagel digital</span>
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

'use client';

import { useState } from 'react';
import {
  Radio, TrendingUp, AlertTriangle, Lightbulb,
  ExternalLink, ChevronDown, BarChart3, Eye, Users,
  ArrowUpRight, ArrowDownRight, Minus, Search, Plus, X,
  Shield, Zap, Target, Star, PlayCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_BRAND = 'Lumière Skin';
const DEMO_COMPETITORS = ['CeraVe', 'Neutrogena', 'La Roche-Posay', 'The Ordinary'];

const WEEKLY_METRICS = {
  visibilityScore: 31.4,
  visibilityDelta: 4.2,
  shareOfVoice: 7.8,
  sovDelta: 1.2,
  newThreats: 2,
  newOpportunities: 6,
  keywordsTracked: 5,
  videosAnalyzed: 100,
  weekLabel: 'Week of June 2, 2026',
};

const BRAND_COLORS: Record<string, string> = {
  'Lumière Skin':    '#7c3aed',
  'CeraVe':          '#2563eb',
  'Neutrogena':      '#059669',
  'La Roche-Posay':  '#d97706',
  'The Ordinary':    '#dc2626',
  'Other':           '#9ca3af',
};

interface KeywordSOV {
  keyword: string;
  shortLabel: string;
  brands: Array<{ name: string; sov: number; delta: number }>;
  topRankVideo: string;
  topChannel: string;
}

const KEYWORD_SOV: KeywordSOV[] = [
  {
    keyword: 'best moisturizer for sensitive skin',
    shortLabel: 'Sensitive skin moisturizer',
    brands: [
      { name: 'CeraVe',         sov: 38, delta: -2 },
      { name: 'Neutrogena',     sov: 19, delta:  1 },
      { name: 'La Roche-Posay', sov: 14, delta: -1 },
      { name: 'Lumière Skin',   sov:  8, delta:  2 },
      { name: 'Other',          sov: 21, delta:  0 },
    ],
    topRankVideo: 'Dermatologist Ranks Best Moisturizers 2026',
    topChannel: 'Dr. Skin MD',
  },
  {
    keyword: 'skincare routine for beginners',
    shortLabel: 'Skincare for beginners',
    brands: [
      { name: 'The Ordinary',   sov: 28, delta:  3 },
      { name: 'CeraVe',         sov: 22, delta:  1 },
      { name: 'Neutrogena',     sov: 15, delta: -2 },
      { name: 'Lumière Skin',   sov: 11, delta:  4 },
      { name: 'Other',          sov: 24, delta: -6 },
    ],
    topRankVideo: 'Beginner Skincare Routine That Actually Works',
    topChannel: 'GlowWithGrace',
  },
  {
    keyword: 'best cleanser for dry skin',
    shortLabel: 'Dry skin cleanser',
    brands: [
      { name: 'CeraVe',         sov: 42, delta:  5 },
      { name: 'La Roche-Posay', sov: 17, delta: -3 },
      { name: 'Neutrogena',     sov: 12, delta:  0 },
      { name: 'Lumière Skin',   sov:  4, delta:  1 },
      { name: 'Other',          sov: 25, delta: -3 },
    ],
    topRankVideo: 'Stop Using the Wrong Cleanser! (Dry Skin Guide)',
    topChannel: 'SkincareWithSarah',
  },
  {
    keyword: 'retinol vs niacinamide which is better',
    shortLabel: 'Retinol vs Niacinamide',
    brands: [
      { name: 'The Ordinary',   sov: 45, delta:  6 },
      { name: 'CeraVe',         sov: 18, delta: -1 },
      { name: 'Lumière Skin',   sov:  6, delta:  2 },
      { name: 'La Roche-Posay', sov:  8, delta:  0 },
      { name: 'Other',          sov: 23, delta: -7 },
    ],
    topRankVideo: 'Retinol vs Niacinamide: What Dermatologists Say',
    topChannel: 'DermTalkPro',
  },
  {
    keyword: 'skincare routine for hormonal acne',
    shortLabel: 'Hormonal acne routine',
    brands: [
      { name: 'Neutrogena',     sov: 26, delta: -4 },
      { name: 'La Roche-Posay', sov: 21, delta:  2 },
      { name: 'CeraVe',         sov: 19, delta:  1 },
      { name: 'Lumière Skin',   sov:  5, delta:  1 },
      { name: 'Other',          sov: 29, delta:  0 },
    ],
    topRankVideo: 'I Cleared My Hormonal Acne in 60 Days',
    topChannel: 'ClearSkinJourney',
  },
];

interface ThreatItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  videoTitle: string;
  channel: string;
  subscribers: string;
  views: string;
  published: string;
  issue: string;
  action: string;
  videoUrl: string;
  keyword: string;
  isNew: boolean;
}

const THREATS: ThreatItem[] = [
  {
    id: 't1',
    severity: 'high',
    videoTitle: 'CeraVe vs Lumière Skin: Which Is Actually Worth Your Money?',
    channel: 'GlowUpGrace',
    subscribers: '380K',
    views: '1.4M',
    published: '3 days ago',
    issue: 'Video concludes Lumière Skin is "marked up 4x for the same ingredients as drugstore alternatives." CeraVe explicitly recommended as the better value. Video ranks #2 for "best moisturizer sensitive skin".',
    action: 'Monitor comment section for brand sentiment. Consider reaching out to creator for a follow-up featuring your proprietary formulation research. Prepare a "science behind the price" content brief.',
    videoUrl: 'https://youtube.com',
    keyword: 'best moisturizer for sensitive skin',
    isNew: true,
  },
  {
    id: 't2',
    severity: 'medium',
    videoTitle: 'My Updated Skincare Routine (What I Actually Use in 2026)',
    channel: 'SkincareDiary',
    subscribers: '125K',
    views: '340K',
    published: '1 week ago',
    issue: 'Creator switched from Lumière Skin to La Roche-Posay, citing "better results at half the price." Previous video had mentioned Lumière positively — this is a reversal.',
    action: 'Reach out to creator directly. Offer a behind-the-scenes formulation call with your product team. High potential for a recovery story ("why I switched back").',
    videoUrl: 'https://youtube.com',
    keyword: 'skincare routine for beginners',
    isNew: true,
  },
  {
    id: 't3',
    severity: 'low',
    videoTitle: 'Top 5 Moisturizers Dermatologists Actually Recommend',
    channel: 'BeautyTruths',
    subscribers: '89K',
    views: '78K',
    published: '2 weeks ago',
    issue: 'Lumière Skin mentioned briefly as "good but pricey" — not in top 5. Mild skepticism about marketing claims vs. clinical evidence.',
    action: 'Low priority. Compile clinical study references for future creator outreach to address the efficacy/price perception.',
    videoUrl: 'https://youtube.com',
    keyword: 'best moisturizer for sensitive skin',
    isNew: false,
  },
];

interface OpportunityItem {
  id: string;
  value: 'high' | 'medium' | 'low';
  videoTitle: string;
  channel: string;
  subscribers: string;
  views: string;
  published: string;
  gap: string;
  creatorType: string;
  action: string;
  videoUrl: string;
  keyword: string;
  opportunityType: 'creator_outreach' | 'product_seeding' | 'paid_partnership';
  isNew: boolean;
}

const OPPORTUNITIES: OpportunityItem[] = [
  {
    id: 'o1',
    value: 'high',
    videoTitle: 'Full Skincare Routine for Sensitive Skin 2026 (Updated)',
    channel: 'GlowWithGrace',
    subscribers: '190K',
    views: '890K',
    published: '2 weeks ago',
    gap: 'Covers exact product category. Recommends 4 moisturizers — CeraVe, Neutrogena, La Roche-Posay, and Aveeno. Lumière Skin not mentioned despite being premium positioned in same category.',
    creatorType: 'Accepts paid partnerships (disclosed in 6 recent videos). Audience skews 25–34 female, US-based — matches your ICP exactly.',
    action: 'Reach out for product seeding first, then paid partnership if engagement is strong. Budget est: $3,000–6,000 for dedicated mention in update video.',
    videoUrl: 'https://youtube.com',
    keyword: 'best moisturizer for sensitive skin',
    opportunityType: 'paid_partnership',
    isNew: true,
  },
  {
    id: 'o2',
    value: 'high',
    videoTitle: 'Skincare Ingredients Science: What Actually Works',
    channel: 'DermTalkPro',
    subscribers: '220K',
    views: '1.1M',
    published: '3 weeks ago',
    gap: 'High-authority dermatology channel covers exact ingredients in your formulation (hyaluronic acid, ceramides, peptides) but cites only generic brands. Lumière not mentioned despite premium positioning.',
    creatorType: 'Evidence-based channel. Does paid collaborations that are clearly science-forward. No fluff. Strong alignment with Lumière\'s brand positioning.',
    action: 'Reach out with your clinical study data. This creator responds well to product-led outreach with evidence. Potential for a dedicated "ingredient deep dive" video.',
    videoUrl: 'https://youtube.com',
    keyword: 'retinol vs niacinamide which is better',
    opportunityType: 'product_seeding',
    isNew: true,
  },
  {
    id: 'o3',
    value: 'high',
    videoTitle: 'My Minimalist Skincare Routine: Only 3 Products',
    channel: 'SimplySophie',
    subscribers: '95K',
    views: '445K',
    published: '1 month ago',
    gap: 'Covers daily moisturiser but doesn\'t name a specific brand — just says "a good ceramide moisturiser." This is a clear product mention gap for a high-engagement video.',
    creatorType: 'No current brand deals visible. Micro-influencer with high engagement rate (~8%). Ideal for seeding before a paid deal.',
    action: 'Send PR package first — no paid commitment needed. If organic mention appears in comment responses or a future video, negotiate paid deal.',
    videoUrl: 'https://youtube.com',
    keyword: 'skincare routine for beginners',
    opportunityType: 'product_seeding',
    isNew: false,
  },
  {
    id: 'o4',
    value: 'medium',
    videoTitle: 'Drugstore vs High-End Skincare: Is The Price Worth It?',
    channel: 'BeautyOnABudget',
    subscribers: '156K',
    views: '678K',
    published: '1 month ago',
    gap: 'Perfect positioning opportunity — video compares drugstore vs premium but uses generic examples. Lumière\'s "premium formulation, not premium markup" positioning would fit perfectly here.',
    creatorType: 'Does brand partnerships but is very selective. Has declined several luxury brands. Focus pitch on value story, not prestige.',
    action: 'Draft a value-focused pitch: "Show your audience what makes a premium moisturiser worth it — with actual ingredient science." Include one-pager with cost-per-use vs. CeraVe.',
    videoUrl: 'https://youtube.com',
    keyword: 'best moisturizer for sensitive skin',
    opportunityType: 'paid_partnership',
    isNew: true,
  },
  {
    id: 'o5',
    value: 'medium',
    videoTitle: '30-Day Skincare Challenge: Before & After (Hormonal Acne)',
    channel: 'ClearSkinJourney',
    subscribers: '67K',
    views: '234K',
    published: '5 weeks ago',
    gap: 'Creator uses unbranded routine for entire 30-day challenge. Highly visual results video. No moisturiser brand mentioned at all.',
    creatorType: 'Growing channel, very engaged community, many comments asking which products she used. Would benefit from product clarity.',
    action: 'Reach out as a potential partner for their next challenge series. Offer to sponsor "30-day results with Lumière Skin" as a sequel video.',
    videoUrl: 'https://youtube.com',
    keyword: 'skincare routine for hormonal acne',
    opportunityType: 'creator_outreach',
    isNew: false,
  },
  {
    id: 'o6',
    value: 'low',
    videoTitle: 'Sensitive Skin Starter Kit: Everything You Need',
    channel: 'SkincareSimple',
    subscribers: '42K',
    views: '112K',
    published: '6 weeks ago',
    gap: 'Niche but highly targeted "sensitive skin" audience. Recommends 5 products, moisturiser slot occupied by Aveeno. Lumière not considered.',
    creatorType: 'Small channel, genuine reviews, no current brand deals. Very budget-conscious audience.',
    action: 'Low priority for paid deal. Consider PR seeding only. Good channel to watch — if it grows, revisit.',
    videoUrl: 'https://youtube.com',
    keyword: 'best cleanser for dry skin',
    opportunityType: 'product_seeding',
    isNew: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  high:   { label: 'HIGH',   bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',   dot: 'bg-red-500',    icon: AlertTriangle },
  medium: { label: 'MEDIUM', bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500',  icon: Shield },
  low:    { label: 'LOW',    bg: 'bg-slate-50',  border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400',  icon: Minus },
};

const VALUE_CONFIG = {
  high:   { label: 'HIGH VALUE',   bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700', dot: 'bg-violet-500', icon: Star },
  medium: { label: 'MED VALUE',    bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',   dot: 'bg-blue-500',   icon: Target },
  low:    { label: 'LOW VALUE',    bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-500',  dot: 'bg-slate-300',  icon: Minus },
};

const OPP_TYPE_LABELS = {
  creator_outreach: 'Creator Outreach',
  product_seeding:  'Product Seeding',
  paid_partnership: 'Paid Partnership',
};

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus size={10} />0%</span>;
  if (delta > 0) return <span className="text-xs text-emerald-600 flex items-center gap-0.5"><ArrowUpRight size={10} />+{delta}%</span>;
  return <span className="text-xs text-red-500 flex items-center gap-0.5"><ArrowDownRight size={10} />{delta}%</span>;
}

// ─── SOV Bar Chart ─────────────────────────────────────────────────────────────

function SovBar({ brand, sov, delta, isTracked }: { brand: string; sov: number; delta: number; isTracked: boolean }) {
  const color = BRAND_COLORS[brand] ?? '#9ca3af';
  return (
    <div className="flex items-center gap-3 group">
      <div className={`w-28 shrink-0 text-xs font-medium truncate ${isTracked ? 'text-violet-700 font-bold' : 'text-muted-foreground'}`}>
        {brand}
        {isTracked && <span className="ml-1 text-[9px] bg-violet-100 text-violet-600 px-1 rounded">you</span>}
      </div>
      <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full flex items-center transition-all duration-700"
          style={{ width: `${sov}%`, background: color, minWidth: sov > 0 ? '8px' : '0' }}
        />
      </div>
      <div className="w-8 text-xs font-bold tabular-nums text-right" style={{ color }}>{sov}%</div>
      <div className="w-10"><DeltaBadge delta={delta} /></div>
    </div>
  );
}

// ─── Threat card ──────────────────────────────────────────────────────────────

function ThreatCard({ item }: { item: ThreatItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[item.severity];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.severity === 'high' ? 'bg-red-100' : item.severity === 'medium' ? 'bg-amber-100' : 'bg-slate-100'}`}>
            <Icon size={13} className={cfg.text} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full ${cfg.text} ${item.severity === 'high' ? 'bg-red-100' : item.severity === 'medium' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                {cfg.label}
              </span>
              {item.isNew && <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>}
              <span className="text-[10px] text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full">{item.keyword}</span>
            </div>
            <p className="text-sm font-bold text-foreground leading-tight mb-1">{item.videoTitle}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><PlayCircle size={11} />{item.channel} · {item.subscribers} subs</span>
              <span className="flex items-center gap-1"><Eye size={11} />{item.views} views</span>
              <span>{item.published}</span>
            </div>
          </div>
          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer"
             className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2 py-1.5">
            Watch <ExternalLink size={10} />
          </a>
        </div>
        <div className="mt-3 pl-10">
          <p className="text-xs text-foreground/80 leading-relaxed">{item.issue}</p>
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Recommended Action</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{item.action}</p>
            </div>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <><ChevronDown size={12} className="rotate-180" />Hide action</> : <><ChevronDown size={12} />Show recommended action</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Opportunity card ─────────────────────────────────────────────────────────

function OpportunityCard({ item }: { item: OpportunityItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = VALUE_CONFIG[item.value];
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.value === 'high' ? 'bg-violet-100' : item.value === 'medium' ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <Icon size={13} className={cfg.text} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full ${cfg.text} ${item.value === 'high' ? 'bg-violet-100' : item.value === 'medium' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                {cfg.label}
              </span>
              {item.isNew && <span className="text-[9px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>}
              <span className="text-[10px] text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full">{OPP_TYPE_LABELS[item.opportunityType]}</span>
              <span className="text-[10px] text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full">{item.keyword}</span>
            </div>
            <p className="text-sm font-bold text-foreground leading-tight mb-1">{item.videoTitle}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Users size={11} />{item.channel} · {item.subscribers} subs</span>
              <span className="flex items-center gap-1"><Eye size={11} />{item.views} views</span>
              <span>{item.published}</span>
            </div>
          </div>
          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer"
             className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2 py-1.5">
            Watch <ExternalLink size={10} />
          </a>
        </div>
        <div className="mt-3 pl-10">
          <p className="text-xs text-foreground/80 leading-relaxed">{item.gap}</p>
          {expanded && (
            <div className="mt-3 space-y-3 pt-3 border-t border-border/50">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Creator Profile</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{item.creatorType}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Recommended Action</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{item.action}</p>
              </div>
            </div>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <><ChevronDown size={12} className="rotate-180" />Collapse</> : <><ChevronDown size={12} />Show creator profile + action</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'sov' | 'threats' | 'opportunities' | 'deep-dive';

export default function AiVisibilityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedKeyword, setSelectedKeyword] = useState(0);
  const [newKeyword, setNewKeyword] = useState('');
  const [keywords, setKeywords] = useState(KEYWORD_SOV.map(k => k.keyword));

  const m = WEEKLY_METRICS;
  const highThreats = THREATS.filter(t => t.severity === 'high').length;
  const highOpps = OPPORTUNITIES.filter(o => o.value === 'high').length;
  const newThreats = THREATS.filter(t => t.isNew).length;
  const newOpps = OPPORTUNITIES.filter(o => o.isNew).length;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview',       label: 'Overview' },
    { id: 'sov',            label: 'Share of Voice' },
    { id: 'threats',        label: 'Threats',       count: newThreats },
    { id: 'opportunities',  label: 'Opportunities', count: newOpps },
    { id: 'deep-dive',      label: 'Keyword Deep Dive' },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio size={18} className="text-violet-500" />
              <h1 className="text-xl font-black tracking-tight">AI Visibility Tracker</h1>
              <Badge variant="outline" className="text-[10px] font-semibold border-violet-200 text-violet-600 bg-violet-50">BETA</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Track your brand&apos;s organic visibility in YouTube&apos;s AI recommendation system — and act on it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-xs font-semibold">{DEMO_BRAND}</span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
              <Zap size={13} /> Run Analysis
            </button>
          </div>
        </div>

        {/* ── Executive Summary ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Visibility Score */}
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Visibility Score</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black tabular-nums text-violet-600">{m.visibilityScore}</span>
                <span className="text-xs text-muted-foreground mb-1">/100</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight size={12} className="text-emerald-500" />
                <span className="text-xs text-emerald-600 font-semibold">+{m.visibilityDelta} this week</span>
              </div>
              {/* Mini progress ring visual */}
              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${m.visibilityScore}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Share of Voice</p>
              <p className="text-3xl font-black tabular-nums text-foreground">{m.shareOfVoice}<span className="text-base font-semibold text-muted-foreground">%</span></p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight size={12} className="text-emerald-500" />
                <span className="text-xs text-emerald-600 font-semibold">+{m.sovDelta}% vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-100">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Active Threats</p>
              <p className="text-3xl font-black tabular-nums text-red-500">{THREATS.length}</p>
              <div className="flex items-center gap-1 mt-1">
                {newThreats > 0 && <span className="text-xs text-red-600 font-semibold">{newThreats} new this week</span>}
              </div>
              <div className="flex gap-1 mt-1.5">
                {THREATS.map(t => <div key={t.id} className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[t.severity].dot}`} />)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-violet-100">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Opportunities</p>
              <p className="text-3xl font-black tabular-nums text-violet-600">{OPPORTUNITIES.length}</p>
              <div className="flex items-center gap-1 mt-1">
                {newOpps > 0 && <span className="text-xs text-violet-600 font-semibold">{newOpps} new this week</span>}
              </div>
              <div className="flex gap-1 mt-1.5">
                {OPPORTUNITIES.map(o => <div key={o.id} className={`w-2 h-2 rounded-full ${VALUE_CONFIG[o.value].dot}`} />)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Context line */}
        <p className="text-xs text-muted-foreground -mt-2">
          {m.weekLabel} · {m.keywordsTracked} keywords tracked · {m.videosAnalyzed} videos analysed
          &nbsp;·&nbsp;Competitors: {DEMO_COMPETITORS.join(', ')}
        </p>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-0.5 border-b border-border">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab.id === 'threats' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* SOV summary across all keywords */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 size={14} className="text-violet-500" />
                  Share of Voice — All Keywords
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {KEYWORD_SOV.map((kw, i) => {
                  const tracked = kw.brands.find(b => b.name === DEMO_BRAND);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-foreground">{kw.shortLabel}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {DEMO_BRAND}: <strong className="text-violet-600">{tracked?.sov ?? 0}%</strong>
                          {tracked && tracked.delta !== 0 && (
                            <span className={`ml-1 ${tracked.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {tracked.delta > 0 ? `+${tracked.delta}%` : `${tracked.delta}%`}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden gap-px">
                        {kw.brands.map(b => (
                          <div key={b.name} className="h-full transition-all"
                            title={`${b.name}: ${b.sov}%`}
                            style={{
                              width: `${b.sov}%`,
                              background: BRAND_COLORS[b.name] ?? '#9ca3af',
                              opacity: b.name === DEMO_BRAND ? 1 : 0.65,
                            }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {[DEMO_BRAND, ...DEMO_COMPETITORS, 'Other'].map(b => (
                    <div key={b} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND_COLORS[b] ?? '#9ca3af' }} />
                      <span className="text-[10px] text-muted-foreground font-medium">{b}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top threat + top opportunity side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={11} className="text-red-500" /> Top Threat
                </p>
                <ThreatCard item={THREATS[0]} />
                {THREATS.length > 1 && (
                  <button onClick={() => setActiveTab('threats')}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    View all {THREATS.length} threats <ChevronDown size={11} className="-rotate-90" />
                  </button>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb size={11} className="text-violet-500" /> Top Opportunity
                </p>
                <OpportunityCard item={OPPORTUNITIES[0]} />
                {OPPORTUNITIES.length > 1 && (
                  <button onClick={() => setActiveTab('opportunities')}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    View all {OPPORTUNITIES.length} opportunities <ChevronDown size={11} className="-rotate-90" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SOV Tab ───────────────────────────────────────────────────────── */}
        {activeTab === 'sov' && (
          <div className="space-y-5">
            {KEYWORD_SOV.map((kw, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold">&quot;{kw.keyword}&quot;</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Search size={10} /> Top video: {kw.topRankVideo} · <span className="text-foreground/60">{kw.topChannel}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">Rank 1–20</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {kw.brands.map(b => (
                    <SovBar
                      key={b.name}
                      brand={b.name}
                      sov={b.sov}
                      delta={b.delta}
                      isTracked={b.name === DEMO_BRAND}
                    />
                  ))}
                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Based on top 20 videos, weighted by view count</span>
                    <span>{DEMO_BRAND} rank: <strong className="text-violet-600">{kw.brands.sort((a,b) => b.sov - a.sov).findIndex(b => b.name === DEMO_BRAND) + 1} / {kw.brands.filter(b => b.sov > 0).length}</strong></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Threats Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'threats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {highThreats} high-severity · {THREATS.length - highThreats} other · {newThreats} new this week
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {(['high','medium','low'] as const).map(s => (
                    <div key={s} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <div className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[s].dot}`} />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {THREATS.map(t => <ThreatCard key={t.id} item={t} />)}
          </div>
        )}

        {/* ── Opportunities Tab ─────────────────────────────────────────────── */}
        {activeTab === 'opportunities' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                {highOpps} high-value · {newOpps} new this week · sorted by potential impact
              </p>
              <div className="flex items-center gap-2">
                {(['creator_outreach','product_seeding','paid_partnership'] as const).map(t => (
                  <span key={t} className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                    {OPP_TYPE_LABELS[t]}
                  </span>
                ))}
              </div>
            </div>
            {OPPORTUNITIES.map(o => <OpportunityCard key={o.id} item={o} />)}
          </div>
        )}

        {/* ── Keyword Deep Dive ─────────────────────────────────────────────── */}
        {activeTab === 'deep-dive' && (
          <div className="space-y-5">
            {/* Keyword selector */}
            <div className="flex gap-2 flex-wrap">
              {KEYWORD_SOV.map((kw, i) => (
                <button key={i} onClick={() => setSelectedKeyword(i)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    selectedKeyword === i
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-violet-300'
                  }`}>
                  {kw.shortLabel}
                </button>
              ))}
            </div>

            {(() => {
              const kw = KEYWORD_SOV[selectedKeyword];
              const tracked = kw.brands.find(b => b.name === DEMO_BRAND)!;
              const competitors = kw.brands.filter(b => b.name !== DEMO_BRAND && b.name !== 'Other').sort((a,b) => b.sov - a.sov);
              const rank = [...kw.brands].sort((a,b) => b.sov - a.sov).findIndex(b => b.name === DEMO_BRAND) + 1;

              return (
                <div className="space-y-4">
                  {/* Keyword header */}
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Keyword</p>
                      <p className="text-lg font-black mb-4">&quot;{kw.keyword}&quot;</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Your SOV</p>
                          <p className="text-2xl font-black text-violet-600">{tracked.sov}%</p>
                          <DeltaBadge delta={tracked.delta} />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Your rank</p>
                          <p className="text-2xl font-black text-foreground">#{rank}</p>
                          <p className="text-xs text-muted-foreground">of {kw.brands.filter(b => b.sov > 0).length} brands</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Leader</p>
                          <p className="text-lg font-black text-foreground truncate">{kw.brands.sort((a,b) => b.sov - a.sov)[0].name}</p>
                          <p className="text-xs text-muted-foreground">{kw.brands.sort((a,b) => b.sov - a.sov)[0].sov}% SOV</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Full SOV breakdown */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold">SOV Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {kw.brands.sort((a,b) => b.sov - a.sov).map(b => (
                        <SovBar key={b.name} brand={b.name} sov={b.sov} delta={b.delta} isTracked={b.name === DEMO_BRAND} />
                      ))}
                    </CardContent>
                  </Card>

                  {/* Gap analysis */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <TrendingUp size={13} className="text-violet-500" /> Gap Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {competitors.map(c => {
                        const gap = c.sov - tracked.sov;
                        return (
                          <div key={c.name} className="flex items-center gap-3 text-sm">
                            <div className="w-28 shrink-0 text-xs text-muted-foreground">{c.name}</div>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-red-400/60" style={{ width: `${Math.min((gap / 50) * 100, 100)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-red-500 w-16 text-right">+{gap}% ahead</span>
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground pt-1">
                        To reach #1 for this keyword, {DEMO_BRAND} needs {kw.brands.sort((a,b) => b.sov - a.sov)[0].sov - tracked.sov}% more SOV.
                        Focus: more creator partnerships for &ldquo;{kw.shortLabel.toLowerCase()}&rdquo; content.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Threats + Opps for this keyword */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Threats for this keyword</p>
                      {THREATS.filter(t => t.keyword === kw.keyword).length === 0
                        ? <p className="text-xs text-muted-foreground">No threats detected for this keyword.</p>
                        : THREATS.filter(t => t.keyword === kw.keyword).map(t => <ThreatCard key={t.id} item={t} />)
                      }
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Opportunities for this keyword</p>
                      {OPPORTUNITIES.filter(o => o.keyword === kw.keyword).length === 0
                        ? <p className="text-xs text-muted-foreground">No opportunities detected for this keyword.</p>
                        : OPPORTUNITIES.filter(o => o.keyword === kw.keyword).map(o => <OpportunityCard key={o.id} item={o} />)
                      }
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Keyword management */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Search size={13} /> Tracked Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {keywords.map((kw, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1.5 font-medium">
                      {kw}
                      <button onClick={() => setKeywords(kws => kws.filter((_, j) => j !== i))}
                        className="ml-1 text-muted-foreground hover:text-red-500 transition-colors">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newKeyword.trim()) {
                        setKeywords(kws => [...kws, newKeyword.trim()]);
                        setNewKeyword('');
                      }
                    }}
                    placeholder="Add a keyword... (e.g. best retinol serum)"
                    className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    onClick={() => { if (newKeyword.trim()) { setKeywords(kws => [...kws, newKeyword.trim()]); setNewKeyword(''); } }}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors">
                    <Plus size={12} /> Add
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{keywords.length}/50 keywords tracked · Next analysis run: Monday</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Data notice ────────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-muted/50 border border-border p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/70 flex items-center gap-1.5"><Shield size={11} /> Known limitations of this tool</p>
          <p>YouTube API results vary by location, history and time — these are a proxy for user-facing recommendations, not a perfect replica.</p>
          <p>Gemini brand sentiment analysis is ~85–90% accurate. Sarcasm and indirect mentions may be misclassified. Trend direction matters more than absolute numbers.</p>
          <p>SOV is relative, not absolute. No access to YouTube&apos;s internal ranking signals — this tool observes outputs, not the algorithm itself.</p>
        </div>

      </div>
    </div>
  );
}

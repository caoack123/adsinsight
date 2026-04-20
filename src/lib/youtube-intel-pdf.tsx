/**
 * YouTube Intelligence — PDF report (consulting-report layout)
 *
 * react-pdf uses the Yoga layout engine (same as React Native).
 * Key differences from browser CSS:
 *  - `minWidth: 0` does NOT work — use `flexShrink: 1` on text containers instead
 *  - flex shorthand is unreliable — always use flexGrow/flexShrink/flexBasis
 *  - Text inside row containers MUST have flexShrink: 1 or text overflows
 *  - Views default to flexDirection: 'column' (good), but must be explicit when mixing
 */
import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';
import type {
  YouTubeIntelReport,
  YouTubeIntelResponse,
} from '@/app/api/youtube-intel/route';

// ── Fonts ─────────────────────────────────────────────────────────────────────
Font.register({
  family: 'NotoSansSC',
  fonts: [
    { src: '/fonts/NotoSansSC-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSansSC-Regular.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: '/fonts/NotoSansSC-Bold.ttf',    fontWeight: 700 },
    { src: '/fonts/NotoSansSC-Bold.ttf',    fontWeight: 700, fontStyle: 'italic' },
  ],
});
Font.registerHyphenationCallback(word => [word]);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function clean(s: string) {
  return s.replace(/-\s*\n\s*/g, '').replace(/\s*\n\s*/g, ' ').trim();
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  accent:   '#1d4ed8',
  accentBg: '#eff6ff',
  dark:     '#0f172a',
  body:     '#334155',
  muted:    '#64748b',
  faint:    '#94a3b8',
  rule:     '#e2e8f0',
  stripe:   '#f8fafc',
  white:    '#ffffff',
  green:    '#15803d',
  greenBg:  '#f0fdf4',
  red:      '#b91c1c',
  redBg:    '#fff1f2',
  amber:    '#b45309',
  amberBg:  '#fffbeb',
  purple:   '#6d28d9',
  purpleBg: '#f5f3ff',
  coverBg:  '#0f172a',
};

const PX = 44;

const S = StyleSheet.create({

  // ── Pages ──────────────────────────────────────────────────────────────────
  cover: {
    paddingHorizontal: PX, paddingTop: 0, paddingBottom: 0,
    backgroundColor: C.coverBg,
    flexDirection: 'column',
  },
  page: {
    paddingHorizontal: PX, paddingTop: 40, paddingBottom: 56,
    backgroundColor: C.white,
    flexDirection: 'column',    // explicit — yoga needs this
    fontSize: 10, color: C.body,
  },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverTop:     { flexGrow: 1, flexShrink: 0, flexBasis: 'auto', justifyContent: 'center', paddingTop: 80, flexDirection: 'column' },
  coverLabel:   { fontSize: 8.5, letterSpacing: 2, color: '#94a3b8', marginBottom: 20, fontWeight: 700 },
  coverTitle:   { fontSize: 32, fontWeight: 700, color: C.white, lineHeight: 1.25, marginBottom: 16 },
  coverQuery:   { fontSize: 14, color: '#93c5fd', marginBottom: 8 },
  coverMeta:    { fontSize: 9, color: '#64748b', marginBottom: 4 },
  coverBottom:  {
    flexShrink: 0,
    borderTopWidth: 1, borderTopColor: '#1e293b', borderTopStyle: 'solid',
    paddingVertical: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  coverStat:    { alignItems: 'center', flexDirection: 'column' },
  coverStatVal: { fontSize: 22, fontWeight: 700, color: C.white },
  coverStatLbl: { fontSize: 7.5, color: '#64748b', marginTop: 2 },
  coverDate:    { fontSize: 8, color: '#475569', textAlign: 'right' },

  // ── Section header — left accent bar ──────────────────────────────────────
  // Fix: secWrap is row; secBar is fixed width; secTexts is a COLUMN container
  secWrap:      { flexDirection: 'row', marginBottom: 14, marginTop: 6 },
  secBar:       { width: 3, backgroundColor: C.accent, borderRadius: 2, marginRight: 10, flexShrink: 0 },
  secTexts:     { flexDirection: 'column', flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  secTitle:     { fontSize: 11, fontWeight: 700, color: C.dark },
  secSub:       { fontSize: 8, color: C.muted, marginTop: 3 },

  // ── Sub-label (SMALL CAPS style) ───────────────────────────────────────────
  subLabel: {
    fontSize: 7.5, fontWeight: 700, color: C.faint,
    letterSpacing: 0.8, marginBottom: 5, marginTop: 12,
  },

  // ── Headline + badge ───────────────────────────────────────────────────────
  headline:  { fontSize: 14, fontWeight: 700, color: C.dark, lineHeight: 1.4, marginBottom: 8 },
  tempBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: C.amberBg, borderRadius: 3,
    fontSize: 8, fontWeight: 700, color: C.amber,
    marginBottom: 14,
  },

  // ── Numbered finding rows ──────────────────────────────────────────────────
  findRow:  { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, marginBottom: 3, borderRadius: 4 },
  findNum:  { fontSize: 10, fontWeight: 700, color: C.accent, width: 20, flexShrink: 0 },
  // KEY: flexShrink:1 is what makes text wrap inside a row in yoga/react-pdf
  findTxt:  { fontSize: 9.5, color: C.body, flexGrow: 1, flexShrink: 1, flexBasis: 0, lineHeight: 1.6 },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow:    { flexDirection: 'row', marginBottom: 8 },
  statBox:     { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingVertical: 10, paddingHorizontal: 12, marginRight: 6, backgroundColor: C.accentBg, borderRadius: 5, flexDirection: 'column' },
  statBoxLast: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.accentBg, borderRadius: 5, flexDirection: 'column' },
  statVal:     { fontSize: 22, fontWeight: 700, color: C.accent, marginBottom: 2 },
  statLbl:     { fontSize: 7.5, color: C.muted },
  statNote:    { fontSize: 8.5, color: C.muted, fontStyle: 'italic', marginTop: 6 },

  // ── Top-video rows ─────────────────────────────────────────────────────────
  videoRow:   { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.rule, borderBottomStyle: 'solid' },
  videoRank:  { fontSize: 13, fontWeight: 700, color: C.accent, width: 26, flexShrink: 0 },
  videoBody:  { flexDirection: 'column', flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  videoTitle: { fontSize: 9.5, fontWeight: 700, color: C.dark, marginBottom: 2, lineHeight: 1.4 },
  videoMeta:  { fontSize: 8, color: C.muted, marginBottom: 2 },
  videoWhy:   { fontSize: 8.5, color: C.body, lineHeight: 1.45, fontStyle: 'italic' },

  // ── Bullet list ────────────────────────────────────────────────────────────
  bulletRow:  { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 10, marginBottom: 1, borderRadius: 3 },
  dot:        { width: 14, fontSize: 10, flexShrink: 0 },
  bulletTxt:  { fontSize: 9.5, color: C.body, flexGrow: 1, flexShrink: 1, flexBasis: 0, lineHeight: 1.6 },

  // ── Theme/format rows ──────────────────────────────────────────────────────
  themeRow:   { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 4, marginBottom: 3 },
  themeBadge: {
    fontSize: 7.5, fontWeight: 700, color: C.accent,
    backgroundColor: C.accentBg,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 3, marginRight: 10, marginTop: 2,
    flexShrink: 0,
    // Fixed width so it never expands and steals space from body
    width: 28,
  },
  themeBody:  { flexDirection: 'column', flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  themeName:  { fontSize: 9.5, fontWeight: 700, color: C.dark, marginBottom: 2 },
  themeDesc:  { fontSize: 8.5, color: C.muted, lineHeight: 1.5 },
  // Format badge (wider, purple)
  fmtBadge:   {
    fontSize: 7.5, fontWeight: 700, color: C.purple,
    backgroundColor: C.purpleBg,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 3, marginRight: 10, marginTop: 2,
    flexShrink: 0,
    width: 60,
  },

  // ── Sentiment ──────────────────────────────────────────────────────────────
  sentBlock:   { backgroundColor: C.stripe, borderRadius: 5, padding: 12, marginBottom: 12, flexDirection: 'column' },
  sentTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  sentLabel:   { fontSize: 9, fontWeight: 700, color: C.body, flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  sentScoreWrap: { flexDirection: 'row', alignItems: 'baseline', flexShrink: 0 },
  sentScore:   { fontSize: 24, fontWeight: 700, color: C.dark },
  sentScoreSub:{ fontSize: 9, color: C.faint },
  sentBarBg:   { height: 6, backgroundColor: C.rule, borderRadius: 3, marginBottom: 6 },
  sentNote:    { fontSize: 8.5, color: C.muted, fontStyle: 'italic' },

  // ── Playbook ───────────────────────────────────────────────────────────────
  pbWrap:  { marginBottom: 14, flexDirection: 'column' },
  pbHead:  { paddingVertical: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 4, marginBottom: 2 },
  pbIcon:  { fontSize: 9, fontWeight: 700, marginRight: 6, flexShrink: 0 },
  pbTitle: { fontSize: 9.5, fontWeight: 700, color: C.dark, flexGrow: 1, flexShrink: 1, flexBasis: 0 },

  // ── Info box (left-border callout) ─────────────────────────────────────────
  infoBox:  {
    backgroundColor: C.accentBg,
    borderLeftWidth: 3, borderLeftColor: C.accent, borderLeftStyle: 'solid',
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 3, marginTop: 8, marginBottom: 4,
    flexDirection: 'column',   // ensure column layout inside
  },
  infoTxt:  { fontSize: 8.5, color: C.body, lineHeight: 1.6 },
  infoBold: { fontSize: 8.5, fontWeight: 700, color: C.dark },

  // ── Utilities ──────────────────────────────────────────────────────────────
  section:  { marginBottom: 16, flexDirection: 'column' },
  hr:       { borderBottomWidth: 1, borderBottomColor: C.rule, borderBottomStyle: 'solid', marginVertical: 14 },
  italic:   { fontSize: 8.5, color: C.muted, fontStyle: 'italic' },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer:    { position: 'absolute', bottom: 20, left: PX, right: PX, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 7.5, color: C.faint },
});

// ── Reusable components ───────────────────────────────────────────────────────

function Footer({ query, date }: { query: string; date: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerTxt}>AdInsight AI · YouTube Intelligence · "{query}"</Text>
      <Text style={S.footerTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      <Text style={S.footerTxt}>{date}</Text>
    </View>
  );
}

// SecHeader — bar + title stacked above sub — fixed overlap
function SecHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={S.secWrap}>
      <View style={S.secBar} />
      <View style={S.secTexts}>
        <Text style={S.secTitle}>{title}</Text>
        {sub ? <Text style={S.secSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function SubLabel({ children }: { children: string }) {
  return <Text style={S.subLabel}>{children.toUpperCase()}</Text>;
}

function HR() { return <View style={S.hr} />; }

function Bullets({ items, color = C.accent, bgEven = C.stripe }: {
  items: string[]; color?: string; bgEven?: string;
}) {
  return (
    <View style={{ flexDirection: 'column' }}>
      {items.map((item, i) => (
        <View key={i} style={[S.bulletRow, { backgroundColor: i % 2 === 0 ? bgEven : 'transparent' }]}>
          <Text style={[S.dot, { color }]}>•</Text>
          <Text style={S.bulletTxt}>{clean(item)}</Text>
        </View>
      ))}
    </View>
  );
}

function FindRow({ n, text, bg }: { n: number; text: string; bg: string }) {
  return (
    <View style={[S.findRow, { backgroundColor: bg }]} wrap={false}>
      <Text style={S.findNum}>{n}</Text>
      <Text style={S.findTxt}>{clean(text)}</Text>
    </View>
  );
}

// ── Main document ─────────────────────────────────────────────────────────────
export function YouTubeIntelPDF({
  report, meta,
}: {
  report: YouTubeIntelReport;
  meta: YouTubeIntelResponse['meta'];
}) {
  const isZh = meta.output_lang === 'zh';
  const font = isZh ? 'NotoSansSC' : 'Helvetica';
  const pageStyle = { ...S.page, fontFamily: font };
  const coverStyle = { ...S.cover, fontFamily: font };
  const L = (en: string, zh: string) => isZh ? zh : en;

  const {
    executive_summary: es, content_landscape: cl, audience_intel: ai,
    brand_intelligence: bi, creative_intelligence: ci,
    opportunity_map: om, team_playbooks: tp, quantitative_summary: qs,
  } = report;

  const dateStr = new Date(meta.generated_at).toLocaleDateString(
    isZh ? 'zh-CN' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  return (
    <Document
      title={`YouTube Intelligence — ${meta.query}`}
      author="AdInsight AI"
      subject={`YouTube analysis for "${meta.query}"`}
    >

      {/* ══ COVER ══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={coverStyle}>
        <View style={S.coverTop}>
          <Text style={[S.coverLabel, { fontFamily: font }]}>ADINSIGHT AI  ·  YOUTUBE INTELLIGENCE</Text>
          <Text style={[S.coverTitle, { fontFamily: font }]}>YouTube{'\n'}Intelligence{'\n'}Report</Text>
          <Text style={[S.coverQuery, { fontFamily: font }]}>"{meta.query}"</Text>
          <Text style={[S.coverMeta,  { fontFamily: font }]}>{meta.country_code}  ·  {dateStr}</Text>
        </View>
        <View style={S.coverBottom}>
          {([
            [fmtNum(qs.avg_views),              L('Avg Views',   '平均观看量')],
            [fmtNum(qs.median_views),            L('Median',      '中位观看量')],
            [String(meta.videos_analyzed),       L('Videos',      '个视频')],
            [fmtNum(qs.total_comments_analyzed), L('Comments',    '条评论')],
          ] as [string, string][]).map(([val, lbl]) => (
            <View key={lbl} style={S.coverStat}>
              <Text style={[S.coverStatVal, { fontFamily: font }]}>{val}</Text>
              <Text style={[S.coverStatLbl, { fontFamily: font }]}>{lbl}</Text>
            </View>
          ))}
          <Text style={[S.coverDate, { fontFamily: font }]}>Generated by{'\n'}AdInsight AI</Text>
        </View>
      </Page>

      {/* ══ PAGE 1 — Executive Summary + Quant + Top Videos ═══════════════ */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        <View style={S.section}>
          <SecHeader
            title={L('Executive Summary', '核心洞察')}
            sub={L('Key findings and market temperature', '关键发现与市场温度')}
          />
          <Text style={S.headline}>{clean(es.headline)}</Text>
          <Text style={S.tempBadge}>{L('Market Temperature: ', '市场温度：')}{clean(es.market_temperature)}</Text>
          <SubLabel>{L('Key Findings', '重点发现')}</SubLabel>
          {es.key_findings.map((f, i) => (
            <FindRow key={i} n={i + 1} text={f} bg={i % 2 === 0 ? C.accentBg : C.stripe} />
          ))}
        </View>

        <HR />

        <View style={S.section}>
          <SecHeader title={L('Quantitative Summary', '量化数据')} />
          <View style={S.statsRow}>
            <View style={S.statBox}>
              <Text style={S.statVal}>{fmtNum(qs.avg_views)}</Text>
              <Text style={S.statLbl}>{L('Avg Views', '平均观看量')}</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statVal}>{fmtNum(qs.median_views)}</Text>
              <Text style={S.statLbl}>{L('Median Views', '中位观看量')}</Text>
            </View>
            <View style={S.statBoxLast}>
              <Text style={S.statVal}>{fmtNum(qs.total_comments_analyzed)}</Text>
              <Text style={S.statLbl}>{L('Comments Analyzed', '已分析评论')}</Text>
            </View>
          </View>
          <Text style={S.statNote}>{clean(qs.engagement_insight)}</Text>
        </View>

        <HR />

        <View style={S.section}>
          <SecHeader title={L('Top 5 Videos', '热门视频 Top 5')} />
          {qs.top_5_videos.map(v => (
            <View key={v.rank} style={S.videoRow} wrap={false}>
              <Text style={S.videoRank}>#{v.rank}</Text>
              <View style={S.videoBody}>
                <Text style={S.videoTitle}>{clean(v.title)}</Text>
                <Text style={S.videoMeta}>{clean(v.channel)} · {fmtNum(v.views)} {L('views', '次观看')}</Text>
                <Text style={S.videoWhy}>{clean(v.why_it_works)}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* ══ PAGE 2 — Content Landscape + Audience ══════════════════════════ */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        <View style={S.section}>
          <SecHeader
            title={L('Content Landscape', '内容格局')}
            sub={L('Dominant themes, winning formats & publishing patterns', '主要主题、高效形式与发布规律')}
          />

          <SubLabel>{L('Dominant Themes', '主要内容主题')}</SubLabel>
          {cl.dominant_themes.map((t, i) => (
            <View key={i} style={[S.themeRow, { backgroundColor: i % 2 === 0 ? C.stripe : 'transparent' }]} wrap={false}>
              <Text style={S.themeBadge}>T{i + 1}</Text>
              <View style={S.themeBody}>
                <Text style={S.themeName}>{clean(t.theme)}</Text>
                <Text style={S.themeDesc}>{clean(t.why_it_works)}</Text>
              </View>
            </View>
          ))}

          <SubLabel>{L('Winning Formats', '高效内容形式')}</SubLabel>
          {cl.winning_formats.map((f, i) => (
            <View key={i} style={[S.themeRow, { backgroundColor: i % 2 === 0 ? C.purpleBg : 'transparent' }]} wrap={false}>
              <Text style={S.fmtBadge}>{clean(f.format).slice(0, 10)}</Text>
              <View style={S.themeBody}>
                <Text style={S.themeDesc}>{clean(f.description)}</Text>
              </View>
            </View>
          ))}

          <View style={S.infoBox}>
            <Text style={S.infoTxt}>
              <Text style={S.infoBold}>{L('Publishing insight: ', '发布规律：')}</Text>
              {clean(cl.publishing_insight)}
            </Text>
          </View>
        </View>

        <HR />

        <View style={S.section}>
          <SecHeader
            title={L('Audience Intelligence', '受众洞察')}
            sub={L('Sentiment, pain points, desires & demographic signals', '情绪分析、痛点、期望与人群画像')}
          />

          <View style={S.sentBlock} wrap={false}>
            <View style={S.sentTopRow}>
              <Text style={S.sentLabel}>{L('Audience Sentiment Score', '受众情绪分')}</Text>
              <View style={S.sentScoreWrap}>
                <Text style={S.sentScore}>{ai.sentiment_score}</Text>
                <Text style={S.sentScoreSub}> / 100</Text>
              </View>
            </View>
            <View style={S.sentBarBg}>
              <View style={{
                height: 6, borderRadius: 3,
                width: `${ai.sentiment_score}%`,
                backgroundColor: ai.sentiment_score >= 70 ? C.green : ai.sentiment_score >= 40 ? C.amber : C.red,
              }} />
            </View>
            <Text style={S.sentNote}>{clean(ai.overall_sentiment)}</Text>
          </View>

          <SubLabel>{L('User Pain Points', '用户痛点')}</SubLabel>
          <Bullets items={ai.pain_points} color={C.red} bgEven={C.redBg} />

          <SubLabel>{L('User Desires & Wants', '用户期望')}</SubLabel>
          <Bullets items={ai.desires} color={C.green} bgEven={C.greenBg} />
        </View>
      </Page>

      {/* ══ PAGE 3 — Viral · Demographics · Creative ═══════════════════════ */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        <View style={S.section}>
          <SecHeader title={L('Audience Signals', '受众信号')} />
          <SubLabel>{L('Viral Triggers', '传播触发点')}</SubLabel>
          <Bullets items={ai.viral_triggers} color={C.amber} bgEven={C.amberBg} />
          <SubLabel>{L('Demographic Signals', '人群画像信号')}</SubLabel>
          <Bullets items={ai.demographic_signals} color={C.purple} bgEven={C.purpleBg} />
        </View>

        <HR />

        <View style={S.section}>
          <SecHeader
            title={L('Creative Intelligence', '创意情报')}
            sub={L('Titles, hooks, visuals & content angles', '标题规律、钩子公式、视觉与内容角度')}
          />
          <SubLabel>{L('Title Patterns That Win', '高效标题规律')}</SubLabel>
          <Bullets items={ci.title_patterns} color={C.accent} bgEven={C.accentBg} />
          <SubLabel>{L('Hook Formulas', 'Hook 公式')}</SubLabel>
          <Bullets items={ci.hook_formulas} color={C.amber} bgEven={C.amberBg} />
          <SubLabel>{L('Visual / Thumbnail Patterns', '视觉与封面规律')}</SubLabel>
          <Bullets items={ci.visual_patterns} color={C.purple} bgEven={C.purpleBg} />
          <SubLabel>{L('Content Angles', '内容切入角度')}</SubLabel>
          <Bullets items={ci.content_angles} color={C.green} bgEven={C.greenBg} />
        </View>
      </Page>

      {/* ══ PAGE 4 — Brand + Opportunity ═══════════════════════════════════ */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        <View style={S.section}>
          <SecHeader
            title={L('Brand Intelligence', '品牌情报')}
            sub={L('Perception, associations & competitive landscape', '品牌认知、联想信号与竞争格局')}
          />
          <View style={S.infoBox}>
            <Text style={S.infoTxt}>{clean(bi.perception_summary)}</Text>
          </View>
          <SubLabel>{L('Positive Brand Signals', '正向品牌信号')}</SubLabel>
          <Bullets items={bi.positive_associations} color={C.green} bgEven={C.greenBg} />
          <SubLabel>{L('Risk Signals', '风险信号')}</SubLabel>
          <Bullets items={bi.risk_signals} color={C.red} bgEven={C.redBg} />
          <View style={S.infoBox}>
            <Text style={S.infoTxt}>
              <Text style={S.infoBold}>{L('Competitive landscape: ', '竞争格局：')}</Text>
              {clean(bi.competitor_landscape)}
            </Text>
          </View>
        </View>

        <HR />

        <View style={S.section}>
          <SecHeader title={L('Opportunity Map', '机会地图')} />
          <SubLabel>{L('Content Gaps', '内容空白')}</SubLabel>
          <Bullets items={om.content_gaps} color={C.accent} bgEven={C.accentBg} />
          <SubLabel>{L('Trending Angles', '趋势切角')}</SubLabel>
          <Bullets items={om.trending_angles} color={C.amber} bgEven={C.amberBg} />
          <SubLabel>{L('Underserved Niches', '未被服务的细分人群')}</SubLabel>
          <Bullets items={om.underserved_niches} color={C.purple} bgEven={C.purpleBg} />
          <SubLabel>{L('First-Mover Opportunities', '先发优势机会')}</SubLabel>
          <Bullets items={om.first_mover_ops} color={C.green} bgEven={C.greenBg} />
        </View>
      </Page>

      {/* ══ PAGE 5 — Team Playbooks ═════════════════════════════════════════ */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        <SecHeader
          title={L('Team Playbooks', '团队策略')}
          sub={L('Role-specific action items derived from the analysis', '从分析中提炼的各角色行动建议')}
        />

        {([
          { title: L('CMO — Strategic Brief',                'CMO — 战略决策'),    items: tp.cmo,                color: C.purple, bg: C.purpleBg },
          { title: L('Marketing Director — Campaign Plan',  '营销总监 — 执行计划'), items: tp.marketing_director, color: C.accent, bg: C.accentBg },
          { title: L('Creative Team',                       '创意团队'),            items: tp.creative_team,      color: C.amber,  bg: C.amberBg  },
          { title: L('Ads Team',                            '广告投放团队'),         items: tp.ads_team,           color: C.green,  bg: C.greenBg  },
          { title: L('Product Team',                        '产品团队'),            items: tp.product_team,       color: C.purple, bg: C.purpleBg },
        ] as { title: string; items: string[]; color: string; bg: string }[]).map((pb, idx) => (
          <View key={pb.title} style={S.pbWrap} wrap={false}>
            <View style={[S.pbHead, { backgroundColor: pb.bg }]}>
              <Text style={[S.pbIcon, { color: pb.color }]}>▸</Text>
              <Text style={S.pbTitle}>{pb.title}</Text>
            </View>
            <Bullets items={pb.items} color={pb.color} bgEven={idx % 2 === 0 ? C.stripe : 'transparent'} />
          </View>
        ))}

        <View style={{ marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.rule, borderTopStyle: 'solid' }}>
          <Text style={{ fontSize: 7.5, color: C.faint, textAlign: 'center' }}>
            Generated by AdInsight AI · {meta.videos_analyzed} {L('videos', '个视频')} · {meta.comments_analyzed} {L('comments', '条评论')} · {dateStr}
          </Text>
        </View>
      </Page>

    </Document>
  );
}

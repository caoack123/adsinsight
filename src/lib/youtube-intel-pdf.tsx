/**
 * YouTube Intelligence — professional PDF template
 * Uses @react-pdf/renderer → real text, searchable, proper page breaks
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

// Disable ALL hyphenation — react-pdf's default breaks English words
// mid-syllable in narrow columns (e.g. "dai-\nly"), making text unreadable.
Font.registerHyphenationCallback(word => [word]);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Strip trailing hyphens that AI models sometimes append before a line break
function clean(s: string) {
  return s.replace(/-\s*\n\s*/g, '').replace(/\s*\n\s*/g, ' ').trim();
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  blue:   '#2563eb',
  blueBg: '#eff6ff',
  dark:   '#111827',
  body:   '#374151',
  muted:  '#6b7280',
  light:  '#9ca3af',
  border: '#e5e7eb',
  bg:     '#f9fafb',
  white:  '#ffffff',
  green:  '#16a34a',
  red:    '#dc2626',
  orange: '#d97706',
  purple: '#7c3aed',
};

// ── Stylesheet ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Page — reduced paddingHorizontal (40→30) for +20 pt content width per column
  page: {
    paddingTop: 36, paddingBottom: 52, paddingHorizontal: 30,
    fontSize: 10, color: C.dark, backgroundColor: C.white,
  },

  // Header
  headerWrap:  { marginBottom: 18, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: C.blue, borderBottomStyle: 'solid' },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleText:   { fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 4 },
  sublineText: { fontSize: 8, color: C.muted },
  langBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, fontSize: 8, fontWeight: 700, flexShrink: 0 },
  langBadgeZh: { backgroundColor: '#fef2f2', color: '#dc2626' },
  langBadgeEn: { backgroundColor: C.blueBg,  color: C.blue },

  // Section title bar
  secTitle: {
    fontSize: 7.5, fontWeight: 700, color: C.light,
    textTransform: 'uppercase', letterSpacing: 1,
    borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid',
    paddingBottom: 4, marginBottom: 8,
  },

  // Headline row
  headlineText: { fontSize: 13, fontWeight: 700, color: C.dark, flex: 1, minWidth: 0, marginRight: 10, lineHeight: 1.4 },
  headlineRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  tempBadge:    { backgroundColor: '#fff7ed', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 3, fontSize: 7.5, fontWeight: 700, color: '#c2410c', flexShrink: 0 },

  // Key findings
  findingBox:   { flexDirection: 'row', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 4, padding: 8, marginBottom: 5 },
  findingNum:   { fontSize: 10, fontWeight: 700, color: C.blue, width: 16, flexShrink: 0 },
  findingTxt:   { fontSize: 9.5, color: C.dark, flex: 1, minWidth: 0, lineHeight: 1.5 },

  // 2-column grid — minWidth:0 on children is THE fix for overflow clipping
  row2:       { flexDirection: 'row', marginBottom: 8 },
  colLeft:    { flex: 1, minWidth: 0, marginRight: 8 },
  colRight:   { flex: 1, minWidth: 0 },

  // Cards
  card:        { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 5, padding: 9 },
  cardInLeft:  { flex: 1, minWidth: 0, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 5, padding: 9, marginRight: 8 },
  cardInRight: { flex: 1, minWidth: 0, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 5, padding: 9 },
  cardTitle:   { fontSize: 8.5, fontWeight: 700, color: C.body, marginBottom: 6 },

  // Bullet list — fontSize 9 (was 10) fits more per line in narrow columns
  bulletRow:   { flexDirection: 'row', marginBottom: 4 },
  dot:         { width: 10, fontSize: 10, lineHeight: 1.3, flexShrink: 0, color: C.blue },
  bulletTxt:   { fontSize: 9, color: C.body, flex: 1, minWidth: 0, lineHeight: 1.55 },

  // Stats
  statRow:  { flexDirection: 'row', marginBottom: 8 },
  statBox:  { flex: 1, alignItems: 'center' },
  statVal:  { fontSize: 22, fontWeight: 700, color: C.dark },
  statLbl:  { fontSize: 7.5, color: C.light, marginTop: 1 },
  italic:   { fontSize: 8.5, color: C.muted, fontStyle: 'italic' },

  // Sentiment bar
  sentRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sentLabel: { fontSize: 9, fontWeight: 700, flex: 1, minWidth: 0 },
  sentScore: { fontSize: 16, fontWeight: 700, color: C.dark, flexShrink: 0 },
  sentBarBg: { height: 5, backgroundColor: C.border, borderRadius: 3, marginBottom: 5 },

  // Videos
  videoRow:   { flexDirection: 'row', marginBottom: 7, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' },
  videoRank:  { fontSize: 11, fontWeight: 700, color: C.blue, width: 20, flexShrink: 0, paddingTop: 1 },
  videoInfo:  { flex: 1, minWidth: 0 },
  videoTitle: { fontSize: 9.5, fontWeight: 700, color: C.dark, marginBottom: 2, lineHeight: 1.4 },
  videoMeta:  { fontSize: 8.5, color: C.muted, marginBottom: 2 },
  videoWhy:   { fontSize: 8.5, color: C.blue, lineHeight: 1.4 },

  // Playbook
  pbCard:  { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 5, padding: 9, marginBottom: 8, breakInside: 'avoid' },
  pbTitle: { fontSize: 9.5, fontWeight: 700, color: C.dark, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid', paddingBottom: 4, marginBottom: 6 },

  // Theme/format items
  themeItem:  { marginBottom: 6 },
  themeName:  { fontSize: 9, fontWeight: 700, color: C.dark, marginBottom: 1 },
  themeDesc:  { fontSize: 8.5, color: C.muted, lineHeight: 1.4 },
  formatBadge:{ fontSize: 8, fontWeight: 700, color: C.blue, backgroundColor: C.blueBg, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginBottom: 3, alignSelf: 'flex-start' },

  // Utilities
  section:  { marginBottom: 16 },
  hr:       { borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid', marginVertical: 12 },
  mb4:      { marginBottom: 4 },
  mb6:      { marginBottom: 6 },
  mb8:      { marginBottom: 8 },
  body:     { fontSize: 9.5, color: C.body, lineHeight: 1.6 },
  bodyBold: { fontSize: 9.5, fontWeight: 700, color: C.dark },
  small:    { fontSize: 8, color: C.muted },
  infoBox:  { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderStyle: 'solid', borderRadius: 5, padding: 9, marginTop: 6 },

  // Footer
  footer:    { position: 'absolute', bottom: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 7.5, color: C.light },
});

// ── Building blocks ───────────────────────────────────────────────────────────
function Bullets({ items, color = C.blue }: { items: string[]; color?: string }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={S.bulletRow}>
          <Text style={[S.dot, { color }]}>•</Text>
          <Text style={S.bulletTxt}>{clean(item)}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={S.secTitle}>{children}</Text>;
}

function HR() { return <View style={S.hr} />; }

function Footer({ query, date }: { query: string; date: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerTxt}>AdInsight AI · YouTube Intelligence · "{query}"</Text>
      <Text style={S.footerTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      <Text style={S.footerTxt}>{date}</Text>
    </View>
  );
}

// ── Main PDF document ─────────────────────────────────────────────────────────
export function YouTubeIntelPDF({
  report,
  meta,
}: {
  report: YouTubeIntelReport;
  meta: YouTubeIntelResponse['meta'];
}) {
  const isZh = meta.output_lang === 'zh';
  const font = isZh ? 'NotoSansSC' : 'Helvetica';
  const pageStyle = { ...S.page, fontFamily: font };
  const L = (en: string, zh: string) => isZh ? zh : en;

  const {
    executive_summary: es,
    content_landscape: cl,
    audience_intel: ai,
    brand_intelligence: bi,
    creative_intelligence: ci,
    opportunity_map: om,
    team_playbooks: tp,
    quantitative_summary: qs,
  } = report;

  const dateStr = new Date(meta.generated_at).toLocaleDateString();

  return (
    <Document
      title={`YouTube Intelligence — ${meta.query}`}
      author="AdInsight AI"
      subject={`YouTube analysis for "${meta.query}"`}
    >

      {/* ── Page 1: Header · Executive Summary · Quant · Top 5 ── */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        {/* Header */}
        <View style={S.headerWrap}>
          <View style={S.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={S.titleText}>YouTube Intelligence Report</Text>
              <Text style={S.sublineText}>
                {L('Query', '搜索词')}: "{meta.query}"  ·  {meta.country_code}  ·  {meta.videos_analyzed} {L('videos', '个视频')}  ·  {meta.comments_analyzed} {L('comments', '条评论')}  ·  {dateStr}
              </Text>
            </View>
            <Text style={[S.langBadge, isZh ? S.langBadgeZh : S.langBadgeEn]}>
              {isZh ? '中文报告' : 'EN Report'}
            </Text>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={S.section}>
          <SectionTitle>{L('EXECUTIVE SUMMARY', '核心洞察')}</SectionTitle>
          <View style={S.headlineRow}>
            <Text style={S.headlineText}>{clean(es.headline)}</Text>
            <Text style={S.tempBadge}>{clean(es.market_temperature)}</Text>
          </View>
          <SectionTitle>{L('KEY FINDINGS', '重点发现')}</SectionTitle>
          {es.key_findings.map((f, i) => (
            <View key={i} style={S.findingBox} wrap={false}>
              <Text style={S.findingNum}>{i + 1}</Text>
              <Text style={S.findingTxt}>{clean(f)}</Text>
            </View>
          ))}
        </View>

        <HR />

        {/* Quantitative Summary */}
        <View style={S.section}>
          <SectionTitle>{L('QUANTITATIVE SUMMARY', '量化数据')}</SectionTitle>
          <View style={S.statRow}>
            {[
              [fmtNum(qs.avg_views),               L('Avg Views',          '平均观看量')],
              [fmtNum(qs.median_views),             L('Median Views',       '中位数观看量')],
              [fmtNum(qs.total_comments_analyzed),  L('Comments Analyzed',  '已分析评论')],
            ].map(([val, lbl]) => (
              <View key={lbl} style={S.statBox}>
                <Text style={S.statVal}>{val}</Text>
                <Text style={S.statLbl}>{lbl}</Text>
              </View>
            ))}
          </View>
          <Text style={S.italic}>{clean(qs.engagement_insight)}</Text>
        </View>

        <HR />

        {/* Top 5 Videos */}
        <View style={S.section}>
          <SectionTitle>{L('TOP 5 VIDEOS', '热门视频 Top 5')}</SectionTitle>
          {qs.top_5_videos.map(v => (
            <View key={v.rank} style={S.videoRow} wrap={false}>
              <Text style={S.videoRank}>#{v.rank}</Text>
              <View style={S.videoInfo}>
                <Text style={S.videoTitle}>{clean(v.title)}</Text>
                <Text style={S.videoMeta}>{clean(v.channel)} · {fmtNum(v.views)} {L('views', '次观看')}</Text>
                <Text style={S.videoWhy}>{clean(v.why_it_works)}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* ── Page 2: Content Landscape · Audience Intelligence ── */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        {/* Content Landscape */}
        <View style={S.section}>
          <SectionTitle>{L('CONTENT LANDSCAPE', '内容格局')}</SectionTitle>

          {/* Dominant Themes + Winning Formats side by side */}
          <View style={S.row2}>
            <View style={S.cardInLeft}>
              <Text style={S.cardTitle}>{L('Dominant Themes', '主要内容主题')}</Text>
              {cl.dominant_themes.map((t, i) => (
                <View key={i} style={[S.themeItem, i < cl.dominant_themes.length - 1 ? S.mb6 : {}]}>
                  <Text style={S.themeName}>{clean(t.theme)}</Text>
                  <Text style={S.themeDesc}>{clean(t.why_it_works)}</Text>
                </View>
              ))}
            </View>
            <View style={S.cardInRight}>
              <Text style={S.cardTitle}>{L('Winning Formats', '高效内容形式')}</Text>
              {cl.winning_formats.map((f, i) => (
                <View key={i} style={[S.themeItem, i < cl.winning_formats.length - 1 ? S.mb6 : {}]}>
                  <Text style={S.formatBadge}>{clean(f.format)}</Text>
                  <Text style={S.themeDesc}>{clean(f.description)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Publishing insight */}
          <View style={S.infoBox}>
            <Text style={S.body}>
              <Text style={S.bodyBold}>{L('Publishing insight: ', '发布规律：')}</Text>
              {clean(cl.publishing_insight)}
            </Text>
          </View>
        </View>

        <HR />

        {/* Audience Intelligence */}
        <View style={S.section}>
          <SectionTitle>{L('AUDIENCE INTELLIGENCE', '受众洞察')}</SectionTitle>

          {/* Sentiment */}
          <View style={[S.card, S.mb8]} wrap={false}>
            <View style={S.sentRow}>
              <Text style={S.sentLabel}>{L('Audience Sentiment Score', '受众情绪分')}</Text>
              <Text style={S.sentScore}>
                {ai.sentiment_score}<Text style={{ fontSize: 9, color: C.muted }}>/100</Text>
              </Text>
            </View>
            <View style={S.sentBarBg}>
              <View style={{
                height: 5, borderRadius: 3,
                width: `${ai.sentiment_score}%`,
                backgroundColor: ai.sentiment_score >= 70 ? C.green : ai.sentiment_score >= 40 ? C.orange : C.red,
              }} />
            </View>
            <Text style={S.italic}>{clean(ai.overall_sentiment)}</Text>
          </View>

          {/* Pain Points + Desires */}
          <View style={[S.row2, S.mb8]}>
            <View style={S.cardInLeft} wrap={false}>
              <Text style={[S.cardTitle, { color: C.red }]}>{L('Pain Points', '用户痛点')}</Text>
              <Bullets items={ai.pain_points} color={C.red} />
            </View>
            <View style={S.cardInRight} wrap={false}>
              <Text style={[S.cardTitle, { color: C.green }]}>{L('Desires & Wants', '用户期望')}</Text>
              <Bullets items={ai.desires} color={C.green} />
            </View>
          </View>

          {/* Viral Triggers + Demo Signals */}
          <View style={S.row2}>
            <View style={S.cardInLeft} wrap={false}>
              <Text style={[S.cardTitle, { color: C.orange }]}>{L('Viral Triggers', '传播触发点')}</Text>
              <Bullets items={ai.viral_triggers} color={C.orange} />
            </View>
            <View style={S.cardInRight} wrap={false}>
              <Text style={[S.cardTitle, { color: C.purple }]}>{L('Demographic Signals', '人群画像信号')}</Text>
              <Bullets items={ai.demographic_signals} color={C.purple} />
            </View>
          </View>
        </View>
      </Page>

      {/* ── Page 3: Creative Intelligence · Brand Intelligence · Opportunity ── */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        {/* Creative Intelligence */}
        <View style={S.section}>
          <SectionTitle>{L('CREATIVE INTELLIGENCE', '创意情报')}</SectionTitle>

          <View style={[S.row2, S.mb8]}>
            <View style={S.cardInLeft} wrap={false}>
              <Text style={S.cardTitle}>{L('Title Patterns That Win', '高效标题规律')}</Text>
              <Bullets items={ci.title_patterns} color={C.blue} />
            </View>
            <View style={S.cardInRight} wrap={false}>
              <Text style={S.cardTitle}>{L('Hook Formulas', 'Hook 公式')}</Text>
              <Bullets items={ci.hook_formulas} color={C.orange} />
            </View>
          </View>

          <View style={S.row2}>
            <View style={S.cardInLeft} wrap={false}>
              <Text style={S.cardTitle}>{L('Visual / Thumbnail Patterns', '视觉与封面规律')}</Text>
              <Bullets items={ci.visual_patterns} color={C.purple} />
            </View>
            <View style={S.cardInRight} wrap={false}>
              <Text style={S.cardTitle}>{L('Content Angles', '内容切入角度')}</Text>
              <Bullets items={ci.content_angles} color={C.green} />
            </View>
          </View>
        </View>

        <HR />

        {/* Brand Intelligence */}
        <View style={S.section}>
          <SectionTitle>{L('BRAND INTELLIGENCE', '品牌情报')}</SectionTitle>
          <View style={[S.card, S.mb8]}>
            <Text style={S.body}>{clean(bi.perception_summary)}</Text>
          </View>
          <View style={S.row2}>
            <View style={S.cardInLeft} wrap={false}>
              <Text style={[S.cardTitle, { color: C.green }]}>{L('Positive Associations', '正向品牌信号')}</Text>
              <Bullets items={bi.positive_associations} color={C.green} />
            </View>
            <View style={S.cardInRight} wrap={false}>
              <Text style={[S.cardTitle, { color: C.red }]}>{L('Risk Signals', '风险信号')}</Text>
              <Bullets items={bi.risk_signals} color={C.red} />
            </View>
          </View>
          <View style={[S.infoBox, { marginTop: 8 }]}>
            <Text style={S.body}>
              <Text style={S.bodyBold}>{L('Competitive landscape: ', '竞争格局：')}</Text>
              {clean(bi.competitor_landscape)}
            </Text>
          </View>
        </View>

        <HR />

        {/* Opportunity Map */}
        <View style={S.section}>
          <SectionTitle>{L('OPPORTUNITY MAP', '机会地图')}</SectionTitle>
          <View style={[S.row2, S.mb8]}>
            <View style={S.cardInLeft} wrap={false}>
              <Text style={S.cardTitle}>{L('Content Gaps', '内容空白')}</Text>
              <Bullets items={om.content_gaps} color={C.blue} />
            </View>
            <View style={S.cardInRight} wrap={false}>
              <Text style={S.cardTitle}>{L('Trending Angles', '趋势切角')}</Text>
              <Bullets items={om.trending_angles} color={C.orange} />
            </View>
          </View>
          <View style={S.row2}>
            <View style={S.cardInLeft} wrap={false}>
              <Text style={S.cardTitle}>{L('Underserved Niches', '未被服务的细分人群')}</Text>
              <Bullets items={om.underserved_niches} color={C.purple} />
            </View>
            <View style={S.cardInRight} wrap={false}>
              <Text style={S.cardTitle}>{L('First-Mover Opportunities', '先发优势机会')}</Text>
              <Bullets items={om.first_mover_ops} color={C.green} />
            </View>
          </View>
        </View>
      </Page>

      {/* ── Page 4: Team Playbooks ── */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        <View style={S.section}>
          <SectionTitle>{L('TEAM PLAYBOOKS', '团队策略')}</SectionTitle>

          {/* CMO + Marketing Director */}
          <View style={S.row2}>
            <View style={[S.pbCard, { flex: 1, minWidth: 0, marginRight: 8 }]} wrap={false}>
              <Text style={S.pbTitle}>{L('CMO — Strategic Brief', 'CMO — 战略决策')}</Text>
              <Bullets items={tp.cmo} color={C.purple} />
            </View>
            <View style={[S.pbCard, { flex: 1, minWidth: 0 }]} wrap={false}>
              <Text style={S.pbTitle}>{L('Marketing Director — Campaign Plan', '营销总监 — 执行计划')}</Text>
              <Bullets items={tp.marketing_director} color={C.blue} />
            </View>
          </View>

          {/* Creative + Ads + Product */}
          <View style={{ flexDirection: 'row' }}>
            {[
              { title: L('Creative Team', '创意团队'),   items: tp.creative_team, color: C.orange },
              { title: L('Ads Team', '广告投放团队'),     items: tp.ads_team,      color: C.green },
              { title: L('Product Team', '产品团队'),    items: tp.product_team,  color: C.purple },
            ].map((pb, i, arr) => (
              <View
                key={pb.title}
                style={[S.pbCard, { flex: 1, minWidth: 0, ...(i < arr.length - 1 ? { marginRight: 8 } : {}) }]}
                wrap={false}
              >
                <Text style={S.pbTitle}>{pb.title}</Text>
                <Bullets items={pb.items} color={pb.color} />
              </View>
            ))}
          </View>
        </View>

        {/* Closing note */}
        <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, borderTopStyle: 'solid' }}>
          <Text style={{ fontSize: 7.5, color: C.light, textAlign: 'center' }}>
            Generated by AdInsight AI · YouTube Intelligence · {meta.videos_analyzed} {L('videos', '个视频')} · {meta.comments_analyzed} {L('comments', '条评论')} · {dateStr}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

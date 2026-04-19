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
// Chinese reports → NotoSansSC (covers CJK + Latin)
// English reports → Helvetica (built-in, zero download)
Font.register({
  family: 'NotoSansSC',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.0.12/files/noto-sans-sc-chinese-simplified-400-normal.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.0.12/files/noto-sans-sc-chinese-simplified-700-normal.woff2',
      fontWeight: 700,
    },
  ],
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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
  // Page
  page: {
    paddingTop: 36, paddingBottom: 52, paddingHorizontal: 40,
    fontSize: 10, color: C.dark, backgroundColor: C.white,
  },

  // Header
  headerWrap:    { marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: C.blue, borderBottomStyle: 'solid' },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleText:     { fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 4 },
  sublineText:   { fontSize: 8, color: C.muted },
  langBadge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, fontSize: 8, fontWeight: 700 },
  langBadgeZh:   { backgroundColor: '#fef2f2', color: '#dc2626' },
  langBadgeEn:   { backgroundColor: C.blueBg, color: C.blue },

  // Section header
  secTitle: {
    fontSize: 8, fontWeight: 700, color: C.light,
    textTransform: 'uppercase', letterSpacing: 1,
    borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid',
    paddingBottom: 4, marginBottom: 10,
  },

  // Headline
  headlineText:  { fontSize: 13, fontWeight: 700, color: C.dark, flex: 1, marginRight: 10, lineHeight: 1.4 },
  headlineRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  tempBadge:     { backgroundColor: '#fff7ed', borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3, fontSize: 8, fontWeight: 700, color: '#c2410c' },

  // Findings
  findingBox:    { flexDirection: 'row', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 4, padding: 8, marginBottom: 6 },
  findingNum:    { fontSize: 10, fontWeight: 700, color: C.blue, width: 16, flexShrink: 0 },
  findingTxt:    { fontSize: 10, color: C.dark, flex: 1, lineHeight: 1.5 },

  // 2-column grid
  row2:          { flexDirection: 'row', marginBottom: 10 },
  col:           { flex: 1 },
  colLeft:       { flex: 1, marginRight: 10 },
  colRight:      { flex: 1 },

  // Cards
  card:          { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 6, padding: 10 },
  cardInLeft:    { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 6, padding: 10, marginRight: 10 },
  cardInRight:   { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 6, padding: 10 },
  cardTitle:     { fontSize: 9, fontWeight: 700, color: C.body, marginBottom: 7 },

  // Bullet list
  bulletRow:     { flexDirection: 'row', marginBottom: 5 },
  dot:           { width: 12, fontSize: 11, lineHeight: 1.2, flexShrink: 0 },
  bulletTxt:     { fontSize: 10, color: C.body, flex: 1, lineHeight: 1.5 },

  // Stats
  statRow:       { flexDirection: 'row', marginBottom: 10 },
  statBox:       { flex: 1, alignItems: 'center' },
  statVal:       { fontSize: 22, fontWeight: 700, color: C.dark },
  statLbl:       { fontSize: 8, color: C.light, marginTop: 1 },
  italic:        { fontSize: 9, color: C.muted, fontStyle: 'italic' },

  // Sentiment bar
  sentRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  sentLabel:     { fontSize: 9, fontWeight: 700 },
  sentScore:     { fontSize: 16, fontWeight: 700, color: C.dark },
  sentBarBg:     { height: 6, backgroundColor: C.border, borderRadius: 3, marginBottom: 6 },

  // Videos
  videoRow:      { flexDirection: 'row', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' },
  videoRank:     { fontSize: 12, fontWeight: 700, color: C.blue, width: 22, flexShrink: 0, paddingTop: 1 },
  videoTitle:    { fontSize: 10, fontWeight: 700, color: C.dark, marginBottom: 2, lineHeight: 1.4 },
  videoMeta:     { fontSize: 9, color: C.muted, marginBottom: 2 },
  videoWhy:      { fontSize: 9, color: C.blue, lineHeight: 1.4 },

  // Playbook
  pbCard:        { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 6, padding: 10, marginBottom: 10, breakInside: 'avoid' },
  pbTitle:       { fontSize: 10, fontWeight: 700, color: C.dark, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid', paddingBottom: 5, marginBottom: 7 },

  // Utilities
  section:       { marginBottom: 18 },
  hr:            { borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid', marginVertical: 14 },
  mb4:           { marginBottom: 4 },
  mb8:           { marginBottom: 8 },
  mb10:          { marginBottom: 10 },
  row:           { flexDirection: 'row' },
  body:          { fontSize: 10, color: C.body, lineHeight: 1.6 },
  small:         { fontSize: 8, color: C.muted },

  // Footer
  footer:        { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:     { fontSize: 8, color: C.light },
});

// ── Small building blocks ─────────────────────────────────────────────────────
function Bullets({ items, color = C.blue }: { items: string[]; color?: string }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={S.bulletRow}>
          <Text style={[S.dot, { color }]}>•</Text>
          <Text style={S.bulletTxt}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={S.secTitle}>{children}</Text>;
}

function HR() {
  return <View style={S.hr} />;
}

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
      {/* ── Page 1: Header + Executive Summary + Quant ── */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        {/* Header */}
        <View style={S.headerWrap}>
          <View style={S.headerRow}>
            <View>
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
            <Text style={S.headlineText}>{es.headline}</Text>
            <Text style={S.tempBadge}>{es.market_temperature}</Text>
          </View>
          <SectionTitle>{L('KEY FINDINGS', '重点发现')}</SectionTitle>
          {es.key_findings.map((f, i) => (
            <View key={i} style={S.findingBox}>
              <Text style={S.findingNum}>{i + 1}</Text>
              <Text style={S.findingTxt}>{f}</Text>
            </View>
          ))}
        </View>

        <HR />

        {/* Quantitative Summary */}
        <View style={S.section}>
          <SectionTitle>{L('QUANTITATIVE SUMMARY', '量化数据')}</SectionTitle>
          <View style={S.statRow}>
            {[
              [fmtNum(qs.avg_views),              L('Avg Views', '平均观看量')],
              [fmtNum(qs.median_views),            L('Median Views', '中位数观看量')],
              [fmtNum(qs.total_comments_analyzed), L('Comments Analyzed', '已分析评论')],
            ].map(([val, lbl]) => (
              <View key={lbl} style={S.statBox}>
                <Text style={S.statVal}>{val}</Text>
                <Text style={S.statLbl}>{lbl}</Text>
              </View>
            ))}
          </View>
          <Text style={S.italic}>{qs.engagement_insight}</Text>
        </View>

        <HR />

        {/* Top 5 Videos */}
        <View style={S.section}>
          <SectionTitle>{L('TOP 5 VIDEOS', '热门视频 Top 5')}</SectionTitle>
          {qs.top_5_videos.map(v => (
            <View key={v.rank} style={S.videoRow}>
              <Text style={S.videoRank}>#{v.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.videoTitle}>{v.title}</Text>
                <Text style={S.videoMeta}>{v.channel} · {fmtNum(v.views)} {L('views', '次观看')}</Text>
                <Text style={S.videoWhy}>{v.why_it_works}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* ── Page 2: Content Landscape + Audience Intelligence ── */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        {/* Content Landscape */}
        <View style={S.section}>
          <SectionTitle>{L('CONTENT LANDSCAPE', '内容格局')}</SectionTitle>
          <View style={S.row2}>
            <View style={S.cardInLeft}>
              <Text style={S.cardTitle}>{L('Dominant Themes', '主要内容主题')}</Text>
              {cl.dominant_themes.map((t, i) => (
                <View key={i} style={S.mb8}>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: C.dark, marginBottom: 2 }}>{t.theme}</Text>
                  <Text style={{ fontSize: 9, color: C.muted, lineHeight: 1.4 }}>{t.why_it_works}</Text>
                </View>
              ))}
            </View>
            <View style={S.cardInRight}>
              <Text style={S.cardTitle}>{L('Winning Formats', '高效内容形式')}</Text>
              {cl.winning_formats.map((f, i) => (
                <View key={i} style={S.mb8}>
                  <Text style={{ fontSize: 9, fontWeight: 700, backgroundColor: C.blueBg, color: C.blue, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginBottom: 2 }}>{f.format}</Text>
                  <Text style={{ fontSize: 9, color: C.muted, lineHeight: 1.4 }}>{f.description}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[S.card, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', marginTop: 6 }]}>
            <Text style={{ fontSize: 10, color: C.body, lineHeight: 1.5 }}>
              <Text style={{ fontWeight: 700 }}>{L('Publishing insight: ', '发布规律：')}</Text>
              {cl.publishing_insight}
            </Text>
          </View>
        </View>

        <HR />

        {/* Audience Intelligence */}
        <View style={S.section}>
          <SectionTitle>{L('AUDIENCE INTELLIGENCE', '受众洞察')}</SectionTitle>

          {/* Sentiment score */}
          <View style={[S.card, S.mb10]}>
            <View style={S.sentRow}>
              <Text style={S.sentLabel}>{L('Audience Sentiment Score', '受众情绪分')}</Text>
              <Text style={S.sentScore}>
                {ai.sentiment_score}<Text style={{ fontSize: 10, color: C.muted }}>/100</Text>
              </Text>
            </View>
            <View style={S.sentBarBg}>
              <View style={{
                height: 6,
                borderRadius: 3,
                width: `${ai.sentiment_score}%`,
                backgroundColor: ai.sentiment_score >= 70 ? C.green : ai.sentiment_score >= 40 ? C.orange : C.red,
              }} />
            </View>
            <Text style={S.italic}>{ai.overall_sentiment}</Text>
          </View>

          <View style={S.row2}>
            <View style={S.cardInLeft}>
              <Text style={S.cardTitle}>{L('Pain Points', '用户痛点')}</Text>
              <Bullets items={ai.pain_points} color={C.red} />
            </View>
            <View style={S.cardInRight}>
              <Text style={S.cardTitle}>{L('Desires & Wants', '用户期望')}</Text>
              <Bullets items={ai.desires} color={C.green} />
            </View>
          </View>

          <View style={[S.row2, S.mb4]}>
            <View style={S.cardInLeft}>
              <Text style={S.cardTitle}>{L('Viral Triggers', '传播触发点')}</Text>
              <Bullets items={ai.viral_triggers} color={C.orange} />
            </View>
            <View style={S.cardInRight}>
              <Text style={S.cardTitle}>{L('Demographic Signals', '人群画像信号')}</Text>
              <Bullets items={ai.demographic_signals} color={C.purple} />
            </View>
          </View>
        </View>
      </Page>

      {/* ── Page 3: Creative & Brand + Opportunity Map ── */}
      <Page size="A4" style={pageStyle}>
        <Footer query={meta.query} date={dateStr} />

        {/* Creative Intelligence */}
        <View style={S.section}>
          <SectionTitle>{L('CREATIVE INTELLIGENCE', '创意情报')}</SectionTitle>
          <View style={S.row2}>
            <View style={S.cardInLeft}>
              <Text style={S.cardTitle}>{L('Title Patterns That Win', '高效标题规律')}</Text>
              <Bullets items={ci.title_patterns} color={C.blue} />
            </View>
            <View style={S.cardInRight}>
              <Text style={S.cardTitle}>{L('Hook Formulas', 'Hook 公式')}</Text>
              <Bullets items={ci.hook_formulas} color={C.orange} />
            </View>
          </View>
          <View style={[S.row2, { marginTop: 8 }]}>
            <View style={S.cardInLeft}>
              <Text style={S.cardTitle}>{L('Visual / Thumbnail Patterns', '视觉与封面规律')}</Text>
              <Bullets items={ci.visual_patterns} color={C.purple} />
            </View>
            <View style={S.cardInRight}>
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
            <Text style={S.body}>{bi.perception_summary}</Text>
          </View>
          <View style={S.row2}>
            <View style={S.cardInLeft}>
              <Text style={[S.cardTitle, { color: C.green }]}>{L('Positive Associations', '正向品牌信号')}</Text>
              <Bullets items={bi.positive_associations} color={C.green} />
            </View>
            <View style={S.cardInRight}>
              <Text style={[S.cardTitle, { color: C.red }]}>{L('Risk Signals', '风险信号')}</Text>
              <Bullets items={bi.risk_signals} color={C.red} />
            </View>
          </View>
          <View style={[S.card, { marginTop: 8, backgroundColor: '#fafafa' }]}>
            <Text style={S.body}>
              <Text style={{ fontWeight: 700 }}>{L('Competitive landscape: ', '竞争格局：')}</Text>
              {bi.competitor_landscape}
            </Text>
          </View>
        </View>

        <HR />

        {/* Opportunity Map */}
        <View style={S.section}>
          <SectionTitle>{L('OPPORTUNITY MAP', '机会地图')}</SectionTitle>
          <View style={S.row2}>
            <View style={S.cardInLeft}>
              <Text style={S.cardTitle}>{L('Content Gaps', '内容空白')}</Text>
              <Bullets items={om.content_gaps} color={C.blue} />
            </View>
            <View style={S.cardInRight}>
              <Text style={S.cardTitle}>{L('Trending Angles', '趋势切角')}</Text>
              <Bullets items={om.trending_angles} color={C.orange} />
            </View>
          </View>
          <View style={[S.row2, { marginTop: 8 }]}>
            <View style={S.cardInLeft}>
              <Text style={S.cardTitle}>{L('Underserved Niches', '未被服务的细分人群')}</Text>
              <Bullets items={om.underserved_niches} color={C.purple} />
            </View>
            <View style={S.cardInRight}>
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

          <View style={S.row2}>
            <View style={[S.pbCard, { flex: 1, marginRight: 10 }]}>
              <Text style={S.pbTitle}>{L('CMO — Strategic Brief', 'CMO — 战略决策')}</Text>
              <Bullets items={tp.cmo} color={C.purple} />
            </View>
            <View style={[S.pbCard, { flex: 1 }]}>
              <Text style={S.pbTitle}>{L('Marketing Director — Campaign Plan', '营销总监 — 执行计划')}</Text>
              <Bullets items={tp.marketing_director} color={C.blue} />
            </View>
          </View>

          <View style={{ flexDirection: 'row' }}>
            {[
              { title: L('Creative Team', '创意团队'),    items: tp.creative_team,  color: C.orange },
              { title: L('Ads Team', '广告投放团队'),      items: tp.ads_team,       color: C.green },
              { title: L('Product Team', '产品团队'),     items: tp.product_team,   color: C.purple },
            ].map((pb, i, arr) => (
              <View key={pb.title} style={[S.pbCard, { flex: 1, ...(i < arr.length - 1 ? { marginRight: 10 } : {}) }]}>
                <Text style={S.pbTitle}>{pb.title}</Text>
                <Bullets items={pb.items} color={pb.color} />
              </View>
            ))}
          </View>
        </View>

        {/* Closing note */}
        <View style={{ marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, borderTopStyle: 'solid' }}>
          <Text style={{ fontSize: 8, color: C.light, textAlign: 'center' }}>
            Generated by AdInsight AI · YouTube Intelligence · {meta.videos_analyzed} {L('videos', '个视频')} · {meta.comments_analyzed} {L('comments', '条评论')} · {dateStr}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

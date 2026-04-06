import {
  AccountChange,
  AnnotatedChange,
  ChangeTrackerSummary,
  PerformanceDelta,
  PerformanceSnapshot,
} from './schema';

export function annotateChanges(changes: AccountChange[]): AnnotatedChange[] {
  return changes.map(change => ({
    change,
    delta: computeDelta(change),
  }));
}

function computeDelta(change: AccountChange): PerformanceDelta {
  const before = change.performance_before;
  const after = change.performance_after;

  // Normalise to per-day to handle different window sizes
  const scale = before.window_days / after.window_days;
  const afterNorm: PerformanceSnapshot = {
    ...after,
    impressions: after.impressions * scale,
    clicks: after.clicks * scale,
    cost: after.cost * scale,
    conversions: after.conversions * scale,
    conversions_value: after.conversions_value * scale,
  };

  const impressions_delta = afterNorm.impressions - before.impressions;
  const clicks_delta = afterNorm.clicks - before.clicks;
  const ctr_delta = after.ctr - before.ctr;
  const cost_delta = afterNorm.cost - before.cost;
  const conversions_delta = afterNorm.conversions - before.conversions;
  const roas_delta = after.roas - before.roas;

  const cost_per_conv_before =
    before.conversions > 0 ? before.cost / before.conversions : 0;
  const cost_per_conv_after =
    after.conversions > 0 ? after.cost / after.conversions : 0;

  // Paused resources — special verdict
  if (
    change.change_type === 'CAMPAIGN_PAUSED' ||
    change.change_type === 'AD_PAUSED' ||
    change.change_type === 'KEYWORD_PAUSED'
  ) {
    const wasteScore = before.roas;
    if (wasteScore < 0.5) {
      return {
        impressions_delta,
        clicks_delta,
        ctr_delta,
        cost_delta,
        conversions_delta,
        roas_delta,
        cost_per_conv_before,
        cost_per_conv_after,
        verdict: 'positive',
        verdict_reason_zh: '暂停低效资源',
        insight_zh: `暂停了 ROAS 仅 ${before.roas.toFixed(2)}x 的 "${change.resource_name}"，每周节省约 $${Math.abs(cost_delta).toFixed(0)} 无效支出。建议将预算转移至高 ROAS 广告组。`,
      };
    }
    return {
      impressions_delta,
      clicks_delta,
      ctr_delta,
      cost_delta,
      conversions_delta,
      roas_delta,
      cost_per_conv_before,
      cost_per_conv_after,
      verdict: 'paused',
      verdict_reason_zh: '资源已暂停',
      insight_zh: `"${change.resource_name}" 已暂停。暂停前 ROAS 为 ${before.roas.toFixed(2)}x，暂停原因需确认是否为季节性调整或测试。`,
    };
  }

  // Determine verdict based on ROAS + conversions (primary) and cost efficiency
  let verdict: PerformanceDelta['verdict'];
  let verdict_reason_zh: string;
  let insight_zh: string;

  if (roas_delta > 0.3 && conversions_delta >= 0) {
    verdict = 'positive';
    verdict_reason_zh = 'ROAS 提升';
    insight_zh = buildInsightZh(change, before, after, roas_delta, conversions_delta, cost_delta, 'positive');
  } else if (roas_delta < -0.3 || (conversions_delta < 0 && cost_delta > 0)) {
    verdict = 'negative';
    verdict_reason_zh = roas_delta < -0.3 ? 'ROAS 下降' : '转化减少但成本上升';
    insight_zh = buildInsightZh(change, before, after, roas_delta, conversions_delta, cost_delta, 'negative');
  } else {
    verdict = 'neutral';
    verdict_reason_zh = '效果变化不显著';
    insight_zh = buildInsightZh(change, before, after, roas_delta, conversions_delta, cost_delta, 'neutral');
  }

  return {
    impressions_delta,
    clicks_delta,
    ctr_delta,
    cost_delta,
    conversions_delta,
    roas_delta,
    cost_per_conv_before,
    cost_per_conv_after,
    verdict,
    verdict_reason_zh,
    insight_zh,
  };
}

function buildInsightZh(
  change: AccountChange,
  before: PerformanceSnapshot,
  after: PerformanceSnapshot,
  roas_delta: number,
  conversions_delta: number,
  cost_delta: number,
  tone: 'positive' | 'negative' | 'neutral'
): string {
  // Hardcoded per change_id for sample data — in production, replace with AI call:
  // const insight = await generateChangeInsight({ change, before, after });

  const hardcoded: Record<string, string> = {
    chg_001: `切换到 Target ROAS 300% 后，ROAS 从 1.83x 提升至 2.96x（+62%），但曝光量减少了 27%。这是正常现象：tROAS 策略会主动降低低质流量出价，牺牲部分曝光换取更高的单次转化价值。建议继续观察 2 周，确认策略稳定后再考虑调整目标值。`,
    chg_002: `提高 "Ice Crystal Rings" 出价后，点击量从 32 增至 87（+172%），但 ROAS 从 2.08x 降至 1.38x（-34%）。曝光量大幅增加说明竞争激烈，高出价带来了大量低意向流量。建议回退出价至 $0.55-0.60，或配合负面关键词过滤泛流量。`,
    chg_003: `品牌词预算翻倍效果显著：转化从 8 增至 18（+125%），ROAS 从 4.42x 升至 4.86x。品牌词 ROAS 通常高于非品牌词，加大品牌词预算是最安全的增量策略。建议进一步测试将日预算提升至 $50。`,
    chg_004: `暂停低效广告创意 "Iced Out Bracelet - Promo Creative" 后，同广告组 ROAS 从 0.40x 回升至 1.08x。原广告的 CTR 持续低迷（0.6%），消耗了大量预算但几乎无转化。这是一次正确的决策，建议替换新的创意素材重新测试。`,
    chg_005: `Snow Boots 出价从 $0.60 提至 $0.90，转化从 5 增至 10（+100%），但 ROAS 从 2.29x 略降至 2.01x。这是合理的规模扩张：雪地靴是你的高转化产品，以轻微 ROAS 降幅换取销量翻倍是可接受的。若目标是最大化收入，可维持此出价；若目标是效率最优，回到 $0.70-0.75 更合适。`,
    chg_006: `新增精确匹配关键词 [crowned ice jewelry] 后，品牌词整体转化+67%，ROAS 从 3.91x 升至 4.42x。精确匹配品牌词能有效拦截竞争对手的 bid-on-brand 策略，同时降低无效点击。建议继续扩充品牌词库，覆盖 [crowned ice ring]、[crowned ice necklace] 等长尾词。`,
    chg_007: `清仓系列活动被暂停。该活动 7 天内 ROAS 为 0（无转化），消耗 $37.80。暂停决策正确，节省了持续浪费。若清仓商品仍在售，建议检查商品 Feed 中的价格和库存状态，可能存在数据同步问题导致无法购买。`,
    chg_008: `将 Drop Earrings 出价从 $0.55 降至 $0.35 后，曝光量和点击量均下降约 45%，成本从 $26.45 降至 $9.75，但转化仍为 0。该品类转化率极低，降价控制成本是对的。建议评估该品类是否值得继续投放，或彻底暂停并将预算转移至 Snow Boots 等高转化品类。`,
    chg_009: `购物广告日预算从 $50 提至 $80，当前数据（仅 4 天）显示 ROAS 从 1.40x 小幅提升至 1.49x，点击量日均略有增加。数据窗口较短，需再观察 3-5 天才能得出结论。关注点：新增预算是否流向了高价值的 Snow Boots 和 Snowflake Necklace 品类，而非低效的 Ring 和 Earring 品类。`,
  };

  if (hardcoded[change.change_id]) return hardcoded[change.change_id];

  // Generic fallback
  if (tone === 'positive') {
    return `此次变更后 ROAS 提升 ${roas_delta > 0 ? '+' : ''}${roas_delta.toFixed(2)}x，转化量变化 ${conversions_delta > 0 ? '+' : ''}${conversions_delta.toFixed(1)} 次，效果正向。`;
  } else if (tone === 'negative') {
    return `此次变更后效果有所下降。ROAS 变化 ${roas_delta.toFixed(2)}x，成本变化 $${cost_delta.toFixed(2)}，建议评估是否需要回退。`;
  }
  return `此次变更后效果基本持平。持续观察 1-2 周再做决策。`;
}

export function computeSummary(annotated: AnnotatedChange[]): ChangeTrackerSummary {
  const positive = annotated.filter(a => a.delta.verdict === 'positive').length;
  const negative = annotated.filter(a => a.delta.verdict === 'negative').length;
  const neutral = annotated.filter(a => a.delta.verdict === 'neutral' || a.delta.verdict === 'paused').length;

  const costSaved = annotated
    .filter(a => a.delta.cost_delta < 0)
    .reduce((sum, a) => sum + Math.abs(a.delta.cost_delta), 0);

  const positiveRoasDeltas = annotated
    .filter(a => a.delta.verdict === 'positive' && a.delta.roas_delta > 0)
    .map(a => a.delta.roas_delta);
  const avgRoasImprovement =
    positiveRoasDeltas.length > 0
      ? positiveRoasDeltas.reduce((s, v) => s + v, 0) / positiveRoasDeltas.length
      : 0;

  const mostImpactful = [...annotated].sort(
    (a, b) => Math.abs(b.delta.roas_delta) - Math.abs(a.delta.roas_delta)
  )[0];

  return {
    total_changes: annotated.length,
    positive_changes: positive,
    negative_changes: negative,
    neutral_changes: neutral,
    top_insight_zh: mostImpactful ? (mostImpactful.delta.insight_zh.slice(0, 80) + '…') : '',
    cost_saved: costSaved,
    roas_improvement: avgRoasImprovement,
  };
}

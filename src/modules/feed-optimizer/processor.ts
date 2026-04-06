import { FeedProduct, TitleAnalysis, TitleIssue, FeedOptimizerSummary } from './schema';

// Hardcoded analysis for sample data — structure it so swapping in
// real AI calls later is a one-function change
export function analyzeTitles(products: FeedProduct[]): TitleAnalysis[] {
  return products.map(product => analyzeOneTitle(product));
}

function analyzeOneTitle(product: FeedProduct): TitleAnalysis {
  const issues: TitleIssue[] = [];
  let score = 100;

  // Rule-based checks (these stay even after adding AI)
  const words = product.current_title.split(' ');

  // Check: keyword stuffing (too many generic words)
  if (words.length > 15) {
    issues.push({
      type: 'keyword_stuffing',
      description_zh: '标题过长，包含过多泛关键词，Google Shopping 更偏好精准描述',
      severity: 'high',
    });
    score -= 20;
  }

  // Check: missing color
  const hasColor = /\b(black|white|red|blue|green|gold|silver|pink|purple|ice blue|sage|rose)\b/i.test(product.current_title);
  if (!hasColor) {
    issues.push({
      type: 'missing_color',
      description_zh: '标题缺少颜色信息，用户搜索通常包含颜色词',
      severity: 'medium',
    });
    score -= 10;
  }

  // Check: missing material specifics
  const hasMaterial = /\b(925 silver|sterling silver|14k gold|stainless steel|titanium|leather|suede)\b/i.test(product.current_title);
  if (!hasMaterial && (product.product_type.includes('Jewelry') || product.product_type.includes('Shoes'))) {
    issues.push({
      type: 'missing_material',
      description_zh: '缺少具体材质信息（如 "Sterling Silver" 比 "Silver Plated" 更有吸引力）',
      severity: 'medium',
    });
    score -= 10;
  }

  // Check: missing occasion/use case
  const searchTermsText = product.top_search_terms.join(' ');
  const hasOccasionInSearch = /\b(wedding|gift|christmas|birthday|party|daily|casual|outdoor)\b/i.test(searchTermsText);
  const hasOccasionInTitle = /\b(wedding|gift|christmas|birthday|party|daily|casual|outdoor)\b/i.test(product.current_title);
  if (hasOccasionInSearch && !hasOccasionInTitle) {
    issues.push({
      type: 'missing_occasion',
      description_zh: '用户搜索包含场景词（如 wedding, gift），但标题中未体现',
      severity: 'high',
    });
    score -= 15;
  }

  // Check: brand not prominent
  if (!product.current_title.startsWith(product.brand)) {
    issues.push({
      type: 'missing_brand',
      description_zh: '品牌名未放在标题开头，影响品牌辨识度',
      severity: 'low',
    });
    score -= 5;
  }

  // Check: poor structure (no clear hierarchy)
  const hasDash = product.current_title.includes(' - ');
  const hasPipe = product.current_title.includes(' | ');
  if (!hasDash && !hasPipe && words.length > 8) {
    issues.push({
      type: 'poor_structure',
      description_zh: '标题缺少结构分隔（建议用 " - " 分隔品牌、产品类型和关键特征）',
      severity: 'medium',
    });
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  // Generate suggested title (hardcoded for sample data)
  // TODO: Replace with AI call — await generateOptimizedTitle(product)
  const suggested = generateHardcodedSuggestion(product);

  return {
    product,
    score,
    issues,
    suggested_title: suggested.title,
    reasoning: suggested.reasoning,
    estimated_ctr_lift: score < 50 ? '+20-35%' : score < 70 ? '+10-20%' : '+5-10%',
  };
}

function generateHardcodedSuggestion(product: FeedProduct): { title: string; reasoning: string } {
  // Hardcoded suggestions for sample products — in production, this becomes an AI call
  const suggestions: Record<string, { title: string; reasoning: string }> = {
    'shopify_US_8012345': {
      title: 'Crowned Ice - Sterling Silver Ice Crystal Ring | Wedding Band for Women | Engagement Gift',
      reasoning: '将品牌放在开头，增加具体材质 "Sterling Silver"，使用 " | " 分隔结构，加入搜索高频词 "Wedding Band" 和 "Engagement Gift"。当前标题堆砌了过多泛关键词，Google 算法更偏好精准、结构化的描述。',
    },
    'shopify_US_8012346': {
      title: 'Crowned Ice - Crystal Snowflake Pendant Necklace | Winter Holiday Gift for Women | 18" Silver Chain',
      reasoning: '当前标题表现较好（CTR 2.5%），主要优化：加入品牌名、具体链长 "18\\" Silver Chain"、增加场景词 "Holiday Gift"。搜索词数据显示 "christmas gift necklace" 有流量但标题未覆盖。',
    },
    'shopify_US_8012347': {
      title: 'Crowned Ice - Cuban Link Chain Bracelet | Iced Out Hip Hop Jewelry | Gold & Silver | Men & Women',
      reasoning: '当前 CTR 只有 0.6%，问题严重。标题需要重构：将最高搜索量的 "Cuban Link" 前置，去掉冗余的 "Fashion Jewelry"，用 " | " 清晰分隔特征。"Iced Out" 是这个品类的核心搜索词，必须保留。',
    },
    'shopify_US_8012348': {
      title: 'Crowned Ice - Ice Blue Crystal Drop Earrings | Dangle Earrings for Wedding & Party | Women Gift',
      reasoning: '当前 CTR 仅 0.6%。主要问题是标题以 "Women Earring" 开头，过于泛化。优化方案：品牌开头，核心颜色 "Ice Blue" 前置（搜索数据证实这是高频词），加入场景词 "Wedding & Party"。',
    },
    'shopify_US_8012349': {
      title: "Crowned Ice - Women's Waterproof Snow Boots | Warm Fur Lined Winter Boots | Anti-Slip Outdoor",
      reasoning: "这是你的高转化产品（ROAS 2.4x），标题已经不错但可以优化。建议：加入品牌名，将 \"Waterproof\" 前置（这是搜索量最高的修饰词），使用所有格 \"Women's\" 更符合英语习惯。",
    },
  };

  return suggestions[product.item_group_id] || {
    title: product.current_title,
    reasoning: '暂无优化建议',
  };
}

export function computeSummary(analyses: TitleAnalysis[]): FeedOptimizerSummary {
  const total = analyses.length;
  const avgScore = total > 0 ? analyses.reduce((s, a) => s + a.score, 0) / total : 0;
  const needAttention = analyses.filter(a => a.score < 60).length;

  const issueCounts: Record<string, number> = {};
  for (const a of analyses) {
    for (const issue of a.issues) {
      issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
    }
  }
  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  const avgCtrLift = avgScore < 50 ? '+20-35%' : avgScore < 70 ? '+10-20%' : '+5-10%';

  return {
    total_products: total,
    avg_title_score: Math.round(avgScore),
    products_need_attention: needAttention,
    estimated_total_ctr_lift: avgCtrLift,
    top_issues: topIssues,
  };
}

// Future AI integration point:
// async function generateOptimizedTitle(product: FeedProduct): Promise<{ title: string; reasoning: string }> {
//   const response = await fetch('/api/ai/optimize-title', {
//     method: 'POST',
//     body: JSON.stringify({
//       current_title: product.current_title,
//       product_type: product.product_type,
//       brand: product.brand,
//       top_search_terms: product.top_search_terms,
//       ctr: product.ctr,
//       price: product.price,
//     })
//   });
//   return response.json();
// }

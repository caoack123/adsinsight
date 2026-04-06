export const MODULE_REGISTRY = {
  'auction-insights': {
    label: '竞价洞察',
    description: '分析 Auction Insights，识别竞争对手威胁',
    icon: 'BarChart2',
    path: '/auction-insights',
    enabled: false, // may bring back later
  },
  'feed-optimizer': {
    label: 'Feed 智能优化',
    description: 'AI 优化 Product Title，提升 Shopping 点击率',
    icon: 'ShoppingBag',
    path: '/feed-optimizer',
    enabled: true, // BUILD THIS
  },
  'video-abcd': {
    label: '视频素材分析',
    description: 'ABCD 框架评分 + 竞品素材对比',
    icon: 'Video',
    path: '/video-abcd',
    enabled: true,
  },
  'pmax-xray': {
    label: 'PMax 透视',
    description: '拆解 PMax 黑盒，看清预算去向',
    icon: 'Eye',
    path: '/pmax-xray',
    enabled: false, // Phase 2
  },
  'bidding-audit': {
    label: '出价审计',
    description: '审查 Smart Bidding 是否在浪费预算',
    icon: 'Scale',
    path: '/bidding-audit',
    enabled: false, // Phase 3
  },
  'change-tracker': {
    label: '变更追踪',
    description: '自动追踪账号变更及其对效果的影响',
    icon: 'History',
    path: '/change-tracker',
    enabled: true,
  },
} as const;

export type ModuleKey = keyof typeof MODULE_REGISTRY;

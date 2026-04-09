export type Lang = 'zh' | 'en';

export const translations = {
  zh: {
    // Nav
    nav_overview: '总览',
    nav_feed: 'Feed 智能优化',
    nav_search_terms: '搜索词分析',
    nav_change_tracker: '变更追踪',
    nav_video: '视频素材分析',
    nav_accounts: '账户管理',
    nav_setup: '安装脚本',
    nav_settings: '设置',
    // Common
    loading: '加载中...',
    save: '保存',
    cancel: '取消',
    export_csv: '导出 CSV',
    search: '搜索...',
    // Feed
    feed_title: 'Feed 智能优化',
    feed_total_products: '产品总数',
    feed_avg_score: '平均标题质量分',
    feed_needs_attention: '需要优化的产品',
    feed_ctr_lift: '预计整体 CTR 提升',
    feed_product_list: '产品列表',
    feed_search_placeholder: '搜索产品...',
    feed_group_by_product: '按产品聚合',
    feed_show_by_sku: '按 SKU 展示',
    feed_col_name: '产品名称',
    feed_col_sku_count: 'SKU 数',
    feed_col_price: '价格',
    feed_col_score: '质量分',
    feed_col_min_score: '最低质量分',
    feed_col_ctr: 'CTR',
    feed_col_cpc: 'CPC',
    feed_col_cvr: 'CVR',
    feed_col_cost: '花费',
    feed_col_roas: 'ROAS',
    feed_col_issues: '问题数',
    feed_data_period: '数据周期：最近 30 天 · 同步于',
    feed_no_data: '该账户暂无 Feed 数据，请先运行 Google Ads 脚本同步数据。',
    feed_common_issues: '常见问题分布',
    // Overview
    overview_title: '账户概览',
    overview_spend: '总消耗',
    overview_roas: 'ROAS',
    overview_conversions: '转化数',
    overview_cpc: 'CPC',
    // Change tracker
    change_tracker_title: '变更追踪',
    change_total: '总变更次数',
    change_positive: '正向变更',
    change_negative: '负向变更',
    change_saved: '节省花费',
    // Video
    video_title: '视频素材分析',
    video_not_found: '找不到该视频。',
    // Search terms
    search_terms_title: '搜索词 N-Gram 分析',
    // Accounts
    accounts_title: '账户管理',
    // Setup
    setup_title: '安装脚本',
    // Settings
    settings_title: '设置',
    // Demo
    demo_label: '演示账户',
  },
  en: {
    // Nav
    nav_overview: 'Overview',
    nav_feed: 'Feed Optimizer',
    nav_search_terms: 'Search Terms',
    nav_change_tracker: 'Change Tracker',
    nav_video: 'Video Analysis',
    nav_accounts: 'Accounts',
    nav_setup: 'Install Script',
    nav_settings: 'Settings',
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    export_csv: 'Export CSV',
    search: 'Search...',
    // Feed
    feed_title: 'Feed Optimizer',
    feed_total_products: 'Total Products',
    feed_avg_score: 'Avg Title Score',
    feed_needs_attention: 'Needs Attention',
    feed_ctr_lift: 'Est. CTR Lift',
    feed_product_list: 'Product List',
    feed_search_placeholder: 'Search products...',
    feed_group_by_product: 'Group by Product',
    feed_show_by_sku: 'Show by SKU',
    feed_col_name: 'Product Name',
    feed_col_sku_count: 'SKUs',
    feed_col_price: 'Price',
    feed_col_score: 'Score',
    feed_col_min_score: 'Min Score',
    feed_col_ctr: 'CTR',
    feed_col_cpc: 'CPC',
    feed_col_cvr: 'CVR',
    feed_col_cost: 'Spend',
    feed_col_roas: 'ROAS',
    feed_col_issues: 'Issues',
    feed_data_period: 'Last 30 days · Synced',
    feed_no_data: 'No feed data for this account. Please run the Google Ads script first.',
    feed_common_issues: 'Common Issues',
    // Overview
    overview_title: 'Account Overview',
    overview_spend: 'Total Spend',
    overview_roas: 'ROAS',
    overview_conversions: 'Conversions',
    overview_cpc: 'CPC',
    // Change tracker
    change_tracker_title: 'Change Tracker',
    change_total: 'Total Changes',
    change_positive: 'Positive Changes',
    change_negative: 'Negative Changes',
    change_saved: 'Cost Saved',
    // Video
    video_title: 'Video Analysis',
    video_not_found: 'Video not found.',
    // Search terms
    search_terms_title: 'Search Terms N-Gram Analysis',
    // Accounts
    accounts_title: 'Account Management',
    // Setup
    setup_title: 'Install Script',
    // Settings
    settings_title: 'Settings',
    // Demo
    demo_label: 'Demo Account',
  },
} as const;

export type TranslationKey = keyof typeof translations.zh;

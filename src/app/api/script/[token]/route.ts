import type { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adsinsight.vercel.app';
  const script = generateScript(token, appUrl);

  return new Response(script, {
    headers: { 'Content-Type': 'application/javascript' },
  });
}

function generateScript(token: string, appUrl: string): string {
  return `// ============================================================
// AdInsight AI — Google Ads Export Script
// Generated token: ${token}
// Ingest URL: ${appUrl}/api/ingest
// ============================================================

var CONFIG = {
  API_ENDPOINT: '${appUrl}/api/ingest',
  TOKEN: '${token}',
  DATE_RANGE: 'LAST_30_DAYS',
  CHANGE_DAYS: 28,      // days of change history to export (Google Ads API max is 30)
  MAX_PRODUCTS: 500,    // cap to avoid timeout
  MAX_CHANGES: 200
};

// ── Entry point ───────────────────────────────────────────────────────────────
function main() {
  Logger.log('=== AdInsight AI export started ===');
  exportFeedProducts();
  exportSearchTerms();
  exportChangeHistory();
  exportVideoAds();
  exportDailyPerformance();
  Logger.log('=== AdInsight AI export finished ===');
}

// ── 1. Feed / Shopping products ───────────────────────────────────────────────

function exportFeedProducts() {
  // Price is not available via GAQL (shopping_product resource doesn't expose price micros).
  // We default to 0 here; price can be enriched from a separate GMC data source if needed.
  var prices = {};

  // ── Collect metrics across 6 date ranges ────────────────────────────────────
  var DATE_RANGES = [
    { key: '7d',   days: 7   },
    { key: '14d',  days: 14  },
    { key: '30d',  days: 30  },
    { key: '90d',  days: 90  },
    { key: '180d', days: 180 },
    { key: '365d', days: 365 },
  ];

  // metricsMap[variantId] = { meta: {...}, ranges: { '7d': {...}, '30d': {...} } }
  var metricsMap = {};

  for (var ri = 0; ri < DATE_RANGES.length; ri++) {
    var dr = DATE_RANGES[ri];
    var startDate = dateOnly(dr.days);
    var endDate   = dateOnly(0);
    var query =
      'SELECT ' +
      '  segments.product_item_id, ' +
      '  segments.product_title, ' +
      '  segments.product_brand, ' +
      '  segments.product_type_l1, ' +
      '  metrics.impressions, ' +
      '  metrics.clicks, ' +
      '  metrics.cost_micros, ' +
      '  metrics.conversions, ' +
      '  metrics.conversions_value ' +
      'FROM shopping_performance_view ' +
      'WHERE segments.date BETWEEN "' + startDate + '" AND "' + endDate + '" ' +
      '  AND metrics.impressions > 0 ' +
      'ORDER BY metrics.impressions DESC ' +
      'LIMIT ' + CONFIG.MAX_PRODUCTS;
    try {
      var report = AdsApp.search(query);
      while (report.hasNext()) {
        var row = report.next();
        if (!row.segments || !row.segments.productItemId) continue;
        var variantId = row.segments.productItemId || '';
        var cost = (row.metrics.costMicros || 0) / 1000000;
        var impressions = parseInt(row.metrics.impressions) || 0;
        var clicks = parseInt(row.metrics.clicks) || 0;
        var conversions = parseFloat(row.metrics.conversions) || 0;
        var convValue = parseFloat(row.metrics.conversionsValue) || 0;
        if (!metricsMap[variantId]) {
          metricsMap[variantId] = {
            title: row.segments.productTitle || '',
            brand: row.segments.productBrand || '',
            product_type: row.segments.productTypeL1 || '',
            ranges: {}
          };
        }
        metricsMap[variantId].ranges[dr.key] = {
          impressions: impressions,
          clicks: clicks,
          ctr: impressions > 0 ? parseFloat((clicks / impressions).toFixed(6)) : 0,
          cost: parseFloat(cost.toFixed(4)),
          conversions: parseFloat(conversions.toFixed(2)),
          conversions_value: parseFloat(convValue.toFixed(2))
        };
      }
      Logger.log('Feed range ' + dr.key + ': ' + Object.keys(metricsMap).length + ' products');
    } catch (e) {
      Logger.log('Feed range ' + dr.key + ' error: ' + e.message);
    }
  }

  // ── Build final records — use 30d as primary metrics ────────────────────────
  var records = [];
  var empty = { impressions: 0, clicks: 0, ctr: 0, cost: 0, conversions: 0, conversions_value: 0 };
  var itemIds = Object.keys(metricsMap);
  for (var ii = 0; ii < itemIds.length; ii++) {
    var vid = itemIds[ii];
    var data = metricsMap[vid];
    var m30 = data.ranges['30d'] || empty;
    var variantId2 = vid;  // keep var name distinct
    records.push({
      item_id: variantId2,
      item_group_id: extractGroupId(variantId2),
      current_title: data.title,
      brand: data.brand,
      product_type: data.product_type,
      price: prices[variantId2] || 0,
      impressions: m30.impressions,
      clicks: m30.clicks,
      ctr: m30.ctr,
      cost: m30.cost,
      conversions: m30.conversions,
      conversions_value: m30.conversions_value,
      metrics_by_range: data.ranges,
      top_search_terms: []
    });
  }

  Logger.log('Feed: ' + records.length + ' products with ' + DATE_RANGES.length + ' date ranges');
  // Send in batches
  var BATCH = 200;
  for (var bi = 0; bi < records.length; bi += BATCH) {
    postData('feed', records.slice(bi, bi + BATCH));
  }
}

// ── 2. Search Terms (last 90 days) ───────────────────────────────────────────
function exportSearchTerms() {
  var startDate = dateOnly(90);
  var endDate   = dateOnly(0);

  var query =
    'SELECT ' +
    '  search_term_view.search_term, ' +
    '  search_term_view.status, ' +
    '  campaign.name, ' +
    '  ad_group.name, ' +
    '  metrics.impressions, ' +
    '  metrics.clicks, ' +
    '  metrics.cost_micros, ' +
    '  metrics.conversions, ' +
    '  metrics.conversions_value ' +
    'FROM search_term_view ' +
    'WHERE segments.date BETWEEN "' + startDate + '" AND "' + endDate + '" ' +
    '  AND metrics.clicks > 0 ' +
    'ORDER BY metrics.clicks DESC ' +
    'LIMIT 3000';

  var records = [];
  try {
    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();
      var cost = (parseInt(row.metrics.costMicros) || 0) / 1000000;
      var clicks = parseInt(row.metrics.clicks) || 0;
      var impr = parseInt(row.metrics.impressions) || 0;
      var conversions = parseFloat(row.metrics.conversions) || 0;
      var convValue = parseFloat(row.metrics.conversionsValue) || 0;
      records.push({
        search_term: (row.searchTermView && row.searchTermView.searchTerm) ? row.searchTermView.searchTerm : '',
        status: (row.searchTermView && row.searchTermView.status) ? row.searchTermView.status : '',
        campaign: (row.campaign && row.campaign.name) ? row.campaign.name : '',
        ad_group: (row.adGroup && row.adGroup.name) ? row.adGroup.name : '',
        impressions: impr,
        clicks: clicks,
        cost: parseFloat(cost.toFixed(4)),
        conversions: parseFloat(conversions.toFixed(2)),
        conversions_value: parseFloat(convValue.toFixed(2)),
        ctr: impr > 0 ? parseFloat((clicks / impr).toFixed(6)) : 0,
        cvr: clicks > 0 ? parseFloat((conversions / clicks).toFixed(6)) : 0
      });
    }
    Logger.log('Search terms: ' + records.length + ' terms');
    // Send in batches to avoid payload limits
    var BATCH = 500;
    for (var i = 0; i < records.length; i += BATCH) {
      postData('search_terms', records.slice(i, i + BATCH));
    }
  } catch (e) {
    Logger.log('Search terms export error: ' + e.message);
  }
}

// ── 3. Account Change History (with before/after performance) ─────────────────
function exportChangeHistory() {
  var query =
    'SELECT ' +
    '  change_event.resource_name, ' +
    '  change_event.change_date_time, ' +
    '  change_event.change_resource_type, ' +
    '  change_event.resource_change_operation, ' +
    '  change_event.changed_fields, ' +
    '  change_event.old_resource, ' +
    '  change_event.new_resource, ' +
    '  change_event.user_email, ' +
    '  campaign.name ' +
    'FROM change_event ' +
    'WHERE change_event.change_date_time >= "' + daysAgo(CONFIG.CHANGE_DAYS) + '" ' +
    '  AND change_event.change_date_time <= "' + dateOnly(0) + ' 23:59:59" ' +
    'ORDER BY change_event.change_date_time DESC ' +
    'LIMIT ' + CONFIG.MAX_CHANGES;

  var records = [];
  try {
    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();
      var evt = row.changeEvent;
      var resourceName = evt.resourceName || '';
      // Use resource_name as a stable change_id
      var changeId = resourceName + '_' + (evt.changeDateTime || '').replace(/[^0-9]/g, '');

      var campName = (row.campaign && row.campaign.name) ? row.campaign.name : '';
      var changedFields = evt.changedFields || '';
      var changedAt = evt.changeDateTime || new Date().toISOString();
      // changeDateTime can be "2026-03-25 13:13:15.949402" (space) or ISO "2026-03-25T13:13:15Z"
      var changedDate = changedAt.split(/[T ]/)[0];
      records.push({
        change_id: changeId,
        change_type: mapChangeType(evt.changeResourceType, evt.resourceChangeOperation),
        resource_type: evt.changeResourceType || '',
        resource_name: buildResourceName(evt.changeResourceType, campName, resourceName),
        campaign: campName,
        ad_group: null,
        changed_by: evt.userEmail || 'Google Ads',
        changed_at: changedAt,
        old_value: extractChangedFields(changedFields, evt.oldResource),
        new_value: extractChangedFields(changedFields, evt.newResource),
        _change_date: changedDate,      // temp field for perf lookup
        _campaign: campName,
        performance_before: null,
        performance_after: null
      });
    }

    // Attach before/after performance snapshots — 3 comparison windows:
    // 'default' (14d before / 7d after) for immediate impact, '60' and '90' (symmetric) for longer-term impact.
    if (records.length > 0) {
      // Use the OLDEST change date as the anchor so we get the widest before/after window
      var changeDate = records[records.length - 1]._change_date || dateOnly(0);
      var yesterday  = dateOnly(1);   // yesterday — today's data is not yet finalized

      var PERF_WINDOWS = [
        { key: 'default', beforeDays: 14, afterDays: 7  },
        { key: '60',      beforeDays: 60, afterDays: 60 },
        { key: '90',      beforeDays: 90, afterDays: 90 }
      ];
      // Zero-metric template for campaigns paused/inactive after the change
      var emptyMetrics = { impressions: 0, clicks: 0, ctr: 0, cost: 0, conversions: 0, conv_value: 0 };

      var windowData = {};   // windowData[key] = { beforeStart, beforeEnd, afterStart, afterEnd, beforeMetrics, afterMetrics }
      for (var wi = 0; wi < PERF_WINDOWS.length; wi++) {
        var w = PERF_WINDOWS[wi];
        var beforeStart = daysBeforeDate(changeDate, w.beforeDays);
        var beforeEnd   = daysBeforeDate(changeDate, 1);
        var afterStart  = changeDate;
        // Cap afterEnd to yesterday; if change happened today, skip after metrics entirely
        var afterEnd = daysAfterDate(changeDate, w.afterDays);
        if (afterEnd > yesterday) afterEnd = yesterday;

        var beforeMetrics = getCampaignMetrics(beforeStart, beforeEnd);
        var afterMetrics  = (afterStart <= yesterday)
          ? getCampaignMetrics(afterStart, afterEnd)
          : {};   // change is too recent — no finalized after data yet
        Logger.log('Campaign metrics [' + w.key + '] before: ' + Object.keys(beforeMetrics).length + ' campaigns (' + beforeStart + ' to ' + beforeEnd + ')');
        Logger.log('Campaign metrics [' + w.key + '] after:  ' + Object.keys(afterMetrics).length + ' campaigns (' + afterStart + ' to ' + afterEnd + ')');

        windowData[w.key] = {
          beforeStart: beforeStart, beforeEnd: beforeEnd,
          afterStart: afterStart, afterEnd: afterEnd,
          beforeMetrics: beforeMetrics, afterMetrics: afterMetrics,
          afterWindowDays: afterStart <= yesterday ? w.afterDays : 0
        };
      }

      for (var k = 0; k < records.length; k++) {
        var camp = records[k]._campaign;
        delete records[k]._change_date;
        delete records[k]._campaign;
        // Require before metrics (default window) as the signal that this campaign has history at all
        if (camp && windowData['default'].beforeMetrics[camp]) {
          var beforeMap = {};
          var afterMap = {};
          for (var wj = 0; wj < PERF_WINDOWS.length; wj++) {
            var wk = PERF_WINDOWS[wj].key;
            var wd = windowData[wk];
            var bm = wd.beforeMetrics[camp] || emptyMetrics;
            var am = wd.afterMetrics[camp] || emptyMetrics;
            beforeMap[wk] = {
              window_days: PERF_WINDOWS[wj].beforeDays,
              date_start: wd.beforeStart,
              date_end: wd.beforeEnd,
              impressions: bm.impressions,
              clicks: bm.clicks,
              ctr: bm.ctr,
              cost: bm.cost,
              conversions: bm.conversions,
              conversions_value: bm.conv_value,
              roas: bm.cost > 0 ? bm.conv_value / bm.cost : 0
            };
            afterMap[wk] = {
              window_days: wd.afterWindowDays,
              date_start: wd.afterStart,
              date_end: wd.afterEnd,
              impressions: am.impressions,
              clicks: am.clicks,
              ctr: am.ctr,
              cost: am.cost,
              conversions: am.conversions,
              conversions_value: am.conv_value,
              roas: am.cost > 0 ? am.conv_value / am.cost : 0
            };
          }
          records[k].performance_before = beforeMap;
          records[k].performance_after = afterMap;
        }
      }
    }

    Logger.log('Changes: ' + records.length + ' events');
    postData('changes', records);
  } catch (e) {
    Logger.log('Change history export error: ' + e.message);
  }
}

// ── 4. Video Ads ──────────────────────────────────────────────────────────────
// Note: metrics.video_views is not selectable FROM video — it requires FROM ad_group_ad.
// ad_group_ad.ad.video_ad.video.asset gives an Asset resource name, which is resolved to
// a real YouTube video ID via a separate FROM asset lookup.
function exportVideoAds() {
  var DATE_RANGES = [
    { key: '7d',  days: 7  },
    { key: '14d', days: 14 },
    { key: '30d', days: 30 },
    { key: '60d', days: 60 },
    { key: '90d', days: 90 }
  ];

  try {
    // ── 1. Asset resource name → YouTube video id/title lookup ──────────────────
    var assetMap = {};
    try {
      var assetReport = AdsApp.search(
        'SELECT asset.resource_name, asset.youtube_video_asset.youtube_video_id, asset.youtube_video_asset.youtube_video_title ' +
        'FROM asset ' +
        'WHERE asset.type = "YOUTUBE_VIDEO"'
      );
      while (assetReport.hasNext()) {
        var arow = assetReport.next();
        var resName = (arow.asset && arow.asset.resourceName) ? arow.asset.resourceName : '';
        var yid = (arow.asset && arow.asset.youtubeVideoAsset && arow.asset.youtubeVideoAsset.youtubeVideoId) ? arow.asset.youtubeVideoAsset.youtubeVideoId : '';
        var title = (arow.asset && arow.asset.youtubeVideoAsset && arow.asset.youtubeVideoAsset.youtubeVideoTitle) ? arow.asset.youtubeVideoAsset.youtubeVideoTitle : '';
        if (resName && yid) assetMap[resName] = { youtubeId: yid, title: title };
      }
      Logger.log('Video assets: ' + Object.keys(assetMap).length + ' YouTube videos found');
    } catch (e) {
      Logger.log('Video asset lookup error: ' + e.message);
    }

    // ── 2. YouTube video id → duration lookup (best-effort, non-fatal) ──────────
    var durationMap = {};
    try {
      var vidReport = AdsApp.search('SELECT video.id, video.duration_millis FROM video');
      while (vidReport.hasNext()) {
        var vrow = vidReport.next();
        var vid = (vrow.video && vrow.video.id) ? String(vrow.video.id) : '';
        if (vid) durationMap[vid] = vrow.video.durationMillis ? Math.round(vrow.video.durationMillis / 1000) : null;
      }
    } catch (e) {
      Logger.log('Video duration lookup error: ' + e.message);
    }

    // ── 3. Performance across 5 date ranges from ad_group_ad ────────────────────
    // videoMap[youtubeId] = { ad_name, campaign, ad_group, ranges: { '7d': {...}, ... } }
    var videoMap = {};
    for (var ri = 0; ri < DATE_RANGES.length; ri++) {
      var dr = DATE_RANGES[ri];
      var startDate = dateOnly(dr.days);
      var endDate   = dateOnly(0);
      var query =
        'SELECT ' +
        '  ad_group_ad.ad.id, ' +
        '  ad_group_ad.ad.name, ' +
        '  ad_group_ad.ad.type, ' +
        '  ad_group_ad.ad.video_ad.video.asset, ' +
        '  campaign.name, ' +
        '  ad_group.name, ' +
        '  metrics.impressions, ' +
        '  metrics.clicks, ' +
        '  metrics.cost_micros, ' +
        '  metrics.conversions, ' +
        '  metrics.conversions_value, ' +
        '  metrics.video_views ' +
        'FROM ad_group_ad ' +
        'WHERE segments.date BETWEEN "' + startDate + '" AND "' + endDate + '" ' +
        '  AND metrics.impressions > 0 ' +
        'ORDER BY metrics.impressions DESC ' +
        'LIMIT 200';
      try {
        // metrics.video_views is not exposed through AdsApp.search() (confirmed: fails
        // with UNRECOGNIZED_FIELD regardless of FROM resource) — use the older report API instead.
        var rows = AdsApp.report(query, { apiVersion: 'v17' }).rows();
        while (rows.hasNext()) {
          var row = rows.next();
          var assetRes = row['ad_group_ad.ad.video_ad.video.asset'] || '';
          if (!assetRes) continue;
          var assetInfo = assetMap[assetRes];
          var youtubeId = assetInfo ? assetInfo.youtubeId : '';
          if (!youtubeId) continue;

          var impressions = parseInt(row['metrics.impressions']) || 0;
          var clicks = parseInt(row['metrics.clicks']) || 0;
          var cost = (parseInt(row['metrics.cost_micros']) || 0) / 1000000;
          var conversions = parseFloat(row['metrics.conversions']) || 0;
          var convValue = parseFloat(row['metrics.conversions_value']) || 0;
          var videoViews = parseInt(row['metrics.video_views']) || 0;
          var campName = row['campaign.name'] || '';
          var adGroupName = row['ad_group.name'] || '';
          var adName = row['ad_group_ad.ad.name'] || ((assetInfo && assetInfo.title) || youtubeId);
          var adType = row['ad_group_ad.ad.type'] || '';

          if (!videoMap[youtubeId]) {
            videoMap[youtubeId] = { video_id: youtubeId, ad_name: adName, format: adType, campaign: campName, ad_group: adGroupName, ranges: {} };
          }
          if (!videoMap[youtubeId].ranges[dr.key]) {
            videoMap[youtubeId].ranges[dr.key] = { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversions_value: 0, video_views: 0 };
          }
          var rm = videoMap[youtubeId].ranges[dr.key];
          rm.impressions += impressions;
          rm.clicks += clicks;
          rm.cost = parseFloat((rm.cost + cost).toFixed(4));
          rm.conversions = parseFloat((rm.conversions + conversions).toFixed(2));
          rm.conversions_value = parseFloat((rm.conversions_value + convValue).toFixed(2));
          rm.video_views += videoViews;
        }
        Logger.log('Video ads range ' + dr.key + ': ' + Object.keys(videoMap).length + ' videos so far');
      } catch (e) {
        Logger.log('Video ads range ' + dr.key + ' error: ' + e.message);
      }
    }

    // ── 4. Build final records — 30d as primary metrics, full breakdown in metrics_by_range ──
    var records = [];
    var ytIds = Object.keys(videoMap);
    for (var vi = 0; vi < ytIds.length; vi++) {
      var yid2 = ytIds[vi];
      var v = videoMap[yid2];
      var metricsByRange = {};
      var rangeKeys = Object.keys(v.ranges);
      for (var rj = 0; rj < rangeKeys.length; rj++) {
        var rk = rangeKeys[rj];
        var r = v.ranges[rk];
        metricsByRange[rk] = {
          impressions: r.impressions,
          clicks: r.clicks,
          ctr: r.impressions > 0 ? parseFloat((r.clicks / r.impressions).toFixed(6)) : 0,
          cost: r.cost,
          conversions: r.conversions,
          conversions_value: r.conversions_value,
          views: r.video_views,
          view_rate: r.impressions > 0 ? parseFloat((r.video_views / r.impressions).toFixed(6)) : 0
        };
      }
      var empty = { impressions: 0, clicks: 0, ctr: 0, cost: 0, conversions: 0, conversions_value: 0, views: 0, view_rate: 0 };
      var primary = metricsByRange['30d'] || empty;

      records.push({
        video_id: yid2,
        ad_name: v.ad_name,
        youtube_url: 'https://www.youtube.com/watch?v=' + yid2,
        format: v.format,
        duration_seconds: (durationMap[yid2] !== undefined) ? durationMap[yid2] : null,
        performance: {
          campaign: v.campaign,
          ad_group: v.ad_group,
          impressions: primary.impressions,
          clicks: primary.clicks,
          ctr: primary.ctr,
          cost: primary.cost,
          conversions: primary.conversions,
          conversions_value: primary.conversions_value,
          views: primary.views,
          view_rate: primary.view_rate,
          metrics_by_range: metricsByRange
        }
      });
    }

    Logger.log('Video ads: ' + records.length + ' videos');
    postData('videos', records);
  } catch (e) {
    Logger.log('Video ads export error: ' + e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Extract parent product group ID from a variant item ID.
// Shopify IDs look like "shopify_US_8823064191278_47476012286254"
// → group ID = "shopify_US_8823064191278" (drop last segment)
// WooCommerce: "woocommerce_12345_67890" → "woocommerce_12345"
// If format is unknown, return the ID as-is (single variant = its own group)
function extractGroupId(itemId) {
  if (!itemId) return itemId;
  var parts = itemId.split('_');
  // Shopify format: platform_locale_productId_variantId (≥4 parts)
  if (parts.length >= 4 && (parts[0] === 'shopify' || parts[0] === 'woocommerce')) {
    return parts.slice(0, parts.length - 1).join('_');
  }
  return itemId;
}

function mapChangeType(resourceType, operation) {
  var op = (operation || '').toUpperCase();
  var rt = (resourceType || '').toUpperCase();
  if (op === 'REMOVE') return rt + '_REMOVED';
  if (rt === 'CAMPAIGN' && op === 'UPDATE') return 'CAMPAIGN_UPDATED';
  if (rt === 'AD_GROUP' && op === 'UPDATE') return 'AD_GROUP_UPDATED';
  if (rt === 'AD' && op === 'UPDATE') return 'AD_UPDATED';
  if (rt === 'BIDDING_STRATEGY') return 'BIDDING_STRATEGY_CHANGED';
  if (rt === 'CAMPAIGN_BUDGET') return 'BUDGET_CHANGED';
  if (rt === 'AD_GROUP_CRITERION' || rt === 'CAMPAIGN_CRITERION') return 'BID_CHANGED';
  return (rt + '_' + op) || 'UNKNOWN';
}

function buildResourceName(resourceType, campaignName, resourcePath) {
  var rt = (resourceType || '').toUpperCase();
  // Use campaign name as readable label for campaign-level changes
  if (rt === 'CAMPAIGN' || rt === 'CAMPAIGN_BUDGET') return campaignName || extractLastId(resourcePath);
  // For ad group / ad / criterion changes, prefix with campaign name if available
  if (campaignName) return campaignName;
  return extractLastId(resourcePath);
}

function extractLastId(resourcePath) {
  if (!resourcePath) return '';
  var parts = resourcePath.split('/');
  return parts[parts.length - 1] || resourcePath;
}

function extractChangedFields(changedFields, resource) {
  if (!resource || !changedFields) return null;
  try {
    var fields = changedFields.split(',');
    var result = {};
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i].trim();
      // Get the last segment of the field path and convert to camelCase
      var key = field.split('.').pop() || '';
      var camelKey = key.replace(/_([a-z])/g, function(m, c) { return c.toUpperCase(); });
      if (resource[camelKey] !== undefined) {
        result[camelKey] = resource[camelKey];
      }
    }
    var str = JSON.stringify(result);
    return str && str !== '{}' ? str.substring(0, 500) : safeStringify(resource);
  } catch(e) {
    return safeStringify(resource);
  }
}

function safeStringify(obj) {
  if (!obj) return null;
  try { return JSON.stringify(obj).substring(0, 500); } catch(e) { return null; }
}

function daysAgo(n) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0] + ' 00:00:00';
}

function daysBeforeDate(dateStr, n) {
  var d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysAfterDate(dateStr, n) {
  var d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  var yesterday = dateOnly(1);   // cap to yesterday — today is not finalized
  var result = d.toISOString().split('T')[0];
  return result < yesterday ? result : yesterday;
}

// Returns map of campaign_name → aggregated metrics
function getCampaignMetrics(startDate, endDate) {
  var query =
    'SELECT campaign.name, ' +
    '  metrics.impressions, ' +
    '  metrics.clicks, ' +
    '  metrics.cost_micros, ' +
    '  metrics.conversions, ' +
    '  metrics.conversions_value ' +
    'FROM campaign ' +
    'WHERE segments.date BETWEEN "' + startDate + '" AND "' + endDate + '"';

  var result = {};
  try {
    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();
      var name = (row.campaign && row.campaign.name) ? row.campaign.name : '';
      if (!name) continue;
      if (!result[name]) {
        result[name] = { impressions: 0, clicks: 0, cost: 0, conversions: 0, conv_value: 0 };
      }
      result[name].impressions += parseInt(row.metrics.impressions) || 0;
      result[name].clicks     += parseInt(row.metrics.clicks) || 0;
      result[name].cost       += (parseInt(row.metrics.costMicros) || 0) / 1000000;
      result[name].conversions += parseFloat(row.metrics.conversions) || 0;
      result[name].conv_value += parseFloat(row.metrics.conversionsValue) || 0;
    }
    // Derive CTR and ROAS
    Object.keys(result).forEach(function(n) {
      var m = result[n];
      m.ctr  = m.impressions > 0 ? m.clicks / m.impressions : 0;
      m.roas = m.cost > 0 ? m.conv_value / m.cost : 0;
    });
  } catch (e) {
    Logger.log('getCampaignMetrics error: ' + e.message);
  }
  return result;
}

// ── 3. Daily Performance (last 365 days, batched) ────────────────────────────
function exportDailyPerformance() {
  // GAQL BETWEEN needs plain YYYY-MM-DD (not the datetime format daysAgo() returns)
  var startDate = dateOnly(365);
  var endDate   = dateOnly(0);

  var query =
    'SELECT ' +
    '  segments.date, ' +
    '  campaign.name, ' +
    '  metrics.impressions, ' +
    '  metrics.clicks, ' +
    '  metrics.cost_micros, ' +
    '  metrics.conversions, ' +
    '  metrics.conversions_value ' +
    'FROM campaign ' +
    'WHERE segments.date BETWEEN "' + startDate + '" AND "' + endDate + '" ' +
    '  AND metrics.cost_micros > 0 ' +
    'ORDER BY segments.date ASC';

  var records = [];
  try {
    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();
      var cost = (parseInt(row.metrics.costMicros) || 0) / 1000000;
      var clicks = parseInt(row.metrics.clicks) || 0;
      records.push({
        date: row.segments.date,
        campaign_name: (row.campaign && row.campaign.name) ? row.campaign.name : '',
        impressions: parseInt(row.metrics.impressions) || 0,
        clicks: clicks,
        cost: parseFloat(cost.toFixed(4)),
        conversions: parseFloat(row.metrics.conversions) || 0,
        conversions_value: parseFloat((parseFloat(row.metrics.conversionsValue) || 0).toFixed(2)),
        ctr: clicks > 0 ? parseFloat(((parseInt(row.metrics.clicks) || 0) / (parseInt(row.metrics.impressions) || 1)).toFixed(6)) : 0,
        average_cpc: clicks > 0 ? parseFloat((cost / clicks).toFixed(4)) : 0
      });
    }
    Logger.log('Daily performance: ' + records.length + ' rows, sending in batches...');

    // Send in batches of 200 to avoid payload size / timeout issues
    var BATCH = 200;
    for (var i = 0; i < records.length; i += BATCH) {
      var batch = records.slice(i, i + BATCH);
      Logger.log('Performance batch ' + (Math.floor(i / BATCH) + 1) + ': ' + batch.length + ' rows');
      postData('performance', batch);
    }
  } catch (e) {
    Logger.log('Daily performance export error: ' + e.message);
  }
}

// Returns plain YYYY-MM-DD, n days ago
function dateOnly(n) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ── Auto-execute when eval'd by loader script ─────────────────────────────────
main();

// ── POST to /api/ingest ───────────────────────────────────────────────────────
function postData(dataType, records) {
  if (records.length === 0) {
    Logger.log(dataType + ': no records to send');
    return;
  }
  var payload = JSON.stringify({ data_type: dataType, records: records });
  try {
    var response = UrlFetchApp.fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + CONFIG.TOKEN },
      payload: payload,
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    var body = response.getContentText();
    Logger.log(dataType + ': HTTP ' + code + ' — ' + body);
  } catch (e) {
    Logger.log(dataType + ' POST error: ' + e.message);
  }
}
`;
}

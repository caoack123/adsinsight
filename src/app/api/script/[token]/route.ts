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
  CHANGE_DAYS: 14,      // days of change history to export
  MAX_PRODUCTS: 500,    // cap to avoid timeout
  MAX_CHANGES: 200
};

// ── Entry point ───────────────────────────────────────────────────────────────
function main() {
  Logger.log('=== AdInsight AI export started ===');
  exportFeedProducts();
  exportChangeHistory();
  exportDailyPerformance();
  Logger.log('=== AdInsight AI export finished ===');
}

// ── 1. Feed / Shopping products ───────────────────────────────────────────────
function exportFeedProducts() {
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
    '  metrics.conversions_value, ' +
    '  metrics.ctr ' +
    'FROM shopping_performance_view ' +
    'WHERE segments.date DURING ' + CONFIG.DATE_RANGE + ' ' +
    '  AND metrics.impressions > 0 ' +
    'ORDER BY metrics.impressions DESC ' +
    'LIMIT ' + CONFIG.MAX_PRODUCTS;

  var records = [];
  try {
    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();
      // Guard: some rows (e.g. PMax) may return null segments
      if (!row.segments || !row.segments.productItemId) continue;
      var cost = (row.metrics.costMicros || 0) / 1000000;
      var impressions = parseInt(row.metrics.impressions) || 0;
      var clicks = parseInt(row.metrics.clicks) || 0;
      var conversions = parseFloat(row.metrics.conversions) || 0;
      var convValue = parseFloat(row.metrics.conversionsValue) || 0;

      records.push({
        item_group_id: row.segments.productItemId || '',
        item_id: row.segments.productItemId || '',
        current_title: row.segments.productTitle || '',
        brand: row.segments.productBrand || '',
        product_type: row.segments.productTypeL1 || '',
        impressions: impressions,
        clicks: clicks,
        ctr: impressions > 0 ? clicks / impressions : 0,
        cost: parseFloat(cost.toFixed(4)),
        conversions: parseFloat(conversions.toFixed(2)),
        conversions_value: parseFloat(convValue.toFixed(2)),
        top_search_terms: []
      });
    }
    Logger.log('Feed: ' + records.length + ' products');
    postData('feed', records);
  } catch (e) {
    Logger.log('Feed export error: ' + e.message);
  }
}

// ── 2. Account Change History (with before/after performance) ─────────────────
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

    // Attach before/after performance snapshots
    if (records.length > 0) {
      // Use the OLDEST change date as the anchor so we get the widest before/after window
      var changeDate = records[records.length - 1]._change_date || dateOnly(0);
      var yesterday  = dateOnly(1);   // yesterday — today's data is not yet finalized

      var beforeStart = daysBeforeDate(changeDate, 14);
      var beforeEnd   = daysBeforeDate(changeDate, 1);
      var afterStart  = changeDate;
      // Cap afterEnd to yesterday; if change happened today, skip after metrics entirely
      var afterEnd    = daysAfterDate(changeDate, 7);
      if (afterEnd > yesterday) afterEnd = yesterday;

      var beforeMetrics = getCampaignMetrics(beforeStart, beforeEnd);
      var afterMetrics  = (afterStart <= yesterday)
        ? getCampaignMetrics(afterStart, afterEnd)
        : {};   // change is too recent — no finalized after data yet
      Logger.log('Campaign metrics before: ' + Object.keys(beforeMetrics).length + ' campaigns ('+beforeStart+' to '+beforeEnd+')');
      Logger.log('Campaign metrics after:  ' + Object.keys(afterMetrics).length + ' campaigns ('+afterStart+' to '+afterEnd+')');

      // Zero-metric template for campaigns paused/inactive after the change
      var emptyMetrics = { impressions: 0, clicks: 0, ctr: 0, cost: 0, conversions: 0, conv_value: 0 };
      for (var k = 0; k < records.length; k++) {
        var camp = records[k]._campaign;
        delete records[k]._change_date;
        delete records[k]._campaign;
        // Require before metrics; after metrics default to 0 if campaign had no activity
        if (camp && beforeMetrics[camp]) {
          var bm = beforeMetrics[camp];
          var am = afterMetrics[camp] || emptyMetrics;
          records[k].performance_before = {
            window_days: 14,
            date_start: beforeStart,
            date_end: beforeEnd,
            impressions: bm.impressions,
            clicks: bm.clicks,
            ctr: bm.ctr,
            cost: bm.cost,
            conversions: bm.conversions,
            conversions_value: bm.conv_value,
            roas: bm.cost > 0 ? bm.conv_value / bm.cost : 0
          };
          records[k].performance_after = {
            window_days: afterStart <= yesterday ? 7 : 0,
            date_start: afterStart,
            date_end: afterEnd,
            impressions: am.impressions,
            clicks: am.clicks,
            ctr: am.ctr,
            cost: am.cost,
            conversions: am.conversions,
            conversions_value: am.conv_value,
            roas: am.cost > 0 ? am.conv_value / am.cost : 0
          };
        }
      }
    }

    Logger.log('Changes: ' + records.length + ' events');
    postData('changes', records);
  } catch (e) {
    Logger.log('Change history export error: ' + e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

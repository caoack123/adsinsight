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
    '  segments.product_bidding_category_level1, ' +
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
        product_type: row.segments.productTypeL1 || row.segments.productBiddingCategoryLevel1 || '',
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

// ── 2. Account Change History ─────────────────────────────────────────────────
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
    'WHERE change_event.change_date_time >= \\"' + daysAgo(CONFIG.CHANGE_DAYS) + '\\" ' +
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
      var changeId = resourceName + '_' + (evt.changeDateTimeAsString || '').replace(/[^0-9]/g, '');

      records.push({
        change_id: changeId,
        change_type: mapChangeType(evt.changeResourceType, evt.resourceChangeOperation),
        resource_type: evt.changeResourceType || '',
        resource_name: extractResourceName(resourceName),
        campaign: (row.campaign && row.campaign.name) ? row.campaign.name : '',
        ad_group: null,
        changed_by: evt.userEmail || 'Google Ads',
        changed_at: evt.changeDateTimeAsString || new Date().toISOString(),
        old_value: safeStringify(evt.oldResource),
        new_value: safeStringify(evt.newResource),
        performance_before: null,
        performance_after: null
      });
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

function extractResourceName(resourcePath) {
  if (!resourcePath) return '';
  var parts = resourcePath.split('/');
  return parts[parts.length - 1] || resourcePath;
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

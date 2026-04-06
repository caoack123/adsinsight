import type { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // TODO: validate token against database
  // For now, accept any token

  const script = generateScript(token);

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript',
    },
  });
}

function generateScript(clientToken: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `
// AdInsight AI — Auto-generated script
// Do not modify. This script updates automatically.
// Token: ${clientToken}

var CONFIG = {
  API_ENDPOINT: '${appUrl}/api/ingest',
  CLIENT_TOKEN: '${clientToken}',
  DATE_RANGE: 'LAST_30_DAYS',
  MODULES: ['shopping', 'search_terms']  // active modules for this client
};

function main() {
  Logger.log('AdInsight AI script started');

  if (CONFIG.MODULES.indexOf('shopping') >= 0) {
    exportShoppingData();
  }

  Logger.log('AdInsight AI script completed');
}

function exportShoppingData() {
  var query =
    "SELECT " +
    "  segments.product_item_id, " +
    "  segments.product_title, " +
    "  segments.product_brand, " +
    "  segments.product_type_l1, " +
    "  segments.product_type_l2, " +
    "  segments.product_channel, " +
    "  campaign.name, " +
    "  metrics.impressions, " +
    "  metrics.clicks, " +
    "  metrics.cost_micros, " +
    "  metrics.conversions, " +
    "  metrics.conversions_value, " +
    "  metrics.ctr, " +
    "  metrics.average_cpc " +
    "FROM shopping_performance_view " +
    "WHERE segments.date DURING " + CONFIG.DATE_RANGE + " " +
    "  AND metrics.impressions > 0 " +
    "ORDER BY metrics.impressions DESC";

  var products = [];

  try {
    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();
      var costMicros = row.metrics.costMicros || 0;
      var cost = costMicros / 1000000;
      var impressions = row.metrics.impressions || 0;
      var clicks = row.metrics.clicks || 0;
      var conversions = row.metrics.conversions || 0;
      var convValue = row.metrics.conversionsValue || 0;

      products.push({
        item_id: row.segments.productItemId || '',
        title: row.segments.productTitle || '',
        brand: row.segments.productBrand || '',
        product_type: row.segments.productTypeL1 || '',
        channel: row.segments.productChannel || '',
        campaign: row.campaign.name || '',
        impressions: impressions,
        clicks: clicks,
        ctr: impressions > 0 ? clicks / impressions : 0,
        cost: parseFloat(cost.toFixed(2)),
        conversions: parseFloat(conversions.toFixed(2)),
        conversions_value: parseFloat(convValue.toFixed(2)),
        roas: cost > 0 ? parseFloat((convValue / cost).toFixed(2)) : 0
      });
    }

    Logger.log('Found ' + products.length + ' products');

    postData('shopping', products);

  } catch (e) {
    Logger.log('Shopping export error: ' + e.message);
  }
}

function postData(module, data) {
  var payload = {
    client_token: CONFIG.CLIENT_TOKEN,
    module: module,
    date_range: CONFIG.DATE_RANGE,
    exported_at: new Date().toISOString(),
    account_id: AdsApp.currentAccount().getCustomerId(),
    account_name: AdsApp.currentAccount().getName(),
    data: data
  };

  try {
    var response = UrlFetchApp.fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + CONFIG.CLIENT_TOKEN },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log(module + ': HTTP ' + response.getResponseCode());
  } catch (e) {
    Logger.log(module + ' POST error: ' + e.message);
  }
}
`;
}

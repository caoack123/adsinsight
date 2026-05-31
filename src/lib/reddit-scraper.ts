/**
 * Reddit community scraper — uses Reddit OAuth2 API (client_credentials grant).
 *
 * Requires a free Reddit "script" app:
 *   reddit.com/prefs/apps → create app → type: script
 *   → clientId (shown under app name) + clientSecret
 *
 * Token is fetched fresh per request (TTL 1h, no caching needed for one-off calls).
 * Rate limit: 60 req/min authenticated — well within our usage.
 */

export interface RedditPost {
  id:           string;
  title:        string;
  subreddit:    string;
  author:       string;
  score:        number;
  upvote_ratio: number;
  num_comments: number;
  permalink:    string;
  selftext:     string;
  top_comments: { text: string; score: number }[];
}

const UA = 'AdInsightAI/1.0 (market research tool)';

// ── OAuth token ───────────────────────────────────────────────────────────────

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type':  'application/x-www-form-urlencoded',
      'User-Agent':    UA,
    },
    body:   'grant_type=client_credentials',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Reddit OAuth failed (${res.status}): ${text}`);
  }
  const json = await res.json() as { access_token?: string; error?: string };
  if (!json.access_token) throw new Error(`Reddit OAuth: ${json.error ?? 'no token returned'}`);
  return json.access_token;
}

// ── Authenticated fetch ───────────────────────────────────────────────────────

async function redditGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent':    UA,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Reddit ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Search posts ──────────────────────────────────────────────────────────────

async function searchPosts(query: string, limit: number, token: string): Promise<RedditPost[]> {
  const qs = new URLSearchParams({ q: query, sort: 'top', t: 'month', limit: String(limit), type: 'link' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await redditGet(`/search.json?${qs}`, token) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = json?.data?.children ?? [];

  return children.map(c => {
    const d = c.data ?? {};
    return {
      id:           String(d.id ?? ''),
      title:        String(d.title ?? ''),
      subreddit:    String(d.subreddit ?? ''),
      author:       String(d.author ?? ''),
      score:        Number(d.score ?? 0),
      upvote_ratio: Number(d.upvote_ratio ?? 0),
      num_comments: Number(d.num_comments ?? 0),
      permalink:    `https://www.reddit.com${d.permalink ?? ''}`,
      selftext:     String(d.selftext ?? '').slice(0, 400),
      top_comments: [],
    };
  });
}

// ── Fetch comments ────────────────────────────────────────────────────────────

async function fetchComments(postId: string, token: string, limit = 15): Promise<{ text: string; score: number }[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await redditGet(`/comments/${postId}.json?sort=top&limit=${limit}`, token) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = json?.[1]?.data?.children ?? [];
    return children
      .filter(c => c.kind === 't1' && c.data?.body)
      .slice(0, limit)
      .map(c => ({ text: String(c.data.body ?? '').slice(0, 300), score: Number(c.data.score ?? 0) }));
  } catch {
    return [];
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function scrapeReddit(
  query:        string,
  clientId:     string,
  clientSecret: string,
  postLimit = 25,
): Promise<RedditPost[]> {
  const token = await getAccessToken(clientId, clientSecret);
  const posts  = await searchPosts(query, postLimit, token);

  // Fetch comments for top 10 posts, 5 at a time
  const BATCH = 5;
  const top   = posts.slice(0, 10);
  for (let i = 0; i < top.length; i += BATCH) {
    const batch    = top.slice(i, i + BATCH);
    const comments = await Promise.all(batch.map(p => fetchComments(p.id, token)));
    batch.forEach((p, idx) => { p.top_comments = comments[idx]; });
    if (i + BATCH < top.length) await new Promise(r => setTimeout(r, 300));
  }

  return posts;
}

/**
 * Reddit community scraper — uses Reddit's public JSON API (no API key needed).
 *
 * Endpoints used:
 *   /search.json        → top posts matching a query (last 30 days)
 *   /comments/{id}.json → top-level comments for each post
 *
 * Rate limits: ~60 req/min unauthenticated. We batch comment fetches (5 at a
 * time) and include a small delay between batches to stay well under the limit.
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

const REDDIT_BASE = 'https://www.reddit.com';
const UA          = 'AdInsightAI/1.0 (market research tool)';

// ── Low-level fetch wrapper ───────────────────────────────────────────────────

async function redditGet(path: string): Promise<unknown> {
  const res = await fetch(`${REDDIT_BASE}${path}`, {
    headers: { 'User-Agent': UA },
    signal:  AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Reddit ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Search posts ──────────────────────────────────────────────────────────────

async function searchPosts(query: string, limit = 25): Promise<RedditPost[]> {
  const path = `/search.json?${new URLSearchParams({
    q:     query,
    sort:  'top',
    t:     'month',
    limit: String(limit),
    type:  'link',
  })}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await redditGet(path) as any;
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

// ── Fetch comments for a single post ─────────────────────────────────────────

async function fetchComments(
  postId: string,
  limit = 15,
): Promise<{ text: string; score: number }[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await redditGet(`/comments/${postId}.json?sort=top&limit=${limit}`) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = json?.[1]?.data?.children ?? [];
    return children
      .filter(c => c.kind === 't1' && c.data?.body)
      .slice(0, limit)
      .map(c => ({
        text:  String(c.data.body ?? '').slice(0, 300),
        score: Number(c.data.score ?? 0),
      }));
  } catch {
    return [];
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetch top Reddit posts for a query and hydrate each with top comments.
 *
 * @param query     Search term (same as YouTube query)
 * @param postLimit Max posts to fetch (default 25)
 */
export async function scrapeReddit(
  query: string,
  postLimit = 25,
): Promise<RedditPost[]> {
  const posts = await searchPosts(query, postLimit);

  // Fetch comments for top 10 posts in batches of 5 to respect rate limits
  const BATCH = 5;
  const top   = posts.slice(0, 10);

  for (let i = 0; i < top.length; i += BATCH) {
    const batch = top.slice(i, i + BATCH);
    const comments = await Promise.all(batch.map(p => fetchComments(p.id)));
    batch.forEach((p, idx) => { p.top_comments = comments[idx]; });

    // Small delay between batches — avoid rate limit
    if (i + BATCH < top.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return posts;
}

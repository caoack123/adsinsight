/**
 * Reddit community scraper — uses Apify `trudax~reddit-scraper`.
 *
 * Requires APIFY_API_TOKEN (same token already used for TikTok/Instagram).
 * Apify handles Reddit's bot-detection/blocking transparently via residential proxies.
 *
 * Actor: https://apify.com/trudax/reddit-scraper
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

export async function scrapeReddit(
  query:      string,
  apifyToken: string,
  postLimit = 25,
): Promise<RedditPost[]> {
  const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=top&t=month&type=link`;

  const res = await fetch(
    `https://api.apify.com/v2/acts/trudax~reddit-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls:   [{ url: searchUrl }],
        maxItems:    postLimit,
        proxy:       { useApifyProxy: true },
      }),
      signal: AbortSignal.timeout(130_000),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Apify Reddit scraper failed (${res.status}): ${text}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = await res.json();

  return items
    // Only posts (actor may also return comment items)
    .filter(item => !item.dataType || item.dataType === 'post')
    .slice(0, postLimit)
    .map(item => ({
      id:           String(item.id ?? item.parsedId ?? ''),
      title:        String(item.title ?? ''),
      subreddit:    String(item.communityName ?? item.subreddit ?? ''),
      author:       String(item.username ?? item.author ?? ''),
      score:        Number(item.upVotes ?? item.score ?? 0),
      upvote_ratio: Number(item.upvoteRatio ?? item.upvote_ratio ?? 0.9),
      num_comments: Number(item.numberOfComments ?? item.numComments ?? item.num_comments ?? 0),
      permalink:    String(item.url ?? item.permalink ?? ''),
      selftext:     String(item.text ?? item.selftext ?? item.body ?? '').slice(0, 400),
      top_comments: (item.comments ?? item.topComments ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .slice(0, 10).map((c: any) => ({
          text:  String(c.text ?? c.body ?? '').slice(0, 300),
          score: Number(c.upVotes ?? c.score ?? 0),
        })),
    }));
}

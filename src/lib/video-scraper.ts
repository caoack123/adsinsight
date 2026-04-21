/**
 * Social video scraper
 * Supports: YouTube (Data API), TikTok (Apify), Instagram/X (URL-only fallback)
 */

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'x' | 'other';

export interface VideoMeta {
  platform:      Platform;
  platform_id:   string;
  title:         string | null;
  author:        string | null;
  thumbnail_url: string | null;
  duration_sec:  number | null;
  view_count:    number | null;
  like_count:    number | null;
  comment_count: number | null;
  share_count:   number | null;
  description:   string | null;
  /** Direct playable/downloadable URL (for non-YouTube Gemini analysis) */
  direct_url:    string | null;
}

// ── Platform detection ────────────────────────────────────────────────────────

export function detectPlatform(url: string): Platform {
  try {
    const h = new URL(url).hostname.replace('www.', '');
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('tiktok.com'))                              return 'tiktok';
    if (h.includes('instagram.com'))                           return 'instagram';
    if (h.includes('twitter.com') || h.includes('x.com'))     return 'x';
  } catch { /* invalid url */ }
  return 'other';
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be'))     return u.pathname.slice(1).split('?')[0];
    if (u.pathname.startsWith('/shorts/'))   return u.pathname.split('/')[2];
    return u.searchParams.get('v');
  } catch { return null; }
}

// ── YouTube ───────────────────────────────────────────────────────────────────

export async function scrapeYouTube(url: string, apiKey: string): Promise<VideoMeta | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${apiKey}`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  const item = json.items?.[0];
  if (!item) return null;

  const sn = item.snippet;
  const st = item.statistics;
  const cd = item.contentDetails;

  // Parse ISO 8601 duration PT#M#S → seconds
  let duration_sec: number | null = null;
  if (cd?.duration) {
    const m = cd.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (m) duration_sec = (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0));
  }

  return {
    platform:      'youtube',
    platform_id:   videoId,
    title:         sn?.title ?? null,
    author:        sn?.channelTitle ?? null,
    thumbnail_url: sn?.thumbnails?.high?.url ?? sn?.thumbnails?.default?.url ?? null,
    duration_sec,
    view_count:    st?.viewCount    ? +st.viewCount    : null,
    like_count:    st?.likeCount    ? +st.likeCount    : null,
    comment_count: st?.commentCount ? +st.commentCount : null,
    share_count:   null,
    description:   sn?.description?.slice(0, 500) ?? null,
    direct_url:    null,   // Gemini handles YouTube URLs natively
  };
}

// ── TikTok via Apify ──────────────────────────────────────────────────────────

export async function scrapeTikTok(url: string, apifyToken: string): Promise<VideoMeta | null> {
  // clockworks~tiktok-scraper — synchronous run, returns dataset items directly
  const res = await fetch(
    `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=60`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postURLs:              [url],
        shouldDownloadVideos:  false,
        shouldDownloadCovers:  false,
        maxItems:              1,
      }),
    },
  );
  if (!res.ok) return null;

  const items: Record<string, unknown>[] = await res.json();
  const item = items?.[0];
  if (!item) return null;

  // Extract platform_id from the TikTok URL
  const idMatch = url.match(/\/video\/(\d+)/);
  const platform_id = idMatch?.[1] ?? String(item.id ?? '');

  const authorMeta = item.authorMeta as Record<string, unknown> | undefined;
  const videoMeta  = item.videoMeta  as Record<string, unknown> | undefined;
  const covers     = item.covers     as string[] | undefined;

  return {
    platform:      'tiktok',
    platform_id,
    title:         (item.text as string | undefined)?.slice(0, 200) ?? null,
    author:        (authorMeta?.name as string | undefined) ?? (authorMeta?.nickName as string | undefined) ?? null,
    thumbnail_url: covers?.[0] ?? null,
    duration_sec:  videoMeta?.duration ? +videoMeta.duration : null,
    view_count:    item.playCount    ? +item.playCount    : null,
    like_count:    item.diggCount    ? +item.diggCount    : null,
    comment_count: item.commentCount ? +item.commentCount : null,
    share_count:   item.shareCount   ? +item.shareCount   : null,
    description:   (item.text as string | undefined)?.slice(0, 500) ?? null,
    // Apify provides a no-watermark download URL
    direct_url:    (item.videoUrl as string | undefined) ?? null,
  };
}

// ── Instagram via Apify ───────────────────────────────────────────────────────

export async function scrapeInstagram(url: string, apifyToken: string): Promise<VideoMeta | null> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=60`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls:   [url],
        resultsType:  'posts',
        resultsLimit: 1,
        addParentData: false,
      }),
    },
  );
  if (!res.ok) return null;

  const items: Record<string, unknown>[] = await res.json();
  const item = items?.[0];
  if (!item) return null;

  // Extract shortcode from URL or item
  const shortcodeMatch = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  const platform_id = shortcodeMatch?.[2] ?? String(item.shortCode ?? item.id ?? '');

  return {
    platform:      'instagram',
    platform_id,
    title:         (item.caption as string | undefined)?.slice(0, 200) ?? null,
    author:        (item.ownerUsername as string | undefined) ?? (item.ownerfullname as string | undefined) ?? null,
    thumbnail_url: (item.displayUrl as string | undefined) ?? null,
    duration_sec:  item.videoDuration ? +item.videoDuration : null,
    view_count:    item.videoPlayCount  ? +item.videoPlayCount  : null,
    like_count:    item.likesCount      ? +item.likesCount      : null,
    comment_count: item.commentsCount   ? +item.commentsCount   : null,
    share_count:   null,
    description:   (item.caption as string | undefined)?.slice(0, 500) ?? null,
    direct_url:    (item.videoUrl as string | undefined) ?? null,
  };
}

// ── URL-only fallback ─────────────────────────────────────────────────────────

export function urlOnlyMeta(url: string, platform: Platform): VideoMeta {
  return {
    platform,
    platform_id:   '',
    title:         null,
    author:        null,
    thumbnail_url: null,
    duration_sec:  null,
    view_count:    null,
    like_count:    null,
    comment_count: null,
    share_count:   null,
    description:   null,
    direct_url:    url,
  };
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function scrapeVideoMeta(
  url: string,
  opts: { youtubeApiKey?: string; apifyToken?: string },
): Promise<VideoMeta> {
  const platform = detectPlatform(url);

  if (platform === 'youtube' && opts.youtubeApiKey) {
    const meta = await scrapeYouTube(url, opts.youtubeApiKey).catch(() => null);
    if (meta) return meta;
  }

  if (platform === 'tiktok' && opts.apifyToken) {
    const meta = await scrapeTikTok(url, opts.apifyToken).catch(() => null);
    if (meta) return meta;
  }

  if (platform === 'instagram' && opts.apifyToken) {
    const meta = await scrapeInstagram(url, opts.apifyToken).catch(() => null);
    if (meta) return meta;
  }

  return urlOnlyMeta(url, platform);
}

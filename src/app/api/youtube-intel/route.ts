/**
 * POST /api/youtube-intel
 *
 * 1. Calls YouTube Data API v3:
 *    - search.list          → top 50 video IDs for the query
 *    - videos.list          → snippet + statistics + contentDetails (1 batch call)
 *    - commentThreads.list  → top 20 comments per video (parallel, batched 10-at-a-time)
 * 2. Feeds all data to Gemini → structured intelligence report JSON
 *
 * Required: YouTube Data API key (passed from client or YOUTUBE_API_KEY env)
 *           Google AI key (passed from client or GOOGLE_AI_API_KEY env)
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { scrapeReddit, type RedditPost } from '@/lib/reddit-scraper';

// ─── Request / Response types ─────────────────────────────────────────────────

export interface YouTubeIntelRequest {
  query: string;
  country_code: string;                         // ISO 3166-1 alpha-2, e.g. 'US'
  sort: 'relevance' | 'date' | 'viewCount';
  output_lang: 'zh' | 'en';                     // language for Gemini report output
  youtube_api_key: string;
  gemini_api_key?: string;                      // falls back to GOOGLE_AI_API_KEY env
  model?: string;                               // defaults to gemini-2.5-flash
  include_reddit?: boolean;                     // also fetch Reddit community data
}

export interface VideoItem {
  id: string;
  title: string;
  channel: string;
  published: string;
  description: string;
  url: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments_count: number;
  duration: string;
  top_comments: { text: string; likes: number }[];
}

export interface YouTubeIntelReport {
  executive_summary: {
    headline: string;
    market_temperature: string;
    key_findings: string[];
  };
  content_landscape: {
    dominant_themes: { theme: string; why_it_works: string }[];
    winning_formats: { format: string; description: string }[];
    publishing_insight: string;
  };
  audience_intel: {
    overall_sentiment: string;
    sentiment_score: number;
    pain_points: string[];
    desires: string[];
    viral_triggers: string[];
    demographic_signals: string[];
  };
  brand_intelligence: {
    perception_summary: string;
    positive_associations: string[];
    risk_signals: string[];
    competitor_landscape: string;
  };
  creative_intelligence: {
    title_patterns: string[];
    hook_formulas: string[];
    visual_patterns: string[];
    content_angles: string[];
  };
  opportunity_map: {
    content_gaps: string[];
    trending_angles: string[];
    underserved_niches: string[];
    first_mover_ops: string[];
  };
  team_playbooks: {
    cmo: string[];
    creative_team: string[];
    ads_team: string[];
    product_team: string[];
    marketing_director: string[];
  };
  quantitative_summary: {
    avg_views: number;
    median_views: number;
    total_comments_analyzed: number;
    engagement_insight: string;
    top_5_videos: {
      rank: number;
      title: string;
      channel: string;
      views: number;
      why_it_works: string;
    }[];
  };
  // Optional — only present when include_reddit is true
  reddit_community_intel?: {
    top_subreddits:    { name: string; relevance: string }[];
    community_sentiment: string;
    key_discussions:   string[];
    unique_insights:   string[];
  };
  cross_platform_intel?: {
    sentiment_alignment:          string;
    divergent_views:              string[];
    reddit_exclusive_insights:    string[];
    youtube_exclusive_insights:   string[];
  };
}

export interface YouTubeIntelResponse {
  report:  YouTubeIntelReport;
  videos:  VideoItem[];
  reddit?: RedditPost[];
  meta: {
    query: string;
    country_code: string;
    sort: string;
    output_lang: 'zh' | 'en';
    videos_analyzed: number;
    comments_analyzed: number;
    reddit_posts_analyzed?: number;
    generated_at: string;
  };
}

// ─── YouTube API helpers ──────────────────────────────────────────────────────

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

async function ytGet(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${YT_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`YouTube /${endpoint}: ${body?.error?.message ?? res.statusText}`);
  }
  return res.json();
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: YouTubeIntelRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    query,
    country_code = 'US',
    sort = 'relevance',
    output_lang = 'en',
    youtube_api_key,
    gemini_api_key,
    model = 'gemini-2.5-flash',
    include_reddit = false,
  } = body;

  if (!query?.trim())           return NextResponse.json({ error: 'query is required' }, { status: 400 });
  if (!youtube_api_key?.trim()) return NextResponse.json({ error: 'youtube_api_key is required' }, { status: 400 });

  const aiKey = gemini_api_key?.trim() || process.env.GOOGLE_AI_API_KEY;
  if (!aiKey) return NextResponse.json({ error: 'No Gemini API key — set GOOGLE_AI_API_KEY env or pass gemini_api_key' }, { status: 400 });

  try {
    // ── 1. Search ──────────────────────────────────────────────────────────────
    const searchData = await ytGet('search', {
      part: 'snippet',
      q: query,
      type: 'video',
      regionCode: country_code,
      order: sort,
      maxResults: '50',
      key: youtube_api_key,
    });

    const videoIds: string[] = ((searchData.items ?? []) as { id?: { videoId?: string } }[])
      .map(item => item.id?.videoId ?? '')
      .filter(Boolean);

    if (videoIds.length === 0) {
      return NextResponse.json({ error: 'No videos found for this query' }, { status: 404 });
    }

    // ── 2. Fetch video details (single batch call) ──────────────────────────
    const videosData = await ytGet('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      key: youtube_api_key,
    });

    // ── 3. Fetch comments in parallel batches of 10 ─────────────────────────
    const commentMap: Record<string, { text: string; likes: number }[]> = {};
    const BATCH = 10;
    for (let i = 0; i < videoIds.length; i += BATCH) {
      await Promise.all(
        videoIds.slice(i, i + BATCH).map(async (vid) => {
          try {
            const data = await ytGet('commentThreads', {
              part: 'snippet',
              videoId: vid,
              order: 'relevance',
              maxResults: '20',
              key: youtube_api_key,
            });
            type CommentItem = { snippet?: { topLevelComment?: { snippet?: { textDisplay?: string; likeCount?: number } } } };
            commentMap[vid] = ((data.items ?? []) as CommentItem[]).map(c => ({
              text: (c.snippet?.topLevelComment?.snippet?.textDisplay ?? '').slice(0, 200),
              likes: c.snippet?.topLevelComment?.snippet?.likeCount ?? 0,
            }));
          } catch {
            commentMap[vid] = []; // comments disabled / quota
          }
        })
      );
    }

    // ── 4. Build VideoItem array ───────────────────────────────────────────
    type RawVideo = {
      id: string;
      snippet?: {
        title?: string;
        channelTitle?: string;
        publishedAt?: string;
        description?: string;
        thumbnails?: { high?: { url?: string }; default?: { url?: string } };
      };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails?: { duration?: string };
    };

    const videos: VideoItem[] = ((videosData.items ?? []) as RawVideo[]).map(item => ({
      id: item.id,
      title: item.snippet?.title ?? '',
      channel: item.snippet?.channelTitle ?? '',
      published: item.snippet?.publishedAt?.split('T')[0] ?? '',
      description: (item.snippet?.description ?? '').slice(0, 300),
      url: `https://youtube.com/watch?v=${item.id}`,
      thumbnail:
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.default?.url ??
        `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
      views: parseInt(item.statistics?.viewCount ?? '0'),
      likes: parseInt(item.statistics?.likeCount ?? '0'),
      comments_count: parseInt(item.statistics?.commentCount ?? '0'),
      duration: item.contentDetails?.duration ?? '',
      top_comments: commentMap[item.id] ?? [],
    }));

    videos.sort((a, b) => b.views - a.views);

    const totalViews    = videos.reduce((s, v) => s + v.views, 0);
    const totalComments = videos.reduce((s, v) => s + v.top_comments.length, 0);
    const medianViews   = videos[Math.floor(videos.length / 2)]?.views ?? 0;
    const avgViews      = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;

    // ── 4b. Fetch Reddit data in parallel (if requested) ───────────────────
    let redditPosts: RedditPost[] = [];
    if (include_reddit) {
      redditPosts = await scrapeReddit(query, 25).catch(() => []);
    }

    // ── 5. Build Gemini prompt ──────────────────────────────────────────────
    const videoDataStr = videos
      .map((v, i) => {
        const commentsBlock =
          v.top_comments.length > 0
            ? '\nTop comments:\n' +
              v.top_comments
                .slice(0, 20)
                .map(c => `  [${c.likes}♥] ${c.text}`)
                .join('\n')
            : '\n(Comments unavailable)';
        return (
          `### Video ${i + 1}: "${v.title}"\n` +
          `Channel: ${v.channel} | Views: ${v.views.toLocaleString()} | Likes: ${v.likes.toLocaleString()} | Comments: ${v.comments_count.toLocaleString()}\n` +
          `Published: ${v.published} | Duration: ${v.duration}\n` +
          `Description: ${v.description}\n` +
          `URL: ${v.url}` +
          commentsBlock
        );
      })
      .join('\n\n---\n\n');

    const langInstruction = output_lang === 'zh'
      ? 'LANGUAGE: Write EVERY text value in the JSON in Simplified Chinese (简体中文). Every headline, finding, bullet, label, and sentence must be in Chinese — no English except proper nouns, brand names, and metric values.'
      : 'LANGUAGE: Write EVERY text value in the JSON in English.';

    // ── Build Reddit section of the prompt ──
    let redditDataStr = '';
    if (redditPosts.length > 0) {
      redditDataStr = redditPosts.map((p, i) => {
        const commentsBlock = p.top_comments.length > 0
          ? '\nTop comments:\n' + p.top_comments
              .slice(0, 10)
              .map(c => `  [${c.score}↑] ${c.text}`)
              .join('\n')
          : '\n(No comments)';
        return (
          `### Reddit Post ${i + 1}: "${p.title}"\n` +
          `r/${p.subreddit} | Score: ${p.score.toLocaleString()} (${Math.round(p.upvote_ratio * 100)}% upvoted) | Comments: ${p.num_comments}\n` +
          `Author: u/${p.author}\n` +
          (p.selftext ? `Post text: ${p.selftext}\n` : '') +
          `URL: ${p.permalink}` +
          commentsBlock
        );
      }).join('\n\n---\n\n');
    }

    const redditContext = redditPosts.length > 0
      ? `\n- Reddit posts: ${redditPosts.length} | Total Reddit comments sampled: ${redditPosts.reduce((s, p) => s + p.top_comments.length, 0)}`
      : '';

    const redditPromptSection = redditPosts.length > 0 ? `

## Reddit Community Dataset
${redditDataStr}

## Additional analysis required (Reddit + Cross-platform)
Since Reddit data is included, also fill these two sections:

**reddit_community_intel:**
- top_subreddits: which subreddits appear most, and why they're relevant (2–4 entries)
- community_sentiment: overall Reddit community feeling toward this topic
- key_discussions: the most important discussion threads/topics surfacing in Reddit (3–5 items)
- unique_insights: insights that ONLY Reddit reveals — things YouTube comments don't show (3–5 items)

**cross_platform_intel:**
- sentiment_alignment: where YouTube viewers and Reddit community agree
- divergent_views: specific points where YouTube and Reddit audiences disagree or differ (2–4 items)
- reddit_exclusive_insights: deep concerns/passions visible only in Reddit long-form posts (3–4 items)
- youtube_exclusive_insights: patterns visible only in YouTube data — not reflected in Reddit (3–4 items)
` : '';

    const prompt = `You are a senior digital marketing intelligence analyst producing a ${redditPosts.length > 0 ? 'YouTube + Reddit Cross-Platform' : 'YouTube'} Intelligence Report for a brand's multi-disciplinary team.

## ${langInstruction}

## Search context
- Query: "${query}"
- Country: ${country_code}
- Sort: ${sort}
- YouTube dataset: ${videos.length} videos | ${totalViews.toLocaleString()} total views | ${totalComments} audience comments analyzed
- Avg views: ${avgViews.toLocaleString()} | Median views: ${medianViews.toLocaleString()}${redditContext}

## Your mandate
Generate a report that is:
1. QUANTITATIVE — cite specific numbers (view counts, ratios, comment counts, Reddit scores)
2. QUALITATIVE — identify concrete patterns, themes, sentiments
3. ACTIONABLE — every insight must be a direct take-away a team can act on within a week
4. SPECIFIC — reference actual video titles, channel names, subreddit names, exact comment quotes

The team_playbooks section is critical: each team (CMO, creative, ads, product, marketing director) needs 4–6 bullet-point action items they can execute directly. Write them as imperative sentences starting with a verb.

## YouTube Dataset
${videoDataStr}
${redditPromptSection}
Generate the full intelligence report now.`;

    // ── 6. Gemini structured output ─────────────────────────────────────────
    const redditSchemaProps = redditPosts.length > 0 ? {
      reddit_community_intel: {
        type: SchemaType.OBJECT,
        required: ['top_subreddits', 'community_sentiment', 'key_discussions', 'unique_insights'],
        properties: {
          top_subreddits: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              required: ['name', 'relevance'],
              properties: {
                name:      { type: SchemaType.STRING },
                relevance: { type: SchemaType.STRING },
              },
            },
          },
          community_sentiment: { type: SchemaType.STRING },
          key_discussions:     { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          unique_insights:     { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
      },
      cross_platform_intel: {
        type: SchemaType.OBJECT,
        required: ['sentiment_alignment', 'divergent_views', 'reddit_exclusive_insights', 'youtube_exclusive_insights'],
        properties: {
          sentiment_alignment:        { type: SchemaType.STRING },
          divergent_views:            { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          reddit_exclusive_insights:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          youtube_exclusive_insights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
      },
    } : {};

    const redditRequiredFields = redditPosts.length > 0
      ? ['reddit_community_intel', 'cross_platform_intel']
      : [];

    const genAI = new GoogleGenerativeAI(aiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          required: [
            'executive_summary', 'content_landscape', 'audience_intel',
            'brand_intelligence', 'creative_intelligence', 'opportunity_map',
            'team_playbooks', 'quantitative_summary',
            ...redditRequiredFields,
          ],
          properties: {
            executive_summary: {
              type: SchemaType.OBJECT,
              required: ['headline', 'market_temperature', 'key_findings'],
              properties: {
                headline:           { type: SchemaType.STRING },
                market_temperature: { type: SchemaType.STRING },
                key_findings:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            content_landscape: {
              type: SchemaType.OBJECT,
              required: ['dominant_themes', 'winning_formats', 'publishing_insight'],
              properties: {
                dominant_themes: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    required: ['theme', 'why_it_works'],
                    properties: {
                      theme:         { type: SchemaType.STRING },
                      why_it_works:  { type: SchemaType.STRING },
                    },
                  },
                },
                winning_formats: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    required: ['format', 'description'],
                    properties: {
                      format:      { type: SchemaType.STRING },
                      description: { type: SchemaType.STRING },
                    },
                  },
                },
                publishing_insight: { type: SchemaType.STRING },
              },
            },
            audience_intel: {
              type: SchemaType.OBJECT,
              required: ['overall_sentiment', 'sentiment_score', 'pain_points', 'desires', 'viral_triggers', 'demographic_signals'],
              properties: {
                overall_sentiment:   { type: SchemaType.STRING },
                sentiment_score:     { type: SchemaType.NUMBER },
                pain_points:         { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                desires:             { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                viral_triggers:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                demographic_signals: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            brand_intelligence: {
              type: SchemaType.OBJECT,
              required: ['perception_summary', 'positive_associations', 'risk_signals', 'competitor_landscape'],
              properties: {
                perception_summary:    { type: SchemaType.STRING },
                positive_associations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                risk_signals:          { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                competitor_landscape:  { type: SchemaType.STRING },
              },
            },
            creative_intelligence: {
              type: SchemaType.OBJECT,
              required: ['title_patterns', 'hook_formulas', 'visual_patterns', 'content_angles'],
              properties: {
                title_patterns:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                hook_formulas:   { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                visual_patterns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                content_angles:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            opportunity_map: {
              type: SchemaType.OBJECT,
              required: ['content_gaps', 'trending_angles', 'underserved_niches', 'first_mover_ops'],
              properties: {
                content_gaps:        { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                trending_angles:     { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                underserved_niches:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                first_mover_ops:     { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            team_playbooks: {
              type: SchemaType.OBJECT,
              required: ['cmo', 'creative_team', 'ads_team', 'product_team', 'marketing_director'],
              properties: {
                cmo:                { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                creative_team:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                ads_team:           { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                product_team:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                marketing_director: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            quantitative_summary: {
              type: SchemaType.OBJECT,
              required: ['avg_views', 'median_views', 'total_comments_analyzed', 'engagement_insight', 'top_5_videos'],
              properties: {
                avg_views:               { type: SchemaType.NUMBER },
                median_views:            { type: SchemaType.NUMBER },
                total_comments_analyzed: { type: SchemaType.NUMBER },
                engagement_insight:      { type: SchemaType.STRING },
                top_5_videos: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    required: ['rank', 'title', 'channel', 'views', 'why_it_works'],
                    properties: {
                      rank:         { type: SchemaType.NUMBER },
                      title:        { type: SchemaType.STRING },
                      channel:      { type: SchemaType.STRING },
                      views:        { type: SchemaType.NUMBER },
                      why_it_works: { type: SchemaType.STRING },
                    },
                  },
                },
              },
            },
          },
        },
        ...redditSchemaProps,
      },
    });

    const result = await geminiModel.generateContent(prompt);
    const report: YouTubeIntelReport = JSON.parse(result.response.text());

    return NextResponse.json({
      report,
      videos,
      ...(redditPosts.length > 0 ? { reddit: redditPosts } : {}),
      meta: {
        query,
        country_code,
        sort,
        output_lang,
        videos_analyzed:      videos.length,
        comments_analyzed:    totalComments,
        ...(redditPosts.length > 0 ? { reddit_posts_analyzed: redditPosts.length } : {}),
        generated_at: new Date().toISOString(),
      },
    } satisfies YouTubeIntelResponse);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[youtube-intel]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

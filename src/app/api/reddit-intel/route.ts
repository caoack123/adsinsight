/**
 * POST /api/reddit-intel
 *
 * 1. Fetches top Reddit posts for a query via public JSON API (no key needed)
 * 2. Fetches top comments for each post
 * 3. Sends all data to Gemini → structured community intelligence report
 *
 * Required: Google AI key (passed from client or GOOGLE_AI_API_KEY env)
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { scrapeReddit, type RedditPost } from '@/lib/reddit-scraper';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RedditIntelRequest {
  query:           string;
  output_lang:     'zh' | 'en';
  gemini_api_key?: string;
  model?:          string;
  post_limit?:     number;   // default 25
}

export interface RedditIntelReport {
  executive_summary: {
    headline:            string;
    community_pulse:     string;   // e.g. "高度关注" / "积极讨论"
    key_findings:        string[];
  };
  community_landscape: {
    top_subreddits:   { name: string; relevance: string; post_count: number }[];
    discussion_types: { type: string; description: string }[];
    activity_insight: string;
  };
  sentiment_analysis: {
    overall_sentiment:   string;
    sentiment_score:     number;   // 0–100
    positive_themes:     string[];
    negative_themes:     string[];
    neutral_observations: string[];
  };
  audience_voice: {
    pain_points:        string[];
    desires:            string[];
    frequently_asked:   string[];
    expert_opinions:    string[];
  };
  content_intelligence: {
    popular_topics:     string[];
    viral_post_patterns: string[];
    comment_triggers:   string[];
    language_patterns:  string[];
  };
  brand_signals: {
    perception_summary:    string;
    positive_associations: string[];
    risk_signals:          string[];
    competitor_mentions:   string[];
  };
  opportunity_map: {
    content_gaps:         string[];
    underserved_questions: string[];
    community_pain_points: string[];
    engagement_hooks:     string[];
  };
  top_posts_analysis: {
    rank:         number;
    title:        string;
    subreddit:    string;
    score:        number;
    why_resonates: string;
  }[];
}

export interface RedditIntelResponse {
  report:  RedditIntelReport;
  posts:   RedditPost[];
  meta: {
    query:              string;
    output_lang:        'zh' | 'en';
    posts_analyzed:     number;
    comments_analyzed:  number;
    generated_at:       string;
  };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: RedditIntelRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    query,
    output_lang    = 'en',
    gemini_api_key,
    model          = 'gemini-2.5-flash',
    post_limit     = 25,
  } = body;

  if (!query?.trim()) return NextResponse.json({ error: 'query is required' }, { status: 400 });

  const apifyToken = process.env.APIFY_API_TOKEN ?? '';
  if (!apifyToken) {
    return NextResponse.json(
      { error: 'APIFY_API_TOKEN not configured on the server.' },
      { status: 500 },
    );
  }

  const aiKey = gemini_api_key?.trim() || process.env.GOOGLE_AI_API_KEY;
  if (!aiKey) return NextResponse.json(
    { error: 'No Gemini API key — set GOOGLE_AI_API_KEY env or pass gemini_api_key' },
    { status: 400 },
  );

  try {
    // ── 1. Fetch Reddit posts + comments ───────────────────────────────────
    const posts = await scrapeReddit(query, apifyToken, post_limit);

    if (posts.length === 0) {
      return NextResponse.json({ error: 'No Reddit posts found for this query' }, { status: 404 });
    }

    const totalComments = posts.reduce((s, p) => s + p.top_comments.length, 0);

    // ── 2. Build prompt ────────────────────────────────────────────────────
    const postDataStr = posts.map((p, i) => {
      const commentsBlock = p.top_comments.length > 0
        ? '\nTop comments:\n' + p.top_comments
            .map(c => `  [${c.score}↑] ${c.text}`)
            .join('\n')
        : '\n(No comments available)';

      return (
        `### Post ${i + 1}: "${p.title}"\n` +
        `r/${p.subreddit} | Score: ${p.score.toLocaleString()} (${Math.round(p.upvote_ratio * 100)}% upvoted) | Comments: ${p.num_comments}\n` +
        `Author: u/${p.author}\n` +
        (p.selftext ? `Post text: ${p.selftext}\n` : '') +
        `URL: ${p.permalink}` +
        commentsBlock
      );
    }).join('\n\n---\n\n');

    const langInstruction = output_lang === 'zh'
      ? 'LANGUAGE: Write EVERY text value in the JSON in Simplified Chinese (简体中文). Every headline, finding, bullet, label, and sentence must be in Chinese — no English except proper nouns, brand names, subreddit names, and metric values.'
      : 'LANGUAGE: Write EVERY text value in the JSON in English.';

    // Count subreddit occurrences for context
    const subredditCounts = posts.reduce<Record<string, number>>((acc, p) => {
      acc[p.subreddit] = (acc[p.subreddit] ?? 0) + 1;
      return acc;
    }, {});
    const topSubs = Object.entries(subredditCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `r/${name} (${count} posts)`)
      .join(', ');

    const prompt = `You are a senior digital marketing intelligence analyst specializing in online community research.
Produce a Reddit Community Intelligence Report based on real Reddit discussion data.

## ${langInstruction}

## Search context
- Query: "${query}"
- Dataset: ${posts.length} posts | ${totalComments} comments analyzed
- Top communities: ${topSubs}
- Avg post score: ${Math.round(posts.reduce((s, p) => s + p.score, 0) / posts.length).toLocaleString()}

## Your mandate
1. AUTHENTIC — base all insights on actual quotes and patterns from the data
2. SPECIFIC — reference real subreddit names, post titles, comment quotes
3. ACTIONABLE — every insight must lead to a concrete brand/content action
4. DEEP — go beyond surface sentiment; find the real emotional drivers and hidden tensions

The top_posts_analysis field must include the 5 most insightful posts (not necessarily highest score)
and explain WHY each resonates with the community.

## Dataset
${postDataStr}

Generate the full Reddit intelligence report now.`;

    // ── 3. Gemini structured output ────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(aiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          required: [
            'executive_summary', 'community_landscape', 'sentiment_analysis',
            'audience_voice', 'content_intelligence', 'brand_signals',
            'opportunity_map', 'top_posts_analysis',
          ],
          properties: {
            executive_summary: {
              type: SchemaType.OBJECT,
              required: ['headline', 'community_pulse', 'key_findings'],
              properties: {
                headline:        { type: SchemaType.STRING },
                community_pulse: { type: SchemaType.STRING },
                key_findings:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            community_landscape: {
              type: SchemaType.OBJECT,
              required: ['top_subreddits', 'discussion_types', 'activity_insight'],
              properties: {
                top_subreddits: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    required: ['name', 'relevance', 'post_count'],
                    properties: {
                      name:       { type: SchemaType.STRING },
                      relevance:  { type: SchemaType.STRING },
                      post_count: { type: SchemaType.NUMBER },
                    },
                  },
                },
                discussion_types: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    required: ['type', 'description'],
                    properties: {
                      type:        { type: SchemaType.STRING },
                      description: { type: SchemaType.STRING },
                    },
                  },
                },
                activity_insight: { type: SchemaType.STRING },
              },
            },
            sentiment_analysis: {
              type: SchemaType.OBJECT,
              required: ['overall_sentiment', 'sentiment_score', 'positive_themes',
                         'negative_themes', 'neutral_observations'],
              properties: {
                overall_sentiment:    { type: SchemaType.STRING },
                sentiment_score:      { type: SchemaType.NUMBER },
                positive_themes:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                negative_themes:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                neutral_observations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            audience_voice: {
              type: SchemaType.OBJECT,
              required: ['pain_points', 'desires', 'frequently_asked', 'expert_opinions'],
              properties: {
                pain_points:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                desires:           { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                frequently_asked:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                expert_opinions:   { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            content_intelligence: {
              type: SchemaType.OBJECT,
              required: ['popular_topics', 'viral_post_patterns', 'comment_triggers', 'language_patterns'],
              properties: {
                popular_topics:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                viral_post_patterns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                comment_triggers:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                language_patterns:   { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            brand_signals: {
              type: SchemaType.OBJECT,
              required: ['perception_summary', 'positive_associations', 'risk_signals', 'competitor_mentions'],
              properties: {
                perception_summary:    { type: SchemaType.STRING },
                positive_associations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                risk_signals:          { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                competitor_mentions:   { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            opportunity_map: {
              type: SchemaType.OBJECT,
              required: ['content_gaps', 'underserved_questions', 'community_pain_points', 'engagement_hooks'],
              properties: {
                content_gaps:           { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                underserved_questions:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                community_pain_points:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                engagement_hooks:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
            },
            top_posts_analysis: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                required: ['rank', 'title', 'subreddit', 'score', 'why_resonates'],
                properties: {
                  rank:          { type: SchemaType.NUMBER },
                  title:         { type: SchemaType.STRING },
                  subreddit:     { type: SchemaType.STRING },
                  score:         { type: SchemaType.NUMBER },
                  why_resonates: { type: SchemaType.STRING },
                },
              },
            },
          },
        },
      },
    });

    const result = await geminiModel.generateContent(prompt);
    const report: RedditIntelReport = JSON.parse(result.response.text());

    return NextResponse.json({
      report,
      posts,
      meta: {
        query,
        output_lang,
        posts_analyzed:    posts.length,
        comments_analyzed: totalComments,
        generated_at:      new Date().toISOString(),
      },
    } satisfies RedditIntelResponse);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reddit-intel]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

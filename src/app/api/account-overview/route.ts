import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface Tweet {
  id: string
  text: string
  created_at: string
  public_metrics: {
    like_count: number
    retweet_count: number
    reply_count: number
  }
}

interface OverviewRequest {
  tweets: Tweet[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: OverviewRequest = await request.json()
    const { tweets } = body

    if (!tweets || tweets.length < 5) {
      return NextResponse.json({ 
        error: 'Need at least 5 tweets to generate insights' 
      }, { status: 400 })
    }

    // Calculate basic stats
    const totalLikes = tweets.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0)
    const totalRetweets = tweets.reduce((sum, t) => sum + (t.public_metrics?.retweet_count || 0), 0)
    const totalReplies = tweets.reduce((sum, t) => sum + (t.public_metrics?.reply_count || 0), 0)
    
    const avgLikes = Math.round(totalLikes / tweets.length)
    const avgRetweets = Math.round(totalRetweets / tweets.length)
    const avgReplies = Math.round(totalReplies / tweets.length)

    // Find top post
    const topPost = [...tweets].sort((a, b) => 
      (b.public_metrics?.like_count || 0) - (a.public_metrics?.like_count || 0)
    )[0]

    // Format tweets for AI analysis
    const tweetTexts = tweets
      .slice(0, 30)
      .map((t, i) => `${i + 1}. "${t.text}" - ${t.public_metrics?.like_count || 0} likes, ${t.public_metrics?.retweet_count || 0} RTs`)
      .join('\n')

    // AI analysis
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are a social media analyst helping a creator understand their X/Twitter performance.

Analyze their posts and provide actionable, personalized insights. Be specific and encouraging.

Return ONLY valid JSON, no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `Analyze these posts from my X account:

${tweetTexts}

STATS:
- Total posts: ${tweets.length}
- Average likes: ${avgLikes}
- Average retweets: ${avgRetweets}
- Top post had ${topPost?.public_metrics?.like_count || 0} likes

Return a JSON object with this structure:
{
  "insights": [
    {
      "type": "pattern" | "recommendation" | "stat",
      "title": "Short insight title",
      "description": "Detailed explanation",
      "metric": "optional metric like '3x more engagement'",
      "icon": "trending" | "calendar" | "heart" | "lightbulb"
    }
    // 3-5 insights
  ],
  "bestPerforming": {
    "contentType": "Single tweets" or "Threads" or specific format,
    "topic": "The topic/theme that performs best",
    "postingTime": "Best time to post based on patterns"
  },
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3"
  ]
}

Make insights specific to MY content, not generic advice.`
      }]
    })

    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()

    // Extract JSON
    let jsonStr = textContent
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonStr = objectMatch[0]
    }

    let aiAnalysis
    try {
      aiAnalysis = JSON.parse(jsonStr)
    } catch {
      // Fallback to basic analysis
      aiAnalysis = {
        insights: [
          {
            type: 'stat',
            title: 'Engagement Summary',
            description: `Your posts average ${avgLikes} likes and ${avgRetweets} retweets`,
            metric: `${avgLikes} likes avg`,
            icon: 'heart'
          }
        ],
        bestPerforming: {
          contentType: 'Your content',
          topic: 'Mixed topics',
          postingTime: 'Varies'
        },
        recommendations: [
          'Keep posting consistently',
          'Engage with your audience',
          'Try different content formats'
        ]
      }
    }

    return NextResponse.json({
      overview: {
        ...aiAnalysis,
        weeklyStats: {
          avgLikes,
          avgRetweets,
          avgReplies,
          totalPosts: tweets.length,
          topPost
        }
      }
    })

  } catch (error) {
    console.error('Account overview error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    }, { status: 500 })
  }
}

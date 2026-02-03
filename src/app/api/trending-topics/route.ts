import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cache trending topics for 1 hour
const topicsCache = new Map<string, { topics: string[]; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

// Niche to search query mapping for better results
const NICHE_QUERIES: Record<string, string> = {
  'ai': 'artificial intelligence AI news today',
  'artificial intelligence': 'artificial intelligence AI news today',
  'crypto': 'cryptocurrency bitcoin ethereum news today',
  'cryptocurrency': 'cryptocurrency bitcoin ethereum news today',
  'web3': 'web3 blockchain crypto news today',
  'saas': 'SaaS software startup news today',
  'software': 'software development tech news today',
  'startups': 'startup funding tech news today',
  'marketing': 'digital marketing social media news today',
  'fintech': 'fintech finance technology news today',
  'defi': 'DeFi decentralized finance news today',
  'nft': 'NFT digital art news today',
  'gaming': 'gaming industry news today',
  'health': 'health tech wellness news today',
  'ecommerce': 'ecommerce retail news today',
  'creator economy': 'creator economy influencer news today',
  'productivity': 'productivity tools apps news today',
  'default': 'technology startup news today'
}

// Niche display config with emojis
export const NICHE_CONFIG: Record<string, { emoji: string; gradient: string }> = {
  'ai': { emoji: '🤖', gradient: 'from-violet-500 to-purple-600' },
  'artificial intelligence': { emoji: '🤖', gradient: 'from-violet-500 to-purple-600' },
  'crypto': { emoji: '₿', gradient: 'from-amber-500 to-orange-600' },
  'cryptocurrency': { emoji: '₿', gradient: 'from-amber-500 to-orange-600' },
  'web3': { emoji: '🌐', gradient: 'from-cyan-500 to-blue-600' },
  'saas': { emoji: '☁️', gradient: 'from-blue-500 to-indigo-600' },
  'software': { emoji: '💻', gradient: 'from-slate-500 to-gray-600' },
  'startups': { emoji: '🚀', gradient: 'from-rose-500 to-pink-600' },
  'marketing': { emoji: '📣', gradient: 'from-green-500 to-emerald-600' },
  'fintech': { emoji: '💳', gradient: 'from-emerald-500 to-teal-600' },
  'defi': { emoji: '🏦', gradient: 'from-purple-500 to-violet-600' },
  'nft': { emoji: '🎨', gradient: 'from-pink-500 to-rose-600' },
  'gaming': { emoji: '🎮', gradient: 'from-red-500 to-orange-600' },
  'health': { emoji: '💚', gradient: 'from-lime-500 to-green-600' },
  'ecommerce': { emoji: '🛒', gradient: 'from-yellow-500 to-amber-600' },
  'creator economy': { emoji: '✨', gradient: 'from-fuchsia-500 to-pink-600' },
  'productivity': { emoji: '⚡', gradient: 'from-sky-500 to-blue-600' },
  'build in public': { emoji: '🔨', gradient: 'from-orange-500 to-red-600' },
  'default': { emoji: '🔥', gradient: 'from-gray-500 to-slate-600' }
}

async function fetchTrendingTopics(niche: string): Promise<string[]> {
  const searchQuery = NICHE_QUERIES[niche.toLowerCase()] || NICHE_QUERIES['default']
  
  // Use Brave Search API
  const braveApiKey = process.env.BRAVE_API_KEY
  if (!braveApiKey) {
    console.error('BRAVE_API_KEY not configured')
    return getDefaultTopics(niche)
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(searchQuery)}&count=8&freshness=pd`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveApiKey
        }
      }
    )

    if (!response.ok) {
      console.error('Brave Search API error:', response.status)
      return getDefaultTopics(niche)
    }

    const data = await response.json()
    
    // Extract titles and clean them up
    const topics = (data.results || [])
      .slice(0, 6)
      .map((result: { title: string }) => {
        // Clean up the title - remove source names, truncate if too long
        let title = result.title
          .replace(/\s*[-|]\s*[^-|]+$/, '') // Remove " - Source Name" at end
          .replace(/\s*\|.*$/, '') // Remove " | Source Name"
          .trim()
        
        // Truncate if too long
        if (title.length > 60) {
          title = title.substring(0, 57) + '...'
        }
        
        return title
      })
      .filter((title: string) => title.length > 10) // Filter out too-short titles

    return topics.length > 0 ? topics : getDefaultTopics(niche)
  } catch (error) {
    console.error('Error fetching trending topics:', error)
    return getDefaultTopics(niche)
  }
}

function getDefaultTopics(niche: string): string[] {
  // Fallback topics by niche
  const defaults: Record<string, string[]> = {
    'ai': [
      'Latest AI model releases and benchmarks',
      'AI agents in production workflows',
      'Open source vs closed AI models',
      'AI regulation and policy updates',
      'Enterprise AI adoption trends'
    ],
    'crypto': [
      'Bitcoin institutional adoption',
      'Ethereum ecosystem updates',
      'DeFi protocol innovations',
      'Crypto regulatory developments',
      'Layer 2 scaling solutions'
    ],
    'saas': [
      'SaaS pricing strategy trends',
      'Product-led growth tactics',
      'B2B marketing innovations',
      'Startup funding landscape',
      'Remote work tools evolution'
    ],
    'default': [
      'Technology trends shaping the industry',
      'Startup ecosystem updates',
      'Digital transformation stories',
      'Innovation in your space',
      'Industry disruption patterns'
    ]
  }
  
  return defaults[niche.toLowerCase()] || defaults['default']
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const niche = searchParams.get('niche')

    if (!niche) {
      return NextResponse.json({ error: 'Niche parameter required' }, { status: 400 })
    }

    // Check cache
    const cacheKey = niche.toLowerCase()
    const cached = topicsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ 
        topics: cached.topics,
        cached: true,
        niche: niche
      })
    }

    // Fetch fresh topics
    const topics = await fetchTrendingTopics(niche)
    
    // Update cache
    topicsCache.set(cacheKey, { topics, timestamp: Date.now() })

    return NextResponse.json({ 
      topics,
      cached: false,
      niche: niche
    })
  } catch (error) {
    console.error('Trending topics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    )
  }
}

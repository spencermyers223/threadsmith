/**
 * Seed Demo Content Script
 * 
 * Populates the calendar and folders with sample content for testing.
 * Run with: npx tsx scripts/seed-demo-content.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Demo folders for popular X niches
const DEMO_FOLDERS = [
  { name: 'Technology & AI', color: '#3B82F6' },
  { name: 'Finance & Investing', color: '#10B981' },
  { name: 'My Business', color: '#F59E0B' },
  { name: 'Personal Brand', color: '#EC4899' },
  { name: 'Industry News', color: '#8B5CF6' },
]

// Demo posts for each category
const DEMO_POSTS = [
  // Technology & AI
  {
    folder: 'Technology & AI',
    posts: [
      {
        title: 'AI Tools Thread',
        type: 'thread',
        content: {
          tweets: [
            { id: '1', content: '10 AI tools that are actually useful (not just hype)\n\nThread 🧵' },
            { id: '2', content: '1/ Claude for writing and analysis\nWhy: Best at nuanced tasks, great at following complex instructions' },
            { id: '3', content: '2/ Cursor for coding\nWhy: AI-first code editor that actually understands your codebase' },
          ]
        },
        generation_type: 'alpha_thread',
        status: 'scheduled',
        scheduled_date: getNextWeekday(1),
      },
      {
        title: 'Hot take on AI hype',
        type: 'tweet',
        content: { html: '<p>Hot take: 90% of AI startups are just ChatGPT wrappers.</p><p>The real innovation is in the 10% building actual infrastructure.</p><p>What do you think?</p>' },
        generation_type: 'hot_take',
        status: 'scheduled',
        scheduled_date: getNextWeekday(2),
      },
    ]
  },
  // Finance & Investing
  {
    folder: 'Finance & Investing',
    posts: [
      {
        title: 'Market analysis',
        type: 'tweet',
        content: { html: '<p>The market is telling us something interesting this week.</p><p>Here\'s what I\'m watching: 📊</p><p>1. Tech earnings\n2. Fed signals\n3. Global demand indicators</p>' },
        generation_type: 'market_take',
        status: 'scheduled',
        scheduled_date: getNextWeekday(3),
      },
      {
        title: 'Investment lessons',
        type: 'tweet',
        content: { html: '<p>5 years of investing taught me:</p><p>• Time in market > timing the market\n• Boring companies often outperform\n• Your edge is patience\n• Fees compound against you</p><p>What would you add?</p>' },
        generation_type: 'build_in_public',
        status: 'scheduled',
        scheduled_date: getNextWeekday(4),
      },
    ]
  },
  // My Business
  {
    folder: 'My Business',
    posts: [
      {
        title: 'Week 12 update',
        type: 'tweet',
        content: { html: '<p>Week 12 building in public:</p><p>✅ Shipped dark mode\n✅ Fixed 3 critical bugs\n❌ Missed revenue target</p><p>Lessons learned: User feedback > feature requests</p><p>What should I focus on next?</p>' },
        generation_type: 'build_in_public',
        status: 'scheduled',
        scheduled_date: getNextWeekday(1),
        scheduled_time: '15:00',
      },
      {
        title: 'Feature launch',
        type: 'tweet',
        content: { html: '<p>Just shipped: AI-powered suggestions 🚀</p><p>Early metrics:\n• 40% faster workflows\n• 3x more engagement\n• Users love it (finally)</p><p>This took 6 weeks to build. Worth every hour.</p>' },
        generation_type: 'build_in_public',
        status: 'draft',
      },
    ]
  },
  // Personal Brand
  {
    folder: 'Personal Brand',
    posts: [
      {
        title: 'Contrarian career advice',
        type: 'tweet',
        content: { html: '<p>Unpopular opinion:</p><p>Your "dream job" doesn\'t exist.</p><p>What exists: problems worth solving, skills worth building, and people worth helping.</p><p>Chase those instead.</p>' },
        generation_type: 'hot_take',
        status: 'draft',
      },
      {
        title: 'Networking tip',
        type: 'tweet',
        content: { html: '<p>Best networking advice I ever got:</p><p>"Don\'t network. Make friends who happen to work in your industry."</p><p>Changed everything.</p>' },
        generation_type: 'market_take',
        status: 'scheduled',
        scheduled_date: getNextWeekday(5),
      },
    ]
  },
  // Industry News
  {
    folder: 'Industry News',
    posts: [
      {
        title: 'Tech news analysis',
        type: 'tweet',
        content: { html: '<p>Everyone\'s talking about [recent news].</p><p>Here\'s the real story no one\'s mentioning:</p><p>The implications go way beyond what the headlines suggest. Let me explain...</p>' },
        generation_type: 'market_take',
        status: 'draft',
      },
    ]
  },
]

// Helper to get next weekday
function getNextWeekday(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

async function seedDemoContent(userId: string) {
  console.log('Seeding demo content for user:', userId)

  // Create folders
  const folderIds: Record<string, string> = {}
  
  for (const folder of DEMO_FOLDERS) {
    console.log(`Creating folder: ${folder.name}`)
    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: userId,
        name: folder.name,
        color: folder.color,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to create folder ${folder.name}:`, error.message)
      continue
    }
    folderIds[folder.name] = data.id
  }

  // Create posts
  for (const category of DEMO_POSTS) {
    const folderId = folderIds[category.folder]
    
    for (const post of category.posts) {
      console.log(`Creating post: ${post.title}`)
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          folder_id: folderId,
          title: post.title,
          type: post.type,
          content: post.content,
          generation_type: post.generation_type,
          status: post.status,
          scheduled_date: post.scheduled_date || null,
          scheduled_time: (post as { scheduled_time?: string }).scheduled_time || null,
        })

      if (error) {
        console.error(`Failed to create post ${post.title}:`, error.message)
      }
    }
  }

  console.log('Demo content seeded successfully!')
}

// Get user ID from command line args
const userId = process.argv[2]
if (!userId) {
  console.error('Usage: npx tsx scripts/seed-demo-content.ts <user_id>')
  console.log('Get your user_id from Supabase Auth or the app')
  process.exit(1)
}

seedDemoContent(userId).catch(console.error)

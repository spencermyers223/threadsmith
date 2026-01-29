import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TEMPLATES = [
  // Build in Public
  {
    title: 'Weekly Progress Update',
    category: 'build-in-public',
    description: 'Share your weekly wins, metrics, and learnings.',
    prompt_template: 'Write a build-in-public progress update for {{project}}. Include these metrics: {{metrics}}. Share one win, one challenge, and what\'s next.',
    variables: [
      { name: 'project', label: 'Project Name', placeholder: 'e.g., My SaaS', required: true },
      { name: 'metrics', label: 'Key Metrics', placeholder: 'e.g., 500 users, $2K MRR', required: true }
    ],
    engagement_type: 'follows',
    best_time: 'Friday afternoons',
    difficulty: 'beginner'
  },
  {
    title: 'Lesson Learned Post',
    category: 'build-in-public',
    description: 'Share a hard lesson from building. Vulnerability creates connection.',
    prompt_template: 'Write a post about a lesson learned while building {{project}}. The lesson: {{lesson}}. Be vulnerable about what went wrong, then share the insight.',
    variables: [
      { name: 'project', label: 'Project', placeholder: 'e.g., my startup', required: true },
      { name: 'lesson', label: 'Lesson', placeholder: 'e.g., Don\'t build features nobody asked for', required: true }
    ],
    engagement_type: 'replies',
    best_time: 'Weekday mornings',
    difficulty: 'beginner'
  },
  {
    title: 'Feature Launch',
    category: 'build-in-public',
    description: 'Announce a new feature with energy.',
    prompt_template: 'Write a feature launch for {{project}}: {{feature}}. Explain the problem it solves and include a clear CTA.',
    variables: [
      { name: 'project', label: 'Project', placeholder: 'e.g., xthread', required: true },
      { name: 'feature', label: 'Feature', placeholder: 'e.g., AI thread generation', required: true }
    ],
    engagement_type: 'likes',
    best_time: 'Tuesday-Thursday',
    difficulty: 'beginner'
  },
  // Contrarian
  {
    title: 'Unpopular Opinion',
    category: 'contrarian',
    description: 'Share a contrarian take that challenges conventional wisdom.',
    prompt_template: 'Write an unpopular opinion about {{topic}}. Go against common consensus and back it up with one strong reason. Make it spicy but defensible.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'e.g., Why hustle culture is overrated', required: true }
    ],
    engagement_type: 'replies',
    best_time: 'Weekday evenings',
    difficulty: 'beginner'
  },
  {
    title: 'Hot Take',
    category: 'contrarian',
    description: 'Make a bold prediction or claim.',
    prompt_template: 'Write a hot take about {{topic}}. Make this bold claim: {{claim}}. Explain your reasoning. End with conviction.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'e.g., The future of AI', required: true },
      { name: 'claim', label: 'Bold Claim', placeholder: 'e.g., Most AI startups will fail', required: true }
    ],
    engagement_type: 'replies',
    best_time: 'Peak hours',
    difficulty: 'intermediate'
  },
  {
    title: 'Myth-Busting',
    category: 'contrarian',
    description: 'Correct a common misconception with facts.',
    prompt_template: 'Write a myth-busting post about: {{myth}}. Explain why it\'s wrong and provide the truth: {{correction}}.',
    variables: [
      { name: 'myth', label: 'Myth', placeholder: 'e.g., You need VC to succeed', required: true },
      { name: 'correction', label: 'Truth', placeholder: 'e.g., Most successful businesses are bootstrapped', required: true }
    ],
    engagement_type: 'likes',
    best_time: 'Mornings',
    difficulty: 'beginner'
  },
  // Alpha/Insights
  {
    title: 'How I Did X',
    category: 'alpha',
    description: 'Share a specific result with exact steps.',
    prompt_template: 'Write about how you achieved {{result}} using {{method}}. Include 3-5 actionable steps with specific numbers.',
    variables: [
      { name: 'result', label: 'Result', placeholder: 'e.g., 10K followers in 60 days', required: true },
      { name: 'method', label: 'Method', placeholder: 'e.g., Reply strategy', required: true }
    ],
    engagement_type: 'retweets',
    best_time: 'Mornings',
    difficulty: 'intermediate'
  },
  {
    title: 'Tools I Use',
    category: 'alpha',
    description: 'Share your real tech stack or tools.',
    prompt_template: 'Write about the tools you use for {{purpose}}: {{tools}}. Brief note on why each one works.',
    variables: [
      { name: 'purpose', label: 'Purpose', placeholder: 'e.g., Running my SaaS', required: true },
      { name: 'tools', label: 'Tools', placeholder: 'e.g., Notion, Linear, Figma', required: true }
    ],
    engagement_type: 'likes',
    best_time: 'Weekdays',
    difficulty: 'beginner'
  },
  {
    title: 'Mistakes to Avoid',
    category: 'alpha',
    description: 'Warn others about common pitfalls.',
    prompt_template: 'Write about mistakes to avoid when {{situation}}: {{mistakes}}. Explain why each is harmful and what to do instead.',
    variables: [
      { name: 'situation', label: 'Situation', placeholder: 'e.g., Starting a startup', required: true },
      { name: 'mistakes', label: 'Mistakes', placeholder: 'e.g., Building without talking to users', required: true }
    ],
    engagement_type: 'likes',
    best_time: 'Any time',
    difficulty: 'beginner'
  },
  // Engagement
  {
    title: 'Question for Timeline',
    category: 'engagement',
    description: 'Ask a genuine question to spark discussion.',
    prompt_template: 'Write a post asking: {{question}} about {{topic}}. Share your own answer to start the conversation.',
    variables: [
      { name: 'question', label: 'Question', placeholder: 'e.g., Best advice you ignored?', required: true },
      { name: 'topic', label: 'Topic Area', placeholder: 'e.g., Building products', required: true }
    ],
    engagement_type: 'replies',
    best_time: 'Evenings',
    difficulty: 'beginner'
  },
  {
    title: 'This or That',
    category: 'engagement',
    description: 'Binary choice debate. Forces people to pick sides.',
    prompt_template: 'Write a "this or that" post: {{option_a}} vs {{option_b}}. Give a brief case for each and ask people to choose.',
    variables: [
      { name: 'option_a', label: 'Option A', placeholder: 'e.g., Move fast', required: true },
      { name: 'option_b', label: 'Option B', placeholder: 'e.g., Move carefully', required: true }
    ],
    engagement_type: 'replies',
    best_time: 'Afternoons',
    difficulty: 'beginner'
  },
  {
    title: 'Underrated Thing',
    category: 'engagement',
    description: 'Crowdsource hidden gems from your audience.',
    prompt_template: 'Write asking for the most underrated {{category}}. Share your own pick with a reason and encourage quote tweets.',
    variables: [
      { name: 'category', label: 'Category', placeholder: 'e.g., Productivity app, Business book', required: true }
    ],
    engagement_type: 'replies',
    best_time: 'Mornings',
    difficulty: 'beginner'
  }
]

async function insertTemplates() {
  console.log('Inserting templates...')
  
  // Clear existing system templates
  const { error: deleteError } = await supabase
    .from('post_templates')
    .delete()
    .eq('is_system', true)
  
  if (deleteError) {
    console.log('Delete error (table may not exist):', deleteError.message)
  }
  
  // Insert new templates
  const { data, error } = await supabase
    .from('post_templates')
    .insert(TEMPLATES.map(t => ({ ...t, is_system: true })))
    .select()
  
  if (error) {
    console.error('Insert error:', error.message)
    return
  }
  
  console.log(`✓ Inserted ${data.length} templates`)
}

insertTemplates()

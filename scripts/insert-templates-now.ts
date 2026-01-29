import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TEMPLATES = [
  {
    title: 'Weekly Progress Update',
    category: 'build-in-public',
    description: 'Share your weekly wins and metrics.',
    prompt_template: 'Write a build-in-public update for {{project}} with metrics: {{metrics}}. Share one win, one challenge, and next steps.',
    variables: [
      { name: 'project', label: 'Project', placeholder: 'My SaaS', required: true },
      { name: 'metrics', label: 'Metrics', placeholder: '500 users, $2K MRR', required: true }
    ],
    engagement_type: 'follows',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'Lesson Learned',
    category: 'build-in-public', 
    description: 'Share a hard lesson from building.',
    prompt_template: 'Write about a lesson learned building {{project}}: {{lesson}}. Be vulnerable about what went wrong, then share the insight.',
    variables: [
      { name: 'project', label: 'Project', placeholder: 'my startup', required: true },
      { name: 'lesson', label: 'Lesson', placeholder: "Don't overbuild", required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'Feature Launch',
    category: 'build-in-public',
    description: 'Announce a new feature with energy.',
    prompt_template: 'Write a feature launch for {{project}}: {{feature}}. Explain the problem it solves and include a clear CTA.',
    variables: [
      { name: 'project', label: 'Project', placeholder: 'xthread', required: true },
      { name: 'feature', label: 'Feature', placeholder: 'AI thread generation', required: true }
    ],
    engagement_type: 'likes',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'Unpopular Opinion',
    category: 'contrarian',
    description: 'Contrarian take that challenges wisdom.',
    prompt_template: 'Write an unpopular opinion about {{topic}}. Go against common consensus and back it up with reasoning. Make it spicy but defensible.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'hustle culture', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'Hot Take',
    category: 'contrarian',
    description: 'Bold prediction or claim.',
    prompt_template: 'Write a hot take: {{claim}} about {{topic}}. Explain your reasoning briefly. End with conviction.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'AI future', required: true },
      { name: 'claim', label: 'Claim', placeholder: 'Most AI startups will fail', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'intermediate',
    is_system: true
  },
  {
    title: 'Myth-Busting',
    category: 'contrarian',
    description: 'Correct a common misconception.',
    prompt_template: 'Write a myth-busting post. The myth: {{myth}}. The truth: {{correction}}. Be educational, not condescending.',
    variables: [
      { name: 'myth', label: 'Myth', placeholder: 'You need VC to succeed', required: true },
      { name: 'correction', label: 'Truth', placeholder: 'Most successful businesses are bootstrapped', required: true }
    ],
    engagement_type: 'likes',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'How I Did X',
    category: 'alpha',
    description: 'Share specific results with steps.',
    prompt_template: 'Write how you achieved {{result}} using {{method}}. Include 3-5 actionable steps with specific numbers.',
    variables: [
      { name: 'result', label: 'Result', placeholder: '10K followers in 60 days', required: true },
      { name: 'method', label: 'Method', placeholder: 'Reply strategy', required: true }
    ],
    engagement_type: 'retweets',
    difficulty: 'intermediate',
    is_system: true
  },
  {
    title: 'Tools I Use',
    category: 'alpha',
    description: 'Share your real tech stack.',
    prompt_template: 'Write about the tools you use for {{purpose}}: {{tools}}. Brief note on why each one works for you.',
    variables: [
      { name: 'purpose', label: 'Purpose', placeholder: 'Running my SaaS', required: true },
      { name: 'tools', label: 'Tools', placeholder: 'Notion, Linear, Figma', required: true }
    ],
    engagement_type: 'likes',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'Mistakes to Avoid',
    category: 'alpha',
    description: 'Warn others about pitfalls.',
    prompt_template: 'Write about mistakes to avoid when {{situation}}: {{mistakes}}. Explain why each is harmful and what to do instead.',
    variables: [
      { name: 'situation', label: 'Situation', placeholder: 'Starting a startup', required: true },
      { name: 'mistakes', label: 'Mistakes', placeholder: 'Building without talking to users', required: true }
    ],
    engagement_type: 'likes',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'Question for Timeline',
    category: 'engagement',
    description: 'Spark discussion with a question.',
    prompt_template: 'Ask {{question}} about {{topic}}. Share your own answer first to get the conversation started.',
    variables: [
      { name: 'question', label: 'Question', placeholder: 'Best advice you ignored?', required: true },
      { name: 'topic', label: 'Topic', placeholder: 'Building products', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'This or That',
    category: 'engagement',
    description: 'Binary choice debate.',
    prompt_template: 'Write a "this or that" post: {{option_a}} vs {{option_b}}. Give a brief case for each and ask people to choose.',
    variables: [
      { name: 'option_a', label: 'Option A', placeholder: 'Move fast', required: true },
      { name: 'option_b', label: 'Option B', placeholder: 'Move carefully', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner',
    is_system: true
  },
  {
    title: 'Underrated Thing',
    category: 'engagement',
    description: 'Crowdsource hidden gems.',
    prompt_template: 'Ask for the most underrated {{category}}. Share your own pick with a reason and encourage quote tweets.',
    variables: [
      { name: 'category', label: 'Category', placeholder: 'Productivity app', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner',
    is_system: true
  }
]

async function run() {
  console.log('Inserting templates...')
  
  const { data, error } = await supabase
    .from('post_templates')
    .insert(TEMPLATES)
    .select()
  
  if (error) {
    console.error('Error:', error.message)
    return
  }
  
  console.log(`✅ Inserted ${data?.length || 0} templates!`)
}

run()

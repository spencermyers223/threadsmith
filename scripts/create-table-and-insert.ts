import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

const TEMPLATES = [
  {
    title: 'Weekly Progress Update',
    category: 'build-in-public',
    description: 'Share your weekly wins and metrics.',
    prompt_template: 'Write a build-in-public update for {{project}} with metrics: {{metrics}}.',
    variables: [
      { name: 'project', label: 'Project', placeholder: 'My SaaS', required: true },
      { name: 'metrics', label: 'Metrics', placeholder: '500 users', required: true }
    ],
    engagement_type: 'follows',
    difficulty: 'beginner'
  },
  {
    title: 'Lesson Learned',
    category: 'build-in-public', 
    description: 'Share a hard lesson from building.',
    prompt_template: 'Write about a lesson learned building {{project}}: {{lesson}}.',
    variables: [
      { name: 'project', label: 'Project', placeholder: 'my startup', required: true },
      { name: 'lesson', label: 'Lesson', placeholder: 'Don\'t overbuild', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner'
  },
  {
    title: 'Unpopular Opinion',
    category: 'contrarian',
    description: 'Contrarian take that challenges wisdom.',
    prompt_template: 'Write an unpopular opinion about {{topic}}. Back it up with reasoning.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'hustle culture', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner'
  },
  {
    title: 'Hot Take',
    category: 'contrarian',
    description: 'Bold prediction or claim.',
    prompt_template: 'Write a hot take: {{claim}} about {{topic}}.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'AI future', required: true },
      { name: 'claim', label: 'Claim', placeholder: 'Most AI startups will fail', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'intermediate'
  },
  {
    title: 'How I Did X',
    category: 'alpha',
    description: 'Share specific results with steps.',
    prompt_template: 'Write how you achieved {{result}} using {{method}}. Include steps.',
    variables: [
      { name: 'result', label: 'Result', placeholder: '10K followers', required: true },
      { name: 'method', label: 'Method', placeholder: 'Reply strategy', required: true }
    ],
    engagement_type: 'retweets',
    difficulty: 'intermediate'
  },
  {
    title: 'Tools I Use',
    category: 'alpha',
    description: 'Share your real tech stack.',
    prompt_template: 'Write about tools for {{purpose}}: {{tools}}.',
    variables: [
      { name: 'purpose', label: 'Purpose', placeholder: 'Running my SaaS', required: true },
      { name: 'tools', label: 'Tools', placeholder: 'Notion, Linear', required: true }
    ],
    engagement_type: 'likes',
    difficulty: 'beginner'
  },
  {
    title: 'Question for Timeline',
    category: 'engagement',
    description: 'Spark discussion with a question.',
    prompt_template: 'Ask {{question}} about {{topic}}. Share your answer first.',
    variables: [
      { name: 'question', label: 'Question', placeholder: 'Best advice ignored?', required: true },
      { name: 'topic', label: 'Topic', placeholder: 'Building products', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner'
  },
  {
    title: 'This or That',
    category: 'engagement',
    description: 'Binary choice debate.',
    prompt_template: 'Write {{option_a}} vs {{option_b}}. Case for each, ask to choose.',
    variables: [
      { name: 'option_a', label: 'Option A', placeholder: 'Move fast', required: true },
      { name: 'option_b', label: 'Option B', placeholder: 'Move carefully', required: true }
    ],
    engagement_type: 'replies',
    difficulty: 'beginner'
  }
]

async function run() {
  // First try to insert directly - if table exists this will work
  console.log('Attempting to insert templates...')
  
  const { data, error } = await supabase
    .from('post_templates')
    .upsert(TEMPLATES.map(t => ({ ...t, is_system: true })), { 
      onConflict: 'title',
      ignoreDuplicates: false 
    })
    .select()
  
  if (error) {
    console.error('Error:', error.message)
    console.log('\nThe table needs to be created first.')
    console.log('Run this SQL in Supabase Dashboard > SQL Editor:\n')
    console.log(`
CREATE TABLE IF NOT EXISTS public.post_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL UNIQUE,
  category text NOT NULL,
  description text,
  prompt_template text NOT NULL,
  variables jsonb,
  engagement_type text,
  best_time text,
  difficulty text DEFAULT 'beginner',
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read templates" ON public.post_templates FOR SELECT USING (true);
    `)
    return
  }
  
  console.log(`✅ Inserted ${data?.length || 0} templates!`)
}

run()

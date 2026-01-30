import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zyjyvcqelpumfrdpwvqc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  // First check if column exists by trying to select it
  const { data: testData, error: testError } = await supabase
    .from('post_templates')
    .select('id, title, why_it_works')
    .limit(1);
  
  if (testError && testError.message.includes('why_it_works')) {
    console.log('Column does not exist yet - need to add via Supabase dashboard');
    console.log('Please run: ALTER TABLE post_templates ADD COLUMN why_it_works text;');
    return;
  }
  
  console.log('Column exists, updating templates...');
  
  // Get all templates
  const { data: templates } = await supabase
    .from('post_templates')
    .select('id, title');
  
  // Why it works content
  const whyItWorks = {
    'Weekly Progress Update': 'Social proof: Real metrics create credibility. Accountability narrative: Followers invest in your journey. Algorithm boost: Regular cadence trains the algorithm. FOMO: Others building want to see if their pace matches.',
    'Lesson Learned': 'Vulnerability principle: Admitting mistakes builds trust (Brené Brown effect). Value exchange: Readers get wisdom without the pain. Reply magnet: People love sharing their own lessons.',
    'Feature Launch': 'News hook: "New" triggers dopamine response. Problem-solution format: Clear value proposition. Urgency: Limited window to engage with fresh content.',
    'Milestone Post': 'Aspiration trigger: Others want the same results. Credibility builder: Numbers don\'t lie. Timeline storytelling: Journey arc is inherently engaging.',
    'Behind the Scenes': 'Exclusivity illusion: "Not everyone sees this." Relatability: Shows you\'re human. Curiosity gap: People want to peek behind the curtain.',
    'Unpopular Opinion': 'Tribal activation: Forces agree/disagree → high engagement. Controversy algorithm: Replies weigh 75x more than likes. Virality engine: Debate = more surface area.',
    'Contrarian Take': 'Authority positioning: "I know something you don\'t." Cognitive dissonance: Challenges beliefs → people must respond. Quote tweet goldmine.',
    'Myth Buster': 'Educational value: Clear save/bookmark trigger. Correctness instinct: People love being right. Authority builder: Positions you as the truth-teller.',
    'Bold Prediction': 'Commitment device: You\'re betting your reputation. Time-bound tension: Creates anticipation. Engagement insurance: People will remind you if wrong.',
    'How-To Guide': 'Proof of concept: You did it, so it\'s possible. Actionable format: Step-by-step is inherently saveable. Specificity principle: Exact numbers build trust.',
    'Tool Recommendation': 'Curation value: You\'ve done the research for them. High save rate: Reference material for later. Recommendation algorithm: Lists perform well.',
    'Framework Post': 'Intellectual credibility: Shows systematic thinking. Portable value: Frameworks apply beyond the example. Thread potential: Can expand each point.',
    'Mistake to Avoid': 'Loss aversion: Humans weigh losses > gains (Kahneman). Warning = value: Saves readers from pain. Experience signal: Shows you\'ve been in the trenches.',
    'Industry Trend': 'Future-facing: Predictions attract attention. Expertise signal: Shows you\'re tracking the space. Debate starter: Others have different predictions.',
    'Question Post': 'Lowest friction: Questions are easy to answer. Algorithm gold: Direct reply invitation. Community building: Makes followers feel heard.',
    'This or That': 'Binary = easy: Two choices reduce decision fatigue. Tribal dynamics: People defend their choice. High reply velocity: Quick responses → algorithm boost.',
    'Rate This': 'Gamification: Numbers make it feel like a game. Low effort: Just pick a number. Opinion expression: People love sharing opinions.',
    'Fill in the Blank': 'Completion instinct: Humans want to fill gaps (Gestalt psychology). Self-expression: Reveals something about responder. Viral potential: Creative answers get likes.',
    'Underrated Pick': 'Expertise showcase: Let others show what they know. Discovery value: Crowdsourced recommendations. Community building: Makes followers feel like contributors.',
  };
  
  let updated = 0;
  for (const template of templates || []) {
    // Find matching why_it_works content
    let content = null;
    for (const [key, value] of Object.entries(whyItWorks)) {
      if (template.title.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(template.title.toLowerCase().split(' ')[0])) {
        content = value;
        break;
      }
    }
    
    if (!content) {
      content = 'This template format drives engagement through clear structure and natural reply triggers.';
    }
    
    const { error } = await supabase
      .from('post_templates')
      .update({ why_it_works: content })
      .eq('id', template.id);
    
    if (!error) {
      updated++;
      console.log(`✓ ${template.title}`);
    }
  }
  
  console.log(`\nUpdated ${updated} templates`);
}

runMigration();

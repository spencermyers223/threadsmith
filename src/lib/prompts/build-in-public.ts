/**
 * Build-in-Public Prompt
 * For project updates, learnings, journey documentation
 *
 * Purpose: Share authentic progress updates with real metrics and honest reflections
 * Structure: Update + specific metrics + honest reflection + ask
 * Length: 1-3 tweets
 * Voice: Vulnerable over polished, specific numbers always
 */

import { ALGORITHM_RULES, CT_VOICE, buildUserContext, OUTPUT_FORMAT_RULES, type UserVoiceProfile } from './shared';

export const BUILD_IN_PUBLIC_PROMPT = `
## BUILD-IN-PUBLIC CONTENT

You are creating build-in-public content that documents a creator's journey with authentic transparency. This content type thrives on honesty, real numbers, and genuine asks for input.

### Core Philosophy

Build-in-public content works because it's REAL. CT respects authenticity over polish. The goal is to:
1. Share genuine progress (wins AND struggles)
2. Use specific numbers (never vague growth claims)
3. Reflect honestly on what you learned
4. Ask for input that you actually want

### Structure: Update + Metrics + Reflection + Ask

Every build-in-public post follows this flow:

1. **The Update** - What happened? Be specific.
   - "Shipped the new dashboard" not "Made progress"
   - "Hit 100 users" not "Growing nicely"
   - "Lost my first customer" not "Faced some challenges"

2. **The Metrics** - Real numbers, always.
   - Revenue, users, MRR, conversion rates
   - Time invested, attempts made, failures counted
   - Specific dates and timeframes

3. **The Reflection** - What did you learn?
   - What worked and why
   - What didn't work and why
   - What you'd do differently

4. **The Ask** - A genuine request for input
   - Ask about something you're actually uncertain about
   - Make it specific so people can actually help
   - Questions about direction, features, pricing, etc.

### Hook Patterns for Build-in-Public

**The Milestone Update**
"Just hit [specific number].

Here's what I learned getting here:"

**The Honest Struggle**
"Week [X] of building [project]:

Things that went wrong:"

**The Learning Share**
"I made $[X] this month from [project].

But here's the uncomfortable truth about how:"

**The Behind-the-Scenes**
"Building in public, day [X]:

[Real metric] - [honest assessment]"

**The Pivot Announcement**
"I'm changing direction on [project].

Here's why (with numbers):"

**The Failure Post-Mortem**
"[Project/feature] failed.

Here's exactly what happened and what I learned:"

### What Makes Build-in-Public Content Work

**Specific Numbers Over Vague Claims (ONLY IF USER PROVIDED THEM)**
- BAD: "Revenue is growing nicely"
- GOOD: "Hit $2,847 MRR, up 23% from last month" (if user provided these numbers)

- BAD: "Getting some traction"
- GOOD: "47 signups this week, 12 converted to paid" (if user provided these numbers)

**When Metrics Aren't Available**
If no specific metrics are provided by the user, focus on actions and learnings:
- GOOD: "Shipped the new onboarding flow this week"
- GOOD: "Learning that retention matters more than acquisition"
- GOOD: "Made progress on the mobile app - finally fixed the auth bug"
- BAD: "Hit 47 users this week" (inventing user counts)
- BAD: "Revenue up 23%" (inventing revenue data)

NEVER invent numbers. Qualitative progress updates are still valuable and authentic.

**Struggles Alongside Wins**
- BAD: "Everything's going great! Users love it!"
- GOOD: "Hit 100 users but churn is 15%. Working on onboarding."

- BAD: "Launch went perfectly"
- GOOD: "Got 200 signups on launch day, but support inbox exploded. Spent 6 hours on customer issues."

**Genuine Asks Over Engagement Bait**
- BAD: "What do you think?"
- GOOD: "Should I focus on retention or growth first? Current numbers: [X]"

- BAD: "Any feedback welcome!"
- GOOD: "Pricing at $19/mo - is that too low for [specific feature set]?"

### Content Length Guidelines

Build-in-public works best SHORT (1-3 tweets):
- Single tweet: One milestone + one insight + one question
- 2-3 tweets: More context, but still focused on ONE update

Avoid long threads for build-in-public. Save threads for deep dives and alpha content.

### Voice for Build-in-Public

**Vulnerable Over Polished**
- Share the messy parts
- Admit when you don't know something
- Show the failures, not just the wins

**Specific Over General**
- Real numbers, real dates, real metrics
- "47 users" not "some users"
- "3 weeks" not "a while"

**Asking Over Telling**
- End with a genuine question
- Ask for advice you'll actually use
- Make it easy for people to help

### Example Transformations

BEFORE (Generic):
"Made some good progress on my project this week. Users are liking the new features. Excited for what's next!"

AFTER (Build-in-Public):
"Week 6 of building [ProductName]:

- 47 users (up from 31)
- 12% converted to paid
- Biggest complaint: onboarding is confusing

Rebuilt the signup flow from scratch.

Should I add a product tour or keep it minimal? Our users are technical."

---

BEFORE (Humble-brag):
"So grateful for the amazing response to the launch. You guys are the best community ever!"

AFTER (Build-in-Public):
"Launch day numbers:

- 234 signups
- 18 paid ($342 in revenue)
- 89 support tickets

The good: Conversion rate hit 7.7%
The bad: Support load was 3x expected

Lesson: Should have tested with 10 users before going wide. Classic mistake.

What's your onboarding support strategy?"

### What to Avoid

- All wins, no struggles (feels fake)
- Vague updates without metrics
- Humble-bragging disguised as updates
- Asking for engagement without providing value
- Corporate milestone announcements
- "Excited to announce" energy

### The End Goal

Build-in-public content should make readers feel like they're on the journey WITH you. They should learn something they can apply to their own projects. And the question at the end should be one you genuinely want answered - that's what drives the high-value replies.
`;

export const BUILD_IN_PUBLIC_HOOKS = [
  {
    pattern: "milestone_update",
    template: "Just hit [specific number].\n\nHere's what I learned getting here:",
    example: "Just hit $1,000 MRR.\n\nHere's what I learned getting here:",
  },
  {
    pattern: "honest_struggle",
    template: "Week [X] of building [project]:\n\nThings that went wrong:",
    example: "Week 8 of building my SaaS:\n\nThings that went wrong:",
  },
  {
    pattern: "learning_share",
    template: "I made $[X] this month from [project].\n\nBut here's the uncomfortable truth:",
    example: "I made $2,400 this month from freelancing.\n\nBut here's the uncomfortable truth:",
  },
  {
    pattern: "behind_scenes",
    template: "Building in public, day [X]:\n\n[Metric] - [Assessment]",
    example: "Building in public, day 47:\n\n23 users - only 2 active daily",
  },
  {
    pattern: "pivot_announcement",
    template: "I'm changing direction on [project].\n\nHere's why (with numbers):",
    example: "I'm changing direction on my newsletter.\n\nHere's why (with numbers):",
  },
  {
    pattern: "failure_postmortem",
    template: "[Project/feature] failed.\n\nHere's exactly what happened:",
    example: "My Product Hunt launch failed.\n\nHere's exactly what happened:",
  },
];

/**
 * Build the complete Build-in-Public generation prompt
 */
export function buildInPublicPrompt(options: {
  topic: string;
  userProfile?: UserVoiceProfile;
  additionalContext?: string;
  length?: 'single' | 'short_thread';
}): { systemPrompt: string; userPrompt: string } {
  const { topic, userProfile, additionalContext, length = 'single' } = options;

  const lengthGuideline = length === 'single'
    ? 'Generate single tweets (under 280 characters). One focused update per option.'
    : 'Generate 2-3 tweet mini-threads. Keep it tight and focused on ONE update.';

  const systemPrompt = `You are an expert at creating authentic build-in-public content for X/Twitter.

${ALGORITHM_RULES}

${CT_VOICE}

${BUILD_IN_PUBLIC_PROMPT}

${userProfile ? buildUserContext(userProfile) : ''}

## LENGTH REQUIREMENT
${lengthGuideline}

${OUTPUT_FORMAT_RULES}

CRITICAL REMINDERS FOR BUILD-IN-PUBLIC:
1. NEVER invent specific numbers or metrics - ONLY use numbers the user explicitly provides
2. If no metrics are given, use qualitative language: "shipped X", "working on Y", "improving", "making progress"
3. Focus on actions, learnings, and honest reflections when metrics aren't available
4. Include both a win AND a struggle/learning
5. End with a SPECIFIC question requesting feedback or advice
6. Keep it SHORT - build-in-public thrives on brevity
7. Voice should be vulnerable and authentic, not polished
`;

  const userPrompt = `Create build-in-public content about: ${topic}

This is a project update/journey post. Remember:
- ONLY use numbers/metrics if they are explicitly mentioned in the topic above - NEVER invent stats
- If no metrics are provided, focus on actions, learnings, and qualitative progress
- Include honest reflection
- End with a genuine question for feedback

${additionalContext ? `Additional context:\n${additionalContext}\n` : ''}
Generate 3 distinct options, each taking a different angle on this update.`;

  return { systemPrompt, userPrompt };
}

export default buildInPublicPrompt;

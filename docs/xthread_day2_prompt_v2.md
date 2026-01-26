# xthread Day 2 - Parallel Agent Tasks

## Context Files (All Agents Read First)

Before starting any task, read:
1. `/docs/xthread_current_state.md` - Current app state
2. `/docs/xthread_v1_features.md` - Feature spec

---

## Agent Structure

**4 focused agents, each with a single clear objective:**

| Agent | Focus | Files | Time Estimate |
|-------|-------|-------|---------------|
| Agent 1 | Short-form prompts (3 post types) | `/src/lib/prompts/`, API routes | 20-30 min |
| Agent 2 | Thread prompts (2 post types) | `/src/lib/prompts/`, API routes | 20-30 min |
| Agent 3 | Build-in-Public prompt + prompt infrastructure | `/src/lib/prompts/`, GenerateMode.tsx | 20-30 min |
| Agent 4 | Bug fixes (button flash + text display) | GenerateMode.tsx, WriteMode.tsx | 15-20 min |

---

## Shared Context for Agents 1-3 (Prompt Engineering)

**Read these docs before writing any prompts:**
- `/docs/xthread_x_algorithm_research_report.md` - Algorithm weights
- `/docs/xthread_crypto_twitter_patterns.md` - CT vocabulary and culture

### Algorithm Rules to Bake Into All Prompts:
- Replies = 75x weight, Likes = 0.5x weight → optimize for conversation
- First 60 minutes determine reach → hooks must stop the scroll
- Under 100 characters = 17% higher engagement
- No hashtags in hooks, max 1-2 in final tweet only
- Questions drive replies (27x more valuable than likes)

### CT Voice Rules for All Prompts:
- Direct over diplomatic - no hedging language
- Use CT vocab naturally: alpha, degen, ape, rekt, ser, anon, etc.
- Confident but not arrogant
- Concise over comprehensive
- No corporate speak ("leveraging synergies")
- No over-hedging ("this might potentially possibly...")

---

## Agent 1: Short-Form Post Prompts

**Objective:** Create prompts for the 3 single-tweet post types.

**Files to create/edit:**
- Create `/src/lib/prompts/` directory if needed
- Create `/src/lib/prompts/market-take.ts`
- Create `/src/lib/prompts/hot-take.ts`
- Create `/src/lib/prompts/on-chain-insight.ts`

### Market Take
```
Purpose: Quick opinion on price action, macro, or sentiment
Structure: Clear position + specific reasoning
Length: Single tweet, under 100 chars ideal
Voice: Strong opinion, zero hedging
Example tone: "ETH looks weak here" NOT "ETH might potentially see some downside"
End with: Implied or explicit question to drive replies
```

### Hot Take
```
Purpose: Contrarian opinion that sparks discussion
Structure: Bold claim + brief supporting logic
Length: Single tweet
Voice: Confident, provocative, invites disagreement
Key insight: Disagreement = replies = 27x algorithmic value
End with: Statement that begs "but what about..." responses
```

### On-Chain Insight
```
Purpose: Data-driven observation from blockchain analytics
Structure: Insight first → Data reference → Implications
Length: 1-3 tweets max
Voice: Lead with "so what" not the raw data
Include: Note to pair with chart/screenshot
End with: "What does this tell us about X?" style question
```

### Implementation Notes:
- Each prompt file exports a function that takes user context (niche, tone settings)
- Generate 3 variations with different angles/hooks
- Include instruction to never use hashtags in the hook

---

## Agent 2: Thread Post Prompts

**Objective:** Create prompts for the 2 thread-based post types.

**Files to create/edit:**
- Create `/src/lib/prompts/alpha-thread.ts`
- Create `/src/lib/prompts/protocol-breakdown.ts`

### Alpha Thread
```
Purpose: Share non-obvious insights, research findings, analysis
Structure: Hook → Context → Evidence → Insight → Action → CTA
Length: 5-7 tweets
Tweet 1: Magnetic hook, no hashtags, under 280 chars
Tweets 2-6: One insight per tweet, under 250 chars each
Final tweet: CTA + 1-2 relevant hashtags + specific question
Voice: "I found something most people are missing..."
End with: Question that invites expert replies
```

### Protocol Breakdown
```
Purpose: Educational deep dive explaining how something works
Structure: Why care → How it works → Key mechanics → Risks → Implications
Length: 5-10 tweets
Tweet 1: Hook explaining why reader should care NOW
Middle tweets: Progressive complexity, one concept each
Final tweet: Honest risk assessment + question asking what to cover next
Voice: Educational but not academic, honest about downsides
```

### Implementation Notes:
- Thread prompts must enforce one idea per tweet
- Include explicit character limits per tweet
- Final tweet structure is critical for engagement

---

## Agent 3: Build-in-Public Prompt + Infrastructure

**Objective:** Create the Build-in-Public prompt AND set up the prompt infrastructure.

**Files to create/edit:**
- Create `/src/lib/prompts/build-in-public.ts`
- Create `/src/lib/prompts/index.ts` (exports all prompts)
- Create `/src/lib/prompts/shared.ts` (shared algorithm rules, CT voice guidelines)
- Update generation logic in `GenerateMode.tsx` or API route to use new prompts

### Build-in-Public
```
Purpose: Project updates, learnings, journey documentation
Structure: Update + specific metrics + honest reflection + ask
Length: 1-3 tweets
Voice: Vulnerable over polished, specific numbers always
Key elements: 
  - Real numbers ("hit 100 users" not "growing nicely")
  - Struggles alongside wins
  - Genuine ask for input
End with: Specific question requesting feedback or advice
```

### Infrastructure Tasks:

**Create `/src/lib/prompts/shared.ts`:**
```typescript
// Algorithm optimization rules
export const ALGORITHM_RULES = `
- Optimize for replies (75x weight) over likes (0.5x)
- Keep single tweets under 100 characters when possible
- No hashtags in hooks, max 1-2 in final tweet only
- First line must stop the scroll
- End with question or opinion that invites response
`;

// CT voice guidelines
export const CT_VOICE = `
- Direct, not diplomatic. No hedging.
- Use CT vocabulary naturally: alpha, degen, ape, rekt, ser, anon, fren
- Confident but not arrogant
- Concise over comprehensive
- No corporate speak
- Self-aware humor when appropriate
`;

// Function to inject user's voice settings
export function buildUserContext(profile: UserProfile): string {
  // Include niche, tone sliders, goals, admired accounts
}
```

**Create `/src/lib/prompts/index.ts`:**
```typescript
export { marketTakePrompt } from './market-take';
export { hotTakePrompt } from './hot-take';
export { onChainInsightPrompt } from './on-chain-insight';
export { alphaThreadPrompt } from './alpha-thread';
export { protocolBreakdownPrompt } from './protocol-breakdown';
export { buildInPublicPrompt } from './build-in-public';
export { ALGORITHM_RULES, CT_VOICE, buildUserContext } from './shared';
```

**Update GenerateMode.tsx or API route:**
- Import prompts from `/src/lib/prompts`
- Select appropriate prompt based on post type
- Inject user's voice profile into prompt

---

## Agent 4: Bug Fixes

**Objective:** Fix two UI bugs. Small scope, high polish impact.

### Bug 1: Upgrade Button Flash

**File:** `src/components/creator-hub/GenerateMode.tsx`

**Problem:** "Upgrade to Pro" button briefly shows for subscribed users when switching to Generate mode, then disappears after async check.

**Root cause:** `isSubscribed` defaults to `false`, button renders, then check completes.

**Fix (2 lines):**

```typescript
// Change this:
const [isSubscribed, setIsSubscribed] = useState(false);

// To this:
const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);

// And change the render condition from:
{!isSubscribed && <UpgradeButton />}

// To:
{isSubscribed === false && <UpgradeButton />}
```

Button now only shows when explicitly confirmed user is NOT subscribed.

---

### Bug 2: Text Display in Write Mode

**File:** `src/components/creator-hub/WriteMode.tsx`

**Problem:** When opening files in Write mode, text doesn't display correctly.

**Investigation steps:**
1. Find where file content is loaded into Tiptap editor
2. Check if content is being set as HTML or plain text
3. Check if line breaks (`\n`) are being converted properly

**Common fixes:**
- If plain text with `\n`: convert to `<p>` tags or `<br>` before setting
- If HTML content: ensure Tiptap is parsing HTML not escaping it
- Check `editor.commands.setContent()` call - may need `{ emitUpdate: true }`

**Test after fix:**
- Plain text with line breaks
- Content with bullet points
- Content with headers

---

## Coordination Notes

### Agents 1-3 (Prompts):
- Work in parallel, no dependencies between you
- Agent 3 creates shared infrastructure that 1 & 2 will use
- If Agent 3 finishes first, Agents 1 & 2 should update their files to import from `shared.ts`

### Agent 4 (Bugs):
- Independent of prompt work
- Can run fully in parallel with others
- Button fix is 2 lines, do that first
- Text display may need debugging time

---

## After All Agents Complete

Run: `npm run build`

**Test checklist:**
- [ ] Generate Market Take - under 100 chars, strong position, no hedging?
- [ ] Generate Hot Take - provocative, invites disagreement?
- [ ] Generate Alpha Thread - magnetic hook, one insight per tweet, ends with question?
- [ ] Generate Protocol Breakdown - progressive complexity, honest about risks?
- [ ] Generate Build-in-Public - specific numbers, asks for feedback?
- [ ] Switch Write → Generate as subscribed user - no button flash?
- [ ] Open saved file in Write mode - formatting displays correctly?

---

## Tips for Running Multiple Agents

1. **Start agents in separate terminal tabs/windows** - each gets its own Claude Code instance
2. **Give each agent ONLY their section** - don't paste the whole doc, paste their specific task
3. **Let them work independently** - don't wait for one to finish before starting another
4. **Agent 4 will likely finish first** - can help test prompt outputs
5. **If conflicts arise** - Agent 3's infrastructure takes precedence, others adapt

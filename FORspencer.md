# FORspencer: The CT-Native Prompt Engine Build

*What we just shipped, why it matters, and what you can learn from it.*

---

## The 30-Second Version

We just turned xthread from "generic AI writer with crypto flavor" into "a tool that actually understands how Crypto Twitter works."

We built 6 specialized prompt templates that bake in algorithm knowledge (replies = 75x more valuable than likes) and CT culture (say "ETH looks weak" not "Ethereum might potentially see some downside"). Plus we squashed two annoying UI bugs that were making the app feel janky.

---

## What We Actually Built

### The Prompt Engine (`/src/lib/prompts/`)

Think of this like giving the AI a crash course in being a CT native before every generation. Here's the architecture:

```
/src/lib/prompts/
├── shared.ts           ← The "CT brain" - algorithm rules, voice guidelines
├── market-take.ts      ← Quick price/macro opinions
├── hot-take.ts         ← Contrarian bait (the good kind)
├── on-chain-insight.ts ← Data-driven observations
├── alpha-thread.ts     ← 5-7 tweet insight threads
├── protocol-breakdown.ts ← Educational deep dives
├── build-in-public.ts  ← Project updates with real numbers
└── index.ts            ← Central export hub
```

**Why this structure matters:** Each post type on CT has different rules. A hot take needs to invite disagreement (because replies are worth 27x more than likes algorithmically). An alpha thread needs a magnetic hook in tweet 1 and a question that invites expert replies at the end. A build-in-public post needs specific numbers ("hit 100 users") not vague positivity ("growing nicely").

By separating these into individual files, we can:
1. Update one post type without touching others
2. A/B test different prompt strategies per type
3. Keep the codebase navigable (imagine all 6 prompts in one 2000-line file)

### The Shared Foundation (`shared.ts`)

This is the secret sauce. Every prompt imports from here:

```typescript
export const ALGORITHM_RULES = `
- Optimize for replies (75x weight) over likes (0.5x)
- Keep single tweets under 100 characters when possible
- No hashtags in hooks, max 1-2 in final tweet only
- First line must stop the scroll
- End with question or opinion that invites response
`;

export const CT_VOICE = `
- Direct, not diplomatic. No hedging.
- Use CT vocabulary naturally: alpha, degen, ape, rekt, ser, anon, fren
- Confident but not arrogant
- Concise over comprehensive
- No corporate speak
- Self-aware humor when appropriate
`;
```

**The insight here:** Instead of copy-pasting these rules into every prompt file (which would be a maintenance nightmare), we centralize them. When X changes their algorithm weights next month, we update ONE file.

There's also a `buildUserContext()` function that takes the user's profile (their niche, tone preferences, goals, admired accounts) and formats it into a string the AI can use. This is how we personalize outputs - the same "market take" prompt produces different vibes for a Bitcoin maxi vs. a DeFi degen.

---

## How The Pieces Connect

Here's the data flow when someone clicks "Generate":

```
User clicks Generate with "Alpha Thread" selected
          ↓
GenerateMode.tsx sends { postType: 'alpha_thread', topic: '...' } to API
          ↓
/api/generate/route.ts receives request
          ↓
isCTNativePostType('alpha_thread') returns true
          ↓
generateForCTNativePostType() calls alphaThreadPrompt()
          ↓
alphaThreadPrompt() imports ALGORITHM_RULES, CT_VOICE from shared.ts
          ↓
Returns { systemPrompt, userPrompt } with all rules baked in
          ↓
Claude generates 3 options following the structure
          ↓
Response streamed back to GenerateMode.tsx
```

**The key architectural decision:** We added a "router" pattern in the API. The `isCTNativePostType()` function checks if the post type is one of our new CT-native types. If yes, we use our specialized prompts. If no, we fall back to the legacy archetypes. This means we didn't break anything that was already working - we just added a new, better path.

---

## The Bug Fixes (And What They Teach Us)

### Bug 1: The Upgrade Button Flash

**What was happening:** Pro users would see "Upgrade to Pro" flash for a split second when switching to Generate mode, then it would disappear.

**Root cause:** Classic async state timing issue.

```typescript
// THE PROBLEM
const [isSubscribed, setIsSubscribed] = useState(false);  // Starts false
// Button renders immediately because false is falsy
// Then async check runs, sets to true, button disappears
// User sees: flash of button

// THE FIX
const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);  // Starts null
// And change the render condition:
{isSubscribed === false && <UpgradeButton />}  // Only shows when CONFIRMED not subscribed
```

**The lesson:** When you have async state that affects UI rendering, use a three-state pattern: `null` (loading/unknown), `true`, `false`. This is called the "loading state pattern" and it prevents UI from making assumptions before data arrives.

This is SO common. Every time you have `useState(false)` for something that gets set by an async call, ask yourself: "What should the UI do BEFORE that call completes?" If the answer is "nothing" or "show a loading state," you probably want `useState(null)` instead.

### Bug 2: Text Not Displaying in Write Mode

**What was happening:** When you opened a file in Write mode, the text wouldn't render properly in the Tiptap editor.

**Root cause:** Plain text with `\n` newlines was being set directly into Tiptap, which expects HTML.

**The naive broken approach:**
```typescript
// This creates malformed HTML with consecutive newlines
content.replace(/\n/g, '</p><p>')
```

**The fix:** We wrote a proper `convertTextToHtml()` function that:
1. Splits text by newlines
2. Wraps each line in `<p>` tags
3. Handles markdown headers (`#`, `##`, `###`) → `<h1>`, `<h2>`, `<h3>`
4. Preserves empty lines as empty paragraphs for spacing

**The lesson:** Rich text editors (Tiptap, Slate, ProseMirror, etc.) don't understand plain text. They need structured HTML or their own JSON format. When bridging between "user's plain text file" and "rich text editor," you need a conversion layer. Don't try to be clever with regex one-liners - write a proper parser that handles edge cases.

---

## The Parallel Agent Pattern

This build used 4 agents working simultaneously:

| Agent | Task | Time |
|-------|------|------|
| Agent 1 | Short-form prompts (3 files) | ~2 min |
| Agent 2 | Thread prompts (2 files) | ~2 min |
| Agent 3 | Infrastructure + Build-in-Public | ~3 min |
| Agent 4 | Bug fixes | ~1 min |

**Why this works:** The tasks had minimal dependencies. Agents 1 and 2 just needed to create files. Agent 3 created the shared infrastructure AND updated the integration points. Agent 4 was completely independent (bug fixes).

**When parallel agents DON'T work:** If Agent 2 needed Agent 1's output to start, we'd have to run them sequentially. The key is identifying which tasks are truly independent.

**The coordination note:** Agent 3 created `shared.ts` which Agents 1 and 2's files would import from. But since all agents ran in parallel, Agents 1 and 2 didn't actually import from `shared.ts` - they have their own inline rules. This is a tradeoff: we got speed (parallel execution) but now have some duplication. A follow-up task could refactor Agents 1 and 2's files to import from `shared.ts` instead of having inline rules.

---

## What Good Engineers Would Notice

### 1. The Type Safety

Every prompt file exports TypeScript types for its options:

```typescript
export interface AlphaThreadUserContext {
  niche?: string;
  tonePreferences?: {
    confidence?: string;
    technicalDepth?: string;
    personality?: string;
  };
  // ...
}
```

This means if you call `alphaThreadPrompt()` with the wrong shape of data, TypeScript screams at you at compile time, not runtime. The build would fail before broken code ships.

### 2. The Separation of Concerns

- `shared.ts` knows about algorithm rules and CT culture
- Individual prompt files know about their specific post type structure
- `index.ts` just re-exports everything (it's a "barrel file")
- The API route knows how to route requests to the right prompt
- `GenerateMode.tsx` just sends the request and displays results

No single file tries to do everything. Each has one job.

### 3. The Fallback Pattern

```typescript
// In the API route
if (isCTNativePostType(postType)) {
  // Use new CT-native prompts
  return generateForCTNativePostType(postType, topic, profile);
} else {
  // Fall back to legacy archetypes
  return generateLegacy(postType, topic);
}
```

This is defensive coding. We're adding new functionality without removing old functionality. If something goes wrong with the new prompts, the old path still works. You can even add a feature flag here to gradually roll out the new prompts.

---

## Potential Pitfalls to Watch

### 1. Prompt Drift
As you tweak prompts based on user feedback, they can drift away from the algorithm research. Periodically audit prompts against `/docs/xthread_x_algorithm_research_report.md` to make sure they're still aligned.

### 2. The "Works on My Machine" Problem
These prompts were tested with Claude claude-sonnet-4-20250514. Different models (or even different Claude versions) might interpret the instructions differently. If you switch AI providers or models, re-test all 6 post types.

### 3. Hardcoded CT Culture
CT culture evolves. "Ser" and "fren" are current. In 6 months, there might be new slang. The prompts will need periodic updates to stay culturally relevant.

### 4. The Index.ts Maintenance Tax
Every time you add a new prompt file, you need to remember to add exports to `index.ts`. It's easy to forget. Consider using a tool like `barrelsby` to auto-generate barrel files, or just be disciplined about it.

---

## The Numbers

- **Files created:** 7 new prompt files
- **Files modified:** 4 (API route, GenerateMode, WriteMode, index.ts)
- **Lines added:** ~1,900
- **Lines removed:** ~30
- **Build status:** Passing (no TypeScript errors, no lint errors)
- **Time to implement:** ~5 minutes with parallel agents

---

## What's Next

Now that we have the prompt infrastructure in place, natural next steps would be:

1. **A/B test prompt variations** - The prompts generate 3 options. Track which option users pick most often. Use that data to refine the prompts.

2. **User voice learning** - The `buildUserContext()` function accepts user profile data. We could expand this to include examples of the user's past tweets, letting the AI mimic their specific voice.

3. **Real-time algorithm updates** - When X changes their algorithm (they do this constantly), we need a fast path to update `ALGORITHM_RULES` in `shared.ts`.

4. **Prompt analytics** - Log which post types get generated most, which get edited heavily (sign of poor generation), which get posted without edits (sign of good generation).

---

## TL;DR

We built a prompt engine that makes the AI think like a CT native. Six specialized prompt files, one shared foundation, two bug fixes, zero breaking changes. The architecture is modular (easy to update one piece), type-safe (TypeScript catches mistakes), and extensible (adding a 7th post type is straightforward).

The key insight: generic AI writing tools produce generic content. Domain-specific prompts that bake in platform knowledge (X algorithm weights) and cultural knowledge (CT vocabulary and norms) produce content that actually performs.

Ship it.

---

## Update: The Great Refactoring (DRY Cleanup)

*What happens when you run a code review on your own work.*

### The Problem We Found

Remember how I mentioned earlier that Agents 1 and 2 didn't import from `shared.ts` because they ran in parallel? That created a "code smell" - duplicate code across files. Here's what a code review caught:

| Issue | Severity | Files Affected |
|-------|----------|----------------|
| Duplicate `buildUserContextSection()` function | HIGH | `alpha-thread.ts`, `protocol-breakdown.ts` |
| `buildSystemPrompt()` was 93 lines | HIGH | `build-generation-prompt.ts` |
| `buildUserContext()` had deep nesting | MEDIUM | `shared.ts` |
| User profile context building duplicated | MEDIUM | `build-generation-prompt.ts` |

**Why this matters:** Duplicate code is a maintenance nightmare. If we need to change how user context is built, we'd have to find and update 3+ places. Miss one? Bug. Different behavior? Bug. It's the classic DRY (Don't Repeat Yourself) violation.

### The Fix: Extract to Shared

**Step 1: Extend the shared interface**

```typescript
// shared.ts - Before
export interface UserVoiceProfile {
  niche?: string;
  contentGoal?: string;
  // ...basic fields
}

// shared.ts - After
export interface UserVoiceProfile {
  niche?: string;
  contentGoal?: string;
  // ...basic fields
  tonePreferences?: TonePreferences;  // NEW: supports alpha-thread & protocol-breakdown
}

export interface TonePreferences {
  confidence?: 'measured' | 'confident' | 'bold';
  technicalDepth?: 'accessible' | 'intermediate' | 'deep' | 'beginner-friendly' | 'advanced';
  personality?: 'serious' | 'witty' | 'irreverent';
  style?: 'teacher' | 'analyst' | 'builder';
  honesty?: 'diplomatic' | 'balanced' | 'brutally-honest';
}
```

**Step 2: Extract helper functions**

The old `buildUserContext()` was 79 lines with lots of `if` statements. We split it:

```typescript
// Before: One giant function with everything inline
export function buildUserContext(profile: UserVoiceProfile): string {
  let context = '...';
  if (profile.niche) { /* 5 lines */ }
  if (profile.contentGoal) { /* 5 lines */ }
  if (profile.targetAudience) { /* 5 lines */ }
  // ...70 more lines of conditionals
}

// After: Small focused helpers
function buildNicheSection(niche: string): string { /* 5 lines */ }
function buildContentGoalSection(contentGoal: string): string { /* 5 lines */ }
function buildTargetAudienceSection(targetAudience: string): string { /* 5 lines */ }
function buildAdmiredAccountsSection(admiredAccounts: string[]): string { /* 6 lines */ }
function buildToneSlidersSection(profile: UserVoiceProfile): string { /* 26 lines */ }
function buildTonePreferencesSection(tonePreferences: TonePreferences): string { /* 44 lines */ }

// Main function is now clean
export function buildUserContext(profile: UserVoiceProfile): string {
  if (!profile) return '';

  let context = '## USER VOICE PROFILE\n...';
  if (profile.niche) context += buildNicheSection(profile.niche);
  if (profile.contentGoal) context += buildContentGoalSection(profile.contentGoal);
  // ...clean, readable, one line per section
  return context;
}
```

**Step 3: Add converter functions**

The specialized files (`alpha-thread.ts`, `protocol-breakdown.ts`) had slightly different interfaces. Instead of forcing them to change, we added converters:

```typescript
// alpha-thread.ts
function toUserVoiceProfile(userContext: AlphaThreadUserContext): UserVoiceProfile {
  return {
    niche: userContext.niche,
    targetAudience: userContext.targetAudience,
    tonePreferences: userContext.tonePreferences,
  };
}

// Now uses the shared function
${userContext ? buildUserContextSection(toUserVoiceProfile(userContext)) : ''}
```

This pattern - converter functions - lets you maintain backward compatibility while centralizing logic. The old interface still works, but the implementation is shared.

### The Numbers

| Metric | Before | After |
|--------|--------|-------|
| Duplicate `buildUserContextSection` implementations | 3 | 1 |
| Longest function (`buildSystemPrompt`) | 93 lines | 12 lines |
| Helper functions in `shared.ts` | 1 | 7 |
| Lines removed (duplication) | - | ~100 |
| TypeScript errors | 0 | 0 |
| Build status | Pass | Pass |

---

## The Code Review Workflow

This refactoring came from running a code review. Here's the workflow that caught these issues:

### How to Run a Code Review

```bash
# In Claude Code, use the code-review skill
/everything-claude-code:code-review /src/lib/prompts
```

The review checks for:

**Security Issues (CRITICAL):**
- Hardcoded credentials, API keys, tokens
- SQL injection, XSS vulnerabilities
- Missing input validation

**Code Quality (HIGH):**
- Functions > 50 lines
- Files > 800 lines
- Nesting depth > 4 levels
- Missing error handling
- console.log statements left in

**Best Practices (MEDIUM):**
- Code duplication
- Missing tests
- Mutation patterns (prefer immutable)

### What We Learned

1. **Run code reviews AFTER parallel agents finish.** When multiple agents work simultaneously, they can't see each other's output. This naturally creates duplication. A review pass catches it.

2. **The "50 line" rule is real.** Functions over 50 lines are hard to test, hard to understand, and usually doing too much. If you can't fit it in 50 lines, it's probably 2+ functions pretending to be one.

3. **Interfaces are contracts.** By extending `UserVoiceProfile` with `tonePreferences` instead of creating a new interface, we maintained backward compatibility. Old code still works. New code gets new features.

4. **Converter functions are underrated.** Instead of forcing all callers to change their data shape, write a converter. `toUserVoiceProfile()` is 6 lines and saved us from modifying 10+ call sites.

5. **"Works" isn't the same as "maintainable."** The code worked before the refactor. It would've shipped fine. But 6 months from now, when someone needs to change how user context is formatted, they'd be hunting through 3 files instead of 1. Technical debt is real.

### The Refactoring Checklist

Before shipping code, ask:

- [ ] Are there any functions over 50 lines?
- [ ] Is there any copy-pasted logic that could be extracted?
- [ ] If I change X, how many files do I need to touch?
- [ ] Are my interfaces minimal and composable?
- [ ] Did I run the code review skill?

---

## Updated Architecture After Refactoring

```
/src/lib/prompts/
├── shared.ts              ← NOW: 7 helper functions, 2 main exports, 2 interfaces
│   ├── UserVoiceProfile   (extended interface)
│   ├── TonePreferences    (new interface)
│   ├── buildUserContext() (uses helpers)
│   ├── buildUserContextSection() (for specialized prompts)
│   └── 6 helper functions (buildNicheSection, etc.)
│
├── alpha-thread.ts        ← NOW: imports from shared, uses toUserVoiceProfile()
├── protocol-breakdown.ts  ← NOW: imports from shared, uses toUserVoiceProfile()
├── build-generation-prompt.ts ← NOW: imports buildUserContext, split into 3 helpers
│   ├── buildBaseSystemPrompt()
│   ├── buildOutputRequirements()
│   └── toUserVoiceProfile()
│
├── market-take.ts         (unchanged)
├── hot-take.ts            (unchanged)
├── on-chain-insight.ts    (unchanged)
├── build-in-public.ts     (unchanged)
└── index.ts               ← NOW: exports buildUserContextSection, TonePreferences
```

**The key insight:** Good architecture isn't just about making things work - it's about making things *changeable*. Every piece of duplication you eliminate is a future bug you prevent.

---

## Final TL;DR

First we built the prompt engine (parallel agents, fast shipping). Then we reviewed it (code review skill, caught duplication). Then we refactored (extracted to shared, added helpers, maintained compatibility).

This is the professional workflow:
1. **Ship fast** - Get something working
2. **Review honestly** - Find the problems
3. **Refactor deliberately** - Fix them properly
4. **Verify completely** - Run the build, run the tests

The code is now both *working* and *maintainable*. That's the goal.

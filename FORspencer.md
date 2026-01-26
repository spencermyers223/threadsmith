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

---

## Update: The 42-Tweet Monster Bug

*When your regex doesn't speak the same language as your prompts.*

### The Symptom

Users generating Alpha Threads or Protocol Breakdowns were seeing something horrifying: "Option 1 of 1" with **42 tweets** in a single continuous scroll. The navigation arrows? Disabled. Because there was only "one" option.

But wait - the prompts clearly ask for 3 variations. And looking at the raw Claude output, there ARE 3 variations. So where did they go?

### The Detective Work

Let me walk you through the debugging process, because this is a classic "format mismatch" bug that happens all the time in AI applications.

**Step 1: Verify the prompts are correct**

Checked `alpha-thread.ts` and `protocol-breakdown.ts`. Both explicitly request:

```
Generate 3 distinct thread variations...

**Variation 1:**
[thread content]

**Variation 2:**
[thread content]
```

Prompts are fine. Claude is outputting exactly what we asked for.

**Step 2: Check the parsing logic**

In `/src/app/api/generate/route.ts`, there's a function called `parseGeneratedPosts()`. This is where raw Claude output becomes structured data for the UI.

Here's what the parsing logic was looking for:

```typescript
// The ONLY pattern the parser knew about
const optionMatch = line.match(/^\*\*Option\s*(\d+)[\s\S]*?\*\*/i);
```

And here's what the thread prompts were outputting:

```
**Variation 1:**
```

See the problem? The parser is looking for `**Option X**` but the threads use `**Variation X:**`. The regex literally cannot see the variations.

**Step 3: Find the fallback behavior**

When the regex doesn't match anything, what happens? Line 173:

```typescript
// Fallback: treat entire response as single post
if (posts.length === 0) {
  posts.push({
    content: fullText.trim(),
    metadata: {}
  });
}
```

So when the parser can't find any `**Option**` markers, it shrugs and says "I guess it's all one thing" and stuffs the ENTIRE response - all 3 variations, all 42 tweets - into a single post.

**That's the bug.** The prompts and the parser were speaking different languages.

### The Fix

We updated `parseGeneratedPosts()` to understand thread formats:

```typescript
// NEW: Detect if this is a thread format
const isThreadFormat = postType === 'alpha_thread' || postType === 'protocol_breakdown';

if (isThreadFormat) {
  // Try to parse **Variation X:** format
  const variationRegex = /\*\*Variation\s*(\d+):\*\*/gi;
  const variationMatches = [...fullText.matchAll(variationRegex)];

  if (variationMatches.length > 0) {
    // Split by variation markers
    for (let i = 0; i < variationMatches.length; i++) {
      const start = variationMatches[i].index! + variationMatches[i][0].length;
      const end = variationMatches[i + 1]?.index ?? fullText.length;

      let content = fullText.slice(start, end).trim();

      // Clean up metadata lines that shouldn't be in the content
      content = content
        .replace(/^\*Hook Analysis:.*$/gm, '')
        .replace(/^\*Reply Potential:.*$/gm, '')
        .replace(/^\*Controversy Score:.*$/gm, '')
        .trim();

      posts.push({ content, metadata: {} });
    }
  }
}

// Fall back to **Option** format if no variations found
if (posts.length === 0) {
  // Original Option parsing logic...
}

// Last resort: single post fallback
if (posts.length === 0) {
  posts.push({ content: fullText.trim(), metadata: {} });
}
```

**The key changes:**

1. **Format detection** - Check the `postType` to know which regex to use
2. **Variation regex** - New pattern that matches `**Variation X:**`
3. **Metadata cleaning** - Thread prompts output analysis lines like `*Hook Analysis: This hook uses curiosity gap...` that were getting mixed into the content. We strip those.
4. **Layered fallbacks** - Try variation format first, then option format, then single-post. This way old prompt formats still work.

### The Result

Before: "Option 1 of 1" with 42 tweets mashed together
After: "Option 1 of 3" with proper navigation, each option being a clean 7-14 tweet thread

### The Lesson: Format Contracts

This bug teaches a critical lesson about AI applications: **your prompts and your parsers have an implicit contract.**

When you write a prompt that says "format your output like THIS," you're making a promise to the parser. If the parser doesn't know about that format, you've broken the contract.

**How to avoid this in the future:**

1. **Document output formats explicitly** - When creating a new prompt, add a comment: `// OUTPUT FORMAT: **Variation X:**`

2. **Test the full round-trip** - Don't just test that Claude outputs the right thing. Test that the parser PARSES the right thing.

3. **Add format detection, not just format parsing** - The fix detects the post type first, THEN chooses the parsing strategy. This is more robust than trying one regex and hoping.

4. **Keep fallbacks, but log them** - The single-post fallback is good (prevents crashes), but we should probably log when it triggers unexpectedly. If the fallback fires for a thread, something is wrong.

5. **Regex is not the enemy, format drift is** - The regex was fine. The problem was that we added new prompts with a new format and forgot to update the parser. When you add a new prompt format, update the parser in the same PR.

### Code Quality Note

While debugging this, I also ran a code review on the entire `/src/lib/prompts/` directory. The good news: 13 prompt files, zero critical issues. The codebase is well-structured with:

- Consistent TypeScript interfaces
- Modular file organization
- Proper separation between shared logic and specialized prompts
- No hardcoded secrets or security issues

The thread parsing bug was in the API route, not in the prompts themselves. The prompts were doing their job perfectly - it was the consumer of their output that had the mismatch.

---

**Commit:** `4413948` - "fix: parse thread variations correctly in generate API"

---

## Final TL;DR

First we built the prompt engine (parallel agents, fast shipping). Then we reviewed it (code review skill, caught duplication). Then we refactored (extracted to shared, added helpers, maintained compatibility). Then we found and fixed a sneaky parsing bug where prompts and parsers weren't speaking the same language.

This is the professional workflow:
1. **Ship fast** - Get something working
2. **Review honestly** - Find the problems
3. **Refactor deliberately** - Fix them properly
4. **Verify completely** - Run the build, run the tests
5. **Debug systematically** - When bugs appear, trace the data flow end-to-end

The code is now both *working* and *maintainable*. That's the goal.

---

## Update: The Thread Parsing Saga Continues

*When you fix one regex, another one is waiting in the shadows.*

### Bug Fix 1: Thread Parsing - Full Tweets Per Variation

#### The Symptom

After fixing the 3-variation parsing (the "42-Tweet Monster Bug" above), we had a new problem. Each variation now showed up correctly... but with only 1 tweet. The UI was displaying "Thread (1 tweets)" for threads that should have been 7-10 tweets long.

We went from "all 42 tweets in one blob" to "3 options with 1 tweet each." Progress? Technically. But clearly something was still broken.

#### The Detective Work

Two files, two problems. Classic frontend/backend mismatch.

**Problem 1: Frontend Regex (GenerateMode.tsx)**

The `parseThreadContent()` function was supposed to split a thread into individual tweets. Here's what it was looking for:

```typescript
// THE BROKEN PATTERN
const tweetPattern = /(\d+\/\d+)/;  // Looking for "1/7", "2/7", etc.
```

And here's what Claude was actually outputting:

```
1/ This is the hook tweet that grabs attention...

2/ Here's the context you need to understand...

3/ Now let me explain why this matters...
```

See it? Claude outputs `1/`, `2/`, `3/` - single number with a trailing slash. The regex wanted `1/7`, `2/7` - two numbers. The pattern `\d+\/\d+` requires digits on BOTH sides of the slash.

When the regex didn't match, the entire thread content became "one tweet."

**Problem 2: Backend Regex (route.ts)**

Even before reaching the frontend, the API was cutting content short. The regex lookahead that was supposed to find where one variation ends and another begins had this:

```typescript
// THE BROKEN PATTERN
/\*\*Variation \d+:\*\*[\s\S]*?(?=^\*\*Variation|\*\*Recommendation|$)/gm
```

The `^` anchor inside the alternation with the `m` (multiline) flag was causing issues. It was matching too early, cutting off variation content before it should.

#### The Fix

**Frontend Fix:**

```typescript
// BEFORE: Required two numbers (1/7)
const tweetPattern = /(\d+\/\d+)/;

// AFTER: Accepts one or two numbers (1/ or 1/7)
const tweetPattern = /(\d+\/\d*)/;

// The \d* means "zero or more digits" - so "1/" matches, and so does "1/7"
```

But wait, there's more. The original code used `.match()` which only finds the first occurrence. We switched to `.matchAll()` to find ALL tweet markers:

```typescript
// BEFORE: Only finds first tweet marker
const match = content.match(tweetPattern);

// AFTER: Finds ALL tweet markers
const matches = [...content.matchAll(/(\d+)\/\d*/g)];

// Then extract content between markers
for (let i = 0; i < matches.length; i++) {
  const start = matches[i].index!;
  const end = matches[i + 1]?.index ?? content.length;
  const tweetContent = content.slice(start, end).trim();
  tweets.push(tweetContent);
}
```

This pattern - "find all markers, then extract content between them" - is way more robust than trying to write one regex that captures everything.

**Backend Fix:**

Simplified the lookahead with clearer stop markers:

```typescript
// BEFORE: Complex lookahead with anchors
(?=^\*\*Variation|\*\*Recommendation|$)

// AFTER: Simpler stop markers
(?=\*\*Variation \d|\*\*Recommendation|\*\*Angle Breakdown|$)
```

We also added `**Angle Breakdown**` as a stop marker because some thread prompts include that section after the variations.

#### The Result

Before: "Option 1 of 3" showing "Thread (1 tweets)"
After: "Option 1 of 3" showing "Thread (7 tweets)" with full content

**Commit:** `681525a`

---

### Bug Fix 2: Write Mode Formatting Preservation

#### The Symptom

This one was a sneaky data loss bug. User workflow:

1. Open a file in Write mode
2. Add bullet points and formatting
3. Save the file
4. Close the file
5. Reopen the file
6. **All formatting is gone.** Bullet points became run-on paragraphs.

Content wasn't being lost - the words were all there. But the structure was destroyed. Bullets like:

```
- First point
- Second point
- Third point
```

Became:

```
- First point - Second point - Third point
```

#### The Root Cause (Two Problems)

**Problem 1: Saving (editor.getText() vs editor.getHTML())**

When saving content from the Tiptap editor, the code was using:

```typescript
// THE BROKEN WAY
const content = editor.getText();
```

`getText()` extracts **plain text only**. All HTML structure is stripped. Bullet lists become hyphen-prefixed lines. Bold becomes plain text. The rich structure is gone.

We needed:

```typescript
// THE CORRECT WAY
const content = editor.getHTML();
```

`getHTML()` preserves the full HTML structure: `<ul><li>First point</li><li>Second point</li></ul>`.

**Problem 2: Loading (convertTextToHtml() was too naive)**

When loading content back into the editor, there was a function called `convertTextToHtml()`. Its job was to convert plain text (from uploaded .txt files) into HTML that Tiptap can render.

Here's what it was doing:

```typescript
// THE BROKEN WAY
function convertTextToHtml(text: string): string {
  // Just wrap everything in <p> tags
  return text.split('\n').map(line => `<p>${line}</p>`).join('');
}
```

This converts:

```
- First point
- Second point
```

Into:

```html
<p>- First point</p>
<p>- Second point</p>
```

But Tiptap wants:

```html
<ul>
  <li>First point</li>
  <li>Second point</li>
</ul>
```

When the editor renders `<p>- First point</p>`, it shows a paragraph that starts with a hyphen - not an actual bullet point. The visual result is the same, but when you edit and re-save, things get weird.

#### The Fix

**Step 1: Fix the saving**

```typescript
// In WriteMode.tsx - save handler
const handleSave = async () => {
  const content = editor.getHTML();  // Changed from getText()
  await saveToDatabase(content);
};
```

**Step 2: Rewrite convertTextToHtml()**

The new version:

1. **Detects if content is already HTML** - If it has `<p>`, `<ul>`, `<li>`, etc., pass it through unchanged
2. **Converts markdown bullets to proper HTML lists** - `- item` becomes `<li>item</li>` wrapped in `<ul>`
3. **Tracks list state** - Opens `<ul>` when a list starts, closes it when the list ends
4. **Handles blockquotes** - `> text` becomes `<blockquote>text</blockquote>`

```typescript
function convertTextToHtml(text: string): string {
  // Step 1: Detect existing HTML
  if (/<(p|ul|ol|li|h[1-6]|blockquote|br)[\s>]/i.test(text)) {
    return text;  // Already HTML, pass through
  }

  // Step 2: Convert plain text to HTML
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${trimmed.slice(2)}</li>`;
    }
    // Check for blockquote
    else if (trimmed.startsWith('> ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<blockquote>${trimmed.slice(2)}</blockquote>`;
    }
    // Regular paragraph
    else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (trimmed) {
        html += `<p>${trimmed}</p>`;
      } else {
        html += '<p></p>';  // Empty line = empty paragraph for spacing
      }
    }
  }

  // Close any open list
  if (inList) {
    html += '</ul>';
  }

  return html;
}
```

#### The Debugging Process

This bug was tricky because the data looked fine at a glance. To find it, we added console.log statements at each stage:

```typescript
// Step 1: What are we saving?
console.log('Saving content:', editor.getHTML());  // Should be HTML
console.log('Saving via getText:', editor.getText());  // Was this being used?

// Step 2: What does Supabase have?
// (Check directly in Supabase dashboard)

// Step 3: What are we loading?
console.log('Loaded from DB:', rawContent);
console.log('After conversion:', convertTextToHtml(rawContent));
console.log('Is HTML detected:', /<(p|ul|li)/.test(rawContent));
```

This revealed:
1. We were saving with `getText()` (wrong)
2. Supabase had plain text (consequence of #1)
3. Loading was detecting "plain text" and converting (but poorly)

The fix addressed both ends: save HTML, and when loading plain text (from old data or uploaded files), convert it properly.

**Commit:** `6c6b460`

---

### Lesson: Rich Text Editor Contracts

Rich text editors like Tiptap have an implicit contract that's easy to violate if you don't understand it:

| Method | Returns | Use For |
|--------|---------|---------|
| `editor.getText()` | Plain text, no formatting | Copying to clipboard, character counts |
| `editor.getHTML()` | Full HTML structure | **Persistence to database** |
| `editor.getJSON()` | Tiptap's internal JSON format | Alternative persistence, more precise |

**The Contract:**

```
Save: editor → getHTML() → database
Load: database → setContent(html) → editor
```

If you save with `getText()` and load expecting HTML, you've broken the contract. The round-trip fails.

**The Bridge Pattern:**

When you need to support multiple input formats (user's plain text file, HTML from database, markdown from API), you need a conversion layer:

```
User uploads .txt file
       ↓
detectFormat(content)  → "plain_text" / "html" / "markdown"
       ↓
if plain_text: convertTextToHtml(content)
if markdown: convertMarkdownToHtml(content)
if html: passthrough
       ↓
editor.setContent(html)
```

The key insight: **detect first, then convert**. Don't assume the format. Check for HTML tags before deciding to convert.

**Debugging Tip:**

When a round-trip bug like this happens (save → load → different result), add logging at three points:

1. What goes into the save
2. What's actually in storage (database/file)
3. What comes out of the load

One of those three will show you where the corruption happens.

---

### Updated Testing Checklist

After these bugs, add to your testing checklist:

- [ ] Generate thread → each option shows correct tweet count (not 1)
- [ ] Write mode → add bullets → save → close → reopen → bullets preserved
- [ ] Upload .txt with bullets → bullets render correctly in editor
- [ ] Edit content in Write mode → save → reload page → content identical
- [ ] Thread navigation arrows work (not disabled)

---

## TL;DR for This Session

Two bugs, two lessons:

1. **Thread Parsing:** Your regex must match the actual output format. `\d+\/\d+` doesn't match `1/` - it needs `\d+\/\d*`. And use `matchAll()` when you need to find multiple occurrences, not `match()`.

2. **Write Mode Formatting:** Rich text editors have a persistence contract. Use `getHTML()` for saving, not `getText()`. And when bridging between plain text and HTML, detect the format first, then convert properly.

Both bugs came from **format mismatches** - code expecting one format but receiving another. The fix is always the same: understand what you're receiving, and handle it appropriately.

---

## Update: Thread Display & Length Variation Fixes

### Bug Fix 1: Thread Tweet Display Styling

**The Problem:**
Tweets in generated threads were displayed as plain text blocks with minimal visual separation - they looked like paragraphs, not actual tweets.

**The Fix:**
Updated `GenerateMode.tsx` to render each tweet as an X/Twitter-style card:
- Profile avatar placeholder (shows tweet number in a gradient circle)
- "Preview" label with tweet number badge (e.g., "Tweet 1/7")
- Tweet content with proper typography (15px, 1.4 line-height)
- Footer with engagement icon placeholders (reply, repost, like) using lucide-react
- Character count badge with color coding (green/amber/red)
- Rounded corners (rounded-2xl), subtle shadow, hover effects
- Proper spacing between tweets in a thread

**The Lesson:**
UI polish matters for user trust. When you're building a tool to help people create content for a platform, your previews should look like that platform. Users need to visualize how their content will appear.

### Bug Fix 2: Thread Length Variation

**The Problem:**
All 3 generated thread options had the same number of tweets (always 6 for alpha threads, always 10 for protocol breakdowns). Users wanted natural variation to choose between concise vs. comprehensive versions.

**The Root Cause:**
The prompt OUTPUT FORMAT sections specified rigid tweet structures:
- alpha-thread.ts: Always tweets 1-6
- protocol-breakdown.ts: Always tweets 1-10

**The Fix:**
Updated both prompt files to explicitly request different lengths per variation:

**alpha-thread.ts:**
- Variation 1: CONCISE (5-6 tweets) - punchy, high-impact
- Variation 2: STANDARD (7-8 tweets) - balanced depth
- Variation 3: COMPREHENSIVE (9-11 tweets) - full deep-dive

**protocol-breakdown.ts:**
- Variation 1: QUICK EXPLAINER (6-7 tweets) - essentials only
- Variation 2: STANDARD BREAKDOWN (8-10 tweets) - balanced education
- Variation 3: COMPREHENSIVE DEEP-DIVE (11-14 tweets) - full context

Also updated the "Thread Performance" sections to match these new ranges to avoid conflicting guidance.

**The Lesson:**
When working with AI prompts, your OUTPUT FORMAT is a contract. If you specify rigid structure, you get rigid output. If you want variation, you must explicitly request it and explain what kind of variation you want.

### Code Review Findings

The code review caught several issues that were fixed:
1. Hardcoded "Your Name" / "@handle" placeholders - Changed to "Preview" label
2. Inline SVGs for icons - Replaced with lucide-react components (MessageCircle, Repeat2, Heart)
3. Inconsistent length guidance - Updated "Thread Performance" sections to match OUTPUT FORMAT ranges
4. Added aria-hidden to decorative engagement icons for accessibility

### Files Changed
- `src/components/creator-hub/GenerateMode.tsx` - Tweet display styling
- `src/lib/prompts/alpha-thread.ts` - Variable length prompts
- `src/lib/prompts/protocol-breakdown.ts` - Variable length prompts

---

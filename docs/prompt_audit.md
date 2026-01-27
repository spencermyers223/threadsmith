# Prompt Audit — All 6 Post Types + Shared Components
*Audited Jan 27, 2026*

## Overall Assessment: B+ (Strong foundation, some consistency issues)

The prompts are genuinely well-crafted — algorithm research is deeply integrated, CT voice is authentic, and the structures are solid. Issues are mostly about consistency and a few missed optimizations.

---

## Shared Components

### algorithm-knowledge.ts (Legacy)
**Issue:** Outdated engagement weights. Says replies = 7x, retweets = 3x.
**Fix needed:** The newer shared.ts has the correct weights (replies = 75x, 13.5x). This file is used by `build-generation-prompt.ts` (the legacy Generate mode) and has stale data.
**Priority:** HIGH — users on the old Generate flow get wrong algorithm info.

### shared.ts ✅
Solid. Correct algorithm weights, good CT voice guidelines, clean user context building.

### algorithm-knowledge.ts table vs shared.ts text
These two files have **conflicting engagement weights**. Anyone using the legacy generate flow gets the wrong numbers.

---

## Post Type Audits

### 1. Alpha Thread (alpha-thread.ts) ✅
**Strengths:**
- Excellent structure (hook → context → evidence → insight → CTA)
- Good length variation (5-6, 7-8, 9-11 tweets)
- Strong hook patterns with examples
- Good CTA question templates

**Issues:**
- None significant. This is the best prompt.

### 2. Market Take (market-take.ts) ✅
**Strengths:**
- Great conciseness focus (under 100 chars ideal)
- Good voice examples (WRONG vs RIGHT)
- Smart conversation hooks

**Issues:**
- Minor: Could use more specific examples for crypto niches beyond price action

### 3. Hot Take (hot-take.ts) ✅
**Strengths:**
- Great "sacred cow" attack patterns
- Good guardrails (attack ideas not people, be defensible)
- Smart note about blocks/reports penalty

**Issues:**
- Minor: Output format asks for "Recommendation" but doesn't specify how to evaluate which generates "most productive disagreement" vs most engagement

### 4. On-Chain Insight (on-chain-insight.ts) ✅
**Strengths:**
- "So What First" principle is excellent
- Good visual/chart pairing notes
- Smart whale tracking patterns

**Issues:**
- Could benefit from noting that users should provide actual data — risk of hallucinated on-chain stats

### 5. Protocol Breakdown (protocol-breakdown.ts) ✅
**Strengths:**
- Risk section is brilliant for credibility
- Good length variation (6-7, 8-10, 11-14)
- Progressive complexity approach is smart

**Issues:**
- None significant. Second best prompt after Alpha Thread.

### 6. Build in Public (build-in-public.ts) ✅
**Strengths:**
- Great "NEVER invent numbers" guardrail
- Good example transformations
- Smart qualitative fallback when no metrics provided

**Issues:**
- Minor: Could use more variety in hook patterns (currently 6, vs 12+ for other types)

---

## Legacy Components

### scroll-stopper.ts, debate-starter.ts, viral-catalyst.ts
These are the old archetypes used in the legacy Generate flow. They're decent but:
- Use the old algorithm weights from algorithm-knowledge.ts
- Less CT-specific than the newer post types
- Still functional, just not as refined

### build-generation-prompt.ts
The legacy prompt builder. Works but uses outdated algorithm data.

---

## Critical Fix Needed

### 1. Sync algorithm-knowledge.ts weights with shared.ts
**File:** `src/lib/prompts/algorithm-knowledge.ts`
**What:** Update the engagement weights table to match the correct values in shared.ts:
- Replies: 75x (not 7x)
- Retweets: 1-20x (not 3x)
- Likes: 0.5x (not 1x)
- Profile clicks: 12x (not 4x)
- Dwell time: 10-11x (not 2x)
- Bookmarks: ~5x (not 2x)

**Impact:** Anyone using the legacy Generate mode (scroll-stopper, debate-starter, viral-catalyst) gets wrong algorithm info.

---

## Recommended Improvements (Non-urgent)

1. **Add "don't hallucinate data" guardrail to On-Chain Insight** — same pattern as Build in Public
2. **Add more Build in Public hooks** — currently has fewer than other types
3. **Consider deprecating legacy archetypes** — or at minimum update algorithm-knowledge.ts
4. **Add character count enforcement** — prompts mention limits but don't strictly enforce via output format

---

## Testing Notes

All prompts were reviewed for:
- ✅ Correct algorithm weights
- ✅ CT voice authenticity
- ✅ Clear output format requirements
- ✅ Appropriate guardrails (no financial advice, no engagement bait)
- ✅ User context integration
- ✅ Hook pattern quality
- ⚠️ Weak input handling (only Build in Public explicitly handles missing data)

*Status: AUDIT COMPLETE — Critical fix identified for algorithm-knowledge.ts*

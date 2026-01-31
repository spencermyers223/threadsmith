/**
 * Output Format Rules
 * Cleaner, more direct output format that produces authentic content
 * 
 * Key insight: Asking Claude to analyze and explain makes output feel robotic.
 * Instead: Just ask for raw content, let users evaluate.
 */

/**
 * Minimal output format - just the content, no meta-discussion
 */
export const MINIMAL_OUTPUT_FORMAT = `
## OUTPUT FORMAT

Generate exactly 3 variations. Each must be READY TO POST - no edits needed.

Format EXACTLY like this:

---
VARIATION 1
[Your content here - ready to copy/paste to X]
---

---
VARIATION 2
[Your content here - ready to copy/paste to X]
---

---
VARIATION 3
[Your content here - ready to copy/paste to X]
---

CRITICAL RULES:
- NO explanations, analysis, or "why this works" commentary
- NO character counts or metadata
- NO "Option 1:" or "Variation 1:" labels INSIDE the content
- NO asking "what do you think?" or similar weak endings
- Just pure, postable content between the --- markers
- Each variation should take a DIFFERENT angle/approach
- Content must be complete and ready to post AS-IS
`;

/**
 * Thread-specific output format
 */
export const THREAD_OUTPUT_FORMAT = `
## OUTPUT FORMAT FOR THREADS

Generate exactly 3 thread variations. Each must be READY TO POST.

Format EXACTLY like this:

---
THREAD 1

1/ [First tweet - the HOOK that makes people click "Show this thread"]

2/ [Second tweet]

3/ [Continue...]

[End with discussion prompt or question]
---

---
THREAD 2

1/ [Different angle hook]

2/ [Continue...]
---

---
THREAD 3

1/ [Third angle hook]

2/ [Continue...]
---

CRITICAL RULES:
- First tweet is EVERYTHING - it must stop the scroll
- Number each tweet (1/, 2/, etc.)
- Each tweet should work standalone (people may see it isolated)
- 5-10 tweets optimal, 7 is the sweet spot
- NO explanations or analysis - just the thread content
- End with a question or discussion prompt
`;

/**
 * Single tweet output format with stronger constraints
 */
export const TWEET_OUTPUT_FORMAT = `
## OUTPUT FORMAT

Generate exactly 3 tweet variations. Each must be READY TO POST.

---
1
[Tweet content here]
---

---
2
[Tweet content here]
---

---
3
[Tweet content here]
---

RULES:
- Under 280 characters each (or clearly indicate if using long-form)
- NO analysis, explanations, or meta-commentary
- Each takes a DIFFERENT angle on the topic
- Ready to copy/paste directly to X
`;

export function getOutputFormat(contentType: 'tweet' | 'thread' | 'mixed'): string {
  switch (contentType) {
    case 'thread':
      return THREAD_OUTPUT_FORMAT;
    case 'tweet':
      return TWEET_OUTPUT_FORMAT;
    default:
      return MINIMAL_OUTPUT_FORMAT;
  }
}

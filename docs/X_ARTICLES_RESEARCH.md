# X Articles Research & Architecture Plan

## What are X Articles?

X Articles is a long-form content feature launched March 7, 2024, allowing users to publish blog-style content directly on X (Twitter).

### Key Facts
- **Character Limit:** Up to 100,000 characters
- **Availability:** Premium+ subscribers and Verified Organizations only
- **Reading:** Anyone can read articles, even free users
- **Location:** Articles appear in the user's timeline AND a dedicated "Articles" tab on their profile

### Formatting Options
X Articles support rich text formatting:
- **Headings** (H1, H2, etc.)
- **Subheadings**
- **Bold** text
- **Italic** text
- **Strikethrough** text
- **Indentation** (block quotes)
- **Numbered lists**
- **Bulleted lists**
- **Embedded images**
- **Embedded videos**
- **Embedded GIFs**
- **Embedded tweets/posts**
- **Links**

### Article Display
- Appears in timeline with a distinct "article card" layout
- Shows headline, featured image, brief excerpt
- Opens in a full-screen reading experience
- Has its own URL that can be shared

---

## Architecture Plan for xthread Article Creation

### 1. Data Model Updates

```sql
-- No schema changes needed - articles already supported in posts table
-- type = 'article' differentiates from tweets/threads
-- content stores HTML or markdown
```

### 2. Article Editor Component

**Location:** `src/components/drafts/ArticleEditor.tsx`

**Features:**
- Rich text editor (Tiptap already exists, can extend)
- Formatting toolbar:
  - Headings (H1, H2, H3)
  - Bold, Italic, Strikethrough
  - Bullet & Numbered lists
  - Block quotes
  - Link insertion
  - Image upload/embed
  - Tweet embed (paste URL → renders preview)
- Character counter (show progress toward 100k)
- Headline/title input (separate from body)
- Featured image selector
- Auto-save functionality

### 3. Article Preview Component

**Location:** `src/components/preview/ArticlePreview.tsx` (already exists, needs enhancement)

**Enhancements needed:**
- Render rich text formatting properly
- Show featured image
- Show estimated reading time
- Match X's article card styling for how it appears in timeline
- Full preview mode (how it looks when opened)

### 4. Article Generation Prompt

**Location:** `src/lib/prompts/article-prompt.ts` (new file)

**Structure:**
```
1. Headline (compelling, SEO-friendly)
2. Hook/Introduction (first 2-3 sentences critical)
3. Body sections with H2 subheadings
4. Conclusion with CTA
5. Suggested featured image description
```

**Generation options:**
- From brain dump → Full article
- From thread → Expand to article
- From topic → Research-backed article
- From notes/files → Structured article

### 5. UI/UX Flow

```
Creator Hub → Brain Dump → Select "Article" length
                ↓
         Generate Article (structured with headings)
                ↓
         Edit in Article Editor (rich text)
                ↓
         Preview (see how it looks on X)
                ↓
         Schedule or Copy to X
```

### 6. Integration Points

**Drafts page:**
- When `contentType === 'article'`, show ArticleEditor
- Article Editor should use rich text, not plain text
- Character limit: 100,000 instead of 280

**Generation API:**
- Detect `length === 'article'` or `length === 'developed'`
- Use article-specific prompt
- Return structured content with markdown headings

**Export:**
- "Copy to X" should format correctly for X's article composer
- Consider direct posting via X API (if supported)

---

## Implementation Priority

### Phase 1: Article Editor UI
1. Create `ArticleEditor.tsx` with Tiptap rich text
2. Add formatting toolbar (headings, lists, bold, italic)
3. Headline input field
4. Character counter

### Phase 2: Article Generation
1. Create `article-prompt.ts` with structured output
2. Update `/api/generate` to handle article requests
3. Return markdown with proper heading structure

### Phase 3: Preview & Export
1. Enhance `ArticlePreview.tsx` to render rich text
2. Add "timeline card" preview mode
3. Add "Copy as Markdown" and "Copy as Plain Text" options

### Phase 4: Polish
1. Featured image support
2. Tweet embedding
3. Reading time estimate
4. SEO title/description fields

---

## Example Article Structure

```markdown
# [Compelling Headline - 60-80 chars]

[Hook paragraph - the most important 2-3 sentences that make people want to read more]

## [Section 1 Heading]

[2-4 paragraphs of content]

## [Section 2 Heading]

[2-4 paragraphs of content]

- Bullet point 1
- Bullet point 2
- Bullet point 3

## [Section 3 Heading]

[2-4 paragraphs of content]

> Notable quote or callout

## Conclusion

[Summary + Call to action]

---

*What do you think? Reply with your thoughts.*
```

---

## Competitor Analysis

| Feature | xthread | Typefully | Hypefury |
|---------|---------|-----------|----------|
| Article Creation | Planned | Limited | No |
| Rich Text Editor | TBD | No | No |
| Article Templates | Planned | No | No |
| Direct X Posting | Via intent | Yes | Yes |
| Scheduling | Yes | Yes | Yes |

**Opportunity:** Most competitors focus on tweets/threads. Full article support is a differentiator.

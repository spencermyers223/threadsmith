# xthread v1 Features Document

**Product Vision:** The AI-powered content engine for Crypto Twitter. xthread helps crypto researchers, analysts, and builders create algorithm-optimized content that sounds like them, not like AI—faster than they could alone.

**Target User:** Crypto-native individuals building their X presence—researchers, analysts, fund managers, protocol teams, and builders who want to establish credibility and grow their audience through high-quality, timely content.

**Core Differentiator:** Unlike generic AI writing tools, xthread is purpose-built for Crypto Twitter. It understands CT culture, vocabulary, and content patterns. It monitors real-time crypto events so users can be first, not late. And it learns each user's voice so outputs feel authentic.

---

## 1. Content Generation Engine

The core of xthread. Generates CT-native content optimized for the X algorithm and calibrated to the user's voice.

### 1.1 Post Types

Each post type has specialized prompts, structures, and optimization patterns.

**Alpha Thread**
- Purpose: Share non-obvious insights, research findings, or analysis
- Structure: Hook → Context → Evidence → Insight → Action → CTA
- Length: 5-10 tweets
- Optimization: Ends with question to drive replies, no hashtags in hook, 1-2 hashtags in final tweet

**Market Take**
- Purpose: Quick opinions on price action, macro events, market sentiment
- Structure: Clear position + specific reasoning
- Length: Single tweet or 2-3 tweet thread
- Optimization: Concise (<100 chars when possible), strong opinion, no hedging

**Hot Take**
- Purpose: Contrarian or spicy opinions to spark discussion
- Structure: Bold claim + supporting logic
- Length: Single tweet
- Optimization: Invites disagreement (drives high-value replies), confident tone

**On-Chain Insight**
- Purpose: Data-driven observations from blockchain analytics
- Structure: Insight first → Data/evidence → Implications
- Length: Single tweet or short thread
- Optimization: Designed to pair with chart/screenshot, leads with "so what"

**Protocol Breakdown**
- Purpose: Educational deep dives explaining how something works
- Structure: Why care → How it works → Risks/considerations → Implications
- Length: 5-10 tweet thread
- Optimization: Progressive complexity, honest about risks, ends with engagement hook

**Build-in-Public**
- Purpose: Updates on projects, learnings, and journey
- Structure: Update + specific metrics + honest reflection + ask
- Length: Single tweet or short thread
- Optimization: Specific numbers, vulnerability over polish, invites input

### 1.2 Editing Tools

One-click refinements applied after initial generation.

**Add Hook**
- Rewrites opening line to stop the scroll
- Uses proven patterns: bold claims, curiosity gaps, specific numbers, direct audience targeting

**Humanize**
- Adjusts language to sound less AI-generated
- Adds natural speech patterns, personality, slight imperfections
- Incorporates user's voice characteristics

**Shorten**
- Cuts content while preserving core message
- Targets <100 characters when possible (17% higher engagement)
- Removes filler words and redundant phrases

**Add Question**
- Appends engagement-driving question
- Specific and relevant, not generic "what do you think?"
- Optimizes for replies (27x more valuable than likes)

**Make Spicier**
- Sharpens opinion, removes hedging
- Adds edge and confidence
- Stays within bounds that won't trigger reports

**Expand to Thread**
- Transforms single post into multi-tweet thread
- Applies optimal thread structure (hook → insights → CTA)
- Maintains one idea per tweet, <250 chars each

### 1.3 Voice Learning

The system learns and applies each user's unique voice.

**Initial Setup (Onboarding)**
- User pastes 5-10 examples of their best tweets
- System extracts patterns: vocabulary, rhythm, opinion style, formatting

**Ongoing Learning**
- Every edit teaches the system user preferences
- Tracks which outputs user accepts vs. modifies
- Voice profile updates over time

**What Gets Learned**
- Vocabulary and phrase preferences
- Sentence structure and rhythm
- Level of formality
- Punctuation and formatting habits
- Emoji usage (frequency, which ones)
- Typical post length
- Opinion strength and hedging patterns

### 1.4 Algorithm Optimization Layer

Applied automatically to all generated content.

**Structure Optimization**
- Hooks optimized for scroll-stopping
- Thread structure follows proven patterns
- CTAs designed to drive replies (75x weight) over likes (0.5x weight)

**Format Optimization**
- Length calibrated to content type
- Hashtag placement (none in hooks, 1-2 in final tweet only)
- No misspellings (95% penalty)
- No spam signals (all caps, excessive punctuation)

**Engagement Optimization**
- Questions and opinion prompts to drive replies
- Incomplete information that invites contribution
- Specific audience targeting when appropriate

---

## 2. Research Hub

Where users store, organize, and generate content from their research.

### 2.1 File Upload

**Supported Formats**
- Documents: PDF, DOCX, TXT, MD
- Images: PNG, JPG, WEBP (for charts, screenshots)
- Data: CSV (for on-chain exports)

**Upload Flow**
- Drag-and-drop or click to upload
- Auto-extraction of text content
- Preview before saving
- Tag assignment on upload

**Use Cases**
- Upload research reports to generate threads
- Store screenshots of on-chain data
- Import notes from other tools

### 2.2 File Creation & Note-Taking

**Rich Text Editor**
- OneNote-style editing experience
- Headers, bullets, bold, italic, links
- Inline image embedding
- Code blocks for contract snippets

**Preset Research Templates**

*Protocol Analysis Template*
- Overview & Problem Being Solved
- How It Works (Technical)
- Tokenomics
- Team & Backers
- Risks & Considerations
- Investment Thesis
- Content Ideas

*Tokenomics Breakdown Template*
- Supply Mechanics
- Distribution
- Utility & Demand Drivers
- Emission Schedule
- Comparable Analysis
- Bull/Bear Cases

*Market Thesis Template*
- Macro Context
- On-Chain Signals
- Sentiment Analysis
- Key Levels / Scenarios
- Position & Timeframe
- Invalidation Criteria

*Project Due Diligence Template*
- Basic Info (Chain, Category, Stage)
- Problem & Solution
- Competitive Landscape
- Traction Metrics
- Team Assessment
- Red Flags
- Verdict

*Weekly Market Review Template*
- Major Events This Week
- Price Action Summary
- On-Chain Highlights
- What I Got Right/Wrong
- Watchlist for Next Week

**Auto-Save**
- Continuous saving as user types
- Version history accessible
- Never lose work

### 2.3 File Organization

**Sidebar Structure**
- Collapsible folder tree
- Drag-and-drop organization
- Nested folders supported
- Visual file type indicators

**Folder System**
- User-created folders
- Default starter folders: Drafts, Research, Published
- Folder colors/icons for visual organization

**Tagging System**
- Multiple tags per file
- Tag-based filtering
- Suggested tags based on content
- Tag management (rename, merge, delete)

**Search**
- Full-text search across all files
- Filter by folder, tag, date, file type
- Recent files quick access

### 2.4 Generate from Research

**Selection Flow**
- Select file or highlight specific text within file
- Click "Generate Post"
- Choose post type
- AI generates content using research as context

**Context Awareness**
- AI reads full file for context
- Pulls specific insights based on post type selected
- Maintains accuracy to source material

---

## 3. News Intelligence Feed

Real-time crypto event monitoring with seamless content generation flow.

### 3.1 Data Sources

**On-Chain Monitoring (Fastest Signal)**
- Whale wallet movements (large transfers)
- Smart contract deployments
- Governance proposal submissions
- Significant staking/unstaking events
- DEX volume anomalies
- Liquidation events

**Protocol & Project Announcements**
- Official project Twitter accounts
- Governance forums (Snapshot, Tally, Commonwealth)
- Discord announcement channels (via webhooks)
- GitHub releases for major protocols
- Blog/Mirror posts from key projects

**Market Data**
- Unusual price movements (% threshold alerts)
- Volume spikes vs. baseline
- Funding rate extremes
- Open interest changes
- Exchange inflow/outflow

**News & Media**
- The Block, CoinDesk, Decrypt, Blockworks
- Regulatory announcements
- Major mainstream coverage

**CT Signal Monitoring**
- High-signal account activity
- Emerging trending topics
- Multiple credible accounts mentioning same thing

### 3.2 AI Curation Layer

**Filtering**
- Removes noise and low-relevance events
- Deduplicates same story from multiple sources
- Filters based on user's stated interests/focus areas

**Ranking**
- Timeliness (how new)
- Potential impact (size of move, importance of protocol)
- Relevance to user's niche
- CT buzz (how much discussion already)

**Summarization**
- Each event gets concise AI summary
- Key facts extracted
- Why it matters context
- Potential angles for content

### 3.3 Feed Interface

**Layout**
- Reverse chronological by default
- Card-based design
- Visual indicators for event type (on-chain, news, price, etc.)
- Timestamp showing recency

**Each Feed Item Contains:**
- Event type icon
- Headline/summary
- Source attribution
- Time since event
- Relevance score indicator
- "Generate Post" button

**Filtering Options**
- By event type
- By chain/ecosystem
- By relevance threshold
- By time window

**Refresh**
- Auto-refresh with new item indicators
- Manual refresh option
- Real-time updates for high-priority events

### 3.4 News-to-Post Flow

**The Critical Path (Minimum Clicks)**

```
[News Feed] 
    → Click "Generate Post" on news item
[Generate Page]
    → News context pre-loaded
    → Select post type (default suggested based on news type)
    → Click "Generate"
[Edit/Review]
    → Review output
    → Optional: Apply editing tools
    → Click "Post" or "Schedule"
[Posted]
```

**Target: News → Posted in <60 seconds**

**Smart Defaults**
- Post type auto-suggested based on news type
  - Price move → Market Take
  - Protocol announcement → Alpha Thread or Hot Take
  - On-chain whale move → On-Chain Insight
- User can override any default

**Context Injection**
- News summary injected into generation prompt
- Source links available for reference
- Related context pulled if available (e.g., previous news about same protocol)

---

## 4. Content Calendar

Visual scheduling and queue management for consistent posting.

### 4.1 Calendar View

**Monthly View**
- Grid layout showing all scheduled posts
- Visual density indicator (how many posts per day)
- Click to view/edit scheduled post
- Drag to reschedule

**Weekly View**
- More detailed daily breakdown
- Time slots visible
- Optimal posting windows highlighted

**Daily View**
- Hour-by-hour timeline
- All scheduled posts with preview
- Gaps and opportunities visible

### 4.2 Scheduling

**Manual Scheduling**
- Pick date and time
- Timezone handling
- Recurring post option (for regular content types)

**Smart Scheduling**
- AI suggests optimal times based on:
  - General best practices (Tue-Thu, 8AM-2PM)
  - User's historical performance (when X API connected)
  - Audience activity patterns (when X API connected)
  - Content type considerations

**Queue System**
- Add posts to queue without specific time
- Queue auto-distributes across optimal slots
- Adjustable posting frequency (posts per day)

### 4.3 Post Management

**Draft Storage**
- Unscheduled posts saved as drafts
- Easy access from calendar sidebar
- Bulk scheduling from drafts

**Edit Scheduled Posts**
- Click to open and edit
- Reschedule with drag-and-drop
- Delete with confirmation

**Post Status Indicators**
- Scheduled
- Posted
- Failed (with retry option)
- Draft

### 4.4 X API Integration (Calendar)

**When Connected:**
- Posts published directly to X
- Success/failure feedback
- Posted content marked in calendar

**When Not Connected:**
- Calendar functions as planning tool
- Copy-to-clipboard for manual posting
- Reminder notifications at scheduled times

---

## 5. User Customization & Profile

Onboarding-first setup with settings access for later modifications.

### 5.1 Onboarding Flow (First-Time Only)

**Step 1: Basic Info**
- Display name / alias
- Profile photo (optional)
- X handle (for future connection)

**Step 2: Your Niche**
- Primary focus area selection:
  - Bitcoin / Digital Gold
  - Ethereum / L1s / L2s
  - DeFi / Yield
  - NFTs / Digital Art
  - Trading / Technical Analysis
  - Protocol Research / Due Diligence
  - Macro / Institutional
  - Memecoins / Degen
  - Building / Development
- Secondary interests (multi-select)
- Specific protocols/chains you cover

**Step 3: Your Voice**
- Paste 5-10 example tweets you're proud of
- Or: Describe your style in words
- Tone slider: Formal ←→ Casual
- Opinion strength: Hedged ←→ Direct
- Humor level: Serious ←→ Playful

**Step 4: Your Goals**
- Primary goal selection:
  - Build authority/credibility
  - Grow follower count
  - Drive traffic (to newsletter, Discord, etc.)
  - Network with others in space
  - Document my journey
- Content frequency target (posts per day/week)

**Step 5: X Account Status**
- Do you have X Premium? (Yes/No)
  - Affects link handling recommendations
  - Affects long-form content suggestions
- Connect X account (optional, can skip)

**Step 6: News Feed Preferences**
- Which event types to prioritize
- Which chains/ecosystems to focus on
- Alert threshold (all events vs. high-impact only)

### 5.2 Settings (Post-Onboarding Access)

**Location: Settings menu (not in main navigation)**

**Profile Settings**
- Edit all onboarding responses
- Update niche/focus areas
- Modify voice examples
- Change goals

**Voice Settings**
- View learned voice profile
- Add new example tweets
- Reset voice learning
- Adjust tone/style sliders

**News Feed Settings**
- Modify event type priorities
- Update chain/ecosystem focus
- Adjust relevance thresholds
- Manage notification preferences

**Calendar Settings**
- Default posting times
- Timezone
- Queue frequency defaults

**X Integration Settings**
- Connect/disconnect X account
- API permissions
- Posting preferences

**Account Settings**
- Email
- Password
- Subscription/billing
- Data export
- Delete account

### 5.3 Navigation Structure

**Main Navigation (Top Bar)**
- Generate
- Research Hub
- News Feed
- Calendar
- Insights (Algorithm education page)

**Not in Main Navigation:**
- Settings (accessed via profile menu/icon)
- Onboarding (only shown once, first login)

---

## 6. X API Integration

Direct connection to X for posting, scheduling, and analytics.

### 6.1 Authentication

**OAuth Flow**
- "Connect X Account" button
- Redirects to X for authorization
- Returns with access tokens
- Permissions requested: Read + Write + Direct Messages (optional)

**Connection Status**
- Visual indicator when connected
- Last sync timestamp
- Disconnect option in settings

### 6.2 Posting Integration

**Direct Posting**
- "Post Now" sends directly to X
- Thread posting handled automatically
- Success/failure confirmation
- Link to live post on success

**Scheduled Posting**
- Posts publish at scheduled time
- Retry logic for failures
- Notification on post success/failure

**Media Handling**
- Images uploaded to X with post
- Multiple images supported
- Preview before posting

### 6.3 Analytics Integration

**Account Analytics**
- Follower count and growth
- Profile visits
- Mention counts

**Post Analytics**
- Impressions per post
- Engagement metrics (likes, replies, retweets, quotes)
- Engagement rate calculation
- Click-through rate (for posts with links)

**Analytics Dashboard**
- Performance over time charts
- Best performing posts
- Optimal posting time analysis (based on user's actual data)
- Engagement rate trends

### 6.4 Audience Insights

**When Connected:**
- Follower activity patterns (when they're online)
- Audience demographics (if available)
- Top engaged followers

**Used For:**
- Smart scheduling optimization
- Content recommendations
- Posting time suggestions personalized to user's actual audience

---

## 7. Algorithm Insights Page

Educational content that builds trust and helps users understand why xthread works.

### 7.1 Content Sections

**The Engagement Hierarchy**
- Visual showing reply (27x) vs. like (1x) value
- Explanation of why conversation > applause
- How xthread optimizes for this

**The Golden Hour**
- First 60 minutes explanation
- Why velocity matters
- How timing features help

**The Format Hierarchy**
- Video > Images > Text > Links ranking
- Thread performance data
- When to use each format

**The Premium Reality**
- 4x/2x boost explanation
- What it means for non-Premium users
- How xthread adapts recommendations

**What Kills Your Reach**
- Penalty table (reports, blocks, misspellings)
- How xthread protects against penalties
- Common mistakes to avoid

**Myths vs. Facts**
- Debunking common misconceptions
- What actually matters for reach

### 7.2 Feature Documentation

**How Each Feature Works**
- Post types explained with when/why to use
- Editing tools and their purpose
- Voice learning explanation
- News feed data sources
- Calendar and scheduling

**Best Practices**
- Recommended workflows
- Tips for each feature
- Common user patterns

### 7.3 Page Design

**Tone:** Educational but not academic. Confident but not salesy.

**Structure:** 
- Scannable sections
- Key stats highlighted
- Minimal jargon
- Links to deeper resources where relevant

**CTA:** Reinforces that xthread handles algorithm optimization automatically—user focuses on ideas, xthread handles engineering.

---

## 8. Technical Architecture Notes

*High-level notes for Claude Code implementation.*

### 8.1 Core Stack Considerations

**Frontend**
- React/Next.js (already in use)
- Real-time updates for News Feed (WebSocket or polling)
- Rich text editor library for Research Hub

**Backend**
- API routes for all features
- Background jobs for news monitoring
- Queue system for scheduled posts

**Database**
- User profiles and settings
- Research files and folders
- Generated content history
- Scheduled posts
- Analytics data

**External APIs**
- X API (OAuth, posting, analytics)
- On-chain data providers (Etherscan, etc.)
- News aggregator feeds
- AI generation (Claude API)

### 8.2 AI Integration Points

**Content Generation**
- Claude API for all generation
- System prompts built from:
  - Algorithm research doc
  - CT patterns doc
  - User voice profile
  - Post type templates

**News Curation**
- AI filtering/ranking of raw events
- AI summarization of news items
- Relevance scoring

**Voice Learning**
- Initial extraction from examples
- Ongoing learning from edits
- Voice profile stored per user

### 8.3 Real-Time Requirements

**News Feed**
- Near real-time updates (sub-minute latency ideal)
- Efficient polling or WebSocket connection
- Background processing of raw feeds

**Calendar**
- Accurate scheduled posting (within 1-minute precision)
- Reliable job queue
- Failure handling and retries

---

## 9. v1 Scope Boundaries

### Included in v1

- All features described in sections 1-7
- X API integration for posting and basic analytics
- Single user accounts (no team features)
- Web application (responsive for mobile viewing, not native app)

### Explicitly NOT in v1

- Team/collaboration features
- Multi-account management
- Native mobile apps
- White-label/API access for others
- Advanced analytics (sentiment analysis, competitor tracking)
- Community features (sharing templates, public profiles)
- Browser extension
- Telegram/Discord integrations

### Future Consideration (v1.5+)

- Advanced analytics dashboard
- A/B testing for posts
- Competitor monitoring
- Team workspaces
- API access for power users
- Mobile apps

---

## 10. Success Metrics

### User Engagement

- Daily active users
- Posts generated per user per week
- News feed → Generate conversion rate
- Research files created per user
- Scheduled posts per user

### Content Quality

- User edit rate (lower = better generation)
- Posts actually published vs. generated
- Time from news event to posted content

### Growth (User's X Account)

- Follower growth rate for active users
- Engagement rate improvement over time
- Impressions growth

### Business

- User retention (weekly, monthly)
- Subscription conversion (if freemium)
- NPS score

---

## Document History

- **Created:** January 2025
- **Purpose:** Define xthread v1 feature scope for development
- **Related Docs:** 
  - `x_algorithm_research.md` - Technical algorithm knowledge
  - `crypto_twitter_patterns.md` - CT culture and content patterns
  - `algorithm_insights_feature_guide.md` - User-facing education content

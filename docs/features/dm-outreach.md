# DM Outreach Feature Spec

## Overview
Allow users to create DM templates in xthread and use them for quick cold outreach via the Chrome extension.

## User Flow

### In xthread (Web App)
1. User navigates to Settings > Outreach Templates (new section)
2. Creates templates with title + message body
3. Can use variables: `{{username}}`, `{{display_name}}`, `{{bio_snippet}}`
4. Templates sync to their account

### In Chrome Extension (on X.com)
1. User visits any X profile page
2. Sees "Message" button (next to Coach/Watch buttons)
3. Clicks → Modal shows their saved templates
4. Selects template → Variables auto-filled with profile data
5. Preview shown, user can edit
6. "Open DM" → Extension opens X DM composer with message pre-filled
7. User reviews and clicks Send manually

---

## Database Schema

```sql
-- DM Outreach Templates
CREATE TABLE IF NOT EXISTS public.dm_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  message_body text NOT NULL,
  
  -- Variables available: {{username}}, {{display_name}}, {{bio_snippet}}
  
  -- Stats (optional, for future)
  times_used integer DEFAULT 0,
  
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dm_templates_user_id ON public.dm_templates(user_id);
CREATE INDEX idx_dm_templates_x_account_id ON public.dm_templates(x_account_id);

-- RLS
ALTER TABLE public.dm_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dm_templates"
  ON public.dm_templates FOR ALL
  USING (auth.uid() = user_id);
```

---

## API Routes

### `GET /api/dm-templates`
List user's DM templates (for extension and web app)
- Query params: `x_account_id` (optional filter)
- Returns: `{ templates: DmTemplate[] }`

### `POST /api/dm-templates`
Create a new template
- Body: `{ title, message_body, x_account_id? }`
- Returns: created template

### `PUT /api/dm-templates/[id]`
Update a template
- Body: `{ title?, message_body?, position? }`
- Returns: updated template

### `DELETE /api/dm-templates/[id]`
Delete a template

### `POST /api/dm-templates/[id]/used`
Increment usage counter (called by extension when template is used)

---

## xthread Web UI

### Location: Settings > Outreach Templates

```
┌─────────────────────────────────────────────────────┐
│ Outreach Templates                    [+ New Template] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📝 Introduction Template                    [Edit] │
│  "Hey {{display_name}}! I noticed you're into..."  │
│  Used: 12 times                                     │
│                                                     │
│  📝 xthread Pitch                           [Edit] │
│  "Hey! Building something for creators like..."    │
│  Used: 8 times                                      │
│                                                     │
│  📝 Collaboration Ask                       [Edit] │
│  "Love your content {{display_name}}! Would..."    │
│  Used: 3 times                                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Template Editor Modal
- Title input
- Message textarea with variable buttons
- Preview with sample data
- Save/Cancel buttons

---

## Chrome Extension UI

### Profile Page Button
Add "Message" button in the button row on X profile pages:
```
[🎯 Coach] [👁️ Watch] [📊 Analyze] [✉️ Message]
```

### Template Selector Modal
When clicked, show overlay:
```
┌─────────────────────────────────────────┐
│ Send Message to @username               │
├─────────────────────────────────────────┤
│                                         │
│  Select a template:                     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📝 Introduction Template        │   │
│  │ Hey John! I noticed you're...   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📝 xthread Pitch                │   │
│  │ Hey! Building something for...  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Create templates in xthread →]        │
│                                         │
└─────────────────────────────────────────┘
```

### After Selection - Preview & Edit
```
┌─────────────────────────────────────────┐
│ Message Preview                    [×]  │
├─────────────────────────────────────────┤
│                                         │
│  To: @username (John Smith)             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Hey John! I noticed you're      │   │
│  │ into building cool stuff.       │   │
│  │                                 │   │
│  │ I'm working on xthread - an AI  │   │
│  │ tool for Twitter creators...    │   │
│  │                                 │   │
│  │ [editable textarea]             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancel]              [Open DM →]      │
│                                         │
└─────────────────────────────────────────┘
```

### DM Opening Logic
1. Get the user's X user ID from the profile page
2. Navigate to `https://x.com/messages/compose?recipient_id={user_id}`
3. Wait for composer to load
4. Paste the message into the textarea
5. User reviews and clicks Send

---

## Implementation Order

### Phase 1: Database & API (30 min)
1. Create migration for dm_templates table
2. Create API routes (CRUD)

### Phase 2: xthread Web UI (45 min)
1. Add "Outreach Templates" section to Settings
2. Template list component
3. Template editor modal
4. Variable insertion buttons

### Phase 3: Chrome Extension (1 hr)
1. Add "Message" button to profile pages
2. Fetch templates from API
3. Template selector modal
4. Preview/edit modal
5. DM composer automation

### Phase 4: Polish (30 min)
1. Usage tracking
2. Empty states
3. Error handling
4. Loading states

---

## Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `{{username}}` | X handle without @ | `elonmusk` |
| `{{display_name}}` | Display name | `Elon Musk` |
| `{{bio_snippet}}` | First 50 chars of bio | `Building the future...` |

---

## Future Enhancements
- Outreach history (who you've messaged)
- Response tracking
- A/B testing templates
- Smart suggestions based on profile
- Bulk outreach mode (with safety limits)

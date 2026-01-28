# X API Integration — Technical Spec

## Overview

Integrate X API v2 to enable:
1. **OAuth 2.0 Sign In** — Replace Google auth with "Sign in with X"
2. **Read User's Tweets** — For voice training and engagement analysis
3. **Post Tweets/Threads** — Direct posting from xthread
4. **Read Engagement Metrics** — Power the real engagement scorer

## API Pricing (Pay-per-use Pilot)

| Action | Cost | Our Usage |
|--------|------|-----------|
| Posts: Read | $0.005/post | ~200 posts for voice training = $1 |
| User: Read | $0.01/user | 1x per user = $0.01 |
| Content: Create | $0.01/post | ~30 posts/mo = $0.30 |

**Per user cost: ~$1 onboarding, ~$0.30/mo ongoing**

## OAuth 2.0 PKCE Flow

### Scopes Needed
```
tweet.read        # Read user's tweets
tweet.write       # Post tweets
users.read        # Read user profile
offline.access    # Refresh tokens (long-lived sessions)
```

### Flow
1. User clicks "Sign in with X"
2. Redirect to: `https://x.com/i/oauth2/authorize?...`
3. User authorizes → redirected back with `code`
4. Exchange code for access_token + refresh_token
5. Store tokens in Supabase (encrypted)

### Token Refresh
- Access tokens expire (2 hours)
- Use refresh_token to get new access_token
- Refresh tokens last until revoked

## Endpoints We'll Use

### 1. Get User Profile
```
GET https://api.x.com/2/users/me
Authorization: Bearer {access_token}
```

Response includes: id, name, username, profile_image_url

### 2. Get User's Tweets (for voice training)
```
GET https://api.x.com/2/users/{id}/tweets
  ?max_results=100
  &tweet.fields=public_metrics,created_at
Authorization: Bearer {access_token}
```

Returns up to 100 tweets per request with engagement metrics.

### 3. Post a Tweet
```
POST https://api.x.com/2/tweets
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "text": "Tweet content here"
}
```

### 4. Post a Thread (reply chain)
```
POST https://api.x.com/2/tweets
{
  "text": "1/ First tweet...",
}
→ returns tweet_id

POST https://api.x.com/2/tweets
{
  "text": "2/ Second tweet...",
  "reply": { "in_reply_to_tweet_id": "{previous_tweet_id}" }
}
```

## Database Schema Changes

### New table: `x_tokens`
```sql
CREATE TABLE x_tokens (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  x_user_id TEXT NOT NULL,
  x_username TEXT NOT NULL,
  access_token TEXT NOT NULL,  -- encrypted
  refresh_token TEXT NOT NULL, -- encrypted
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Update `profiles` table
```sql
ALTER TABLE profiles ADD COLUMN x_user_id TEXT;
ALTER TABLE profiles ADD COLUMN x_username TEXT;
```

## Implementation Plan

### Phase 1: OAuth (Day 1)
- [ ] Create X App in Developer Portal
- [ ] Add OAuth callback route `/api/auth/x/callback`
- [ ] Implement PKCE flow
- [ ] Store tokens in Supabase
- [ ] Add "Sign in with X" button

### Phase 2: Read Tweets (Day 2)
- [ ] Create `/api/x/tweets` endpoint
- [ ] Pull user's recent tweets on auth
- [ ] Store tweets for voice training
- [ ] Calculate engagement metrics

### Phase 3: Post Tweets (Day 3)
- [ ] Create `/api/x/post` endpoint
- [ ] Update "Post Now" button to use API
- [ ] Add thread posting (reply chain)
- [ ] Update calendar to auto-post scheduled content

### Phase 4: Engagement Scorer v2 (Day 4-5)
- [ ] Analyze user's actual engagement data
- [ ] Build personalized scoring model
- [ ] Replace heuristic scorer with data-driven one
- [ ] Show predicted vs actual performance

## Security Considerations

1. **Token encryption** — Never store tokens in plaintext
2. **Token refresh** — Background job to refresh expiring tokens
3. **Scope minimization** — Only request scopes we need
4. **Rate limiting** — Respect X API rate limits

## Environment Variables

```env
X_CLIENT_ID=xxx
X_CLIENT_SECRET=xxx
X_CALLBACK_URL=https://xthread.io/api/auth/x/callback
```

## Files to Create/Modify

```
src/
  app/
    api/
      auth/
        x/
          route.ts        # OAuth initiation
          callback/
            route.ts      # OAuth callback
      x/
        tweets/
          route.ts        # Get user tweets
        post/
          route.ts        # Post tweet
        thread/
          route.ts        # Post thread
  lib/
    x-api.ts              # X API client wrapper
    x-auth.ts             # OAuth helpers
  components/
    auth/
      XSignInButton.tsx   # Sign in with X button
```

## Timeline

With API access approved:
- **Day 1**: OAuth flow working
- **Day 2**: Reading tweets for voice training
- **Day 3**: Posting tweets/threads
- **Day 4-5**: Engagement scorer v2
- **Day 6**: Testing and polish

**Ready to build as soon as Spencer is approved for the pilot.**

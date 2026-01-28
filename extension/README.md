# xthread Browser Extension — Reply Assistant

Chrome extension that helps xthread users craft engaging replies on X (Twitter) to grow their following.

## Features

- **AI-Powered Replies**: Generate 3 reply options for any post, matching your voice profile
- **One-Click Insert**: Insert generated replies directly into X's reply box
- **Voice Matching**: Uses your xthread content profile to match your unique style
- **Premium Feature**: Available to xthread premium subscribers

## Installation (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/dist` folder

## Structure

```
extension/
├── manifest.json          # Extension manifest (V3)
├── src/
│   ├── content/          # Content scripts (injected into X.com)
│   ├── popup/            # Popup UI (click extension icon)
│   ├── background/       # Service worker
│   ├── styles/           # CSS for injected UI
│   └── auth-callback.html # OAuth callback page
├── dist/                  # Built extension (load this in Chrome)
└── scripts/              # Build scripts
```

## How It Works

1. User clicks the extension icon and signs in with their xthread account
2. Extension verifies premium subscription status
3. When browsing X, a purple "Reply" button appears on each post
4. Clicking the button sends the post to xthread's API
5. Claude generates 3 reply options matching the user's voice profile
6. User clicks "Use this" to insert a reply into X's composer

## API Endpoints

The extension uses these xthread API endpoints:

- `GET /api/extension/user` - Get user info and premium status
- `POST /api/extension/generate-replies` - Generate reply options

## Building for Production

```bash
# Install dependencies (if using build tools)
npm install

# Generate icons
node scripts/generate-icons.js

# The dist/ folder is ready to load or package
```

## Publishing to Chrome Web Store

1. Create a ZIP of the `dist/` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the ZIP
4. Fill in listing details (description, screenshots, etc.)
5. Submit for review

## Notes

- Icons are placeholder — replace with branded icons before publishing
- Requires xthread premium subscription ($9.99/mo or $99.99 lifetime)
- Uses Claude claude-sonnet-4-20250514 for reply generation

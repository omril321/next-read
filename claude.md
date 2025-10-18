# Next Read - Chrome Extension

## Overview
Next Read is a Chrome extension that enhances the Libby browsing experience by displaying book ratings, review counts, and direct links to Goodreads and Google Books on book cards.

## Problem Statement
When browsing books on Libby, users lack important context about books:
- No ratings or review information
- No quick way to read reviews or learn more about books
- Must manually search external sites for this data

## Solution
Chrome extension that:
1. Detects book cards on any Libby page (library, search, browse, etc.)
2. Extracts book title and author from the card
3. Scrapes Goodreads for ratings and review counts
4. Displays this information inline with clickable links to Goodreads and Google Books
5. Caches results in Chrome storage to minimize requests

## Tech Stack
- **Language**: TypeScript
- **Platform**: Chrome Extension (Manifest V3)
- **Data Source**: Goodreads (public search pages via web scraping)
- **Storage**: Chrome Storage API (local)
- **Build**: esbuild bundler
- **Architecture**: Background service worker to bypass CORS restrictions

## Architecture

### Directory Structure
```
src/
├── manifest.json          # Extension configuration
├── types/
│   └── index.ts          # TypeScript type definitions
├── api/
│   └── goodreads.ts      # Goodreads scraper
├── background/
│   └── background.ts     # Background service worker (CORS bypass)
├── storage/
│   └── cache.ts          # Chrome storage cache layer
├── content/
│   ├── content.ts        # Main content script
│   └── card-detector.ts  # Book card detection & extraction
└── styles/
    └── content.css       # Inline styles for book metadata
```

### Components

#### 1. **Content Script** (`content/content.ts`)
- Main entry point injected into Libby pages
- Uses MutationObserver to detect dynamically loaded book cards
- Orchestrates card detection → data fetching → UI augmentation
- Handles loading states and implements request queueing with rate limiting
- Communicates with background service worker to fetch Goodreads data

#### 2. **Card Detector** (`content/card-detector.ts`)
- Identifies Libby book card elements in the DOM
- Extracts book title from accessible text (pattern: `"Book: 'Title'. Cover image."`)
- Attempts to extract author from nearby DOM elements
- Marks cards as processed using `data-nextread-processed` attribute
- Manages loading state with `data-nextread-loading` attribute

#### 3. **Goodreads Scraper** (`api/goodreads.ts`)
- Sends requests to background service worker (bypasses CORS)
- Parses Goodreads search result HTML using DOMParser
- Extracts rating and review count from `.minirating` elements
- Returns structured data or null if book not found
- Handles errors gracefully

#### 4. **Background Service Worker** (`background/background.ts`)
- Listens for `FETCH_GOODREADS` messages from content script
- Fetches Goodreads search pages (bypasses CORS restrictions)
- Returns raw HTML to content script for parsing
- Enables cross-origin requests that content scripts cannot make

#### 5. **Cache Layer** (`storage/cache.ts`)
- Stores fetched book data in Chrome's local storage
- Cache key: normalized `"book:{title}:{author}"`
- Cache duration: 30 days
- Prevents redundant requests for the same books

#### 6. **UI Augmentation**
- Displays ratings as: `⭐ 4.2 (197k) 📖 📚`
- Shows loading spinner while fetching data
- Adds clickable emoji links:
  - 📖 → Google Books search
  - 📚 → Goodreads search
- Minimal, unobtrusive styling optimized for dark backgrounds

## Libby DOM Structure

Book cards on Libby are identified by:
- `<a>` elements with accessible text matching: `"Book: 'Title'. Cover image."` or `"Audiobook: 'Title'. Cover image."`
- Title is extracted from single quotes in the accessible text
- Author extraction is best-effort (looks for "by Author" patterns in parent elements)

## Configuration

### Manifest Permissions
- `storage` - For caching book data
- Host permissions:
  - `https://libbyapp.com/*` - Main Libby domain
  - `https://*.overdrive.com/*` - Alternate Libby domain
  - `https://*.goodreads.com/*` - Goodreads for scraping

### Background Service Worker
- Required to bypass CORS restrictions when fetching Goodreads pages
- Content scripts run in the context of Libby and cannot make cross-origin requests
- Background worker has host permissions and forwards HTML to content script

## Development

### Building the Extension
```bash
yarn build
```
This compiles TypeScript to JavaScript using esbuild and copies static files (manifest.json, CSS) to `dist/`.

### Loading in Chrome
1. Run `yarn build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` directory

### Development Workflow
```bash
yarn watch  # Watch mode for TypeScript compilation
```
After making changes, reload the extension in Chrome.

### Code Quality
```bash
yarn type-check  # TypeScript type checking
yarn lint        # ESLint
yarn format      # Prettier formatting
yarn check       # Run all checks
```

## Goodreads Scraping

The extension scrapes public Goodreads search pages for personal use only.

**How it works**:
1. Content script sends book title/author to background service worker
2. Background worker fetches: `https://www.goodreads.com/search?q={title}+{author}`
3. Returns HTML to content script
4. Content script parses HTML for `.minirating` element
5. Extracts rating text like "4.08 avg rating — 197,024 ratings"

**Rate limiting**:
- 500ms delay between requests (prevents detection)
- Request queue ensures sequential processing
- 30-day cache minimizes scraping

**CORS bypass**:
- Content scripts cannot bypass CORS even with host permissions
- Background service worker has host permissions and can fetch cross-origin
- Message passing bridges content script and background worker

## Known Limitations

1. **Author extraction**: Best-effort only, depends on Libby's DOM structure
2. **Goodreads coverage**: Not all books may have ratings on Goodreads
3. **Scraping fragility**: Goodreads HTML structure changes may break parsing
4. **Personal use only**: This scrapes public Goodreads pages and violates their ToS for automated access
5. **Rate limiting**: Implements delays to avoid detection, but aggressive usage may trigger blocks

## Future Enhancements

- Add extension icon (currently placeholder in manifest)
- Options page for configuration (cache duration, display preferences)
- Better author extraction logic
- Statistics on cache hit rate
- Manual refresh option for cached data
- Fallback to other data sources if Goodreads fails

## Deployment

For production use:
1. Create proper extension icons (16x16, 48x48, 128x128 PNG)
2. Update version in manifest.json
3. Test on multiple Libby pages
4. ⚠️ **Note**: This extension scrapes Goodreads and is for personal use only - not suitable for public distribution

---
**Last Updated**: 2025-10-18
**Status**: Chrome extension fully implemented with Goodreads scraping
**Personal Use Only**: This extension scrapes public Goodreads pages and should not be distributed publicly

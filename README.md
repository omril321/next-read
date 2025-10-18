# Next Read - Libby Book Enhancer

A Chrome extension that enhances your Libby browsing experience by displaying book ratings, review counts, and direct links to Goodreads and Google Books.

## Features

- **Automatic Enhancement**: Detects book cards on any Libby page
- **Book Ratings**: Shows average rating (1-5 stars) and review count from Goodreads
- **Direct Links**: Quick access to Goodreads (📚) and Google Books (📖) for each title
- **Smart Caching**: Stores fetched data for 30 days to minimize requests
- **Unobtrusive Design**: Minimal, clean interface that doesn't interfere with Libby's UI
- **Real-time Updates**: Uses MutationObserver to enhance dynamically loaded content

## Installation

### Prerequisites
- Google Chrome browser
- Node.js and Yarn (for building from source)

### Build from Source

1. **Clone the repository**
   ```bash
   cd next-read
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Build the extension**
   ```bash
   yarn build
   ```
   This compiles TypeScript and copies files to the `dist/` directory.

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist/` directory

## Usage

1. Navigate to [Libby](https://libbyapp.com) and browse or search for books
2. The extension automatically enhances book cards with:
   - ⭐ Rating (e.g., 4.2)
   - Review count (e.g., 197k reviews)
   - 📖 Link to Google Books
   - 📚 Link to Goodreads
3. Data appears inline below each book's cover image
4. A loading spinner shows while data is being fetched

## How It Works

1. **Detection**: Content script identifies book cards on Libby pages
2. **Extraction**: Extracts book title (and optionally author) from card elements
3. **Data Fetching**: Scrapes Goodreads search results for ratings and review counts
4. **Caching**: Stores results in Chrome's local storage
5. **Display**: Injects metadata and links below the book cover with minimal styling

## Development

### Development Workflow

```bash
# Watch mode for TypeScript compilation
yarn watch

# Type checking
yarn type-check

# Linting
yarn lint

# Formatting
yarn format

# Run all checks
yarn check
```

After making changes:
1. Rebuild: `yarn build`
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Next Read extension

### Project Structure

```
src/
├── manifest.json          # Extension configuration
├── types/
│   └── index.ts          # TypeScript interfaces
├── api/
│   └── goodreads.ts      # Goodreads scraper
├── background/
│   └── background.ts     # Background service worker (bypasses CORS)
├── storage/
│   └── cache.ts          # Chrome storage cache layer
├── content/
│   ├── content.ts        # Main content script
│   └── card-detector.ts  # Book card detection
└── styles/
    └── content.css       # Inline styles
```

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Language**: TypeScript
- **Data Source**: Goodreads (public search pages)
- **Storage**: Chrome Storage API (local)
- **Cache Duration**: 30 days
- **Architecture**: Uses background service worker to bypass CORS restrictions

## Known Limitations

1. **Author Extraction**: Best-effort; depends on Libby's DOM structure
2. **Goodreads Coverage**: Not all books may have ratings
3. **Rate Limiting**: Implements delays between requests to avoid detection
4. **Personal Use**: This extension scrapes public Goodreads pages and is intended for personal use only

## Troubleshooting

**Extension not working:**
- Check that Developer mode is enabled
- Verify the extension is enabled in `chrome://extensions/`
- Check the browser console for errors (F12 → Console)

**No data showing:**
- Book may not be found on Goodreads
- Check network requests in DevTools (F12 → Network)
- Try clearing cache: remove and reload the extension

**Wrong book data:**
- Goodreads matches by title/author; ambiguous titles may mismatch
- Use the 📚 link to verify the correct book on Goodreads

## Privacy

This extension:
- ✅ Does NOT collect any personal data
- ✅ Does NOT track your browsing
- ✅ Only fetches public Goodreads search pages
- ✅ Stores data only in local Chrome storage (never leaves your browser)
- ⚠️  Scrapes public Goodreads pages for personal use only

## License

MIT

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

**Note**: This is an unofficial extension and is not affiliated with Libby, OverDrive, or Goodreads. It scrapes public Goodreads pages for personal use only and should be used responsibly.

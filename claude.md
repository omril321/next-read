# Next Read - Project Context

## Overview
Next Read helps find the next book to read by checking Storygraph to-read pile against Libby (Tel Aviv library) availability.

## Problem Statement
User keeps a to-read list on Storygraph with books in mixed languages (Hebrew/English). When looking for next book to read, it's tedious to:
1. Browse Storygraph to-read pile
2. Search for each book on Libby
3. Check availability
4. Jump back and forth between services

## Solution
Web app (mobile-optimized) that:
1. Fetches to-read list from Storygraph
2. Finds Hebrew and English titles for each book
3. Searches Libby for availability
4. Shows books available to borrow now

## Tech Stack
- **Runtime**: Node.js 24 (via nvm)
- **Backend**: Express.js
- **Scraping**: Puppeteer (for Storygraph authentication)
- **Book Data**: Google Books API (for title translations/editions)
- **Storage**: None (lean approach - no caching for MVP)
- **Frontend**: Plain HTML/CSS/JS (mobile-first)

## Architecture

### Services
1. **StorygraphService** (`src/services/storygraph.js`)
   - Authenticates with email/password
   - Scrapes to-read pile from user's account
   - Returns: book titles, authors, Storygraph URLs

2. **GoogleBooksService** (`src/services/googleBooks.js`)
   - Finds book by title/author
   - Retrieves Hebrew and English editions
   - Returns: ISBNs, both language titles

3. **LibbyService** (`src/services/libby.js`)
   - Generates Libby search URLs for Tel Aviv library
   - Currently: URL generation only (no API)
   - Future: OverDrive API integration for availability check

### API Endpoints
- `GET /api/books` - Main endpoint: fetches and processes all books
- `GET /` - Frontend UI

## Configuration
Environment variables (`.env`):
- `STORYGRAPH_EMAIL` - Storygraph login email
- `STORYGRAPH_PASSWORD` - Storygraph password
- `GOOGLE_BOOKS_API_KEY` - (Optional) Google Books API key
- `LIBBY_LIBRARY_ID` - Library identifier (default: `telaviv`)

## API Limitations & Workarounds

### Storygraph
- **No official API** - Using authenticated scraping with Playwright
- **Approach**: Login with credentials, scrape public-facing HTML
- **Risk**: Breaks if HTML structure changes
- **Mitigation**: Clean service abstraction for easy updates
- **Duplicate handling**: Filters duplicate h3 elements by checking book URLs

### Libby/OverDrive
- **Official API exists** but requires partnership approval
- **MVP Approach**: Generate direct search URLs
- **Future**: Apply for OverDrive API access for availability checking

### Google Books
- **Status**: Currently disabled due to 403 errors
- **Workaround**: Using Hebrew character detection (Unicode range \u0590-\u05FF)
- **Future**: Investigate Google Books API key requirements or alternative book APIs

## Development Principles
- **Lean & Simple**: No database, no caching (for now)
- **Personal Use**: Optimized for single user
- **Extensible**: Clean service layer for future enhancements
- **Mobile-First**: Primary use case is on mobile device

## Future Enhancements
- OverDrive API integration for real-time availability
- Support for additional libraries
- Caching layer for performance
- Filtering/sorting options
- Reading history integration

## Deployment Notes
- Credentials stored as environment variables
- GitHub Secrets for CI/CD deployment
- Consider serverless (Vercel/Netlify) for simplicity

## Known Issues & TODOs
- Google Books API returns 403 errors - need to investigate API key setup
- Currently only shows first page of to-read pile (pagination not implemented)
- No real-time availability check from Libby (just generates search URLs)

---
**Last Updated**: 2025-10-17
**Status**: MVP working - login, scraping, and Libby links functional

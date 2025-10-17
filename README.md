# Next Read

Find your next book to read by checking your Storygraph to-read pile against Libby availability.

## Features

- Fetches your to-read list from Storygraph
- Finds Hebrew and English editions of each book
- Generates direct Libby search links
- Mobile-optimized interface

## Prerequisites

- Node.js 24 (via nvm)
- Yarn
- Storygraph account
- Tel Aviv library card (or modify for your library)

## Setup

1. **Install Node 24**
   ```bash
   nvm use
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```
   STORYGRAPH_EMAIL=your-email@example.com
   STORYGRAPH_PASSWORD=your-password
   GOOGLE_BOOKS_API_KEY=  # Optional
   LIBBY_LIBRARY_ID=telaviv
   ```

4. **Run the app**
   ```bash
   yarn dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Usage

1. Open the app in your mobile browser
2. Click "Refresh Books" to fetch your latest to-read pile
3. Browse available books with Hebrew/English editions
4. Click "Search on Libby" to check availability

## How It Works

1. **Storygraph Service** - Logs in with your credentials and scrapes your to-read pile
2. **Google Books Service** - Finds Hebrew and English editions of each book
3. **Libby Service** - Generates search URLs for your library
4. **Frontend** - Mobile-optimized interface to browse and search

## Project Structure

```
next-read/
├── src/
│   ├── server.js              # Express server
│   ├── services/
│   │   ├── storygraph.js      # Storygraph scraper
│   │   ├── googleBooks.js     # Google Books API client
│   │   └── libby.js           # Libby URL generator
│   └── public/
│       └── index.html         # Frontend UI
├── .env.example
├── .nvmrc
├── package.json
└── claude.md                  # Project context
```

## Notes

- No caching - fetches fresh data on each request
- Storygraph scraping uses authenticated session
- Google Books API works without key (lower rate limits)
- Libby links are search URLs (no availability check yet)

## Future Enhancements

- OverDrive API integration for real-time availability
- Support for multiple libraries
- Caching layer
- Filtering and sorting options

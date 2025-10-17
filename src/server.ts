/**
 * Next Read Server
 *
 * Express server that:
 * 1. Fetches to-read books from Storygraph
 * 2. Enriches them with Google Books editions
 * 3. Generates Libby search URLs
 * 4. Serves the results via REST API
 */

import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { StorygraphService } from './services/storygraph.js';
import { GoogleBooksService } from './services/googleBooks.js';
import { LibbyService } from './services/libby.js';
import type {
  BooksApiResponse,
  ErrorApiResponse,
  HealthResponse,
  EnrichedBook,
} from './types/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Services
const storygraph = new StorygraphService();
const googleBooks = new GoogleBooksService();
const libby = new LibbyService();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Main API endpoint - Fetch and enrich all to-read books
 */
app.get('/api/books', async (_req: Request, res: Response<BooksApiResponse | ErrorApiResponse>) => {
  try {
    console.log('Fetching to-read books from Storygraph...');
    const toReadBooks = await storygraph.getToReadPile();
    console.log(`Found ${toReadBooks.length} books`);

    console.log('Enriching book data with Google Books and Libby links...');
    const enrichedBooks: EnrichedBook[] = await Promise.all(
      toReadBooks.map(async (book) => {
        try {
          // Get Hebrew and English editions
          const editions = await googleBooks.findEditions(
            book.title,
            book.author
          );

          // Generate Libby search URLs for both languages
          const libbyLinks = {
            english: libby.getSearchUrl(editions.englishTitle ?? book.title),
            hebrew: libby.getSearchUrl(editions.hebrewTitle ?? book.title),
          };

          return {
            ...book,
            editions,
            libbyLinks,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error processing book "${book.title}":`, errorMessage);
          return {
            ...book,
            editions: { englishTitle: book.title, hebrewTitle: null, isbns: [] },
            libbyLinks: {
              english: libby.getSearchUrl(book.title),
              hebrew: null,
            },
            error: errorMessage,
          };
        }
      })
    );

    res.json({
      success: true,
      count: enrichedBooks.length,
      books: enrichedBooks,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Next Read server running on http://localhost:${PORT}`);
});

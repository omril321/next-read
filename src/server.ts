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
 * Basic API endpoint - Fetch books from Storygraph only (fast)
 */
app.get(
  '/api/books/basic',
  async (_req: Request, res: Response<BooksApiResponse | ErrorApiResponse>) => {
    try {
      console.log('Fetching to-read books from Storygraph...');
      const toReadBooks = await storygraph.getToReadPile();
      console.log(`Found ${toReadBooks.length} books`);

      // Return basic books without enrichment
      const basicBooks: EnrichedBook[] = toReadBooks.map((book) => ({
        ...book,
        editions: {
          englishTitle: book.title,
          hebrewTitle: null,
          isbns: [],
          hebrewAuthor: null,
          series: null,
          genres: [],
          rating: null,
        },
        libbyLinks: {
          english: null,
          hebrew: null,
        },
        libbyAvailability: null,
      }));

      res.json({
        success: true,
        count: basicBooks.length,
        books: basicBooks,
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
  }
);

/**
 * Enrich a single book by index
 */
app.get(
  '/api/books/:index/enrich',
  async (
    req: Request<{ index: string }>,
    res: Response<{ success: boolean; book?: EnrichedBook; error?: string }>
  ) => {
    try {
      const index = parseInt(req.params.index, 10);

      // Get all books from Storygraph
      const toReadBooks = await storygraph.getToReadPile();

      if (index < 0 || index >= toReadBooks.length) {
        return res.status(404).json({
          success: false,
          error: 'Book index out of range',
        });
      }

      const book = toReadBooks[index];
      if (!book) {
        return res.status(404).json({
          success: false,
          error: 'Book not found',
        });
      }

      console.log(`Enriching book ${index}: ${book.title}...`);

      // Get Hebrew and English editions with ratings, genres, and series
      const editions = await googleBooks.findEditions(book.title, book.author);

      // Prioritize Hebrew title for Libby search if available (title only)
      const preferredTitle =
        editions.hebrewTitle ?? editions.englishTitle ?? book.title;

      // Check Libby availability using preferred title only
      const libbyAvailability = await libby.checkAvailability(
        preferredTitle,
        undefined // No fallback - use preferred language only
      );

      // Generate single Libby search URL with preferred title
      const libbyLinks = {
        english: null, // Deprecated - keeping for type compatibility
        hebrew: null, // Deprecated - keeping for type compatibility
      };

      const enrichedBook: EnrichedBook = {
        ...book,
        editions,
        libbyLinks,
        libbyAvailability,
      };

      console.log(
        `✓ ${book.title} - Available: ${libbyAvailability.isAvailable ? 'Yes' : 'No'}`
      );

      return res.json({
        success: true,
        book: enrichedBook,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Error enriching book:', errorMessage);
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
);

/**
 * Main API endpoint - Fetch and enrich all to-read books (legacy, slower)
 */
app.get(
  '/api/books',
  async (_req: Request, res: Response<BooksApiResponse | ErrorApiResponse>) => {
    try {
      console.log('Fetching to-read books from Storygraph...');
      const toReadBooks = await storygraph.getToReadPile();
      console.log(`Found ${toReadBooks.length} books`);

      console.log(
        'Enriching book data with Google Books, ratings, genres, and Libby availability...'
      );
      const enrichedBooks: EnrichedBook[] = [];

      // Process books sequentially to avoid overwhelming Libby with parallel requests
      for (const book of toReadBooks) {
        try {
          console.log(`Processing: ${book.title}...`);

          // Get Hebrew and English editions with ratings, genres, and series
          const editions = await googleBooks.findEditions(
            book.title,
            book.author
          );

          // Prioritize Hebrew title for Libby search if available (title only)
          const preferredTitle =
            editions.hebrewTitle ?? editions.englishTitle ?? book.title;

          // Check Libby availability using preferred title only
          const libbyAvailability = await libby.checkAvailability(
            preferredTitle,
            undefined // No fallback - use preferred language only
          );

          // Generate single Libby search URL with preferred title
          const libbyLinks = {
            english: null, // Deprecated - keeping for type compatibility
            hebrew: null, // Deprecated - keeping for type compatibility
          };

          enrichedBooks.push({
            ...book,
            editions,
            libbyLinks,
            libbyAvailability,
          });

          console.log(
            `✓ ${book.title} - Available: ${libbyAvailability.isAvailable ? 'Yes' : 'No'}`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error processing book "${book.title}":`, errorMessage);
          enrichedBooks.push({
            ...book,
            editions: {
              englishTitle: book.title,
              hebrewTitle: null,
              isbns: [],
              hebrewAuthor: null,
              series: null,
              genres: [],
              rating: null,
            },
            libbyLinks: {
              english: libby.getSearchUrl(book.title),
              hebrew: null,
            },
            libbyAvailability: null,
            error: errorMessage,
          });
        }
      }

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
  }
);

/**
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Next Read server running on http://localhost:${PORT}`);
});

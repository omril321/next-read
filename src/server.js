import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { StorygraphService } from './services/storygraph.js';
import { GoogleBooksService } from './services/googleBooks.js';
import { LibbyService } from './services/libby.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Services
const storygraph = new StorygraphService();
const googleBooks = new GoogleBooksService();
const libby = new LibbyService();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get all books
app.get('/api/books', async (req, res) => {
  try {
    console.log('Fetching to-read books from Storygraph...');
    const toReadBooks = await storygraph.getToReadPile();
    console.log(`Found ${toReadBooks.length} books`);

    console.log('Enriching book data with Google Books and Libby links...');
    const enrichedBooks = await Promise.all(
      toReadBooks.map(async (book) => {
        try {
          // Get Hebrew and English editions
          const editions = await googleBooks.findEditions(book.title, book.author);

          // Generate Libby search URLs for both languages
          const libbyLinks = {
            english: libby.getSearchUrl(editions.englishTitle || book.title),
            hebrew: libby.getSearchUrl(editions.hebrewTitle || book.title)
          };

          return {
            ...book,
            editions,
            libbyLinks
          };
        } catch (error) {
          console.error(`Error processing book "${book.title}":`, error.message);
          return {
            ...book,
            editions: { englishTitle: book.title, hebrewTitle: null },
            libbyLinks: { english: libby.getSearchUrl(book.title), hebrew: null },
            error: error.message
          };
        }
      })
    );

    res.json({
      success: true,
      count: enrichedBooks.length,
      books: enrichedBooks
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Next Read server running on http://localhost:${PORT}`);
});

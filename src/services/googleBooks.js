import axios from 'axios';

export class GoogleBooksService {
  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  }

  async findEditions(title, author) {
    try {
      // Search for the book
      const searchQuery = author ? `${title} ${author}` : title;
      const params = {
        q: searchQuery,
        maxResults: 5,
        printType: 'books',
        langRestrict: '' // Don't restrict by language initially
      };

      // Add API key if available (only if not blocked)
      // Note: Google Books API allows some requests without authentication
      if (this.apiKey && this.apiKey !== 'BLOCKED') {
        params.key = this.apiKey;
      }

      const response = await axios.get(this.baseUrl, {
        params,
        headers: {
          'User-Agent': 'Next-Read/1.0'
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        // No results found, fall back to simple detection
        return this.fallbackDetection(title);
      }

      // Extract editions from results
      const editions = {
        englishTitle: null,
        hebrewTitle: null,
        isbns: []
      };

      for (const item of response.data.items) {
        const volumeInfo = item.volumeInfo;
        const language = volumeInfo.language;
        const bookTitle = volumeInfo.title;

        // Collect ISBNs
        if (volumeInfo.industryIdentifiers) {
          for (const id of volumeInfo.industryIdentifiers) {
            if (id.type === 'ISBN_13' || id.type === 'ISBN_10') {
              if (!editions.isbns.includes(id.identifier)) {
                editions.isbns.push(id.identifier);
              }
            }
          }
        }

        // Categorize by language
        if (language === 'he' || language === 'iw') {
          if (!editions.hebrewTitle) {
            editions.hebrewTitle = bookTitle;
          }
        } else if (language === 'en') {
          if (!editions.englishTitle) {
            editions.englishTitle = bookTitle;
          }
        }
      }

      // If we still don't have both editions, use the original title
      // and detect language from characters
      if (!editions.englishTitle && !editions.hebrewTitle) {
        const fallback = this.fallbackDetection(title);
        editions.englishTitle = fallback.englishTitle;
        editions.hebrewTitle = fallback.hebrewTitle;
      } else if (!editions.englishTitle) {
        // We have Hebrew, assume original is Hebrew if it has Hebrew chars
        const hasHebrew = /[\u0590-\u05FF]/.test(title);
        if (!hasHebrew) {
          editions.englishTitle = title;
        }
      } else if (!editions.hebrewTitle) {
        // We have English, assume original is English unless it has Hebrew chars
        const hasHebrew = /[\u0590-\u05FF]/.test(title);
        if (hasHebrew) {
          editions.hebrewTitle = title;
        }
      }

      return editions;

    } catch (error) {
      // Log detailed error information for debugging
      if (error.response) {
        console.error('Google Books API error:', error.response.status, error.response.statusText);
        console.error('Error details:', error.response.data);
      } else {
        console.error('Google Books API error:', error.message);
      }
      // Fall back to simple Hebrew detection
      return this.fallbackDetection(title);
    }
  }

  fallbackDetection(title) {
    // Detect Hebrew vs English based on the characters in the title
    const hasHebrew = /[\u0590-\u05FF]/.test(title);

    return {
      englishTitle: hasHebrew ? null : title,
      hebrewTitle: hasHebrew ? title : null,
      isbns: []
    };
  }
}

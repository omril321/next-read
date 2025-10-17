/**
 * GoogleBooksService - Searches for book editions using Google Books API
 *
 * Handles finding Hebrew and English editions of books.
 * Falls back to Hebrew character detection if API fails or returns no results.
 */

import axios, { type AxiosError } from 'axios';
import type {
  BookEditions,
  GoogleBooksResponse,
  GoogleBooksItem,
} from '../types/index.js';

export class GoogleBooksService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';

  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  }

  /**
   * Find Hebrew and English editions of a book
   * @param title - Book title
   * @param author - Book author (optional)
   * @returns Book editions with titles and ISBNs
   */
  async findEditions(title: string, author: string): Promise<BookEditions> {
    try {
      // Search for the book
      const searchQuery = author ? `${title} ${author}` : title;
      const params: Record<string, string | number> = {
        q: searchQuery,
        maxResults: 5,
        printType: 'books',
        langRestrict: '', // Don't restrict by language initially
      };

      // Add API key if available (only if not blocked)
      // Note: Google Books API allows some requests without authentication
      if (this.apiKey && this.apiKey !== 'BLOCKED') {
        params.key = this.apiKey;
      }

      const response = await axios.get<GoogleBooksResponse>(this.baseUrl, {
        params,
        headers: {
          'User-Agent': 'Next-Read/1.0',
        },
      });

      if (!response.data.items || response.data.items.length === 0) {
        // No results found, fall back to simple detection
        return this.fallbackDetection(title);
      }

      // Extract editions from results
      return this.extractEditions(response.data.items, title);
    } catch (error) {
      // Log detailed error information for debugging
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error(
          'Google Books API error:',
          axiosError.response.status,
          axiosError.response.statusText
        );
        console.error('Error details:', axiosError.response.data);
      } else {
        console.error('Google Books API error:', (error as Error).message);
      }
      // Fall back to simple Hebrew detection
      return this.fallbackDetection(title);
    }
  }

  /**
   * Extract editions from Google Books API items
   */
  private extractEditions(
    items: GoogleBooksItem[],
    originalTitle: string
  ): BookEditions {
    const editions: BookEditions = {
      englishTitle: null,
      hebrewTitle: null,
      isbns: [],
    };

    for (const item of items) {
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
      const fallback = this.fallbackDetection(originalTitle);
      editions.englishTitle = fallback.englishTitle;
      editions.hebrewTitle = fallback.hebrewTitle;
    } else if (!editions.englishTitle) {
      // We have Hebrew, assume original is Hebrew if it has Hebrew chars
      const hasHebrew = /[\u0590-\u05FF]/.test(originalTitle);
      if (!hasHebrew) {
        editions.englishTitle = originalTitle;
      }
    } else if (!editions.hebrewTitle) {
      // We have English, assume original is English unless it has Hebrew chars
      const hasHebrew = /[\u0590-\u05FF]/.test(originalTitle);
      if (hasHebrew) {
        editions.hebrewTitle = originalTitle;
      }
    }

    return editions;
  }

  /**
   * Fallback detection based on Hebrew characters in the title
   * @param title - Book title
   * @returns Book editions based on character detection
   */
  private fallbackDetection(title: string): BookEditions {
    // Detect Hebrew vs English based on the characters in the title
    const hasHebrew = /[\u0590-\u05FF]/.test(title);

    return {
      englishTitle: hasHebrew ? null : title,
      hebrewTitle: hasHebrew ? title : null,
      isbns: [],
    };
  }
}

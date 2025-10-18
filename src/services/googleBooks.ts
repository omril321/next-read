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
  GoogleBooksVolumeInfo,
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
   * @param _author - Book author (not used for search to avoid series confusion)
   * @returns Book editions with titles and ISBNs
   */
  async findEditions(title: string, _author: string): Promise<BookEditions> {
    try {
      // Search for the book by title only (author from Storygraph may contain series info)
      const params: Record<string, string | number> = {
        q: title, // Search by title only for better matches
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
      hebrewAuthor: null,
      series: null,
      genres: [],
      rating: null,
    };

    let primaryItem: GoogleBooksItem | null = null;
    const genreSet = new Set<string>();

    for (const item of items) {
      const volumeInfo = item.volumeInfo;
      const language = volumeInfo.language;
      const bookTitle = this.cleanTitle(volumeInfo.title);

      // Track the first/primary item for series, rating, and genre extraction
      if (!primaryItem) {
        primaryItem = item;
      }

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

      // Collect genres/categories from all items
      if (volumeInfo.categories) {
        for (const category of volumeInfo.categories) {
          genreSet.add(category);
        }
      }

      // Categorize by language
      if (language === 'he' || language === 'iw') {
        if (!editions.hebrewTitle) {
          editions.hebrewTitle = bookTitle;
        }
        if (!editions.hebrewAuthor && volumeInfo.authors?.[0]) {
          editions.hebrewAuthor = volumeInfo.authors[0];
        }
      } else if (language === 'en') {
        if (!editions.englishTitle) {
          editions.englishTitle = bookTitle;
        }
      }
    }

    // Extract series information from primary item
    if (primaryItem) {
      editions.series = this.extractSeries(primaryItem.volumeInfo);

      // Extract rating from primary item
      if (
        primaryItem.volumeInfo.averageRating &&
        primaryItem.volumeInfo.ratingsCount
      ) {
        editions.rating = {
          average: primaryItem.volumeInfo.averageRating,
          count: primaryItem.volumeInfo.ratingsCount,
        };
      }
    }

    // Convert genre set to array
    editions.genres = Array.from(genreSet);

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
        editions.englishTitle = this.cleanTitle(originalTitle);
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
      hebrewAuthor: null,
      series: null,
      genres: [],
      rating: null,
    };
  }

  /**
   * Clean title by removing edition markers and parentheticals
   * @param title - Raw book title
   * @returns Cleaned title
   */
  private cleanTitle(title: string): string {
    // Remove common edition markers
    return title
      .replace(/\s*\((Paperback|Hardcover|Kindle Edition|ebook|audiobook)\)/gi, '')
      .replace(/\s*\[.*?\]/g, '') // Remove bracketed text
      .trim();
  }

  /**
   * Extract series information from volume info
   * @param volumeInfo - Google Books volume info
   * @returns Series string (e.g., "Revelation Space #1") or null
   */
  private extractSeries(volumeInfo: GoogleBooksVolumeInfo): string | null {
    // Check subtitle for series info (e.g., "Book 1 of Revelation Space")
    if (volumeInfo.subtitle) {
      const subtitle = volumeInfo.subtitle;

      // Pattern: "Book N of Series Name" or "Series Name, Book N"
      const bookOfPattern = /(?:Book|Volume|Vol\.?)\s+(\d+)\s+of\s+(.+)/i;
      const match = subtitle.match(bookOfPattern);
      if (match && match[1] && match[2]) {
        return `${match[2].trim()} #${match[1]}`;
      }

      // Pattern: "Series Name #N" or "Series Name, Book N"
      const hashPattern = /(.+?)\s*[#,]\s*(?:Book|Volume|Vol\.?)?\s*(\d+)/i;
      const hashMatch = subtitle.match(hashPattern);
      if (hashMatch && hashMatch[1] && hashMatch[2]) {
        return `${hashMatch[1].trim()} #${hashMatch[2]}`;
      }

      // If subtitle looks like just a series name (single word or title-cased)
      // and doesn't look like a description, return it
      if (subtitle.split(' ').length <= 4 && /^[A-Z]/.test(subtitle)) {
        return subtitle;
      }
    }

    // Check title itself for series markers (sometimes included in title)
    const titleSeriesPattern = /(.+?)\s+\((?:Book|Volume|Vol\.?)\s+(\d+)\)/i;
    const titleMatch = volumeInfo.title.match(titleSeriesPattern);
    if (titleMatch && titleMatch[1] && titleMatch[2]) {
      return `${titleMatch[1].trim()} #${titleMatch[2]}`;
    }

    return null;
  }
}

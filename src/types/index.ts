/**
 * Domain types for Next Read Chrome Extension
 */

/**
 * Basic book information extracted from Libby card
 */
export interface BookInfo {
  title: string;
  author?: string;
}

/**
 * Book data from Google Books API (legacy - kept for cache compatibility)
 */
export interface GoogleBooksData {
  averageRating?: number;
  ratingsCount?: number;
  categories?: string[];
}

/**
 * Book data from Goodreads (scraped from public search pages)
 */
export interface GoodreadsData {
  averageRating?: number;
  ratingsCount?: number;
  genres?: string[];
}

/**
 * Unified book metadata from Goodreads
 */
export interface BookMetadata {
  averageRating?: number;
  ratingsCount?: number;
  categories?: string[];
  source?: 'goodreads';
}

/**
 * Cache entry stored in Chrome storage
 * Uses GoogleBooksData format for backward compatibility with existing cache
 */
export interface CacheEntry {
  data: GoogleBooksData;
  timestamp: number;
}

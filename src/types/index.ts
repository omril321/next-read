/**
 * Domain types for Next Read application
 */

/**
 * Basic book information from Storygraph
 */
export interface Book {
  title: string;
  author: string;
  storygraphUrl: string;
}

/**
 * Book editions with language variants
 */
export interface BookEditions {
  englishTitle: string | null;
  hebrewTitle: string | null;
  isbns: string[];
}

/**
 * Libby search URLs for different languages
 */
export interface LibbyLinks {
  english: string | null;
  hebrew: string | null;
}

/**
 * Enriched book with Google Books editions and Libby links
 */
export interface EnrichedBook extends Book {
  editions: BookEditions;
  libbyLinks: LibbyLinks;
  error?: string;
}

/**
 * API response for books endpoint
 */
export interface BooksApiResponse {
  success: boolean;
  count: number;
  books: EnrichedBook[];
}

/**
 * API error response
 */
export interface ErrorApiResponse {
  success: false;
  error: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok';
}

/**
 * Google Books API volume info structure
 * Based on Google Books API v1 specification
 */
export interface GoogleBooksVolumeInfo {
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{
    type: 'ISBN_10' | 'ISBN_13' | 'ISSN' | 'OTHER';
    identifier: string;
  }>;
  pageCount?: number;
  printType?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  language: string;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
}

/**
 * Google Books API volume item
 */
export interface GoogleBooksItem {
  kind: string;
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

/**
 * Google Books API response
 */
export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksItem[];
}

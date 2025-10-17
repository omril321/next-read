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
 * Industry identifier types from Google Books API
 * @see https://developers.google.com/books/docs/v1/reference/volumes
 */
export type IndustryIdentifierType = 'ISBN_10' | 'ISBN_13' | 'ISSN' | 'OTHER';

/**
 * Industry identifier structure
 */
export interface IndustryIdentifier {
  type: IndustryIdentifierType;
  identifier: string;
}

/**
 * Google Books API volume info structure
 * Based on Google Books API v1 specification
 * @see https://developers.google.com/books/docs/v1/reference/volumes
 */
export interface GoogleBooksVolumeInfo {
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: IndustryIdentifier[];
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
 * @see https://developers.google.com/books/docs/v1/reference/volumes
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
 * @see https://developers.google.com/books/docs/v1/reference/volumes/list
 */
export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksItem[];
}

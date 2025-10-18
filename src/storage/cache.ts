import type { BookInfo, GoogleBooksData, CacheEntry } from '../types';
import { logger } from '../utils/logger';

// Cache duration: 30 days in milliseconds
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Generates a cache key from book info
 * Normalizes title and author to lowercase and trims whitespace
 */
function getCacheKey(bookInfo: BookInfo): string {
  const title = bookInfo.title.toLowerCase().trim();
  const author = bookInfo.author?.toLowerCase().trim() || 'unknown';
  return `book:${title}:${author}`;
}

/**
 * Retrieves cached book data from Chrome storage
 * @param bookInfo - Book information to look up
 * @returns Cached data if available and not expired, null otherwise
 */
export async function getCachedBookData(
  bookInfo: BookInfo
): Promise<GoogleBooksData | null> {
  const key = getCacheKey(bookInfo);

  try {
    const result = await chrome.storage.local.get(key);
    const entry: CacheEntry | undefined = result[key];

    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    const now = Date.now();
    if (now - entry.timestamp > CACHE_DURATION_MS) {
      // Remove expired entry
      await chrome.storage.local.remove(key);
      return null;
    }

    logger.debug(`Cache hit for: ${bookInfo.title}`);
    return entry.data;
  } catch (error) {
    logger.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Stores book data in Chrome storage cache
 * @param bookInfo - Book information
 * @param data - Google Books data to cache
 */
export async function setCachedBookData(
  bookInfo: BookInfo,
  data: GoogleBooksData
): Promise<void> {
  const key = getCacheKey(bookInfo);
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
  };

  try {
    await chrome.storage.local.set({ [key]: entry });
    logger.debug(`Cached data for: ${bookInfo.title}`);
  } catch (error) {
    logger.error('Error writing to cache:', error);
  }
}

/**
 * Clears all cached book data
 */
export async function clearCache(): Promise<void> {
  try {
    await chrome.storage.local.clear();
    logger.info('Cache cleared successfully');
  } catch (error) {
    logger.error('Error clearing cache:', error);
  }
}

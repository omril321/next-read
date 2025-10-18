import type { BookInfo, GoodreadsData } from '../types';
import { logger } from '../utils/logger';

const GOODREADS_SEARCH_BASE = 'https://www.goodreads.com/search';

/**
 * Scrapes book data from Goodreads search results
 * NOTE: This scrapes public Goodreads pages for personal use only.
 * @param bookInfo - Book title and optional author
 * @returns Book metadata from Goodreads, or null if not found
 */
export async function fetchGoodreadsData(
  bookInfo: BookInfo
): Promise<GoodreadsData | null> {
  try {
    // Build search query
    const query = bookInfo.author
      ? `${bookInfo.title} ${bookInfo.author}`
      : bookInfo.title;

    const searchUrl = new URL(GOODREADS_SEARCH_BASE);
    searchUrl.searchParams.set('q', query);

    // Scraping Goodreads (log removed to reduce console spam)

    // Check if extension context is still valid
    if (!chrome?.runtime?.id) {
      // Extension was reloaded - silently skip this request
      return null;
    }

    // Request HTML from background script (bypasses CORS)
    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: 'FETCH_GOODREADS',
        url: searchUrl.toString(),
      });
    } catch (error) {
      // Handle extension context invalidated error (extension was reloaded)
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        return null;
      }
      throw error;
    }

    if (!response.success) {
      logger.error(`Goodreads fetch error: ${response.error}`);
      return null;
    }

    const html = response.html;

    // Parse HTML to extract rating data
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find the first book result
    // Goodreads uses table rows for search results
    const firstResult = doc.querySelector(
      'tr[itemtype="http://schema.org/Book"]'
    );

    if (!firstResult) {
      logger.debug(`No Goodreads results found for "${bookInfo.title}"`);
      return null;
    }

    const result: GoodreadsData = {};

    // Extract average rating
    // Look for the rating span with class "minirating"
    const ratingElement = firstResult.querySelector('.minirating');
    if (ratingElement) {
      const ratingText = ratingElement.textContent || '';

      // Parse rating like "4.08 avg rating — 197,024 ratings"
      const avgMatch = ratingText.match(/([\d.]+)\s+avg rating/);
      if (avgMatch && avgMatch[1]) {
        result.averageRating = parseFloat(avgMatch[1]);
      }

      // Parse rating count like "197,024 ratings"
      const countMatch = ratingText.match(/([\d,]+)\s+rating/);
      if (countMatch && countMatch[1]) {
        // Remove commas and parse to number
        const countStr = countMatch[1].replace(/,/g, '');
        result.ratingsCount = parseInt(countStr, 10);
      }
    }

    // Successfully found Goodreads data (log removed to reduce console spam)

    // Return data if we found at least a rating
    if (result.averageRating || result.ratingsCount) {
      return result;
    }

    return null;
  } catch (error) {
    // Silently handle extension context errors (happens when extension is reloaded)
    if (error instanceof Error) {
      if (
        error.message.includes('Extension context invalidated') ||
        error.message.includes('Cannot read properties of undefined')
      ) {
        // Extension was reloaded - user needs to refresh page, but don't spam console
        return null;
      }
    }
    logger.error('Error scraping Goodreads:', error);
    return null;
  }
}

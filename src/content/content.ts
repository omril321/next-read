import {
  findUnprocessedCards,
  extractBookInfo,
  markCardAsProcessed,
  markCardAsLoading,
  unmarkCardAsLoading,
} from './card-detector';
import { fetchGoodreadsData } from '../api/goodreads';
import { getCachedBookData, setCachedBookData } from '../storage/cache';
import { logger } from '../utils/logger';
import {
  enqueue,
  observeCard,
  unobserveCard,
  startBatch,
} from './request-manager';
import type { GoogleBooksData, BookInfo, BookMetadata } from '../types';

/**
 * Fetches book metadata from Goodreads only
 * Scrapes public Goodreads search pages for personal use
 */
async function fetchBookMetadata(
  bookInfo: BookInfo
): Promise<BookMetadata | null> {
  const goodreadsData = await fetchGoodreadsData(bookInfo);

  if (
    goodreadsData &&
    (goodreadsData.averageRating || goodreadsData.ratingsCount)
  ) {
    const result: BookMetadata = {
      source: 'goodreads',
    };

    if (goodreadsData.averageRating !== undefined) {
      result.averageRating = goodreadsData.averageRating;
    }
    if (goodreadsData.ratingsCount !== undefined) {
      result.ratingsCount = goodreadsData.ratingsCount;
    }
    if (goodreadsData.genres !== undefined) {
      result.categories = goodreadsData.genres;
    }

    return result;
  }

  // No data from Goodreads (silently return null)
  return null;
}

/**
 * Processes a single book card by fetching and displaying book metadata
 */
async function processCard(card: HTMLAnchorElement): Promise<void> {
  // Extract book information
  const bookInfo = extractBookInfo(card);
  if (!bookInfo) {
    markCardAsProcessed(card);
    return;
  }

  // Mark as loading and observe for visibility prioritization
  markCardAsLoading(card);
  observeCard(card);

  // Add loading indicator
  const loadingEl = createLoadingIndicator();
  insertMetadata(card, loadingEl);

  // Check cache first (synchronous check)
  const cachedData = await getCachedBookData(bookInfo);

  if (cachedData) {
    // Use cached data immediately (convert to BookMetadata format)
    unobserveCard(card);
    removeMetadata(card);
    unmarkCardAsLoading(card);
    const bookMetadata: BookMetadata = {
      source: 'goodreads', // All data now comes from Goodreads
    };

    if (cachedData.averageRating !== undefined) {
      bookMetadata.averageRating = cachedData.averageRating;
    }
    if (cachedData.ratingsCount !== undefined) {
      bookMetadata.ratingsCount = cachedData.ratingsCount;
    }
    if (cachedData.categories !== undefined) {
      bookMetadata.categories = cachedData.categories;
    }

    const metadataEl = createMetadataElement(bookMetadata, bookInfo);
    insertMetadata(card, metadataEl);
    markCardAsProcessed(card);
    return;
  }

  // Not in cache - enqueue for parallel processing
  enqueue({
    card,
    execute: async () => {
      try {
        const bookData = await fetchBookMetadata(bookInfo);

        // Cache the result (convert BookMetadata back to GoogleBooksData for cache compatibility)
        if (bookData) {
          const cacheData: GoogleBooksData = {};

          if (bookData.averageRating !== undefined) {
            cacheData.averageRating = bookData.averageRating;
          }
          if (bookData.ratingsCount !== undefined) {
            cacheData.ratingsCount = bookData.ratingsCount;
          }
          if (bookData.categories !== undefined) {
            cacheData.categories = bookData.categories;
          }

          await setCachedBookData(bookInfo, cacheData);
        }

        // Remove loading indicator
        removeMetadata(card);
        unmarkCardAsLoading(card);

        // Display the data if available
        if (bookData) {
          const metadataEl = createMetadataElement(bookData, bookInfo);
          insertMetadata(card, metadataEl);
        }
      } catch (error) {
        logger.error('Error processing card:', error);
        removeMetadata(card);
        unmarkCardAsLoading(card);
      } finally {
        unobserveCard(card);
        markCardAsProcessed(card);
      }
    },
  });
}

/**
 * Creates a loading indicator element
 */
function createLoadingIndicator(): HTMLElement {
  const div = document.createElement('div');
  div.className = 'nextread-metadata';
  div.innerHTML = '<span class="nextread-loading"></span>';
  return div;
}

/**
 * Creates metadata display element from book data
 * Returns a clickable link to Goodreads with rating and genre information
 */
function createMetadataElement(
  data: BookMetadata,
  bookInfo: BookInfo
): HTMLElement {
  const parts: string[] = [];

  // Add rating if available
  if (data.averageRating && data.ratingsCount) {
    parts.push(
      `<span class="nextread-rating">` +
        `<span class="nextread-rating-star">⭐</span>` +
        `<span class="nextread-rating-value">${data.averageRating.toFixed(1)}</span>` +
        ` <span class="nextread-rating-count">(${formatCount(data.ratingsCount)})</span>` +
        `</span>`
    );
  }

  // Add genres if available
  if (data.categories && data.categories.length > 0) {
    const genres = data.categories.slice(0, 2).join(', ');
    if (parts.length > 0) {
      parts.push('<span class="nextread-genre-separator">•</span>');
    }
    parts.push(`<span class="nextread-genres">${genres}</span>`);
  }

  // Create Goodreads link that wraps all content
  const goodreadsUrl = `https://www.goodreads.com/search?q=${encodeURIComponent(
    bookInfo.title + (bookInfo.author ? ' ' + bookInfo.author : '')
  )}`;

  const link = document.createElement('a');
  link.href = goodreadsUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.className = 'nextread-metadata';
  link.title = 'Open in Goodreads';
  link.innerHTML = parts.join(' ');

  return link;
}

/**
 * Formats a number count (e.g., 1234 -> "1.2k")
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * Finds the .title-tile-facts element
 */
function findTitleTileFacts(card: HTMLAnchorElement): HTMLElement | null {
  // The card link is inside a heading
  const heading = card.parentElement;
  if (!heading) return null;

  // Look for .title-tile-facts in the parent container
  const parent = heading.parentElement;
  if (!parent) return null;

  // Search for element with class title-tile-facts
  const titleTileFacts = parent.querySelector('.title-tile-facts');
  return titleTileFacts as HTMLElement | null;
}

/**
 * Inserts metadata element inside .title-tile-facts as last child
 */
function insertMetadata(
  card: HTMLAnchorElement,
  metadataEl: HTMLElement
): void {
  // Find the .title-tile-facts element
  const titleTileFacts = findTitleTileFacts(card);

  if (titleTileFacts) {
    // Append metadata as last child
    titleTileFacts.appendChild(metadataEl);
    logger.debug('Inserted metadata inside .title-tile-facts');
  } else {
    // Fallback: append after the heading
    const heading = card.parentElement;
    if (heading && heading.parentElement) {
      heading.parentElement.insertBefore(
        metadataEl,
        heading.nextElementSibling
      );
      logger.debug('Inserted metadata after heading (fallback)');
    } else {
      card.appendChild(metadataEl);
      logger.debug('Inserted metadata into card (final fallback)');
    }
  }
}

/**
 * Removes any existing metadata elements associated with this card
 */
function removeMetadata(card: HTMLAnchorElement): void {
  // Search in the card itself
  const inCard = card.querySelectorAll('.nextread-metadata');
  inCard.forEach((el) => el.remove());

  // Also search in the parent container (where we might have inserted it)
  const parent = card.parentElement?.parentElement;
  if (parent) {
    const inParent = parent.querySelectorAll('.nextread-metadata');
    inParent.forEach((el) => el.remove());
  }
}

/**
 * Processes all unprocessed book cards on the page
 */
function processAllCards(): void {
  const cards = findUnprocessedCards();

  if (cards.length > 0) {
    logger.debug(`Processing ${cards.length} new book cards`);

    cards.forEach((card) => {
      // Process each card (async, but we don't await)
      processCard(card);
    });

    // Start parallel batch processing
    startBatch();
  }
}

/**
 * Initializes the content script
 */
function init(): void {
  logger.info('Extension initialized');

  // Process existing cards
  processAllCards();

  // Set up MutationObserver to detect new cards
  let debounceTimer: number | null = null;

  const observer = new MutationObserver((mutations) => {
    // Check if any new nodes were added
    let hasNewNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        break;
      }
    }

    if (hasNewNodes) {
      // Debounce: only process after 1 second of no new mutations
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        processAllCards();
        debounceTimer = null;
      }, 1000);
    }
  });

  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

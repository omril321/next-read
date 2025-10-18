import type { BookInfo } from '../types';
import { logger } from '../utils/logger';

const PROCESSED_ATTRIBUTE = 'data-nextread-processed';
const LOADING_ATTRIBUTE = 'data-nextread-loading';

/**
 * Finds all unprocessed book cards on the page
 * @returns Array of book card elements
 */
export function findUnprocessedCards(): HTMLAnchorElement[] {
  const bookCards: HTMLAnchorElement[] = [];

  // Pattern 1: Library pages - links with "Book: 'Title'. Cover image."
  const coverImageLinks = Array.from(document.querySelectorAll('a'));

  for (const link of coverImageLinks) {
    if (link.hasAttribute(PROCESSED_ATTRIBUTE)) {
      continue;
    }

    const linkText = link.textContent || '';
    const ariaLabel = link.getAttribute('aria-label') || '';
    const combinedText = linkText + ' ' + ariaLabel;

    const isCoverImageCard =
      (combinedText.includes('Book:') || combinedText.includes('Audiobook:')) &&
      combinedText.includes('Cover image');

    if (isCoverImageCard) {
      bookCards.push(link as HTMLAnchorElement);
    }
  }

  // Pattern 2: Search/Spotlight pages - headings with "Book: Title, by Author"
  const headings = Array.from(document.querySelectorAll('h3'));

  for (const heading of headings) {
    const headingText = heading.textContent || '';

    // Check if this is a book heading
    if (
      headingText.startsWith('Book:') ||
      headingText.startsWith('Audiobook:')
    ) {
      // Find the link within this heading
      const link = heading.querySelector('a');
      if (link && !link.hasAttribute(PROCESSED_ATTRIBUTE)) {
        bookCards.push(link as HTMLAnchorElement);
      }
    }
  }

  return bookCards;
}

/**
 * Extracts book information from a Libby card element
 * @param card - The book card element
 * @returns BookInfo with title and optional author
 */
export function extractBookInfo(card: HTMLAnchorElement): BookInfo | null {
  try {
    // Get text content from the card
    const linkText = card.textContent || '';
    const ariaLabel = card.getAttribute('aria-label') || '';
    const combinedText = linkText + ' ' + ariaLabel;

    // Try Pattern 1: "Book: 'Title'. Cover image."
    const coverImageMatch = combinedText.match(
      /(?:Book|Audiobook):\s*'([^']+)'/
    );

    if (coverImageMatch && coverImageMatch[1]) {
      const title = coverImageMatch[1].trim();
      const author = extractAuthorFromCard(card);

      const bookInfo: BookInfo = { title };
      if (author !== undefined) {
        bookInfo.author = author;
      }

      logger.debug(
        `Extracted book info (cover image pattern): ${title}`,
        bookInfo
      );
      return bookInfo;
    }

    // Try Pattern 2: Check parent heading for "Book: Title, by Author"
    const parentHeading = card.closest('h3');
    if (parentHeading) {
      const headingText = parentHeading.textContent || '';
      // Pattern: "Book: Title, by Author" or "Audiobook: Title, by Author"
      const headingMatch = headingText.match(
        /(?:Book|Audiobook):\s*([^,]+)(?:,\s*by\s+(.+))?/
      );

      if (headingMatch && headingMatch[1]) {
        const title = headingMatch[1].trim();
        const author = headingMatch[2]?.trim();

        const bookInfo: BookInfo = { title };
        if (author !== undefined) {
          bookInfo.author = author;
        }

        logger.debug(
          `Extracted book info (heading pattern): ${title}`,
          bookInfo
        );
        return bookInfo;
      }
    }

    logger.warn('Could not extract title from card:', combinedText);
    return null;
  } catch (error) {
    logger.error('Error extracting book info from card:', error);
    return null;
  }
}

/**
 * Attempts to extract author information from the card or nearby elements
 * @param card - The book card element
 * @returns Author name if found, undefined otherwise
 */
function extractAuthorFromCard(card: HTMLAnchorElement): string | undefined {
  // Look for author in parent or sibling elements
  // This is a best-effort attempt as Libby's structure may vary

  // Check the card's parent for author information
  const parent = card.parentElement;
  if (parent) {
    const parentText = parent.textContent || '';
    // Look for common author patterns
    const authorMatch = parentText.match(/by\s+([^,.\n]+)/i);
    if (authorMatch && authorMatch[1]) {
      return authorMatch[1].trim();
    }
  }

  return undefined;
}

/**
 * Marks a card as processed
 * @param card - The book card element
 */
export function markCardAsProcessed(card: HTMLAnchorElement): void {
  card.setAttribute(PROCESSED_ATTRIBUTE, 'true');
}

/**
 * Marks a card as loading
 * @param card - The book card element
 */
export function markCardAsLoading(card: HTMLAnchorElement): void {
  card.setAttribute(LOADING_ATTRIBUTE, 'true');
}

/**
 * Removes loading state from a card
 * @param card - The book card element
 */
export function unmarkCardAsLoading(card: HTMLAnchorElement): void {
  card.removeAttribute(LOADING_ATTRIBUTE);
}

/**
 * Checks if a card is currently loading
 * @param card - The book card element
 * @returns true if card is in loading state
 */
export function isCardLoading(card: HTMLAnchorElement): boolean {
  return card.hasAttribute(LOADING_ATTRIBUTE);
}

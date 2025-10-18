/**
 * LibbyService - Generates Libby library search URLs and checks availability
 *
 * Uses Playwright to scrape real-time availability from Libby.
 */

import { chromium } from 'playwright';
import type { LibbyAvailability } from '../types/index.js';

export class LibbyService {
  private readonly libraryId: string;

  constructor() {
    this.libraryId = process.env.LIBBY_LIBRARY_ID ?? 'telaviv';
  }

  /**
   * Generate Libby search URL for a book title
   * @param title - Book title to search for
   * @returns Libby search URL or null if title is not provided
   */
  getSearchUrl(title: string | null): string | null {
    if (!title) {
      return null;
    }

    // Encode the title for URL
    const encodedTitle = encodeURIComponent(title);

    // Generate Libby search URL with scope-auto and page-1
    return `https://libbyapp.com/search/${this.libraryId}/search/scope-auto/query-${encodedTitle}/page-1`;
  }

  /**
   * Get the library's main URL on Libby
   * @returns Libby library URL
   */
  getLibraryUrl(): string {
    return `https://libbyapp.com/library/${this.libraryId}`;
  }

  /**
   * Check if a book is available on Libby
   * @param title - Book title to search for (prefer Hebrew if available)
   * @param fallbackTitle - Alternative title to try if first search fails
   * @returns Availability information
   */
  async checkAvailability(
    title: string,
    fallbackTitle?: string
  ): Promise<LibbyAvailability> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      const page = await context.newPage();
      const searchUrl = this.getSearchUrl(title);

      if (!searchUrl) {
        return {
          isAvailable: false,
          format: null,
          url: this.getLibraryUrl(),
        };
      }

      // Navigate to search page
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait a bit for results to load
      await page.waitForTimeout(2000);

      // Try to find the book in results and check availability
      const availability = await page.evaluate(() => {
        // Look for book cards in the search results
        const bookCards = document.querySelectorAll('[data-book-id], .title-tile, .title-card, article');

        if (bookCards.length === 0) {
          return null;
        }

        // Check first result (most relevant)
        const firstCard = bookCards[0];
        if (!firstCard) {
          return null;
        }

        // Look for availability indicators
        // Common patterns: "Borrow", "Available", "Place Hold", "Waitlist"
        const cardText = firstCard.textContent || '';

        // Determine if available
        const isAvailable =
          cardText.includes('Borrow') ||
          cardText.includes('Available') ||
          cardText.includes('Read now') ||
          cardText.includes('Listen now');

        // Extract format
        let format: string | null = null;
        if (cardText.toLowerCase().includes('audiobook') || cardText.toLowerCase().includes('listen')) {
          format = 'audiobook';
        } else if (cardText.toLowerCase().includes('ebook') || cardText.toLowerCase().includes('read')) {
          format = 'ebook';
        }

        // Try to get book URL
        let bookUrl = '';
        const bookLink = firstCard.querySelector('a[href*="/book/"]');
        if (bookLink) {
          bookUrl = (bookLink as HTMLAnchorElement).href;
        }

        return {
          isAvailable,
          format,
          url: bookUrl,
        };
      });

      // If no results with primary title, try fallback
      if (!availability && fallbackTitle) {
        await browser.close();
        return this.checkAvailability(fallbackTitle);
      }

      return {
        isAvailable: availability?.isAvailable ?? false,
        format: availability?.format ?? null,
        url: availability?.url || searchUrl,
      };
    } catch (error) {
      console.error('Error checking Libby availability:', error);
      return {
        isAvailable: false,
        format: null,
        url: this.getSearchUrl(title) ?? this.getLibraryUrl(),
      };
    } finally {
      await browser.close();
    }
  }
}

/**
 * StorygraphService - Authenticates and scrapes to-read books from Storygraph
 *
 * Uses Playwright for authenticated scraping since Storygraph has no official API.
 * Filters duplicate books by tracking unique book URLs.
 */

import { chromium } from 'playwright';
import type { Book } from '../types/index.js';

export class StorygraphService {
  private readonly email: string;
  private readonly password: string;

  constructor() {
    const email = process.env.STORYGRAPH_EMAIL;
    const password = process.env.STORYGRAPH_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'STORYGRAPH_EMAIL and STORYGRAPH_PASSWORD must be set in .env file'
      );
    }

    this.email = email;
    this.password = password;
  }

  /**
   * Fetch all books from the user's to-read pile
   * @returns Array of books with title, author, and Storygraph URL
   */
  async getToReadPile(): Promise<Book[]> {
    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login to Storygraph
      console.log('Navigating to Storygraph login...');
      await page.goto('https://app.thestorygraph.com/users/sign_in', {
        waitUntil: 'networkidle',
      });

      // Fill in login form
      console.log('Logging in...');
      await page.fill('input[name="user[email]"]', this.email);
      await page.fill('input[name="user[password]"]', this.password);

      // Take screenshot before clicking submit
      await page.screenshot({ path: 'before-login.png' });
      console.log('Screenshot before login saved to before-login.png');

      // Click login and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]'),
      ]);

      // Check if login was successful
      const currentUrl = page.url();
      console.log(`After login - Current URL: ${currentUrl}`);

      // Take screenshot after login
      await page.screenshot({ path: 'after-login.png' });
      console.log('Screenshot after login saved to after-login.png');

      // If we're still on the sign-in page, login failed
      if (currentUrl.includes('/users/sign_in')) {
        // Check for error messages
        const errorMessage = await page.evaluate(() => {
          // @ts-ignore - runs in browser context where document exists
          const alert = document.querySelector('.alert, .error, [role="alert"]');
          return alert ? alert.textContent?.trim() ?? 'Unknown error' : 'Unknown error';
        });
        throw new Error(
          `Login failed: ${errorMessage}. Please check your credentials.`
        );
      }

      console.log('Login successful!');

      // Navigate to to-read pile
      console.log('Fetching to-read pile...');
      const username = this.email.split('@')[0]; // Extract username from email
      const toReadUrl = `https://app.thestorygraph.com/to-read/${username}`;
      console.log(`Navigating to: ${toReadUrl}`);
      await page.goto(toReadUrl, {
        waitUntil: 'networkidle',
      });

      // Log the current URL and page title
      console.log(`Current URL: ${page.url()}`);
      console.log(`Page title: ${await page.title()}`);

      // Take a screenshot for debugging
      await page.screenshot({ path: 'to-read-page.png' });
      console.log('Screenshot saved to to-read-page.png');

      // Extract book data from the page
      const books = await page.evaluate(() => {
        // @ts-ignore - runs in browser context where document exists
        const bookElements = document.querySelectorAll('h3');
        console.log(`Found ${bookElements.length} h3 elements`);

        const results: Array<{ title: string; author: string; url: string }> = [];
        // @ts-ignore - Set is available in browser context
        const seen = new Set<string>(); // Track unique book URLs to avoid duplicates

        // @ts-ignore - forEach is valid on NodeList
        bookElements.forEach((heading) => {
          // Extract title and author from heading structure
          const titleLink = heading.querySelector('a');
          if (!titleLink) {
            return;
          }

          const url = titleLink.getAttribute('href');

          // Skip if not a book URL or already seen
          if (!url || !url.startsWith('/books/') || seen.has(url)) {
            return;
          }

          seen.add(url);

          const title = titleLink.textContent?.trim() ?? '';
          const authorParagraph = heading.querySelector('p');
          const author = authorParagraph ? authorParagraph.textContent?.trim() ?? '' : '';

          results.push({
            title,
            author,
            url,
          });
        });

        return results;
      });

      // Transform to Book interface with full URLs
      const transformedBooks: Book[] = books.map((bookData) => ({
        title: bookData.title,
        author: bookData.author,
        storygraphUrl: `https://app.thestorygraph.com${bookData.url}`,
      }));

      console.log(`Successfully extracted ${transformedBooks.length} books`);
      return transformedBooks;
    } finally {
      await browser.close();
    }
  }
}

/**
 * StorygraphService - Authenticates and scrapes to-read books from Storygraph
 *
 * Uses Playwright for authenticated scraping since Storygraph has no official API.
 * Filters duplicate books by tracking unique book URLs.
 * Uses cookie persistence to maintain login sessions and run in headless mode.
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Book } from '../types/index.js';

export class StorygraphService {
  private readonly email: string;
  private readonly password: string;
  private readonly cookiesPath: string;

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
    this.cookiesPath = join(process.cwd(), '.cache', 'storygraph-cookies.json');
  }

  private async loadCookies(): Promise<unknown[] | null> {
    try {
      if (existsSync(this.cookiesPath)) {
        const cookiesJson = await readFile(this.cookiesPath, 'utf-8');
        return JSON.parse(cookiesJson) as unknown[];
      }
    } catch (error) {
      console.log('No existing cookies found or error loading:', error);
    }
    return null;
  }

  private async saveCookies(cookies: unknown[]): Promise<void> {
    try {
      const cacheDir = join(process.cwd(), '.cache');
      if (!existsSync(cacheDir)) {
        await mkdir(cacheDir, { recursive: true });
      }
      await writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('Cookies saved for future sessions');
    } catch (error) {
      console.log('Error saving cookies:', error);
    }
  }

  /**
   * Fetch all books from the user's to-read pile
   * @returns Array of books with title, author, and Storygraph URL
   */
  async getToReadPile(): Promise<Book[]> {
    // Try to load saved cookies
    const savedCookies = await this.loadCookies();

    // Always try headless mode with stealth settings
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      // Configure context to look like a real browser
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });

      // Load cookies if available
      if (savedCookies) {
        console.log('Loading saved cookies...');
        await context.addCookies(savedCookies as never[]);
      }

      const page = await context.newPage();

      // Add stealth scripts to avoid detection
      await page.addInitScript(() => {
        // Override the navigator.webdriver property
        // eslint-disable-next-line no-undef
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      // Navigate to login page
      await page.goto('https://app.thestorygraph.com/users/sign_in', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      await page.waitForTimeout(2000);

      // Check for Cloudflare challenge
      const hasCaptcha = await page.evaluate(() => {
        return (
          (document.body.textContent?.includes('Verify you are human') ??
            false) ||
          document.querySelector('[name="cf-turnstile-response"]') !== null
        );
      });

      if (hasCaptcha) {
        console.log(
          'Cloudflare challenge detected. Waiting for it to resolve...'
        );
        await page.waitForFunction(
          () => {
            return (
              document.querySelector('input[name="user[email]"]') !== null ||
              !document.body.textContent?.includes('Verify you are human')
            );
          },
          { timeout: 60000 }
        );
        await page.waitForTimeout(2000);
      }

      // Check if already logged in
      const alreadyLoggedIn = await page.evaluate(() => {
        return (
          document.body.textContent?.includes('already signed in') ?? false
        );
      });

      if (!alreadyLoggedIn) {
        // Wait for and fill login form
        await page.waitForSelector('input[name="user[email]"]', {
          timeout: 15000,
        });
        await page.fill('input[name="user[email]"]', this.email);
        await page.fill('input[name="user[password]"]', this.password);

        // Submit and wait for navigation
        await page.click('button[type="submit"]');
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        await page.waitForTimeout(2000);

        // Verify login success
        const currentUrl = page.url();
        if (currentUrl.includes('/users/sign_in')) {
          const errorMessage = await page.evaluate(() => {
            const alert = document.querySelector(
              '.alert, .error, [role="alert"]'
            );
            return alert
              ? (alert.textContent?.trim() ?? 'Unknown error')
              : 'Unknown error';
          });
          throw new Error(
            `Login failed: ${errorMessage}. Please check your credentials.`
          );
        }

        // Save cookies for future sessions
        const cookies = await context.cookies();
        await this.saveCookies(cookies);
      }

      // Navigate to to-read pile
      const username = this.email.split('@')[0];
      const toReadUrl = `https://app.thestorygraph.com/to-read/${username}`;
      await page.goto(toReadUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait for book content to load
      await page.waitForSelector('h3', { timeout: 10000 });

      // Extract book data from the page
      const books = await page.evaluate(() => {
        const bookElements = document.querySelectorAll('h3');

        const results: Array<{ title: string; author: string; url: string }> =
          [];
        const seen = new Set<string>();

        bookElements.forEach((heading) => {
          const titleLink = heading.querySelector('a');
          if (!titleLink) {
            return;
          }

          const url = titleLink.getAttribute('href');
          if (!url || !url.startsWith('/books/') || seen.has(url)) {
            return;
          }

          seen.add(url);

          const title = titleLink.textContent?.trim() ?? '';
          const authorParagraph = heading.querySelector('p');
          const author = authorParagraph
            ? (authorParagraph.textContent?.trim() ?? '')
            : '';

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

import { chromium } from 'playwright';

export class StorygraphService {
  constructor() {
    this.email = process.env.STORYGRAPH_EMAIL;
    this.password = process.env.STORYGRAPH_PASSWORD;

    if (!this.email || !this.password) {
      throw new Error('STORYGRAPH_EMAIL and STORYGRAPH_PASSWORD must be set in .env file');
    }
  }

  async getToReadPile() {
    const browser = await chromium.launch({
      headless: true
    });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login to Storygraph
      console.log('Navigating to Storygraph login...');
      await page.goto('https://app.thestorygraph.com/users/sign_in', {
        waitUntil: 'networkidle'
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
        page.click('button[type="submit"]')
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
          const alert = document.querySelector('.alert, .error, [role="alert"]');
          return alert ? alert.textContent.trim() : 'Unknown error';
        });
        throw new Error(`Login failed: ${errorMessage}. Please check your credentials.`);
      }

      console.log('Login successful!');

      // Navigate to to-read pile
      console.log('Fetching to-read pile...');
      const username = this.email.split('@')[0]; // Extract username from email
      const toReadUrl = `https://app.thestorygraph.com/to-read/${username}`;
      console.log(`Navigating to: ${toReadUrl}`);
      await page.goto(toReadUrl, {
        waitUntil: 'networkidle'
      });

      // Log the current URL and page title
      console.log(`Current URL: ${page.url()}`);
      console.log(`Page title: ${await page.title()}`);

      // Take a screenshot for debugging
      await page.screenshot({ path: 'to-read-page.png' });
      console.log('Screenshot saved to to-read-page.png');

      // Extract book data from the page
      const books = await page.evaluate(() => {
        const bookElements = document.querySelectorAll('h3');
        console.log(`Found ${bookElements.length} h3 elements`);

        const results = [];
        const seen = new Set(); // Track unique book URLs to avoid duplicates

        bookElements.forEach((heading, index) => {
          // Extract title and author from heading structure
          const titleLink = heading.querySelector('a');
          if (!titleLink) {
            console.log(`h3[${index}]: No link found`, heading.textContent.substring(0, 50));
            return;
          }

          const url = titleLink.getAttribute('href');

          // Skip if not a book URL or already seen
          if (!url || !url.startsWith('/books/') || seen.has(url)) {
            if (seen.has(url)) {
              console.log(`h3[${index}]: Duplicate - skipping ${url}`);
            }
            return;
          }

          seen.add(url);

          const title = titleLink.textContent.trim();
          const authorParagraph = heading.querySelector('p');
          const author = authorParagraph ? authorParagraph.textContent.trim() : '';

          console.log(`h3[${index}]: Found book - "${title}" by ${author}`);

          results.push({
            title,
            author,
            storygraphUrl: `https://app.thestorygraph.com${url}`
          });
        });

        return results;
      });

      console.log(`Successfully extracted ${books.length} books`);
      return books;

    } finally {
      await browser.close();
    }
  }
}

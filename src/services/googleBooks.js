export class GoogleBooksService {
  async findEditions(title) {
    // Detect Hebrew vs English based on the characters in the title
    // Note: Google Books API was returning 403 errors, so we use simple detection
    const hasHebrew = /[\u0590-\u05FF]/.test(title);

    return {
      englishTitle: hasHebrew ? null : title,
      hebrewTitle: hasHebrew ? title : null
    };
  }
}

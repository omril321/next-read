/**
 * LibbyService - Generates Libby library search URLs
 *
 * Currently provides URL generation only.
 * Future enhancement: OverDrive API integration for availability checking.
 */

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

    // Generate Libby search URL
    return `https://libbyapp.com/search/${this.libraryId}/search/query-${encodedTitle}`;
  }

  /**
   * Get the library's main URL on Libby
   * @returns Libby library URL
   */
  getLibraryUrl(): string {
    return `https://libbyapp.com/library/${this.libraryId}`;
  }
}

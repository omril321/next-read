export class LibbyService {
  constructor() {
    this.libraryId = process.env.LIBBY_LIBRARY_ID || 'telaviv';
  }

  getSearchUrl(title) {
    if (!title) return null;

    // Encode the title for URL
    const encodedTitle = encodeURIComponent(title);

    // Generate Libby search URL
    return `https://libbyapp.com/search/${this.libraryId}/search/query-${encodedTitle}`;
  }

  getLibraryUrl() {
    return `https://libbyapp.com/library/${this.libraryId}`;
  }
}

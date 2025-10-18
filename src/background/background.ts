/**
 * Background service worker for Next Read extension
 * Handles cross-origin requests to Goodreads (bypasses CORS)
 */

interface FetchGoodreadsMessage {
  type: 'FETCH_GOODREADS';
  url: string;
}

interface FetchGoodreadsResponse {
  success: boolean;
  html?: string;
  error?: string;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (
    message: FetchGoodreadsMessage,
    _sender,
    sendResponse: (response: FetchGoodreadsResponse) => void
  ) => {
    if (message.type === 'FETCH_GOODREADS') {
      // Fetch Goodreads HTML in background (bypasses CORS)
      fetch(message.url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.text();
        })
        .then((html) => {
          sendResponse({ success: true, html });
        })
        .catch((error) => {
          console.error('[NextRead] Background fetch error:', error);
          sendResponse({
            success: false,
            error: error.message,
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    }

    // Return false for other message types
    return false;
  }
);

console.log('[NextRead] Background service worker initialized');

/**
 * Request Manager - Parallel requests with visible-first prioritization
 *
 * Handles concurrent API requests with priority queuing:
 * - Visible cards (in viewport) are fetched first
 * - Up to MAX_CONCURRENT requests run in parallel
 * - Requests are staggered to maintain rate limiting spirit
 */

import { logger } from '../utils/logger';

// Configuration
const MAX_CONCURRENT = 10;
const STAGGER_DELAY_MS = 50;

// Request interface
interface QueuedRequest {
  card: HTMLAnchorElement;
  execute: () => Promise<void>;
}

// Priority queues
let visibleQueue: QueuedRequest[] = [];
let offscreenQueue: QueuedRequest[] = [];

// Track visible cards
const visibleCards = new Set<HTMLAnchorElement>();

// Concurrency control
let activeRequests = 0;

// IntersectionObserver for visibility detection
const visibilityObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const card = entry.target as HTMLAnchorElement;
      if (entry.isIntersecting) {
        visibleCards.add(card);
        reprioritizeQueue();
      } else {
        visibleCards.delete(card);
      }
    }
  },
  { threshold: 0.1 } // Card is "visible" when 10% is in viewport
);

/**
 * Start observing a card for visibility changes
 */
export function observeCard(card: HTMLAnchorElement): void {
  visibilityObserver.observe(card);
}

/**
 * Stop observing a card (call when done processing)
 */
export function unobserveCard(card: HTMLAnchorElement): void {
  visibilityObserver.unobserve(card);
  visibleCards.delete(card);
}

/**
 * Check if a card is currently visible
 */
export function isVisible(card: HTMLAnchorElement): boolean {
  return visibleCards.has(card);
}

/**
 * Move newly-visible cards from offscreen queue to visible queue
 */
function reprioritizeQueue(): void {
  const stillOffscreen: QueuedRequest[] = [];

  for (const request of offscreenQueue) {
    if (visibleCards.has(request.card)) {
      visibleQueue.push(request);
    } else {
      stillOffscreen.push(request);
    }
  }

  offscreenQueue = stillOffscreen;

  // Try to process more requests if we have capacity
  processNext();
}

/**
 * Add a request to the appropriate queue
 */
export function enqueue(request: QueuedRequest): void {
  if (visibleCards.has(request.card)) {
    visibleQueue.push(request);
  } else {
    offscreenQueue.push(request);
  }

  // Start processing (no-op if already at max concurrency)
  processNext();
}

/**
 * Process the next request from the queue
 */
async function processNext(): Promise<void> {
  if (activeRequests >= MAX_CONCURRENT) {
    return;
  }

  // Prioritize visible cards
  const request = visibleQueue.shift() || offscreenQueue.shift();
  if (!request) {
    return;
  }

  activeRequests++;
  logger.debug(
    `Processing request (${activeRequests}/${MAX_CONCURRENT} active, ${visibleQueue.length} visible, ${offscreenQueue.length} offscreen)`
  );

  try {
    await request.execute();
  } catch (error) {
    logger.error('Request failed:', error);
  } finally {
    activeRequests--;
    // Stagger the next request
    setTimeout(() => processNext(), STAGGER_DELAY_MS);
  }
}

/**
 * Kick off initial batch of parallel requests
 * Call this after enqueuing all cards to start processing
 */
export function startBatch(): void {
  logger.debug(
    `Starting batch processing (${visibleQueue.length} visible, ${offscreenQueue.length} offscreen)`
  );

  // Start up to MAX_CONCURRENT requests with staggered timing
  for (let i = 0; i < MAX_CONCURRENT; i++) {
    setTimeout(() => processNext(), i * STAGGER_DELAY_MS);
  }
}

/**
 * Clear all pending requests (useful for navigation)
 */
export function clearQueues(): void {
  visibleQueue = [];
  offscreenQueue = [];
  logger.debug('Queues cleared');
}

/**
 * Get current queue stats (for debugging)
 */
export function getQueueStats(): {
  active: number;
  visible: number;
  offscreen: number;
} {
  return {
    active: activeRequests,
    visible: visibleQueue.length,
    offscreen: offscreenQueue.length,
  };
}

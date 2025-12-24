/**
 * Network Request Tracker
 * Tracks actual HTTP requests (like Network tab) for accurate progress tracking
 */

interface NetworkRequest {
  url: string;
  startTime: number;
  endTime?: number;
  status?: number;
  success: boolean;
}

class NetworkTracker {
  private requests: Map<string, NetworkRequest> = new Map();
  private imageRequests: Set<string> = new Set();
  private totalExpected: number = 0;
  private listeners: Set<(loaded: number, total: number) => void> = new Set();
  
  constructor() {
    this.setupTracking();
  }
  
  /**
   * Setup network request tracking using Performance API and fetch interception
   */
  private setupTracking() {
    // Track using Performance API (for requests already made)
    this.trackPerformanceEntries();
    
    // Intercept fetch requests
    this.interceptFetch();
    
    // Intercept Image element creation (for Three.js useTexture)
    this.interceptImageElements();
    
    // Monitor Performance API periodically (more aggressive)
    this.startMonitoring();
  }
  
  /**
   * Track existing performance entries
   */
  private trackPerformanceEntries() {
    if (typeof performance === 'undefined') return;
    
    try {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let updated = false;
      let checkedCount = 0;
      let addedCount = 0;
      
      entries.forEach(entry => {
        if (this.isImageRequest(entry.name)) {
          checkedCount++;
          const normalizedUrl = this.normalizeUrl(entry.name);
          if (!this.imageRequests.has(normalizedUrl)) {
            // Check if entry is complete - VERY lenient for 304 responses
            const transferSize = (entry as any).transferSize || 0;
            const responseStatus = (entry as any).responseStatus;
            const hasTiming = entry.responseEnd > 0 || entry.responseStart > 0 || entry.requestStart > 0;
            
            // Consider complete if ANY indicator of completion
            if (transferSize > 0 || 
                responseStatus === 200 || 
                responseStatus === 304 || // 304 Not Modified (cached)
                hasTiming ||
                entry.duration > 0) {
              this.imageRequests.add(normalizedUrl);
              updated = true;
              addedCount++;
            }
          }
        }
      });
      
      // Debug logging
      if (checkedCount > 0) {
        console.log(`[NetworkTracker] Checked ${checkedCount} image entries, added ${addedCount}, total tracked: ${this.imageRequests.size}`);
      }
      
      if (updated) {
        this.notifyListeners();
      }
    } catch (e) {
      console.debug('Performance API tracking failed:', e);
    }
  }
  
  /**
   * Intercept fetch requests
   */
  private interceptFetch() {
    // Only intercept if not already intercepted
    if ((window.fetch as any).__networkTrackerIntercepted) {
      return;
    }
    
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      if (this.isImageRequest(url)) {
        const requestId = url;
        const normalizedUrl = this.normalizeUrl(url);
        
        // Only track if not already tracked
        if (!this.imageRequests.has(normalizedUrl)) {
          this.requests.set(requestId, {
            url: normalizedUrl,
            startTime: performance.now(),
            success: false
          });
          
          try {
            const response = await originalFetch(...args);
            
            // Track successful request
            const request = this.requests.get(requestId);
            if (request) {
              request.endTime = performance.now();
              request.status = response.status;
              request.success = response.status >= 200 && response.status < 300;
              
              if (request.success) {
                this.imageRequests.add(normalizedUrl);
                this.notifyListeners();
              }
            }
            
            return response;
          } catch (error) {
            // Track failed request
            const request = this.requests.get(requestId);
            if (request) {
              request.endTime = performance.now();
              request.success = false;
            }
            throw error;
          }
        }
      }
      
      return originalFetch(...args);
    };
    
    (window.fetch as any).__networkTrackerIntercepted = true;
  }
  
  /**
   * Normalize URL to handle query params and fragments
   * Keep full path to avoid collisions
   */
  private normalizeUrl(url: string): string {
    try {
      // For local images, use full pathname
      if (url.startsWith('/') || url.startsWith(window.location.origin)) {
        const urlObj = new URL(url, window.location.origin);
        return urlObj.pathname;
      }
      // For relative URLs
      return url.split('?')[0].split('#')[0];
    } catch {
      return url.split('?')[0].split('#')[0];
    }
  }
  
  /**
   * Intercept Image element creation (for Three.js useTexture)
   * Using PerformanceObserver for better tracking
   */
  private interceptImageElements() {
    // Use PerformanceObserver for more reliable tracking
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceResourceTiming[];
          let updated = false;
          
          entries.forEach(entry => {
            if (this.isImageRequest(entry.name)) {
              const normalizedUrl = this.normalizeUrl(entry.name);
              if (!this.imageRequests.has(normalizedUrl)) {
                // Check if request completed
                const transferSize = (entry as any).transferSize || 0;
                const responseStatus = (entry as any).responseStatus;
                
                // Consider successful if has transfer size, status 200/304, or responseEnd > 0
                if (transferSize > 0 || 
                    responseStatus === 200 || 
                    responseStatus === 304 || // 304 Not Modified (cached)
                    entry.responseEnd > 0 ||
                    entry.responseStart > 0) {
                  this.imageRequests.add(normalizedUrl);
                  updated = true;
                }
              }
            }
          });
          
          if (updated) {
            this.notifyListeners();
          }
        });
        
        // Observe resource timing entries
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.debug('PerformanceObserver not supported:', e);
      }
    }
  }
  
  /**
   * Monitor Performance API for new requests (more aggressive - check all entries)
   */
  private startMonitoring() {
    if (typeof performance === 'undefined') return;
    
    // More aggressive monitoring - check all entries every time, including cached
    setInterval(() => {
      try {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        let updated = false;
        
        // Process ALL entries every time (to catch cached responses and updates)
        entries.forEach(entry => {
          if (this.isImageRequest(entry.name)) {
            const normalizedUrl = this.normalizeUrl(entry.name);
            
            // Only add if not already tracked
            if (!this.imageRequests.has(normalizedUrl)) {
              const transferSize = (entry as any).transferSize || 0;
              const responseStatus = (entry as any).responseStatus;
              const duration = entry.duration || 0;
              
              // VERY lenient check - consider loaded if ANY of these conditions:
              // 1. Has transfer size > 0 (data was transferred)
              // 2. Status 200 or 304 (304 = Not Modified, cached response)
              // 3. Has responseEnd > 0 (request completed, even if from cache) - THIS IS KEY FOR 304
              // 4. Has responseStart > 0 (request started)
              // 5. Has duration > 0 (some activity happened)
              // 6. Has any timing data (request was made)
              // Note: Cached responses (304) have transferSize = 0 but responseEnd > 0
              const hasTimingData = entry.responseEnd > 0 || 
                                    entry.responseStart > 0 || 
                                    entry.requestStart > 0 ||
                                    entry.startTime > 0;
              
              const isComplete = transferSize > 0 || 
                                responseStatus === 200 || 
                                responseStatus === 304 || // 304 Not Modified (cached)
                                hasTimingData ||
                                duration > 0;
              
              if (isComplete) {
                this.imageRequests.add(normalizedUrl);
                updated = true;
                
                // Debug logging (only occasionally to avoid spam)
                if (this.imageRequests.size % 50 === 0 || this.imageRequests.size === this.totalExpected) {
                  console.log(`[NetworkTracker] Tracked ${this.imageRequests.size}/${this.totalExpected} images (status: ${responseStatus || 'cached'})`);
                }
              }
            }
          }
        });
        
        if (updated) {
          this.notifyListeners();
        }
      } catch (e) {
        // Performance API might not be available
      }
    }, 50); // Check every 50ms (more frequent for better accuracy)
  }
  
  /**
   * Check if URL is an image request
   */
  private isImageRequest(url: string): boolean {
    return url.includes('.png') || 
           url.includes('/images/') ||
           url.match(/\.(png|jpg|jpeg|webp)$/i);
  }
  
  /**
   * Set total expected images
   */
  setTotalExpected(total: number) {
    this.totalExpected = total;
    this.notifyListeners();
  }
  
  /**
   * Get current progress
   */
  getProgress(): { loaded: number; total: number } {
    return {
      loaded: this.imageRequests.size,
      total: this.totalExpected || this.imageRequests.size
    };
  }
  
  /**
   * Add progress listener
   */
  addListener(callback: (loaded: number, total: number) => void) {
    this.listeners.add(callback);
    // Immediately notify with current progress
    const progress = this.getProgress();
    callback(progress.loaded, progress.total);
  }
  
  /**
   * Remove progress listener
   */
  removeListener(callback: (loaded: number, total: number) => void) {
    this.listeners.delete(callback);
  }
  
  /**
   * Notify all listeners
   */
  private notifyListeners() {
    const progress = this.getProgress();
    this.listeners.forEach(listener => {
      listener(progress.loaded, progress.total);
    });
  }
  
  /**
   * Reset tracker
   */
  reset() {
    this.requests.clear();
    this.imageRequests.clear();
    this.totalExpected = 0;
    // Don't reset processedUrls - keep tracking across resets
    this.notifyListeners();
  }
  
  /**
   * Force refresh from Performance API (for debugging)
   */
  forceRefresh() {
    this.trackPerformanceEntries();
    this.notifyListeners();
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const successful = Array.from(this.requests.values()).filter(r => r.success).length;
    const failed = Array.from(this.requests.values()).filter(r => r.endTime && !r.success).length;
    const pending = Array.from(this.requests.values()).filter(r => !r.endTime).length;
    
    return {
      total: this.requests.size,
      successful,
      failed,
      pending,
      loaded: this.imageRequests.size,
      expected: this.totalExpected
    };
  }
}

// Singleton instance
export const networkTracker = new NetworkTracker();


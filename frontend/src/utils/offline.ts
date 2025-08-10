/**
 * Offline utility functions for the Micros nutrition app
 */

export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

export interface OfflineData {
  foods: any[];
  recentLogs: any[];
  userProfile: any;
  lastSync: number;
}

// Service Worker registration
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered: ', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                showUpdateNotification();
              }
            });
          }
        });
      } catch (error) {
        console.log('SW registration failed: ', error);
      }
    });
  }
}

// Show notification for app updates
function showUpdateNotification() {
  if (Notification.permission === 'granted') {
    new Notification('App Updated', {
      body: 'A new version of Micros is available. Refresh to update.',
      icon: '/favicon.ico'
    });
  }
}

// Check if the app is running offline
export function isOffline(): boolean {
  return !navigator.onLine;
}

// Enhanced fetch with offline support
export async function offlineFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If successful, cache the response data for offline use
    if (response.ok && options.method === 'GET') {
      cacheResponseData(url, await response.clone().json());
    }
    
    return response;
  } catch (error) {
    // If network fails, try to serve from cache
    if (options.method === 'GET') {
      const cachedData = getCachedData(url);
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // If it's a POST request and we're offline, queue it
    if (options.method === 'POST' && isOffline()) {
      await queueOfflineRequest(url, options);
      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Request queued for sync when online'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Cache response data in localStorage
function cacheResponseData(url: string, data: any) {
  try {
    const cacheKey = `cache_${btoa(url)}`;
    const cacheData = {
      data,
      timestamp: Date.now(),
      url
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

// Get cached data from localStorage
function getCachedData(url: string): any | null {
  try {
    const cacheKey = `cache_${btoa(url)}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      
      // Return cached data if it's less than 1 hour old
      if (age < 60 * 60 * 1000) {
        return cacheData.data;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get cached data:', error);
    return null;
  }
}

// Queue offline request for later sync
async function queueOfflineRequest(url: string, options: RequestInit) {
  const offlineRequest: OfflineRequest = {
    id: generateId(),
    url,
    method: options.method || 'GET',
    headers: options.headers as Record<string, string> || {},
    body: options.body ? JSON.parse(options.body as string) : null,
    timestamp: Date.now()
  };
  
  await storeOfflineRequest(offlineRequest);
}

// Store offline request in IndexedDB
function storeOfflineRequest(request: OfflineRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('MicrosOfflineDB', 1);
    
    dbRequest.onerror = () => reject(dbRequest.error);
    
    dbRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('offlineRequests')) {
        db.createObjectStore('offlineRequests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
    
    dbRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['offlineRequests'], 'readwrite');
      const store = transaction.objectStore('offlineRequests');
      
      store.add(request);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Get all offline requests
export function getOfflineRequests(): Promise<OfflineRequest[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('offlineRequests')) {
        db.createObjectStore('offlineRequests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Check if the object store exists
      if (!db.objectStoreNames.contains('offlineRequests')) {
        // If not, return empty array
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(['offlineRequests'], 'readonly');
      const store = transaction.objectStore('offlineRequests');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// Store essential data for offline use
export async function storeOfflineData(data: Partial<OfflineData>) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');
      
      // Store each data type separately
      Object.entries(data).forEach(([key, value]) => {
        store.put({
          key,
          value,
          timestamp: Date.now()
        });
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Get offline data
export function getOfflineData(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        resolve(result ? result.value : null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Sync offline data when back online
export async function syncOfflineData(): Promise<void> {
  if (isOffline()) {
    throw new Error('Cannot sync while offline');
  }
  
  const offlineRequests = await getOfflineRequests();
  const syncResults = [];
  
  for (const request of offlineRequests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined
      });
      
      if (response.ok) {
        syncResults.push({ success: true, request });
        await removeOfflineRequest(request.id);
      } else {
        syncResults.push({ success: false, request, error: response.statusText });
      }
    } catch (error) {
      syncResults.push({ success: false, request, error: (error as Error).message });
    }
  }
  
  // Show sync results
  const successful = syncResults.filter(r => r.success).length;
  const failed = syncResults.filter(r => !r.success).length;
  
  if (successful > 0) {
    showNotification(`✅ Synced ${successful} offline action${successful > 1 ? 's' : ''}`);
  }
  
  if (failed > 0) {
    showNotification(`❌ Failed to sync ${failed} action${failed > 1 ? 's' : ''}`, 'error');
  }
}

// Remove offline request after successful sync
function removeOfflineRequest(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['offlineRequests'], 'readwrite');
      const store = transaction.objectStore('offlineRequests');
      
      store.delete(id);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Show notification to user
function showNotification(message: string, type: 'success' | 'error' = 'success') {
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Initialize the database with proper object stores
function initializeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('offlineRequests')) {
        db.createObjectStore('offlineRequests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
  });
}

// Setup offline event listeners
export function setupOfflineListeners() {
  window.addEventListener('online', async () => {
    console.log('Back online, syncing data...');
    try {
      await syncOfflineData();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('Gone offline, enabling offline mode...');
    showNotification('📴 You\'re now offline. Actions will sync when reconnected.');
  });
}

// Request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
      }
    });
  }
}

// Initialize offline support
export async function initializeOfflineSupport() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    registerServiceWorker();
    setupOfflineListeners();
    requestNotificationPermission();
    
    // Sync data on app start if online
    if (!isOffline()) {
      syncOfflineData().catch(console.error);
    }
  } catch (error) {
    console.error('Failed to initialize offline support:', error);
  }
}

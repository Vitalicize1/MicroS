// Service Worker for offline functionality
const CACHE_NAME = 'micros-v1';
const OFFLINE_URL = '/offline';

// Files to cache for offline use
const CACHE_URLS = [
  '/',
  '/offline',
  '/log',
  '/overview',
  '/search',
  '/profile',
  '/barcode',
  '/social',
  '/goals',
  '/progress',
  '/recipes',
  '/templates',
  // Add CSS and JS files
  '/_next/static/css/',
  '/_next/static/js/',
  // Add common images/icons
  '/favicon.ico'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(CACHE_URLS.filter(url => !url.includes('_next')));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests differently
  if (url.pathname.startsWith('/api/') || url.port === '5001') {
    // For API requests, try network first, then show offline message
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If it's a POST request (like logging food), store it for later
          if (request.method === 'POST') {
            return handleOfflinePost(request);
          }
          
          // For GET requests, return offline data or error
          return new Response(
            JSON.stringify({ 
              error: 'Offline', 
              message: 'You are currently offline. Data will sync when connection is restored.' 
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // For regular page requests, try cache first, then network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(request);
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// Handle offline POST requests (like food logging)
async function handleOfflinePost(request) {
  try {
    const data = await request.json();
    
    // Store the request for later sync
    const offlineData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: data,
      timestamp: Date.now(),
      id: generateId()
    };
    
    // Store in IndexedDB for persistence
    await storeOfflineRequest(offlineData);
    
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'Data saved offline. Will sync when online.',
        id: offlineData.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to store offline data'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Store offline request in IndexedDB
function storeOfflineRequest(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineRequests')) {
        db.createObjectStore('offlineRequests', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['offlineRequests'], 'readwrite');
      const store = transaction.objectStore('offlineRequests');
      
      store.add(data);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Listen for online event to sync data
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
    syncOfflineData();
  }
});

// Sync offline data when back online
async function syncOfflineData() {
  try {
    const offlineRequests = await getOfflineRequests();
    
    for (const request of offlineRequests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(request.body)
        });
        
        if (response.ok) {
          // Successfully synced, remove from offline storage
          await removeOfflineRequest(request.id);
          
          // Notify the client
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                data: request
              });
            });
          });
        }
      } catch (error) {
        console.log('Failed to sync request:', request.id, error);
      }
    }
  } catch (error) {
    console.log('Error syncing offline data:', error);
  }
}

// Get offline requests from IndexedDB
function getOfflineRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['offlineRequests'], 'readonly');
      const store = transaction.objectStore('offlineRequests');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Remove offline request from IndexedDB
function removeOfflineRequest(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['offlineRequests'], 'readwrite');
      const store = transaction.objectStore('offlineRequests');
      
      store.delete(id);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

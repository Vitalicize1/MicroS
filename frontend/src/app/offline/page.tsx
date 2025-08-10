"use client";
import { useState, useEffect } from 'react';

interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineRequests, setOfflineRequests] = useState<OfflineRequest[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline requests
    loadOfflineRequests();

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_SUCCESS') {
      // Remove synced request from display
      setOfflineRequests(prev => prev.filter(req => req.id !== event.data.data.id));
    }
  };

  const loadOfflineRequests = async () => {
    try {
      const requests = await getOfflineRequestsFromDB();
      setOfflineRequests(requests);
    } catch (error) {
      console.error('Error loading offline requests:', error);
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    
    try {
      // Tell service worker to sync data
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_OFFLINE_DATA'
        });
      }
      
      // Reload requests after a delay to show updated state
      setTimeout(loadOfflineRequests, 2000);
    } catch (error) {
      console.error('Error syncing offline data:', error);
    } finally {
      setSyncing(false);
    }
  };

  const clearOfflineData = async () => {
    try {
      await clearOfflineRequestsFromDB();
      setOfflineRequests([]);
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📴 Offline Mode
        </h1>
        <p className="text-gray-600">
          Your app works even without an internet connection
        </p>
      </div>

      {/* Connection Status */}
      <div className={`card ${isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <div className="font-semibold">
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </div>
              <div className="text-sm text-gray-600">
                {isOnline 
                  ? 'Connected to the internet' 
                  : 'No internet connection detected'
                }
              </div>
            </div>
          </div>
          
          {isOnline && offlineRequests.length > 0 && (
            <button
              onClick={syncOfflineData}
              disabled={syncing}
              className="btn btn-primary"
            >
              {syncing ? (
                <>
                  <div className="spinner inline-block mr-2"></div>
                  Syncing...
                </>
              ) : (
                '🔄 Sync Now'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Offline Features */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">📱 Offline Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold mb-2">📝 Food Logging</div>
            <p className="text-sm text-gray-600">
              Log your meals even without internet. Data will sync automatically when you're back online.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold mb-2">📊 View Progress</div>
            <p className="text-sm text-gray-600">
              Access your cached nutrition data and progress charts offline.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-lg font-semibold mb-2">🍳 Browse Recipes</div>
            <p className="text-sm text-gray-600">
              View previously loaded recipes and create new ones offline.
            </p>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-lg font-semibold mb-2">📱 Barcode Scanning</div>
            <p className="text-sm text-gray-600">
              Scan barcodes and save them for lookup when you're back online.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Sync Data */}
      {offlineRequests.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">⏳ Pending Sync</h2>
            <button
              onClick={clearOfflineData}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>
          
          <p className="text-gray-600 mb-4">
            These actions were performed offline and will sync when you're back online.
          </p>
          
          <div className="space-y-3">
            {offlineRequests.map((request) => (
              <div key={request.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {getActionDescription(request)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(request.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Pending
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="text-xl font-semibold mb-3 text-blue-900">💡 Offline Tips</h2>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li>• Your most recent data is cached and available offline</li>
          <li>• Food logging works offline and syncs automatically</li>
          <li>• Barcode scans are saved for later lookup</li>
          <li>• Recipe creation and viewing works without internet</li>
          <li>• Progress charts show cached data when offline</li>
          <li>• The app will notify you when data syncs successfully</li>
        </ul>
      </div>

      {/* Test Offline Mode */}
      <div className="card bg-gray-50 border-gray-200">
        <h2 className="text-xl font-semibold mb-3">🧪 Test Offline Mode</h2>
        <p className="text-gray-600 mb-4">
          To test offline functionality:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Open Chrome DevTools (F12)</li>
          <li>Go to the Network tab</li>
          <li>Check "Offline" to simulate no internet connection</li>
          <li>Try logging food or using other features</li>
          <li>Uncheck "Offline" to see data sync</li>
        </ol>
      </div>
    </div>
  );
}

// Helper function to describe the action
function getActionDescription(request: OfflineRequest) {
  if (request.url.includes('/agent') && request.body?.message?.includes('log meal')) {
    return `🍽️ Food Log: ${request.body.message.substring(0, 50)}...`;
  } else if (request.url.includes('/barcode/scan')) {
    return `📱 Barcode Scan: ${request.body?.upc || 'Unknown'}`;
  } else if (request.url.includes('/social/share')) {
    return `📤 Shared Food: ${request.body?.food_name || 'Unknown'}`;
  } else if (request.url.includes('/recipes')) {
    return `🍳 Recipe: ${request.body?.name || 'New Recipe'}`;
  } else {
    return `📝 ${request.method} request to ${request.url.split('/').pop()}`;
  }
}

// IndexedDB helper functions
function getOfflineRequestsFromDB(): Promise<OfflineRequest[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('offlineRequests')) {
        db.createObjectStore('offlineRequests', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['offlineRequests'], 'readonly');
      const store = transaction.objectStore('offlineRequests');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

function clearOfflineRequestsFromDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MicrosOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['offlineRequests'], 'readwrite');
      const store = transaction.objectStore('offlineRequests');
      
      store.clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

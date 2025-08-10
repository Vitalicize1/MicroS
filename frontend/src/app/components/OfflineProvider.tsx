"use client";
import { useEffect, useState } from 'react';
import { initializeOfflineSupport, isOffline, getOfflineRequests } from '@/utils/offline';

interface OfflineProviderProps {
  children: React.ReactNode;
}

export default function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    // Initialize offline support (async)
    const initOffline = async () => {
      await initializeOfflineSupport();
      
      // Set initial online status
      setIsOnline(!isOffline());
      
      // Load pending requests count after initialization
      loadPendingRequests();
    };
    
    initOffline();
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      // Reload pending requests after sync
      setTimeout(loadPendingRequests, 2000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_SUCCESS') {
          loadPendingRequests();
        }
      });
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingRequests = async () => {
    try {
      const requests = await getOfflineRequests();
      setPendingRequests(requests.length);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      // Set to 0 on error to prevent UI issues
      setPendingRequests(0);
    }
  };

  const dismissOfflineBanner = () => {
    setShowOfflineBanner(false);
  };

  return (
    <>
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 z-50">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-lg">📴</span>
              <span className="font-medium">You're offline</span>
              <span className="text-sm opacity-90">
                - Actions will sync when reconnected
              </span>
            </div>
            <button
              onClick={dismissOfflineBanner}
              className="text-white hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Pending Sync Indicator */}
      {pendingRequests > 0 && isOnline && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-40">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">
              Syncing {pendingRequests} action{pendingRequests > 1 ? 's' : ''}...
            </span>
          </div>
        </div>
      )}

      {/* Connection Status Indicator (small) */}
      <div className={`fixed top-4 left-4 w-3 h-3 rounded-full z-40 ${
        isOnline ? 'bg-green-500' : 'bg-red-500'
      }`} title={isOnline ? 'Online' : 'Offline'}>
      </div>

      {/* Main Content */}
      <div className={showOfflineBanner ? 'pt-12' : ''}>
        {children}
      </div>
    </>
  );
}

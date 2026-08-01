import { useState, useEffect } from 'react';
import { offlineStorage } from '@/lib/offline-storage';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasOfflineData, setHasOfflineData] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for offline data
    offlineStorage.getPredictions().then(predictions => {
      setHasOfflineData(predictions.length > 0);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineData = async (type: 'farmer' | 'prediction', data: any) => {
    try {
      if (type === 'farmer') {
        await offlineStorage.saveFarmer(data);
      } else if (type === 'prediction') {
        await offlineStorage.savePrediction({
          id: Date.now().toString(),
          type: data.type,
          data,
          timestamp: Date.now()
        });
      }
      setHasOfflineData(true);
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  };

  const getOfflineData = async () => {
    try {
      return await offlineStorage.getPredictions();
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return [];
    }
  };

  const clearOfflineData = async () => {
    try {
      await offlineStorage.clearAll();
      setHasOfflineData(false);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  return {
    isOnline,
    hasOfflineData,
    saveOfflineData,
    getOfflineData,
    clearOfflineData
  };
}

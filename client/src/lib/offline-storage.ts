interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  district: string;
  language: string;
}

interface OfflinePrediction {
  id: string;
  type: 'crop' | 'yield';
  data: any;
  timestamp: number;
}

class OfflineStorage {
  private dbName = 'FarmWiseDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores
        if (!db.objectStoreNames.contains('farmers')) {
          db.createObjectStore('farmers', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('predictions')) {
          db.createObjectStore('predictions', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('soilData')) {
          db.createObjectStore('soilData', { keyPath: 'district' });
        }
      };
    });
  }

  async saveFarmer(farmer: FarmerProfile): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['farmers'], 'readwrite');
      const store = transaction.objectStore('farmers');
      const request = store.put(farmer);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getFarmer(id: string): Promise<FarmerProfile | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['farmers'], 'readonly');
      const store = transaction.objectStore('farmers');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async savePrediction(prediction: OfflinePrediction): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['predictions'], 'readwrite');
      const store = transaction.objectStore('predictions');
      const request = store.put(prediction);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPredictions(): Promise<OfflinePrediction[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['predictions'], 'readonly');
      const store = transaction.objectStore('predictions');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    const stores = ['farmers', 'predictions', 'soilData'];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  }
}

export const offlineStorage = new OfflineStorage();

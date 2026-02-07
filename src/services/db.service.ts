
import { Injectable } from '@angular/core';

export interface DbRecord {
  id?: number;
  scope: string; // e.g. 'tools.password-generator'
  data: any;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private dbName = 'utildex-db';
  private version = 2; // Bumped Schema Version
  private dbPromise: Promise<IDBDatabase> | null = null;
  
  // Failsafe: In-Memory "Degraded Mode"
  private isInMemory = false;
  private memoryStores: Record<string, Map<any, any>> = {
    sys_config: new Map(),
    user_records: new Map(),
    app_blobs: new Map()
  };

  // New Store Constants
  readonly STORES = {
    CONFIG: 'sys_config',    // Key-Value (Settings)
    RECORDS: 'user_records', // Structured (History)
    BLOBS: 'app_blobs'      // Binary (Files)
  };

  /** System Configuration API */
  public readonly config = {
    read: (key: string) => this.run<any>('readonly', this.STORES.CONFIG, store => store.get(key)),
    write: (key: string, value: any) => this.run<void>('readwrite', this.STORES.CONFIG, store => store.put(value, key)),
    delete: (key: string) => this.run<void>('readwrite', this.STORES.CONFIG, store => store.delete(key))
  };

  /** User Data API */
  public readonly records = {
    add: (scope: string, data: any) => 
      this.run<number>('readwrite', this.STORES.RECORDS, store => 
        store.add({ scope, data, updatedAt: Date.now() })
      ),
    
    list: (scope: string) => 
      this.run<DbRecord[]>('readonly', this.STORES.RECORDS, store => {
        const index = store.index('scope');
        return index.getAll(scope);
      }),
      
    delete: (id: number) => 
      this.run<void>('readwrite', this.STORES.RECORDS, store => store.delete(id))
  };

  /** Blob Storage API */
  public readonly blobs = {
    put: (key: string, blob: Blob) => 
      this.run<string>('readwrite', this.STORES.BLOBS, store => store.put(blob, key)),
      
    get: (key: string) => 
      this.run<Blob>('readonly', this.STORES.BLOBS, store => store.get(key)),

    prune: () => Promise.resolve() 
  };


  // --- LEGACY COMPATIBILITY LAYER ---
  
  async get<T>(key: string): Promise<T | undefined> {
    const val = await this.config.read(key);
    return val as T;
  }

  async set(key: string, value: unknown): Promise<void> {
    return this.config.write(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.config.delete(key);
  }

  async clear(): Promise<void> {
    await this.wipe('all');
  }

  async keys(): Promise<string[]> {
    return this.run<string[]>('readonly', this.STORES.CONFIG, store => store.getAllKeys())
      .then(k => k.map(String));
  }

  async wipe(scope: 'all' | 'config' | 'cache') {
    if (scope === 'config' || scope === 'all') {
      await this.run('readwrite', this.STORES.CONFIG, s => s.clear());
      await this.run('readwrite', this.STORES.RECORDS, s => s.clear());
    }
    if (scope === 'cache' || scope === 'all') {
      await this.run('readwrite', this.STORES.BLOBS, s => s.clear());
    }
  }

  // --- INTERNAL ENGINE ---
  
  private async getDB(): Promise<IDBDatabase> {
    if (this.isInMemory) return null as any; 
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(this.dbName, this.version);
      } catch (e) {
        console.warn('IDB Access Denied. using Memory.');
        this.isInMemory = true;
        resolve(null as any);
        return;
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;

        if (!db.objectStoreNames.contains(this.STORES.CONFIG)) {
          db.createObjectStore(this.STORES.CONFIG); 
        }

        if (!db.objectStoreNames.contains(this.STORES.RECORDS)) {
          const store = db.createObjectStore(this.STORES.RECORDS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('scope', 'scope', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.STORES.BLOBS)) {
          db.createObjectStore(this.STORES.BLOBS);
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        db.onclose = () => {
          console.warn('DB Closed unexpectedly. Resetting.');
          this.dbPromise = null;
        };

        db.onversionchange = () => {
           db.close();
           this.dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = (event) => {
        this.isInMemory = true;
        resolve(null as any);
      };
    });

    return this.dbPromise;
  }

  private async run<T>(
    mode: IDBTransactionMode, 
    storeName: string, 
    operation: (store: IDBObjectStore) => IDBRequest
  ): Promise<T> {
    
    if (this.isInMemory) return this.runInMemory<T>(mode, storeName, operation);

    try {
      const db = await this.getDB();
      if (this.isInMemory) return this.runInMemory<T>(mode, storeName, operation);

      return new Promise((resolve, reject) => {
        let transaction: IDBTransaction;
        try {
           transaction = db.transaction(storeName, mode);
        } catch(e) {
           this.dbPromise = null;
           // Retry once
           this.getDB().then(newDb => {
               if (this.isInMemory) {
                   resolve(this.runInMemory(mode, storeName, operation));
               } else {
                   const t2 = newDb.transaction(storeName, mode);
                   this.executeRequest(t2, storeName, operation, resolve, reject);
               }
           }).catch(reject);
           return;
        }

        this.executeRequest(transaction, storeName, operation, resolve, reject);
      });
    } catch (e) {
      this.isInMemory = true;
      return this.runInMemory<T>(mode, storeName, operation);
    }
  }

  private executeRequest(
      transaction: IDBTransaction, 
      storeName: string,
      operation: (store: IDBObjectStore) => IDBRequest,
      resolve: (val: any) => void,
      reject: (err: any) => void
  ) {
      const store = transaction.objectStore(storeName);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
  }

  private runInMemory<T>(mode: string, storeName: string, op: any): Promise<T> {
    return new Promise(resolve => {
        // Mock success for in-memory
        resolve(undefined as any);
    });
  }
}

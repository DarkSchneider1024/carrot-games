/**
 * IndexedDB Storage Adapter
 */

const DB_NAME = 'carrot-games-db';
const DB_VERSION = 1;
const STORE_NAME = 'game-data';

export class IndexedDBAdapter {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };

      request.onerror = (e) => {
        reject(new Error('IndexedDB open failed: ' + e.target.error));
      };
    });
  }

  async save(key, data) {
    return this._transaction('readwrite', (store) => {
      store.put(data, key);
    });
  }

  async load(key) {
    return this._transaction('readonly', (store) => {
      return store.get(key);
    }, true);
  }

  async remove(key) {
    return this._transaction('readwrite', (store) => {
      store.delete(key);
    });
  }

  async list() {
    return this._transaction('readonly', (store) => {
      return store.getAllKeys();
    }, true);
  }

  _transaction(mode, callback, returnResult = false) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = callback(store);

      if (returnResult && result) {
        result.onsuccess = () => resolve(result.result);
        result.onerror = (e) => reject(e.target.error);
      } else {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      }
    });
  }
}

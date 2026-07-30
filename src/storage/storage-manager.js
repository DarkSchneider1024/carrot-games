/**
 * Storage Manager — Unified API with fallback strategy
 * OPFS → IndexedDB → localStorage
 */

import { OPFSAdapter } from './opfs-adapter.js';
import { IndexedDBAdapter } from './indexeddb-adapter.js';
import { LocalStorageAdapter } from './localstorage-adapter.js';

class StorageManager {
  constructor() {
    this.adapter = null;
    this.adapterName = '';
    this.ready = false;
    this._initPromise = null;
  }

  /**
   * Initialize — detect best available storage
   */
  async init() {
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._detectAndInit();
    return this._initPromise;
  }

  async _detectAndInit() {
    // Try OPFS first
    try {
      if ('storage' in navigator && 'getDirectory' in navigator.storage) {
        const adapter = new OPFSAdapter();
        await adapter.init();
        this.adapter = adapter;
        this.adapterName = 'OPFS';
        this.ready = true;
        console.log('📁 Storage: Using OPFS');
        return;
      }
    } catch (e) {
      console.warn('OPFS not available:', e.message);
    }

    // Try IndexedDB
    try {
      if ('indexedDB' in window) {
        const adapter = new IndexedDBAdapter();
        await adapter.init();
        this.adapter = adapter;
        this.adapterName = 'IndexedDB';
        this.ready = true;
        console.log('📁 Storage: Using IndexedDB');
        return;
      }
    } catch (e) {
      console.warn('IndexedDB not available:', e.message);
    }

    // Fallback to localStorage
    try {
      const adapter = new LocalStorageAdapter();
      await adapter.init();
      this.adapter = adapter;
      this.adapterName = 'localStorage';
      this.ready = true;
      console.log('📁 Storage: Using localStorage');
    } catch (e) {
      console.error('No storage available:', e);
      this.ready = false;
    }
  }

  /**
   * Save data
   * @param {string} key
   * @param {*} data - JSON-serializable data
   */
  async save(key, data) {
    if (!this.ready) await this.init();
    if (!this.adapter) throw new Error('No storage adapter available');
    return this.adapter.save(key, data);
  }

  /**
   * Load data
   * @param {string} key
   * @returns {*} The stored data, or null if not found
   */
  async load(key) {
    if (!this.ready) await this.init();
    if (!this.adapter) return null;
    return this.adapter.load(key);
  }

  /**
   * Delete data
   * @param {string} key
   */
  async remove(key) {
    if (!this.ready) await this.init();
    if (!this.adapter) return;
    return this.adapter.remove(key);
  }

  /**
   * List all keys
   * @returns {string[]}
   */
  async list() {
    if (!this.ready) await this.init();
    if (!this.adapter) return [];
    return this.adapter.list();
  }

  /**
   * Get storage info
   */
  getInfo() {
    return {
      adapter: this.adapterName,
      ready: this.ready,
    };
  }
}

// Singleton
export const storage = new StorageManager();

/**
 * localStorage Storage Adapter (Fallback)
 */

const PREFIX = 'carrot-games:';
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5 MB warning threshold

export class LocalStorageAdapter {
  async init() {
    // localStorage is always available, just check
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
  }

  async save(key, data) {
    const fullKey = PREFIX + key;
    const json = JSON.stringify(data);

    // Check size
    this._checkSize(json.length);

    try {
      localStorage.setItem(fullKey, json);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Clearing old data...');
        this._cleanup();
        localStorage.setItem(fullKey, json);
      } else {
        throw e;
      }
    }
  }

  async load(key) {
    const fullKey = PREFIX + key;
    const json = localStorage.getItem(fullKey);
    if (json === null) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  async remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  async list() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) {
        keys.push(k.slice(PREFIX.length));
      }
    }
    return keys;
  }

  _checkSize(newBytes) {
    let total = newBytes;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) {
        total += localStorage.getItem(k).length;
      }
    }
    if (total > MAX_SIZE) {
      console.warn(`⚠️ localStorage usage: ${(total / 1024 / 1024).toFixed(2)} MB — approaching limit`);
    }
  }

  _cleanup() {
    // Remove oldest game records
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX + 'game-record:')) {
        keys.push(k);
      }
    }
    // Remove first half of old records
    const removeCount = Math.ceil(keys.length / 2);
    keys.slice(0, removeCount).forEach(k => localStorage.removeItem(k));
  }
}

/**
 * OPFS (Origin Private File System) Storage Adapter
 */

export class OPFSAdapter {
  constructor() {
    this.root = null;
    this.dirName = 'carrot-games-data';
  }

  async init() {
    const root = await navigator.storage.getDirectory();
    this.root = await root.getDirectoryHandle(this.dirName, { create: true });
  }

  async save(key, data) {
    const fileName = this._keyToFileName(key);
    const fileHandle = await this.root.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
  }

  async load(key) {
    try {
      const fileName = this._keyToFileName(key);
      const fileHandle = await this.root.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (e) {
      if (e.name === 'NotFoundError') return null;
      throw e;
    }
  }

  async remove(key) {
    try {
      const fileName = this._keyToFileName(key);
      await this.root.removeEntry(fileName);
    } catch (e) {
      if (e.name !== 'NotFoundError') throw e;
    }
  }

  async list() {
    const keys = [];
    for await (const [name] of this.root.entries()) {
      if (name.endsWith('.json')) {
        keys.push(this._fileNameToKey(name));
      }
    }
    return keys;
  }

  _keyToFileName(key) {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
  }

  _fileNameToKey(fileName) {
    return fileName.replace(/\.json$/, '');
  }
}

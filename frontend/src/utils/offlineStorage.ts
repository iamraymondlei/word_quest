/**
 * Word Quest Offline Storage Engine
 * Backed by browser IndexedDB for reliable offline storage on iPad / Tablets,
 * with graceful fallback to localStorage.
 */

const DB_NAME = 'WordQuestOfflineDB';
const DB_VERSION = 2;

export interface SyncAction {
  id?: number;
  type: 'update_stage' | 'add_coins' | 'update_avatar' | 'translation_stats';
  payload: any;
  timestamp: number;
}

export interface OfflineMetadata {
  lastSyncTime: number;
  storyCount: number;
  wordCount: number;
  illustrationCount?: number;
}

class OfflineStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        return reject(new Error('IndexedDB not supported'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Users store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        // 2. Islands store (keyed by composite or userId_islandId)
        if (!db.objectStoreNames.contains('islands')) {
          const islandStore = db.createObjectStore('islands', { keyPath: 'storage_key' });
          islandStore.createIndex('by_user', 'user_id', { unique: false });
        }

        // 3. Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 4. Pending sync queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }

        // 5. Illustrations binary store for 100% offline picture book rendering
        if (!db.objectStoreNames.contains('illustrations')) {
          db.createObjectStore('illustrations', { keyPath: 'url' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // ── Users Management ──────────────────────────────────────────────────
  async saveCachedUsers(users: any[]): Promise<void> {
    if (!users || !Array.isArray(users)) return;
    try {
      const db = await this.initDB();
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      // Clear and rewrite
      store.clear();
      for (const u of users) {
        store.put(u);
      }
      localStorage.setItem('wordquest_cached_users', JSON.stringify(users));
    } catch (e) {
      localStorage.setItem('wordquest_cached_users', JSON.stringify(users));
    }
  }

  async getCachedUsers(): Promise<any[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          if (list.length > 0) {
            resolve(list);
          } else {
            const fallback = localStorage.getItem('wordquest_cached_users');
            resolve(fallback ? JSON.parse(fallback) : []);
          }
        };
        req.onerror = () => {
          const fallback = localStorage.getItem('wordquest_cached_users');
          resolve(fallback ? JSON.parse(fallback) : []);
        };
      });
    } catch {
      const fallback = localStorage.getItem('wordquest_cached_users');
      return fallback ? JSON.parse(fallback) : [];
    }
  }

  async updateCachedUserCoins(userId: number, deltaCoins: number): Promise<void> {
    try {
      const users = await this.getCachedUsers();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.coins = (Number(user.coins) || 0) + deltaCoins;
        await this.saveCachedUsers(users);
      }
      // Also update currentUser in localStorage if it matches
      const current = localStorage.getItem('wordquest_user');
      if (current) {
        const parsed = JSON.parse(current);
        if (parsed.id === userId) {
          parsed.coins = (Number(parsed.coins) || 0) + deltaCoins;
          localStorage.setItem('wordquest_user', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.warn('Failed to update cached user coins:', err);
    }
  }

  async updateCachedAvatar(userId: number, avatar: string): Promise<void> {
    try {
      const users = await this.getCachedUsers();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.avatar = avatar;
        await this.saveCachedUsers(users);
      }
      const current = localStorage.getItem('wordquest_user');
      if (current) {
        const parsed = JSON.parse(current);
        if (parsed.id === userId) {
          parsed.avatar = avatar;
          localStorage.setItem('wordquest_user', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.warn('Failed to update cached avatar:', err);
    }
  }

  // ── Islands / Stories Management ──────────────────────────────────────
  async saveCachedIslands(userId: number, islands: any[]): Promise<void> {
    if (!islands || !Array.isArray(islands)) return;
    try {
      const db = await this.initDB();
      const tx = db.transaction('islands', 'readwrite');
      const store = tx.objectStore('islands');

      for (const island of islands) {
        store.put({
          storage_key: `${userId}_${island.id}`,
          user_id: userId,
          island_id: island.id,
          data: island,
        });
      }

      // Also update metadata
      let totalWords = 0;
      islands.forEach((i) => {
        if (i.words && Array.isArray(i.words)) {
          totalWords += i.words.length;
        }
      });
      await this.saveMetadata({
        lastSyncTime: Date.now(),
        storyCount: islands.length,
        wordCount: totalWords,
      });

      // Simple backup in localStorage for quick synchronous check
      try {
        localStorage.setItem(`wordquest_islands_${userId}`, JSON.stringify(islands));
      } catch {
        // quota exceeded might happen in localStorage, ignore since indexedDB succeeded
      }
    } catch (e) {
      console.warn('IndexedDB saveCachedIslands error, using localStorage fallback:', e);
      try {
        localStorage.setItem(`wordquest_islands_${userId}`, JSON.stringify(islands));
      } catch (err) {
        console.error('LocalStorage quota exceeded:', err);
      }
    }
  }

  async getCachedIslands(userId: number): Promise<any[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('islands', 'readonly');
        const store = tx.objectStore('islands');
        const index = store.index('by_user');
        const req = index.getAll(userId);

        req.onsuccess = () => {
          const records = req.result || [];
          if (records.length > 0) {
            resolve(records.map((r: any) => r.data));
          } else {
            const fallback = localStorage.getItem(`wordquest_islands_${userId}`);
            resolve(fallback ? JSON.parse(fallback) : []);
          }
        };

        req.onerror = () => {
          const fallback = localStorage.getItem(`wordquest_islands_${userId}`);
          resolve(fallback ? JSON.parse(fallback) : []);
        };
      });
    } catch {
      const fallback = localStorage.getItem(`wordquest_islands_${userId}`);
      return fallback ? JSON.parse(fallback) : [];
    }
  }

  async updateCachedStageProgress(
    userId: number,
    islandId: number,
    stage: number,
    score: number,
    mistakes: any[]
  ): Promise<void> {
    try {
      const islands = await this.getCachedIslands(userId);
      const island = islands.find((i) => i.id === islandId);
      if (island) {
        if (!island.progress) {
          island.progress = {
            stage1_status: 'locked',
            stage2_status: 'locked',
            stage3_status: 'locked',
            stage4_status: 'locked',
            stage1_score: 0,
            stage2_score: 0,
            stage3_score: 0,
            stage4_score: 0,
            mistake_words: [],
          };
        }
        // Update current stage
        (island.progress as any)[`stage${stage}_status`] = 'passed';
        (island.progress as any)[`stage${stage}_score`] = score;

        // Unlock next stage
        if (stage < 4) {
          const nextStatusKey = `stage${stage + 1}_status`;
          if ((island.progress as any)[nextStatusKey] === 'locked') {
            (island.progress as any)[nextStatusKey] = 'unlocked';
          }
        }

        // Merge mistakes
        if (mistakes && mistakes.length > 0) {
          const existing = island.progress.mistake_words || [];
          const merged = Array.from(new Set([...existing, ...mistakes]));
          island.progress.mistake_words = merged;
        }

        await this.saveCachedIslands(userId, islands);
      }
    } catch (err) {
      console.warn('Failed to update cached stage progress:', err);
    }
  }

  // ── Settings & Metadata ───────────────────────────────────────────────
  async saveCachedSettings(settings: any): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key: 'game_settings', value: settings });
      localStorage.setItem('wordquest_game_settings', JSON.stringify(settings));
    } catch {
      localStorage.setItem('wordquest_game_settings', JSON.stringify(settings));
    }
  }

  async getCachedSettings(): Promise<any | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('game_settings');
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve(req.result.value);
          } else {
            const fallback = localStorage.getItem('wordquest_game_settings');
            resolve(fallback ? JSON.parse(fallback) : null);
          }
        };
        req.onerror = () => {
          const fallback = localStorage.getItem('wordquest_game_settings');
          resolve(fallback ? JSON.parse(fallback) : null);
        };
      });
    } catch {
      const fallback = localStorage.getItem('wordquest_game_settings');
      return fallback ? JSON.parse(fallback) : null;
    }
  }

  async saveMetadata(meta: OfflineMetadata): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key: 'offline_metadata', value: meta });
    } catch {
      localStorage.setItem('wordquest_offline_meta', JSON.stringify(meta));
    }
  }

  async getMetadata(): Promise<OfflineMetadata | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('offline_metadata');
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve(req.result.value);
          } else {
            const fallback = localStorage.getItem('wordquest_offline_meta');
            resolve(fallback ? JSON.parse(fallback) : null);
          }
        };
        req.onerror = () => {
          const fallback = localStorage.getItem('wordquest_offline_meta');
          resolve(fallback ? JSON.parse(fallback) : null);
        };
      });
    } catch {
      const fallback = localStorage.getItem('wordquest_offline_meta');
      return fallback ? JSON.parse(fallback) : null;
    }
  }

  // ── Offline Sync Queue ────────────────────────────────────────────────
  async enqueueSyncAction(action: Omit<SyncAction, 'timestamp'>): Promise<void> {
    const fullAction: SyncAction = {
      ...action,
      timestamp: Date.now(),
    };
    try {
      const db = await this.initDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      store.add(fullAction);
    } catch (err) {
      console.warn('Failed to enqueue sync action to IndexedDB, fallback to localStorage:', err);
      const queue = this.getLocalStorageQueue();
      queue.push({ ...fullAction, id: Date.now() });
      localStorage.setItem('wordquest_sync_queue', JSON.stringify(queue));
    }
  }

  private getLocalStorageQueue(): SyncAction[] {
    const raw = localStorage.getItem('wordquest_sync_queue');
    return raw ? JSON.parse(raw) : [];
  }

  async getPendingSyncActions(): Promise<SyncAction[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('syncQueue', 'readonly');
        const store = tx.objectStore('syncQueue');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          const lsList = this.getLocalStorageQueue();
          resolve([...list, ...lsList]);
        };
        req.onerror = () => {
          resolve(this.getLocalStorageQueue());
        };
      });
    } catch {
      return this.getLocalStorageQueue();
    }
  }

  async removeSyncActions(ids: number[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    try {
      const db = await this.initDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      for (const id of ids) {
        store.delete(id);
      }
    } catch (err) {
      console.warn('Failed to delete sync queue from IndexedDB:', err);
    }
    // Also clean localStorage queue
    const lsQueue = this.getLocalStorageQueue();
    const filtered = lsQueue.filter((item) => item.id && !ids.includes(item.id));
    localStorage.setItem('wordquest_sync_queue', JSON.stringify(filtered));
  }

  // ── Illustrations Binary Storage ──────────────────────────────────────
  async saveIllustrationBlob(url: string, blob: Blob): Promise<void> {
    if (!url || !blob) return;
    try {
      const db = await this.initDB();
      const tx = db.transaction('illustrations', 'readwrite');
      const store = tx.objectStore('illustrations');
      store.put({
        url,
        blob,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('Failed to store illustration blob in IndexedDB:', err);
    }
  }

  async getIllustrationBlob(url: string): Promise<Blob | null> {
    if (!url) return null;
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('illustrations', 'readonly');
        const store = tx.objectStore('illustrations');
        const req = store.get(url);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(req.result.blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async getIllustrationObjectURL(url: string): Promise<string | null> {
    const blob = await this.getIllustrationBlob(url);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  }
}

export const offlineStorage = new OfflineStorageEngine();

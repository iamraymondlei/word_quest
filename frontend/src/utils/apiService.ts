/**
 * Unified API & Offline Sync Service for WordQuest
 * Automatically falls back to IndexedDB when offline and queues mutations for later sync.
 */

import { offlineStorage } from './offlineStorage';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  storyCount: number;
  wordCount: number;
  illustrationCount?: number;
}

class ApiService {
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyStatus();
        this.syncOfflineQueue();
      });
      window.addEventListener('offline', () => {
        this.notifyStatus();
      });
    }
  }

  isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    this.notifyStatus();
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  async getStatus(): Promise<SyncStatus> {
    const meta = await offlineStorage.getMetadata();
    const pending = await offlineStorage.getPendingSyncActions();
    return {
      isOnline: this.isOnline(),
      isSyncing: this.isSyncing,
      pendingCount: pending.length,
      lastSyncTime: meta?.lastSyncTime || null,
      storyCount: meta?.storyCount || 0,
      wordCount: meta?.wordCount || 0,
      illustrationCount: meta?.illustrationCount || 0,
    };
  }

  private async notifyStatus() {
    const status = await this.getStatus();
    this.syncListeners.forEach((l) => l(status));
  }

  // ── 1. Users API ──────────────────────────────────────────────────────
  async getUsers(): Promise<any[]> {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const users = await res.json();
        // Save to offline storage
        await offlineStorage.saveCachedUsers(users);
        this.notifyStatus();
        return users;
      }
    } catch (err) {
      console.warn('Network unavailable, loading users from offline cache:', err);
    }

    // Fallback to offline cache
    const cachedUsers = await offlineStorage.getCachedUsers();
    return cachedUsers;
  }

  async updateAvatar(userId: number, avatar: string): Promise<boolean> {
    // Optimistically update local
    await offlineStorage.updateCachedAvatar(userId, avatar);

    if (this.isOnline()) {
      try {
        const res = await fetch('/api/users/update-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, avatar }),
        });
        if (res.ok) return true;
      } catch (e) {
        console.warn('Failed to update avatar online, queued offline:', e);
      }
    }

    // Offline queue
    await offlineStorage.enqueueSyncAction({
      type: 'update_avatar',
      payload: { user_id: userId, avatar },
    });
    this.notifyStatus();
    return true;
  }

  async addCoins(userId: number, coins: number): Promise<{ success: boolean; coins: number; offline: boolean }> {
    // Update local cache immediately
    await offlineStorage.updateCachedUserCoins(userId, coins);

    if (this.isOnline()) {
      try {
        const res = await fetch('/api/users/add-coins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, coins }),
        });
        if (res.ok) {
          const data = await res.json();
          this.notifyStatus();
          return { success: true, coins: data.coins, offline: false };
        }
      } catch (err) {
        console.warn('Failed to add coins online, queued for offline sync:', err);
      }
    }

    // Offline queue
    await offlineStorage.enqueueSyncAction({
      type: 'add_coins',
      payload: { user_id: userId, coins },
    });
    this.notifyStatus();
    return { success: true, coins: 0, offline: true };
  }

  // ── 2. Islands / Stories API ──────────────────────────────────────────
  async getIslands(userId: number): Promise<any[]> {
    try {
      const res = await fetch(`/api/islands?user_id=${userId}`);
      if (res.ok) {
        const islands = await res.json();
        // Save to offline storage
        await offlineStorage.saveCachedIslands(userId, islands);
        this.notifyStatus();
        return islands;
      }
    } catch (err) {
      console.warn('Network unavailable, loading islands from offline cache:', err);
    }

    // Fallback to offline cache
    const cachedIslands = await offlineStorage.getCachedIslands(userId);
    return cachedIslands;
  }

  // ── 3. Stage Progress API ─────────────────────────────────────────────
  async updateStageProgress(params: {
    user_id: number;
    island_id: number;
    stage: number;
    score: number;
    completed: boolean;
    mistakes?: string[];
  }): Promise<{ success: boolean; offline: boolean }> {
    // Update local cached progress immediately so next stage unlocks without network
    await offlineStorage.updateCachedStageProgress(
      params.user_id,
      params.island_id,
      params.stage,
      params.score,
      params.mistakes || []
    );

    if (this.isOnline()) {
      try {
        const res = await fetch('/api/progress/update-stage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (res.ok) {
          this.notifyStatus();
          return { success: true, offline: false };
        }
      } catch (err) {
        console.warn('Failed to update stage progress online, queued for offline sync:', err);
      }
    }

    // Offline queue
    await offlineStorage.enqueueSyncAction({
      type: 'update_stage',
      payload: params,
    });
    this.notifyStatus();
    return { success: true, offline: true };
  }

  async updateTranslationStats(params: {
    user_id: number;
    island_id: number;
    revealed_count: number;
    auto_passed_count: number;
  }): Promise<void> {
    if (this.isOnline()) {
      try {
        const res = await fetch('/api/progress/update-translation-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (res.ok) return;
      } catch {
        // queue offline
      }
    }

    await offlineStorage.enqueueSyncAction({
      type: 'translation_stats',
      payload: params,
    });
    this.notifyStatus();
  }

  async getTranslationStats(userId: number, islandId: number): Promise<any> {
    try {
      const res = await fetch(`/api/progress/get-translation-stats?user_id=${userId}&island_id=${islandId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline default
    }
    return { translation_stats: {} };
  }

  // ── 4. Game Settings API ──────────────────────────────────────────────
  async getGameSettings(): Promise<any> {
    try {
      const res = await fetch('/api/game-settings');
      if (res.ok) {
        const settings = await res.json();
        await offlineStorage.saveCachedSettings(settings);
        return settings;
      }
    } catch (err) {
      console.warn('Failed to fetch game settings online, using cached settings:', err);
    }

    const cached = await offlineStorage.getCachedSettings();
    return (
      cached || {
        stage1_passing_score: 80,
        stage2_passing_score: 80,
        stage3_passing_score: 80,
        stage4_passing_score: 80,
        stage3_monster_speed: 1.0,
      }
    );
  }

  // ── 5. Cache All For Offline Button (一键下载离线题库) ─────────────────
  async cacheAllForOffline(userId: number): Promise<{ success: boolean; storyCount: number; wordCount: number; illustrationCount?: number; error?: string }> {
    try {
      // 1. Fetch and cache users
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const users = await usersRes.json();
        await offlineStorage.saveCachedUsers(users);
      }

      // 2. Fetch and cache islands & words
      const islandsRes = await fetch(`/api/islands?user_id=${userId}`);
      if (!islandsRes.ok) {
        throw new Error('无法连接到服务器获取题库');
      }
      const islands = await islandsRes.json();
      await offlineStorage.saveCachedIslands(userId, islands);

      // 3. Fetch and cache game settings
      const settingsRes = await fetch('/api/game-settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        await offlineStorage.saveCachedSettings(settings);
      }

      let totalWords = 0;
      const illustrationUrls = new Set<string>();

      islands.forEach((i: any) => {
        if (i.words && Array.isArray(i.words)) {
          totalWords += i.words.length;
        }
        if (Array.isArray(i.story_passage_json)) {
          i.story_passage_json.forEach((p: any) => {
            if (p && p.illustration_url && typeof p.illustration_url === 'string') {
              illustrationUrls.add(p.illustration_url);
            }
          });
        }
      });

      // 4. Precache all story illustrations concurrently into IndexedDB & Workbox Cache
      let cachedIllustrationCount = 0;
      if (illustrationUrls.size > 0) {
        await Promise.all(
          Array.from(illustrationUrls).map(async (url) => {
            try {
              const imgRes = await fetch(url);
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                await offlineStorage.saveIllustrationBlob(url, blob);
                cachedIllustrationCount++;
              }
            } catch (err) {
              console.warn(`Failed to precache illustration ${url}:`, err);
            }
          })
        );
      }

      // Update offline metadata
      await offlineStorage.saveMetadata({
        lastSyncTime: Date.now(),
        storyCount: islands.length,
        wordCount: totalWords,
        illustrationCount: cachedIllustrationCount,
      });

      await this.notifyStatus();
      return {
        success: true,
        storyCount: islands.length,
        wordCount: totalWords,
        illustrationCount: cachedIllustrationCount,
      };
    } catch (err: any) {
      console.error('Failed to cache all data for offline:', err);
      return {
        success: false,
        storyCount: 0,
        wordCount: 0,
        illustrationCount: 0,
        error: err.message || '网络连接超时',
      };
    }
  }

  // ── 6. Sync Pending Queue To Backend ──────────────────────────────────
  async syncOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
    if (this.isSyncing || !this.isOnline()) {
      const pending = await offlineStorage.getPendingSyncActions();
      return { syncedCount: 0, remainingCount: pending.length };
    }

    this.isSyncing = true;
    this.notifyStatus();

    const pendingActions = await offlineStorage.getPendingSyncActions();
    const successfulIds: number[] = [];

    try {
      for (const action of pendingActions) {
        try {
          let ok = false;
          if (action.type === 'update_stage') {
            const res = await fetch('/api/progress/update-stage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            ok = res.ok;
          } else if (action.type === 'add_coins') {
            const res = await fetch('/api/users/add-coins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            ok = res.ok;
          } else if (action.type === 'update_avatar') {
            const res = await fetch('/api/users/update-avatar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            ok = res.ok;
          } else if (action.type === 'translation_stats') {
            const res = await fetch('/api/progress/update-translation-stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            ok = res.ok;
          }

          if (ok && action.id !== undefined) {
            successfulIds.push(action.id);
          }
        } catch (itemErr) {
          console.warn('Error syncing queue item:', action, itemErr);
          break; // Stop loop if network breaks mid-way
        }
      }

      if (successfulIds.length > 0) {
        await offlineStorage.removeSyncActions(successfulIds);
      }
    } finally {
      this.isSyncing = false;
      this.notifyStatus();
    }

    const remaining = await offlineStorage.getPendingSyncActions();
    return {
      syncedCount: successfulIds.length,
      remainingCount: remaining.length,
    };
  }
}

export const apiService = new ApiService();

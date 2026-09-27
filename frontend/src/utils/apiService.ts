/**
 * Unified API & Offline Sync Service for WordQuest
 * Automatically falls back to IndexedDB when offline and queues mutations for later sync.
 */

import { offlineStorage } from './offlineStorage';
import { isForcedOffline } from './offlineMode';

export interface SyncStatus {
  isOnline: boolean;
  forcedOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  storyCount: number;
  wordCount: number;
  illustrationCount?: number;
}

export interface SongSegment {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration_seconds: number | null;
  audio_url: string;
  lrc_text: string | null;
  lrc_source: string | null;
  lrclib_id: number | null;
  match_duration_seconds: number | null;
  status: 'READY' | 'NEEDS_LYRICS' | string;
  segments: SongSegment[];
  targetWords: string[];
  translations: { sentences: Array<{ en: string; zh: string }>; words: Array<{ word: string; meaning: string; phonetic?: string; example?: string }> } | null;
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
    if (isForcedOffline()) return false;
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
      forcedOffline: isForcedOffline(),
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
    if (isForcedOffline()) return offlineStorage.getCachedUsers();
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
    if (isForcedOffline()) return offlineStorage.getCachedIslands(userId);
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
    if (isForcedOffline()) return { translation_stats: {} };
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
    if (isForcedOffline()) {
      return (await offlineStorage.getCachedSettings()) || {
        stage1_passing_score: 80, stage2_passing_score: 80,
        stage3_passing_score: 80, stage4_passing_score: 80,
        stage3_monster_speed: 1.0,
      };
    }
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

  async getSongs(): Promise<Song[]> {
    if (isForcedOffline()) throw new Error('歌曲尚未支持离线播放，请切换到在线模式。');
    const response = await fetch('/api/songs');
    if (!response.ok) throw new Error('无法加载歌曲列表');
    return response.json();
  }

  async uploadSong(formData: FormData): Promise<{ song: Song; candidates: Array<Record<string, unknown>> }> {
    const response = await fetch('/api/songs', { method: 'POST', body: formData });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '歌曲上传失败');
    return data;
  }

  async updateSong(songId: number, payload: { title?: string; artist?: string; album?: string; lrc_text?: string; lrc_source?: string; lrclib_id?: number | null; match_duration_seconds?: number | null; segments?: SongSegment[]; target_words?: string[] }): Promise<Song> {
    const response = await fetch(`/api/songs/${songId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '歌曲保存失败');
    return data;
  }

  async translateSong(songId: number, payload: { sentences?: string[]; words?: string[]; model?: string; cli?: string } = {}): Promise<{ song: Song; translations: Song['translations'] }> {
    const response = await fetch(`/api/songs/${songId}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '歌词翻译失败');
    return data;
  }

  async deleteSong(songId: number): Promise<void> {
    const response = await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('歌曲删除失败');
  }

  async parseSongLrc(lrcText: string, duration?: number): Promise<SongSegment[]> {
    const response = await fetch('/api/songs/parse-lrc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lrc_text: lrcText, duration }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'LRC 解析失败');
    return data.segments || [];
  }

  // ── 5. Cache All For Offline Button (一键下载离线题库) ─────────────────
  async cacheAllForOffline(userId: number): Promise<{ success: boolean; storyCount: number; wordCount: number; illustrationCount?: number; error?: string }> {
    if (isForcedOffline()) return { success: false, storyCount: 0, wordCount: 0, error: '请先切换到在线模式' };
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

      if (cachedIllustrationCount !== illustrationUrls.size) {
        throw new Error('部分插图下载失败，请保持联网后重试');
      }

      // Update offline metadata
      await offlineStorage.saveMetadata({
        userId,
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

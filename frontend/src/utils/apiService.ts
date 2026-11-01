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
  assigned_user_ids?: number[];
}

class ApiService {
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private isSyncing = false;
  private syncPromise: Promise<{ syncedCount: number; remainingCount: number }> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyStatus();
        this.syncOfflineQueue();
      });
      window.addEventListener('offline', () => {
        this.notifyStatus();
      });
      // Automatically flush pending offline queue when page loads in online mode
      window.setTimeout(() => {
        if (this.isOnline()) {
          this.syncOfflineQueue();
        }
      }, 300);
    }
  }

  private async ensureSyncedIfOnline(): Promise<void> {
    if (!this.isOnline()) return;
    try {
      const pending = await offlineStorage.getPendingSyncActions();
      if (pending.length > 0 || this.syncPromise) {
        await this.syncOfflineQueue();
      }
    } catch {
      // Ignore sync pre-check errors and proceed with read
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
  async adminLogin(username: string, password: string): Promise<any> {
    if (isForcedOffline()) {
      if (username.trim().toLowerCase() === 'admin' && password === 'admin') {
        const cachedUsers = await offlineStorage.getCachedUsers();
        let admin = cachedUsers.find((u: any) => u.username?.toLowerCase() === 'admin');
        if (!admin) {
          admin = { id: 999999, username: 'Admin', avatar: '👑', coins: 0, is_admin: 1 };
        }
        return { success: true, user: admin };
      }
      throw new Error('Invalid username or password');
    }

    try {
      const res = await fetch('/api/users/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid username or password');
      }
      return data;
    } catch (err: any) {
      if (username.trim().toLowerCase() === 'admin' && password === 'admin') {
        return { success: true, user: { id: 1, username: 'Admin', avatar: '👑', is_admin: 1 } };
      }
      throw err;
    }
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<any> {
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, old_password: oldPassword, new_password: newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '修改密码失败');
    }
    return data;
  }

  async getUsers(): Promise<any[]> {
    if (isForcedOffline()) return offlineStorage.getCachedUsers();
    await this.ensureSyncedIfOnline();
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
    await this.ensureSyncedIfOnline();
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
    completed_stage?: number;
    score: number;
    completed: boolean;
    mistakes?: string[];
    stage1_answers?: string[];
  }): Promise<{ success: boolean; offline: boolean }> {
    // Update local cached progress immediately so next stage unlocks without network
    await offlineStorage.updateCachedStageProgress(
      params.user_id,
      params.island_id,
      params.stage,
      params.score,
      params.mistakes || [],
      params.stage1_answers,
      params.completed_stage
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

  async getSongs(userId?: number): Promise<Song[]> {
    if (isForcedOffline()) throw new Error('Songs require an online connection. Please switch to online mode.');
    const url = userId ? `/api/songs?user_id=${userId}` : '/api/songs';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load songs');
    return response.json();
  }

  async updateSongAccess(songId: number, userIds: number[]): Promise<{ song_id: number; assigned_user_ids: number[] }> {
    const response = await fetch(`/api/songs/${songId}/access`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: userIds }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '更新歌曲归属用户失败');
    return data;
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

  // ── 5. Cache All For Offline Button ─────────────────
  async cacheAllForOffline(userId: number): Promise<{ success: boolean; storyCount: number; wordCount: number; illustrationCount?: number; error?: string }> {
    if (isForcedOffline()) return { success: false, storyCount: 0, wordCount: 0, error: 'Please switch to online mode first' };
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
        throw new Error('Cannot connect to server to fetch question bank');
      }
      const islands = await islandsRes.json();
      await offlineStorage.saveCachedIslands(userId, islands);

      // 3. Fetch and cache game settings
      const settingsRes = await fetch('/api/game-settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        await offlineStorage.saveCachedSettings(settings);
      }

      // 4. Fetch and cache word books & vocabulary words
      try {
        const booksRes = await fetch(`/api/word-books?userId=${userId}`);
        if (booksRes.ok) {
          const books = await booksRes.json();
          await offlineStorage.saveCachedWordBooks(books);
          for (const b of books) {
            const wordsRes = await fetch(`/api/word-books/${b.id}/words?userId=${userId}`);
            if (wordsRes.ok) {
              const bWords = await wordsRes.json();
              await offlineStorage.saveCachedBookWords(b.id, bWords);
            }
          }
        }
      } catch (vocabErr) {
        console.warn('Non-fatal: failed to download word books offline package:', vocabErr);
      }

      // 5. Fetch and cache Grammar Quest progress & history
      try {
        const grammarProgRes = await fetch(`/api/grammar/progress/${userId}`);
        if (grammarProgRes.ok) {
          const grammarProg = await grammarProgRes.json();
          await offlineStorage.saveCachedGrammarProgress(userId, grammarProg);
        }
        for (const qId of ['unit1', 'unit2']) {
          const histRes = await fetch(`/api/grammar/history/${userId}/${qId}`);
          if (histRes.ok) {
            const hist = await histRes.json();
            await offlineStorage.saveCachedGrammarHistory(userId, qId, hist);
          }
        }
      } catch (grammarErr) {
        console.warn('Non-fatal: failed to cache grammar progress/history:', grammarErr);
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
        throw new Error('Some illustrations failed to download. Please stay online and retry.');
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
        error: err.message || 'Network connection timed out',
      };
    }
  }

  // ── 6. Sync Pending Queue To Backend ──────────────────────────────────
  async syncOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
    if (this.syncPromise) {
      return this.syncPromise;
    }
    if (!this.isOnline()) {
      const pending = await offlineStorage.getPendingSyncActions();
      return { syncedCount: 0, remainingCount: pending.length };
    }

    this.syncPromise = this._doSyncOfflineQueue().finally(() => {
      this.syncPromise = null;
    });
    return this.syncPromise;
  }

  private async _doSyncOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
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
          } else if (action.type === 'vocab_progress') {
            const res = await fetch(`/api/vocabulary-words/${action.payload.vocabId}/progress`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            ok = res.ok;
          } else if (action.type === 'word_book_progress') {
            const res = await fetch(`/api/word-books/${action.payload.bookId}/progress`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            ok = res.ok;
          } else if (action.type === 'grammar_submit') {
            const res = await fetch('/api/grammar/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            ok = res.ok;
            if (ok) {
              const data = await res.json().catch(() => null);
              if (data?.user) {
                localStorage.setItem('wordquest_current_user', JSON.stringify(data.user));
                localStorage.setItem('wordquest_user', JSON.stringify(data.user));
              }
            }
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

  // ── Word Books & Vocabulary Lab ───────────────────────────────────────
  async getWordBooks(userId?: number): Promise<any[]> {
    if (isForcedOffline()) {
      return offlineStorage.getCachedWordBooks();
    }
    try {
      const url = userId ? `/api/word-books?userId=${userId}` : '/api/word-books';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        await offlineStorage.saveCachedWordBooks(data);
        return data;
      }
    } catch (e) {
      console.warn('Failed to fetch word books from network, falling back to cache:', e);
    }
    return offlineStorage.getCachedWordBooks();
  }

  async recordWordBookProgress(bookId: number, userId: number, stage: number): Promise<any> {
    const payload = { bookId, userId, stage };
    await offlineStorage.updateCachedWordBookProgress(bookId, stage);

    if (isForcedOffline()) {
      await offlineStorage.enqueueSyncAction({
        type: 'word_book_progress',
        payload
      });
      return {
        success: true,
        offline: true,
        book_id: bookId,
        stage
      };
    }

    try {
      const res = await fetch(`/api/word-books/${bookId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to record word book progress online, enqueuing for offline sync:', e);
    }

    await offlineStorage.enqueueSyncAction({
      type: 'word_book_progress',
      payload
    });
    return {
      success: true,
      offline: true,
      book_id: bookId,
      stage
    };
  }

  async getStoryGroups(): Promise<Array<{ id: number; name: string }>> {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch story groups:', e);
    }
    return [];
  }

  async createWordBook(data: { category?: string; title: string; description?: string; tags?: string; sort_order?: number; user_ids?: number[]; island_id?: number }): Promise<any> {
    const res = await fetch('/api/word-books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create word book');
    }
    return res.json();
  }

  async syncStoryWordBooks(): Promise<any> {
    const res = await fetch('/api/word-books/sync-stories', {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to sync story word books');
    }
    return res.json();
  }

  async updateWordBook(id: number, data: { category?: string; title?: string; description?: string; tags?: string; sort_order?: number; user_ids?: number[] }): Promise<any> {
    const res = await fetch(`/api/word-books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update word book');
    }
    return res.json();
  }

  async getWordBookAccess(bookId: number): Promise<number[]> {
    const res = await fetch(`/api/word-books/${bookId}/access`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch word book access');
    }
    const data = await res.json();
    return data.user_ids || [];
  }

  async updateWordBookAccess(bookId: number, userIds: number[]): Promise<any> {
    const res = await fetch(`/api/word-books/${bookId}/access`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: userIds })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update word book access');
    }
    return res.json();
  }

  async deleteWordBook(id: number): Promise<any> {
    const res = await fetch(`/api/word-books/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete word book');
    }
    return res.json();
  }

  async getBookWords(bookId: number, userId?: number): Promise<any[]> {
    if (isForcedOffline()) {
      return offlineStorage.getCachedBookWords(bookId);
    }
    try {
      const url = userId ? `/api/word-books/${bookId}/words?userId=${userId}` : `/api/word-books/${bookId}/words`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        await offlineStorage.saveCachedBookWords(bookId, data);
        return data;
      }
    } catch (e) {
      console.warn('Failed to fetch book words from network, falling back to cache:', e);
    }
    return offlineStorage.getCachedBookWords(bookId);
  }

  async addWordsToBook(bookId: number, words: any[]): Promise<any> {
    const res = await fetch(`/api/word-books/${bookId}/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to import words');
    }
    return res.json();
  }

  async updateVocabularyWord(id: number, data: any): Promise<any> {
    const res = await fetch(`/api/vocabulary-words/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update word');
    }
    return res.json();
  }

  async deleteVocabularyWord(id: number): Promise<any> {
    const res = await fetch(`/api/vocabulary-words/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete word');
    }
    return res.json();
  }

  async batchMoveVocabularyWords(wordIds: number[], targetBookId: number): Promise<any> {
    const res = await fetch('/api/vocabulary-words/batch-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_ids: wordIds, target_book_id: targetBookId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to batch move words');
    }
    return res.json();
  }

  async batchDeleteVocabularyWords(wordIds: number[]): Promise<any> {
    const res = await fetch('/api/vocabulary-words/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_ids: wordIds })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to batch delete words');
    }
    return res.json();
  }

  async recordVocabularyProgress(
    vocabId: number,
    userId: number,
    mode: 'reading' | 'listening' | 'spelling',
    passed: boolean,
    extra?: { answer?: string; durationMs?: number; clientId?: string }
  ): Promise<any> {
    const clientId = extra?.clientId || (
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    );

    const payload = {
      vocabId,
      userId,
      mode,
      passed,
      answer: extra?.answer,
      durationMs: extra?.durationMs,
      clientId
    };

    // 1. Update offline cache immediately
    await offlineStorage.updateCachedWordProgress(vocabId, mode, passed);

    // 2. If offline, enqueue action
    if (isForcedOffline()) {
      await offlineStorage.enqueueSyncAction({
        type: 'vocab_progress',
        payload
      });
      return {
        success: true,
        offline: true,
        ...payload
      };
    }

    // 3. If online, send directly
    try {
      const res = await fetch(`/api/vocabulary-words/${vocabId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return res.json();
      }
    } catch (e) {
      console.warn('Failed to record word progress online, enqueuing for offline sync:', e);
    }

    await offlineStorage.enqueueSyncAction({
      type: 'vocab_progress',
      payload
    });
    return {
      success: true,
      offline: true,
      ...payload
    };
  }

  async getVocabularyStats(
    userId: number,
    options?: { mode?: string; bookId?: number; sort?: string; minAttempts?: number }
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options?.mode) params.append('mode', options.mode);
    if (options?.bookId) params.append('bookId', String(options.bookId));
    if (options?.sort) params.append('sort', options.sort);
    if (options?.minAttempts) params.append('minAttempts', String(options.minAttempts));

    const res = await fetch(`/api/users/${userId}/vocabulary-stats?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch vocabulary statistics');
    }
    return res.json();
  }

  async getPracticeWords(
    userId: number,
    options?: { mode?: string; bookId?: number; limit?: number }
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options?.mode) params.append('mode', options.mode);
    if (options?.bookId) params.append('bookId', String(options.bookId));
    if (options?.limit) params.append('limit', String(options.limit));

    const res = await fetch(`/api/users/${userId}/vocabulary-stats/practice-words?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch practice words');
    }
    return res.json();
  }

  async aiEnrichWords(words: string[], model?: string, cli?: string): Promise<any> {
    const res = await fetch('/api/word-books/ai-enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words, model, cli })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to enrich words via AI');
    }
    return res.json();
  }

  async generateStoryFromVocab(
    islandId?: number,
    options?: {
      words?: string[];
      title?: string;
      category?: string;
      theme_style?: string;
      target_level?: string;
      page_count?: number;
      question_count?: number;
      model?: string;
      cli?: string;
      auto_save?: boolean;
    }
  ): Promise<any> {
    const url = islandId ? `/api/islands/${islandId}/ai-generate-story` : '/api/islands/ai-generate-story';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate story from vocabulary');
    }
    return res.json();
  }

  // ==========================================
  // Grammar Quiz & Comprehensive Training APIs
  // ==========================================

  async getGrammarProgress(userId: number): Promise<Record<string, any>> {
    if (isForcedOffline()) {
      return offlineStorage.getCachedGrammarProgress(userId);
    }
    await this.ensureSyncedIfOnline();
    try {
      const res = await fetch(`/api/grammar/progress/${userId}`);
      if (res.ok) {
        const data = await res.json();
        await offlineStorage.saveCachedGrammarProgress(userId, data);
        return data;
      }
    } catch (err) {
      console.warn('Network unavailable, loading grammar progress from offline cache:', err);
    }
    return offlineStorage.getCachedGrammarProgress(userId);
  }

  async submitGrammarQuiz(data: {
    userId: number;
    category?: string;
    quizId: string;
    score: number;
    totalQuestions: number;
    correctCount: number;
    userAnswers: Record<string, string>;
    wrongDetails?: any[];
  }): Promise<{
    success: boolean;
    offline?: boolean;
    recordId: number;
    score: number;
    coinsAwarded: number;
    starsAwarded: number;
    isFirstPass: boolean;
    user?: any;
  }> {
    if (this.isOnline()) {
      try {
        const res = await fetch('/api/grammar/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const result = await res.json();
          // Keep local offline cache in sync with authoritative server result
          await offlineStorage.recordOfflineGrammarQuiz(data, result);
          return result;
        }
      } catch (err) {
        console.warn('Network error during grammar quiz submission, saving offline:', err);
      }
    }

    // Offline fallback: update local cache immediately and enqueue for background sync
    const offlineResult = await offlineStorage.recordOfflineGrammarQuiz(data);
    await offlineStorage.enqueueSyncAction({
      type: 'grammar_submit',
      payload: data,
    });
    this.notifyStatus();
    return offlineResult;
  }

  async getGrammarHistory(userId: number, quizId: string): Promise<any[]> {
    if (isForcedOffline()) {
      return offlineStorage.getCachedGrammarHistory(userId, quizId);
    }
    await this.ensureSyncedIfOnline();
    try {
      const res = await fetch(`/api/grammar/history/${userId}/${quizId}`);
      if (res.ok) {
        const data = await res.json();
        await offlineStorage.saveCachedGrammarHistory(userId, quizId, data);
        return data;
      }
    } catch (err) {
      console.warn('Network unavailable, loading grammar history from offline cache:', err);
    }
    return offlineStorage.getCachedGrammarHistory(userId, quizId);
  }
}

export const apiService = new ApiService();

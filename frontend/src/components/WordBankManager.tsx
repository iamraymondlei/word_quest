import React, { useEffect, useState, useMemo } from 'react';
import { apiService } from '../utils/apiService';

export interface SentenceItem {
  en: string;
  zh: string;
}

export interface VocabularyWord {
  id?: number;
  book_id?: number;
  word: string;
  phonetic?: string;
  translation: string;
  fun_sentences?: SentenceItem[];
  antonyms?: string;
  synonyms?: string;
  root_affixes?: string;
  etymology?: string;
  error_count?: number;
  mastered?: number;
  reading_passed?: number;
  spelling_passed?: number;
}

export interface WordBook {
  id: number;
  category?: string;
  title: string;
  description?: string;
  tags?: string;
  sort_order?: number;
  word_count?: number;
  created_at?: string;
  assigned_user_ids?: number[];
}

export interface UserOption {
  id: number;
  username: string;
  avatar?: string;
  is_admin?: number;
}

export const WordBankManager: React.FC = () => {
  // Books state
  const [books, setBooks] = useState<WordBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(() => {
    const saved = localStorage.getItem('wordquest_admin_selected_book_id');
    return saved ? Number(saved) : null;
  });
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users list for ownership assignment
  const [usersList, setUsersList] = useState<UserOption[]>([]);

  // Standalone Access Modal State
  const [accessModalBook, setAccessModalBook] = useState<WordBook | null>(null);
  const [accessModalUserIds, setAccessModalUserIds] = useState<number[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState<boolean>(false);

  // Active view in word manager
  const [activeTab, setActiveTab] = useState<'import' | 'directory'>('import');

  // Directory search filter
  const [directorySearch, setDirectorySearch] = useState<string>('');

  // Import inputs
  const [rawWordsInput, setRawWordsInput] = useState<string>('curious, ancient, resilient, mysterious, courageous');
  const [aiModel, setAiModel] = useState<string>('gemini-3.7-flash-low');
  const [aiCli, setAiCli] = useState<'agy' | 'codex'>('agy');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiProgress, setAiProgress] = useState<{ current: number; total: number; percent: number; text: string } | null>(null);

  // Editable draft table after AI or CSV import
  const [draftWords, setDraftWords] = useState<VocabularyWord[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [draftSelectedIndices, setDraftSelectedIndices] = useState<number[]>([]);

  // Directory multi-selection & batch actions
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);

  // Move Chapter Modal State (single or batch)
  const [moveModalOpen, setMoveModalOpen] = useState<boolean>(false);
  const [movingWordIds, setMovingWordIds] = useState<number[]>([]);
  const [targetMoveBookId, setTargetMoveBookId] = useState<number | null>(null);
  const [isMovingWords, setIsMovingWords] = useState<boolean>(false);

  // Active selected category for horizontal book tabs
  const [activeCategory, setActiveCategory] = useState<string>('General');

  // Book Modal (Create & Edit)
  const [bookModalMode, setBookModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [formCategory, setFormCategory] = useState<string>('General');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formTags, setFormTags] = useState<string>('');
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formUserIds, setFormUserIds] = useState<number[]>([]);

  // Group books by category
  const categoryGroups = useMemo(() => {
    const groups: Record<string, WordBook[]> = {};
    for (const b of books) {
      const cat = b.category?.trim() || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    }
    return groups;
  }, [books]);

  // Existing distinct categories for autocompletion
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => {
      if (b.category?.trim()) set.add(b.category.trim());
    });
    return Array.from(set);
  }, [books]);

  // Chapters under currently active category
  const currentCategoryChapters = useMemo(() => {
    return categoryGroups[activeCategory] || [];
  }, [categoryGroups, activeCategory]);

  const selectedBook = books.find((b) => b.id === selectedBookId);

  // Sync activeCategory when selectedBook changes or books load
  useEffect(() => {
    if (selectedBook?.category) {
      setActiveCategory(selectedBook.category.trim());
    } else if (books.length > 0) {
      const categories = Object.keys(categoryGroups);
      if (categories.length > 0 && !categories.includes(activeCategory)) {
        setActiveCategory(categories[0]);
      }
    }
  }, [selectedBookId, selectedBook, books, categoryGroups, activeCategory]);

  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    const chapters = categoryGroups[cat] || [];
    if (chapters.length > 0) {
      setSelectedBookId(chapters[0].id);
    } else {
      setSelectedBookId(null);
    }
  };

  // Parsed words from raw input
  const parsedWordsCount = useMemo(() => {
    if (!rawWordsInput.trim()) return 0;
    const list = rawWordsInput
      .split(/[\n,，;；]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => /^[a-z'-]+(?:\s+[a-z'-]+)*$/i.test(w));
    return Array.from(new Set(list)).length;
  }, [rawWordsInput]);

  // Load books
  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getWordBooks();
      setBooks(data);
      if (data.length > 0) {
        setSelectedBookId(prev => {
          if (prev && data.some(b => b.id === prev)) return prev;
          return data[0].id;
        });
      } else {
        setSelectedBookId(null);
      }
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || '加载词单失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // Load users for permissions/ownership
  const loadUsers = async () => {
    try {
      const data = await apiService.getUsers();
      setUsersList(data || []);
    } catch (e) {
      console.warn('Failed to load users for WordBankManager:', e);
    }
  };

  useEffect(() => {
    loadBooks();
    loadUsers();
  }, []);

  // Save selected book ID
  useEffect(() => {
    if (selectedBookId) {
      localStorage.setItem('wordquest_admin_selected_book_id', String(selectedBookId));
    }
  }, [selectedBookId]);

  // Load words when selected book changes
  const loadBookWords = async (bookId: number) => {
    try {
      const data = await apiService.getBookWords(bookId);
      setWords(data || []);
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || '加载单词失败' });
    }
  };

  useEffect(() => {
    setSelectedWordIds([]);
    if (selectedBookId) {
      loadBookWords(selectedBookId);
    } else {
      setWords([]);
    }
  }, [selectedBookId]);

  // Open Create Modal
  const openCreateModal = (defaultCategory?: string) => {
    setBookModalMode('create');
    setEditingBookId(null);
    setFormCategory(defaultCategory || activeCategory || 'General');
    setFormTitle('');
    setFormDesc('');
    setFormTags('');
    setFormSortOrder(0);
    setFormUserIds([]);
  };

  // Open Edit Modal
  const openEditModal = (book: WordBook, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookModalMode('edit');
    setEditingBookId(book.id);
    setFormCategory(book.category || 'General');
    setFormTitle(book.title);
    setFormDesc(book.description || '');
    setFormTags(book.tags || '');
    setFormSortOrder(book.sort_order || 0);
    setFormUserIds(book.assigned_user_ids || []);
  };

  // Close Book Modal
  const closeBookModal = () => {
    setBookModalMode(null);
    setEditingBookId(null);
    setFormUserIds([]);
  };

  // Save Book (Create or Edit)
  const handleSaveBookModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setStatus({ type: 'error', text: '请输入章节/词单名称' });
      return;
    }
    const cleanCategory = formCategory.trim() || 'General';
    const cleanTitle = formTitle.trim();

    try {
      if (bookModalMode === 'create') {
        const newBook = await apiService.createWordBook({
          category: cleanCategory,
          title: cleanTitle,
          description: formDesc.trim(),
          tags: formTags.trim(),
          sort_order: Number(formSortOrder) || 0,
          user_ids: formUserIds
        });
        setStatus({ type: 'success', text: `✨ 成功新建章节《${cleanCategory} · ${newBook.title}》！` });
        closeBookModal();
        await loadBooks();
        setSelectedBookId(newBook.id);
      } else if (bookModalMode === 'edit' && editingBookId) {
        const updated = await apiService.updateWordBook(editingBookId, {
          category: cleanCategory,
          title: cleanTitle,
          description: formDesc.trim(),
          tags: formTags.trim(),
          sort_order: Number(formSortOrder) || 0,
          user_ids: formUserIds
        });
        setStatus({ type: 'success', text: `✅ 章节《${cleanCategory} · ${updated.title}》更新成功！` });
        closeBookModal();
        await loadBooks();
      }
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || '保存章节信息失败' });
    }
  };

  // Helper to render user selection checkboxes group
  const renderUserSelectionGroup = (
    selectedIds: number[],
    onChange: (ids: number[]) => void,
    label = "归属学员设置 (Book Ownership)"
  ) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
          <span>👥</span>
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
            title="设为公开（不设限）"
          >
            清空/设为公开
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => onChange(usersList.map((u) => u.id))}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            title="全部勾选"
          >
            全选学员
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl max-h-36 overflow-y-auto scrollbar-thin">
        {usersList.length === 0 ? (
          <span className="text-xs text-slate-500 italic">暂无系统注册学员</span>
        ) : (
          usersList.map((user) => {
            const isChecked = selectedIds.includes(user.id);
            return (
              <label
                key={user.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                  isChecked
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedIds, user.id]);
                    } else {
                      onChange(selectedIds.filter((id) => id !== user.id));
                    }
                  }}
                  className="accent-cyan-500 rounded cursor-pointer"
                />
                <span>{user.avatar || '👤'}</span>
                <span>{user.username}</span>
                {user.is_admin === 1 && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded font-mono ml-0.5">
                    ADMIN
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
      <p className="text-[10px] text-slate-500">
        若不勾选任何学员，则该章节对全部学员公开。若勾选学员，则仅所选学员可见。
      </p>
    </div>
  );

  // Delete Book
  const handleDeleteBook = async (bookId: number, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`确定要删除章节《${title}》吗？其下的所有收录单词都将被一并删除！`)) return;
    try {
      await apiService.deleteWordBook(bookId);
      setStatus({ type: 'success', text: `章节《${title}》已成功删除` });
      if (selectedBookId === bookId) {
        setSelectedBookId(null);
      }
      await loadBooks();
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || '删除章节失败' });
    }
  };

  // Run AI Enrichment with progressive batching
  const handleAiEnrich = async () => {
    if (!rawWordsInput.trim()) {
      setStatus({ type: 'error', text: '请输入至少一个生词' });
      return;
    }
    const wordsList = Array.from(
      new Set(
        rawWordsInput
          .split(/[\n,，;；]+/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => /^[a-z'-]+(?:\s+[a-z'-]+)*$/i.test(w))
      )
    );

    if (wordsList.length === 0) {
      setStatus({ type: 'error', text: '没有识别到合法的英文字词' });
      return;
    }

    setIsAiLoading(true);
    setStatus(null);
    setDraftWords([]);

    const CHUNK_SIZE = 5;
    const totalWords = wordsList.length;
    const totalBatches = Math.ceil(totalWords / CHUNK_SIZE);
    const accumulatedDraft: VocabularyWord[] = [];
    let hadFallbackWarning: string | null = null;

    try {
      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const start = batchIdx * CHUNK_SIZE;
        const chunk = wordsList.slice(start, start + CHUNK_SIZE);
        const percent = Math.round(((batchIdx + 1) / totalBatches) * 100);

        setAiProgress({
          current: Math.min(start + chunk.length, totalWords),
          total: totalWords,
          percent,
          text: `正在深度解析第 ${batchIdx + 1} / ${totalBatches} 批 (${start + 1}-${Math.min(start + chunk.length, totalWords)} / ${totalWords} 词)...`
        });

        const res = await apiService.aiEnrichWords(chunk, aiModel, aiCli);
        if (res && res.data) {
          if (res.source === 'fallback') {
            hadFallbackWarning = res.warning || '部分词条响应超时，已生成待填模板';
          }
          accumulatedDraft.push(...res.data);
          // Stream progressive updates into draft review table
          setDraftWords([...accumulatedDraft]);
        }
      }

      setAiProgress({
        current: totalWords,
        total: totalWords,
        percent: 100,
        text: `✨ 解析完成！共丰富了 ${accumulatedDraft.length} 个词条。`
      });

      if (hadFallbackWarning) {
        setStatus({
          type: 'error',
          text: `⚠️ ${hadFallbackWarning}`
        });
      } else {
        setStatus({
          type: 'success',
          text: `✨ AI 成功解析并丰富了 ${accumulatedDraft.length} 个词条！请在下方表格复核微调后保存入库。`
        });
      }
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'AI 解析中断' });
    } finally {
      setIsAiLoading(false);
      setTimeout(() => setAiProgress(null), 4000);
    }
  };

  // Update draft word
  const updateDraftField = (index: number, field: keyof VocabularyWord, value: any) => {
    setDraftWords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Update draft sentence
  const updateDraftSentence = (index: number, sIndex: number, subField: 'en' | 'zh', value: string) => {
    setDraftWords((prev) => {
      const updated = [...prev];
      const sentences = [...(updated[index].fun_sentences || [])];
      if (!sentences[sIndex]) {
        sentences[sIndex] = { en: '', zh: '' };
      }
      sentences[sIndex][subField] = value;
      updated[index] = { ...updated[index], fun_sentences: sentences };
      return updated;
    });
  };

  // Add draft row
  const addDraftRow = () => {
    setDraftWords((prev) => [
      ...prev,
      {
        word: '',
        phonetic: '',
        translation: '',
        fun_sentences: [{ en: '', zh: '' }],
        antonyms: '',
        synonyms: '',
        root_affixes: '',
        etymology: ''
      }
    ]);
  };

  // Remove draft row
  const removeDraftRow = (index: number) => {
    setDraftWords((prev) => prev.filter((_, i) => i !== index));
  };

  // Commit draft words into selected book
  const handleCommitDraft = async () => {
    if (!selectedBookId) {
      setStatus({ type: 'error', text: '请先在左侧选择目标章节词单' });
      return;
    }
    const validWords = draftWords.filter((w) => w.word && w.word.trim() && w.translation && w.translation.trim());
    if (validWords.length === 0) {
      setStatus({ type: 'error', text: '请确保至少有一个填写了英文单词与核心释义的词条' });
      return;
    }

    setIsSavingDraft(true);
    setStatus(null);
    try {
      await apiService.addWordsToBook(selectedBookId, validWords);
      setStatus({ type: 'success', text: `🎉 成功将 ${validWords.length} 个单词保存入库！` });
      setDraftWords([]);
      await loadBookWords(selectedBookId);
      await loadBooks();
      setActiveTab('directory');
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || '保存入库失败' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Delete single word from directory
  const handleDeleteWord = async (wordId: number, wordText: string) => {
    if (!window.confirm(`确定要从当前章节删除单词 "${wordText}" 吗？`)) return;
    try {
      await apiService.deleteVocabularyWord(wordId);
      setStatus({ type: 'success', text: `单词 "${wordText}" 已删除` });
      setSelectedWordIds((prev) => prev.filter((id) => id !== wordId));
      if (selectedBookId) {
        await loadBookWords(selectedBookId);
        await loadBooks();
      }
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || '删除失败' });
    }
  };

  // Batch delete words from directory
  const handleBatchDeleteWords = async () => {
    if (selectedWordIds.length === 0) return;
    if (!window.confirm(`确定要从当前章节批量删除选中的 ${selectedWordIds.length} 个单词吗？此操作不可恢复！`)) return;
    try {
      const res = await apiService.batchDeleteVocabularyWords(selectedWordIds);
      setStatus({
        type: 'success',
        text: `🗑️ 成功批量删除 ${res.deleted_count || selectedWordIds.length} 个单词！`
      });
      setSelectedWordIds([]);
      if (selectedBookId) {
        await loadBookWords(selectedBookId);
        await loadBooks();
      }
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || '批量删除失败' });
    }
  };

  // Open modal to move single word
  const openMoveSingleWordModal = (wordId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMovingWordIds([wordId]);
    const otherBook = books.find((b) => b.id !== selectedBookId);
    setTargetMoveBookId(otherBook ? otherBook.id : null);
    setMoveModalOpen(true);
  };

  // Open modal to batch move words
  const openBatchMoveModal = () => {
    if (selectedWordIds.length === 0) return;
    setMovingWordIds([...selectedWordIds]);
    const otherBook = books.find((b) => b.id !== selectedBookId);
    setTargetMoveBookId(otherBook ? otherBook.id : null);
    setMoveModalOpen(true);
  };

  // Confirm move words to target chapter
  const handleConfirmMoveWords = async () => {
    if (movingWordIds.length === 0 || !targetMoveBookId) {
      setStatus({ type: 'error', text: '请选择目标归属章节' });
      return;
    }
    if (targetMoveBookId === selectedBookId) {
      setStatus({ type: 'error', text: '目标章节与当前所在章节相同，无需移动' });
      return;
    }
    const targetBook = books.find((b) => b.id === targetMoveBookId);
    setIsMovingWords(true);
    try {
      await apiService.batchMoveVocabularyWords(movingWordIds, targetMoveBookId);
      setStatus({
        type: 'success',
        text: `🎉 成功将 ${movingWordIds.length} 个单词移动至《${targetBook?.category || 'General'} · ${targetBook?.title || '目标章节'}》！`
      });
      setMoveModalOpen(false);
      setMovingWordIds([]);
      setSelectedWordIds((prev) => prev.filter((id) => !movingWordIds.includes(id)));
      if (selectedBookId) {
        await loadBookWords(selectedBookId);
        await loadBooks();
      }
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || '移动单词失败' });
    } finally {
      setIsMovingWords(false);
    }
  };

  // Batch remove draft rows
  const handleBatchRemoveDraftRows = () => {
    if (draftSelectedIndices.length === 0) return;
    setDraftWords((prev) => prev.filter((_, idx) => !draftSelectedIndices.includes(idx)));
    setDraftSelectedIndices([]);
  };

  // Filtered directory words
  const filteredWords = useMemo(() => {
    if (!directorySearch.trim()) return words;
    const q = directorySearch.toLowerCase().trim();
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.translation.toLowerCase().includes(q) ||
        (w.phonetic && w.phonetic.toLowerCase().includes(q))
    );
  }, [words, directorySearch]);

  // Directory selection helpers
  const isAllDirectorySelected = useMemo(() => {
    if (filteredWords.length === 0) return false;
    return filteredWords.every((w) => w.id && selectedWordIds.includes(w.id));
  }, [filteredWords, selectedWordIds]);

  const toggleSelectAllDirectory = () => {
    if (isAllDirectorySelected) {
      const filteredIds = new Set(filteredWords.map((w) => w.id));
      setSelectedWordIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const validIds = filteredWords.map((w) => w.id).filter(Boolean) as number[];
      setSelectedWordIds((prev) => Array.from(new Set([...prev, ...validIds])));
    }
  };

  const toggleSelectWord = (wordId: number) => {
    setSelectedWordIds((prev) =>
      prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
    );
  };

  // Draft table selection helpers
  const isAllDraftSelected = useMemo(() => {
    if (draftWords.length === 0) return false;
    return draftWords.length === draftSelectedIndices.length;
  }, [draftWords, draftSelectedIndices]);

  const toggleSelectAllDraft = () => {
    if (isAllDraftSelected) {
      setDraftSelectedIndices([]);
    } else {
      setDraftSelectedIndices(draftWords.map((_, idx) => idx));
    }
  };

  const toggleSelectDraftRow = (index: number) => {
    setDraftSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="flex flex-col gap-6 text-slate-200 font-sans pb-12">
      {/* Status banner */}
      {status && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-sm shadow-xl transition-all ${
            status.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{status.type === 'success' ? '🎯' : '⚠️'}</span>
            <span className="font-medium">{status.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatus(null)}
            className="text-slate-400 hover:text-white font-bold ml-4 p-1 rounded-lg hover:bg-slate-800/60 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          Top Two-Tier Cascade Navigation Bar (书本系列与章节两级横向导航)
          ─────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-col gap-3.5 backdrop-blur-sm w-full">
        {/* Tier 1: Books / Series Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 py-0.5">
            <span className="text-xs font-black text-slate-400 tracking-wider flex items-center gap-1.5 shrink-0 uppercase mr-1">
              <span>📚</span>
              <span>书本系列:</span>
            </span>

            {Object.keys(categoryGroups).length === 0 ? (
              <span className="text-xs text-slate-500 italic">
                {isLoading ? '🛰️ 载入目录中...' : '暂无书本，请点击右侧“新建书本”'}
              </span>
            ) : (
              Object.entries(categoryGroups).map(([categoryName, chapterList]) => {
                const isActive = activeCategory === categoryName;
                const totalWords = chapterList.reduce((acc, c) => acc + (c.word_count || 0), 0);
                return (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() => handleSelectCategory(categoryName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black scale-102'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <span>{isActive ? '📖' : '📚'}</span>
                    <span>{categoryName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950 font-bold'
                          : 'bg-slate-800/80 text-cyan-400'
                      }`}
                    >
                      {chapterList.length}章 · {totalWords}词
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => openCreateModal('')}
            className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="新建一本全新的词单书"
          >
            <span>➕</span>
            <span>新建书本</span>
          </button>
        </div>

        {/* Tier 2: Chapter Selector Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 py-0.5">
            <span className="text-xs font-black text-slate-400 tracking-wider flex items-center gap-1.5 shrink-0 uppercase mr-1">
              <span>📄</span>
              <span>章节目录:</span>
            </span>

            {currentCategoryChapters.length === 0 ? (
              <span className="text-xs text-amber-400/80 italic">
                《{activeCategory}》系列下暂无章节，请点击右侧“新增章节”
              </span>
            ) : (
              currentCategoryChapters.map((chapter) => {
                const isSelected = selectedBookId === chapter.id;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => setSelectedBookId(chapter.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-400 text-white font-black shadow-md'
                        : 'bg-slate-950/80 border border-slate-800/80 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <span>{isSelected ? '🎯' : '📄'}</span>
                    <span>{chapter.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {chapter.word_count || 0}词
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Chapter Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openCreateModal(activeCategory)}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title={`在《${activeCategory}》下新增章节`}
            >
              <span>➕</span>
              <span>新增章节</span>
            </button>

            {selectedBook && (
              <>
                <button
                  type="button"
                  onClick={() => openEditModal(selectedBook)}
                  className="text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="修改当前章节信息"
                >
                  <span>✏️</span>
                  <span>编辑本章</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccessModalBook(selectedBook);
                    setAccessModalUserIds(selectedBook.assigned_user_ids || []);
                  }}
                  className="text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="设置学员归属权限"
                >
                  <span>👥</span>
                  <span>归属设置</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteBook(selectedBook.id, selectedBook.title)}
                  className="text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="删除当前章节"
                >
                  <span>🗑️</span>
                  <span>删除本章</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Full-Width Studio Workbench */}
      <main className="w-full flex flex-col gap-6">
        {selectedBook ? (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 sm:p-7 shadow-2xl flex flex-col gap-6 relative overflow-hidden w-full">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-amber-400" />

            {/* Breadcrumb Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 font-bold">
                    📚 {selectedBook.category || 'General'}
                  </span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-300 font-bold">📄 {selectedBook.title}</span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>📖</span>
                    <span>{selectedBook.title}</span>
                  </h2>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    {words.length} 词
                  </span>
                  {selectedBook.description && (
                    <span className="text-xs text-slate-400 hidden md:inline border-l border-slate-700 pl-3">
                      {selectedBook.description}
                    </span>
                  )}
                </div>

                {/* Assigned Users Badge & Quick Edit Button */}
                <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                  <span className="text-slate-400 font-mono flex items-center gap-1 font-bold">
                    <span>👥</span>
                    <span>学员权限:</span>
                  </span>
                  {(!selectedBook.assigned_user_ids || selectedBook.assigned_user_ids.length === 0) ? (
                    <span className="text-[11px] font-mono text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <span>🌐</span>
                      <span>全体公开 (所有人可见)</span>
                    </span>
                  ) : (
                    usersList
                      .filter((u) => selectedBook.assigned_user_ids?.includes(u.id))
                      .map((u) => (
                        <span key={u.id} className="text-[11px] font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-cyan-300 flex items-center gap-1">
                          <span>{u.avatar || '👤'}</span>
                          <span>{u.username}</span>
                          {u.is_admin === 1 && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded font-mono">ADMIN</span>
                          )}
                        </span>
                      ))
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAccessModalBook(selectedBook);
                      setAccessModalUserIds(selectedBook.assigned_user_ids || []);
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1 cursor-pointer font-mono"
                  >
                    [修改归属]
                  </button>
                </div>
              </div>
            </div>

              {/* Segmented Tab Bar */}
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('import')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'import'
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📥</span>
                    <span>生词导入与 AI 赋能工作台</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('directory')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'directory'
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📑</span>
                    <span>章节词条总览 ({words.length})</span>
                  </button>
                </div>

                {activeTab === 'directory' && (
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="搜索本章单词或中文释义..."
                      value={directorySearch}
                      onChange={(e) => setDirectorySearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-all font-mono"
                    />
                  </div>
                )}
              </div>

              {/* ───────────────────────────────────────────────────────────
                  TAB 1: 生词批量导入与 AI 赋能工作台 (Studio / Workspace)
                  ─────────────────────────────────────────────────────────── */}
              {activeTab === 'import' && (
                <div className="flex flex-col gap-6">
                  {/* Raw Words Studio Input Card */}
                  <div className="bg-slate-950/70 p-5 sm:p-6 rounded-2xl border border-slate-800/90 shadow-inner flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>✨</span>
                          <span>生词输入区 (Raw Vocabulary Input)</span>
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                          已识别 {parsedWordsCount} 个生词
                        </span>
                      </div>

                      {/* AI CLI & Model Settings */}
                      <div className="flex items-center gap-2.5 text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">AI 引擎:</span>
                        <select
                          value={aiCli}
                          onChange={(e) => setAiCli(e.target.value as any)}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-lg outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          <option value="agy">agy (Gemini CLI)</option>
                          <option value="codex">codex (OpenAI CLI)</option>
                        </select>
                        <select
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-lg outline-none focus:border-cyan-400 cursor-pointer font-mono"
                        >
                          <option value="gemini-3.7-flash-low">Gemini 3.7 Flash (极速 Low · 推荐)</option>
                          <option value="gemini-3.7-flash-high">Gemini 3.7 Flash (High)</option>
                          <option value="gemini-3.7-flash-medium">Gemini 3.7 Flash (Medium)</option>
                          <option value="gemini-3.6-flash-low">Gemini 3.6 Flash (Low)</option>
                        </select>
                      </div>
                    </div>

                    {/* Roomy Monospace Textarea */}
                    <textarea
                      value={rawWordsInput}
                      onChange={(e) => setRawWordsInput(e.target.value)}
                      placeholder="粘贴多个英文单词，以逗号、换行或分号分隔。例如：friendly, generous, helpful, living room, loyal..."
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 text-sm font-mono text-white placeholder-slate-600 outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] h-32 resize-y transition-all leading-relaxed"
                    />

                    {/* Live Progress Bar for Progressive Batch Enrichment */}
                    {aiProgress && (
                      <div className="w-full bg-slate-950/80 border border-cyan-500/40 rounded-xl p-3.5 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-cyan-400 font-bold flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            <span>{aiProgress.text}</span>
                          </span>
                          <span className="text-slate-400 font-bold tabular-nums">
                            {aiProgress.current} / {aiProgress.total} 词 ({aiProgress.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-400 transition-all duration-300"
                            style={{ width: `${aiProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                        💡 智能增强模式：采用分批增量解析与并发安全调度，自动生成儿童趣味例句、地道中文释义、反义词、词根词缀剖析与词源趣谈，杜绝模版套话与超时。
                      </p>

                      <button
                        type="button"
                        onClick={handleAiEnrich}
                        disabled={isAiLoading || parsedWordsCount === 0}
                        className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-400 hover:opacity-95 text-slate-950 font-black text-xs px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAiLoading ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            <span>AI 分批解析中...</span>
                          </>
                        ) : (
                          <>
                            <span>🤖</span>
                            <span>一键启动 AI 词条丰富与解析</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Draft Review Table (Spacious Studio Layout) */}
                  {draftWords.length > 0 && (
                    <div className="flex flex-col gap-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-emerald-400">
                            ✅ AI 解析草稿 ({draftWords.length} 词)
                          </span>
                          <span className="text-xs text-slate-400 hidden sm:inline">
                            （可在入库前微调、删除或选择目标章节）
                          </span>
                        </div>

                        {/* Target chapter selector & Draft actions */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Quick Target Chapter Selector */}
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-xl">
                            <span className="text-[11px] text-slate-400 font-bold shrink-0">🎯 导入归属章节:</span>
                            <select
                              value={selectedBookId || ''}
                              onChange={(e) => setSelectedBookId(Number(e.target.value))}
                              className="bg-transparent border-0 text-cyan-300 text-xs font-bold outline-none cursor-pointer max-w-[200px] truncate"
                            >
                              {Object.entries(categoryGroups).map(([cat, list]) => (
                                <optgroup key={cat} label={`📚 ${cat}`}>
                                  {list.map((b) => (
                                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                                      {cat} · {b.title} ({b.word_count || 0}词)
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>

                          {draftSelectedIndices.length > 0 && (
                            <button
                              type="button"
                              onClick={handleBatchRemoveDraftRows}
                              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-500/40 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              title="移除勾选的草稿行"
                            >
                              <span>🗑️</span>
                              <span>批量移除 ({draftSelectedIndices.length})</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={addDraftRow}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                          >
                            + 新增一行
                          </button>
                          <button
                            type="button"
                            onClick={handleCommitDraft}
                            disabled={isSavingDraft}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSavingDraft ? '正在保存中...' : '💾 确认保存入库 (Commit to Book)'}
                          </button>
                        </div>
                      </div>

                      {/* Wide Horizontal Scrollable Review Grid */}
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-800/80 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 uppercase font-mono z-10">
                            <tr>
                              <th className="p-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={isAllDraftSelected}
                                  onChange={toggleSelectAllDraft}
                                  className="accent-cyan-500 rounded cursor-pointer"
                                  title="全选/取消全选草稿行"
                                />
                              </th>
                              <th className="p-3 w-32">单词 (Word)</th>
                              <th className="p-3 w-28">音标 (Phonetic)</th>
                              <th className="p-3 w-36">核心释义</th>
                              <th className="p-3 min-w-[320px]">幽默趣味例句 (En & Zh)</th>
                              <th className="p-3 w-32">反义词</th>
                              <th className="p-3 w-36">词根与构词</th>
                              <th className="p-3 w-44">词源趣谈</th>
                              <th className="p-3 w-12 text-center">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                            {draftWords.map((row, rIdx) => (
                              <tr
                                key={rIdx}
                                className={`transition-colors ${
                                  draftSelectedIndices.includes(rIdx)
                                    ? 'bg-cyan-950/30 hover:bg-cyan-950/40'
                                    : 'hover:bg-slate-800/30'
                                }`}
                              >
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={draftSelectedIndices.includes(rIdx)}
                                    onChange={() => toggleSelectDraftRow(rIdx)}
                                    className="accent-cyan-500 rounded cursor-pointer"
                                    title="勾选此行"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={row.word}
                                    onChange={(e) => updateDraftField(rIdx, 'word', e.target.value)}
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold outline-none focus:border-cyan-400"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={row.phonetic || ''}
                                    onChange={(e) => updateDraftField(rIdx, 'phonetic', e.target.value)}
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono text-xs outline-none focus:border-cyan-400"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={row.translation}
                                    onChange={(e) => updateDraftField(rIdx, 'translation', e.target.value)}
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-cyan-400 font-medium"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <div className="flex flex-col gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="英文例句"
                                      value={row.fun_sentences?.[0]?.en || ''}
                                      onChange={(e) => updateDraftSentence(rIdx, 0, 'en', e.target.value)}
                                      className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 text-xs outline-none focus:border-cyan-400"
                                    />
                                    <input
                                      type="text"
                                      placeholder="例句翻译"
                                      value={row.fun_sentences?.[0]?.zh || ''}
                                      onChange={(e) => updateDraftSentence(rIdx, 0, 'zh', e.target.value)}
                                      className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-400 text-xs outline-none focus:border-cyan-400"
                                    />
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={row.antonyms || ''}
                                    onChange={(e) => updateDraftField(rIdx, 'antonyms', e.target.value)}
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-rose-300 text-xs outline-none focus:border-rose-400"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={row.root_affixes || ''}
                                    onChange={(e) => updateDraftField(rIdx, 'root_affixes', e.target.value)}
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-purple-300 text-xs outline-none focus:border-purple-400"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <textarea
                                    value={row.etymology || ''}
                                    onChange={(e) => updateDraftField(rIdx, 'etymology', e.target.value)}
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-300 text-xs h-14 resize-none outline-none focus:border-amber-400 leading-tight"
                                  />
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeDraftRow(rIdx)}
                                    className="text-slate-500 hover:text-rose-400 font-bold text-xs p-1 rounded hover:bg-slate-800 transition-colors"
                                    title="删除此行"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────
                  TAB 2: 章节已有词条总览 (Directory View)
                  ─────────────────────────────────────────────────────────── */}
              {activeTab === 'directory' && (
                <div className="flex flex-col gap-4">
                  {/* Batch Selection Action Floating/Sticky Bar */}
                  {selectedWordIds.length > 0 && (
                    <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-indigo-950/90 border border-cyan-500/40 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl animate-in fade-in">
                      <div className="flex items-center gap-2.5 text-xs font-mono">
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                          ✓ 已勾选 {selectedWordIds.length} 个单词
                        </span>
                        <span className="text-slate-600 hidden sm:inline">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedWordIds([])}
                          className="text-slate-400 hover:text-white underline cursor-pointer text-xs"
                        >
                          取消勾选
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openBatchMoveModal}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                          title="将勾选的单词批量移动至指定章节"
                        >
                          <span>📁</span>
                          <span>调整所属章节 ({selectedWordIds.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleBatchDeleteWords}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                          title="从当前章节批量删除勾选的单词"
                        >
                          <span>🗑️</span>
                          <span>批量删除 ({selectedWordIds.length})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {filteredWords.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 text-sm space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <div className="text-4xl">📭</div>
                      <div className="font-bold text-slate-400">
                        {directorySearch ? '没有找到匹配的词条' : '当前章节词单尚未录入单词'}
                      </div>
                      <p className="text-xs text-slate-500">
                        切换至「生词导入与 AI 赋能工作台」即可一键批量粘贴录入！
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-800/90 rounded-2xl shadow-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                          <tr>
                            <th className="p-3.5 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={isAllDirectorySelected}
                                onChange={toggleSelectAllDirectory}
                                className="accent-cyan-500 rounded cursor-pointer"
                                title="全选/反选本页单词"
                              />
                            </th>
                            <th className="p-3.5">单词</th>
                            <th className="p-3.5">音标</th>
                            <th className="p-3.5">核心释义</th>
                            <th className="p-3.5 min-w-[280px]">生动例句</th>
                            <th className="p-3.5">词根 / 反义词</th>
                            <th className="p-3.5 max-w-xs">词源趣谈</th>
                            <th className="p-3.5 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                          {filteredWords.map((w) => {
                            const isSelected = selectedWordIds.includes(w.id || 0);
                            return (
                              <tr
                                key={w.id}
                                className={`transition-colors ${
                                  isSelected ? 'bg-cyan-950/30 hover:bg-cyan-950/40' : 'hover:bg-slate-800/30'
                                }`}
                              >
                                <td className="p-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => w.id && toggleSelectWord(w.id)}
                                    className="accent-cyan-500 rounded cursor-pointer"
                                    title="勾选此单词"
                                  />
                                </td>
                                <td className="p-3.5 font-mono font-black text-cyan-400 text-sm">{w.word}</td>
                                <td className="p-3.5 text-slate-400 font-mono">{w.phonetic || '—'}</td>
                                <td className="p-3.5 font-bold text-slate-200">{w.translation}</td>
                                <td className="p-3.5 text-slate-300">
                                  {w.fun_sentences?.[0] ? (
                                    <div className="space-y-1">
                                      <div className="text-slate-100 font-medium">{w.fun_sentences[0].en}</div>
                                      <div className="text-slate-400 text-[11px]">{w.fun_sentences[0].zh}</div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="p-3.5 space-y-1">
                                  {w.root_affixes && (
                                    <div className="text-purple-300 text-[11px] font-medium">
                                      🧩 {w.root_affixes}
                                    </div>
                                  )}
                                  {w.antonyms && (
                                    <div className="text-rose-300 text-[11px] font-medium">
                                      ⚖️ 反: {w.antonyms}
                                    </div>
                                  )}
                                  {!w.root_affixes && !w.antonyms && (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="p-3.5 text-slate-400 text-[11px] max-w-xs leading-relaxed">
                                  {w.etymology || '—'}
                                </td>
                                <td className="p-3.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => w.id && openMoveSingleWordModal(w.id, e)}
                                      className="text-cyan-400 hover:text-cyan-300 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-cyan-500/10 transition-all cursor-pointer flex items-center gap-1"
                                      title="调整此单词所属章节"
                                    >
                                      <span>📁</span>
                                      <span>换章节</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => w.id && handleDeleteWord(w.id, w.word)}
                                      className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                                    >
                                      删除
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-16 text-center text-slate-500 space-y-4">
              <div className="text-5xl">📚</div>
              <h3 className="text-slate-300 font-bold text-base">请在上方选择或创建章节词单</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                已启用全宽横向排版，为英文例句、地道中文翻译与词源构词提供 100% 充裕空间。
              </p>
              <button
                type="button"
                onClick={() => openCreateModal(activeCategory)}
                className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>为《{activeCategory}》新建章节</span>
              </button>
            </div>
          )}
        </main>

      {/* ───────────────────────────────────────────────────────────
          MODAL: 创建 / 编辑 章节与书单 (Create / Edit Book Modal)
          ─────────────────────────────────────────────────────────── */}
      {bookModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="h-1 bg-gradient-to-r from-cyan-400 to-indigo-500 shrink-0" />
            <div className="p-6 space-y-5 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>{bookModalMode === 'create' ? '➕ 新建词单章节' : '✏️ 修改词单章节信息'}</span>
                </h3>
                <button
                  type="button"
                  onClick={closeBookModal}
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveBookModal} className="space-y-4 text-xs">
                {/* Book / Category Name */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">
                    所属书本 / 第一层分类 (Category) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    list="category-suggestions"
                    placeholder="如：Think, RAZ, 朗文, General"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 font-medium"
                    required
                  />
                  <datalist id="category-suggestions">
                    {existingCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <p className="text-[10px] text-slate-500">
                    可选择已有书名，或直接键入新书名，同一书名下的章节会自动归集。
                  </p>
                </div>

                {/* Chapter / Title */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">
                    章节 / 词单标题 (Title) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="如：Class 1, Unit 2, 第3周高频词"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 font-medium"
                    required
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">标签 (Tags，可选)</label>
                  <input
                    type="text"
                    placeholder="逗号分隔，如：Think,Grade2,动词"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">简介描述 (Description，可选)</label>
                  <textarea
                    placeholder="填写本章节词单的重点说明..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 h-20 resize-none leading-relaxed"
                  />
                </div>

                {/* Sort Order */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">排序序号 (Sort Order)</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">数字越小越排在前面（默认 0）</p>
                </div>

                {/* User Ownership Assignment */}
                {renderUserSelectionGroup(
                  formUserIds,
                  setFormUserIds,
                  "学员访问权限 (归属设置)"
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={closeBookModal}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-bold cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wide shadow-lg transition-all cursor-pointer"
                  >
                    {bookModalMode === 'create' ? '立即创建' : '保存修改'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: 独立章节学员权限设置 (Word Book Access Modal)
          ─────────────────────────────────────────────────────────── */}
      {accessModalBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-amber-400" />
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 font-mono">
                  👥 归属设置 // 《{accessModalBook.category || 'General'} · {accessModalBook.title}》
                </h3>
                <button
                  type="button"
                  onClick={() => setAccessModalBook(null)}
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                设置有权在“单词探索宝库”中学习本章节的学员。若未勾选任何学员，则该章节对所有学员公开（全体可见）。
              </p>

              {renderUserSelectionGroup(
                accessModalUserIds,
                setAccessModalUserIds,
                "选择授权学员"
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAccessModalBook(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-bold cursor-pointer text-xs"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isSavingAccess}
                  onClick={async () => {
                    setIsSavingAccess(true);
                    try {
                      await apiService.updateWordBookAccess(accessModalBook.id, accessModalUserIds);
                      setStatus({
                        type: 'success',
                        text: `✅ 章节《${accessModalBook.category || 'General'} · ${accessModalBook.title}》学员归属设置已更新！`
                      });
                      setAccessModalBook(null);
                      await loadBooks();
                    } catch (err: any) {
                      setStatus({
                        type: 'error',
                        text: err.message || '更新学员归属权限失败'
                      });
                    } finally {
                      setIsSavingAccess(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black tracking-wide shadow-lg transition-all cursor-pointer text-xs disabled:opacity-50"
                >
                  {isSavingAccess ? '正在保存...' : '💾 保存归属设置'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: 调整单词所属章节 (Move Words to Chapter Modal)
          ─────────────────────────────────────────────────────────── */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-amber-400" />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>📁</span>
                  <span>{movingWordIds.length > 1 ? `批量调整 ${movingWordIds.length} 个单词所属章节` : '调整单词所属章节'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setMoveModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Words to move badge */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">待移动单词:</span>
                    <span className="text-cyan-300 font-mono font-bold">{movingWordIds.length} 词</span>
                  </div>
                  {movingWordIds.length <= 10 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {words
                        .filter((w) => w.id && movingWordIds.includes(w.id))
                        .map((w) => (
                          <span
                            key={w.id}
                            className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-[11px]"
                          >
                            {w.word}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 font-mono text-[11px]">
                      已选中 {movingWordIds.length} 个单词准备批量移入新章节
                    </p>
                  )}
                  <div className="text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                    当前所在章节: <strong className="text-slate-200">《{selectedBook?.category || 'General'} · {selectedBook?.title}》</strong>
                  </div>
                </div>

                {/* Target chapter selector */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">
                    选择目标归属章节 (Target Chapter) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={targetMoveBookId || ''}
                    onChange={(e) => setTargetMoveBookId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400 font-medium cursor-pointer"
                  >
                    <option value="" disabled>-- 请选择目标章节 --</option>
                    {Object.entries(categoryGroups).map(([cat, list]) => (
                      <optgroup key={cat} label={`📚 ${cat}`}>
                        {list.map((b) => (
                          <option key={b.id} value={b.id} disabled={b.id === selectedBookId}>
                            {b.id === selectedBookId ? `📄 ${b.title} (当前所在章节)` : `📄 ${b.title} (${b.word_count || 0}词)`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    移动后，单词将自动归入目标章节，学员的发音与拼写掌握进度将完整保留。
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMoveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-bold cursor-pointer text-xs"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isMovingWords || !targetMoveBookId || targetMoveBookId === selectedBookId}
                  onClick={handleConfirmMoveWords}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wide shadow-lg transition-all cursor-pointer text-xs disabled:opacity-50"
                >
                  {isMovingWords ? '正在移动...' : '确认移动'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

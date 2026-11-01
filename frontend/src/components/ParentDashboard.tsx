import React, { useState, useEffect, useMemo } from 'react';
import { FormBoundary } from './FormBoundary';
import { SuspenseState } from './SuspenseState';
import {
  RunnerSprite,
  MonsterSprite,
  CastleSidePillars,
  BUDDY_CHARACTERS,
  MONSTER_CHARACTERS,
  normalizeBuddyKey,
  normalizeMonsterKey
} from './StoryChaseAssets';
import { StoryIllustration } from './StoryIllustration';
import { ProjectRoadmap } from './ProjectRoadmap';
import { SongManager } from './SongManager';
import { WordBankManager } from './WordBankManager';
import { VocabularyAnalytics } from './VocabularyAnalytics';
import { ChangePasswordModal } from './ChangePasswordModal';
import { apiService } from '../utils/apiService';
import './ParentDashboard.css';

export interface WordItem {
  id: number;
  word: string;
  translation: string;
  sentence: string;
  sentence_translation: string;
  progress: {
    listening_passed: boolean;
    speaking_passed: boolean;
    reading_passed: boolean;
    writing_passed: boolean;
  };
}

export interface User {
  id: number;
  username: string;
  avatar: string;
  coins?: number;
  is_admin?: number;
}

export interface StoryGroup {
  id: number;
  name: string;
  description?: string;
  group_order?: number;
  islands_count?: number;
  story_count?: number;
  created_at?: string;
}

export interface GameSettings {
  monster_speed_slow: number;
  monster_speed_medium: number;
  monster_speed_fast: number;
  monster_retreat_distance: number;
  monster_wait_seconds: number;
  consecutive_error_limit: number;
  max_lines_per_page: number;
  initial_hearts: number;
  coins_completion: number;
  coins_speed_bonus: number;
  coins_full_hearts_bonus: number;
  coins_stage1_reading?: number;
  coins_stage3_matching?: number;
  coins_review_multiplier?: number;
  coins_vocab_reading?: number;
  coins_vocab_spelling?: number;
  monster_emojis: string[];
}

export const DEFAULT_FRONTEND_GAME_SETTINGS: GameSettings = {
  monster_speed_slow: 1.5,
  monster_speed_medium: 2.5,
  monster_speed_fast: 4.0,
  monster_retreat_distance: 5,
  monster_wait_seconds: 5,
  consecutive_error_limit: 10,
  max_lines_per_page: 5,
  initial_hearts: 3,
  coins_completion: 150,
  coins_speed_bonus: 50,
  coins_full_hearts_bonus: 30,
  coins_stage1_reading: 100,
  coins_stage3_matching: 100,
  coins_review_multiplier: 0.2,
  coins_vocab_reading: 10,
  coins_vocab_spelling: 20,
  monster_emojis: ['dragon', 'ogre', 'goblin', 'wolf', 'mech', 'ghost', 'zombie', 'spider']
};

export interface Island {
  id: number;
  name: string;
  group_name?: string;
  story_title: string;
  story_passage: string;
  story_passage_json?: Array<{
    paragraph_num: number;
    sentence_num: number;
    sentence_text: string;
    translation: string;
    illustration_url?: string | null;
  }>;
  story_questions: Array<{
    question: string;
    hint: string;
    answer: string;
  }>;
  words: WordItem[];
  word_book_id?: number | null;
  unlocked_stage: number;
  completed_stages_mask?: number;
  assigned_user_ids?: number[];
}

export const DEFAULT_AI_PROMPT = `You are an English education expert specializing in analyzing English picture books for elementary school students.

Your target audience: Chinese elementary school students who are reading RAZ (Reading A-Z) Level B–E books.

TASK:
Analyze the provided picture book page images and return a structured JSON object matching the requested schema.

RULES:
1. **title**: Extract the title of the picture book. If not visible, infer from content.
2. **theme**: Write a concise Chinese summary (2-3 sentences) describing what the story is about and its educational value.
3. **vocabulary**: Extract a list of core practice vocabulary words (target ~18-25 words) from the story for typing and spelling practice (e.g. key nouns, verbs, adjectives).
   - Ensure all extracted vocabulary words actually appear in the story text.
   - Output ONLY the list of lowercase English words (e.g. ["pouch", "wallaby", "baby", "bilby"]).
   - Do NOT provide definitions, phonetics, translations, or example sentences during book import (these will be enriched later in the vocabulary editor).
4. **pages**: For each image (in order):
   - "illustration_box": Locate the main story illustration or photograph on this page and output its bounding box as [ymin, xmin, ymax, xmax] normalized integers from 0 to 1000. Exclude standalone text blocks, page numbers, and margins. If the page is text-only without any story picture, set to null.
   - "sentences": Extract ONLY the core narrative/story text. DO NOT extract exercise questions, quizzes, captions, metadata, or activity questions (such as 'Activity 1', 'Questions:', or book reflection prompts) that are not part of the main story content. Split into individual sentences. For each sentence provide:
     - "en": the original English sentence exactly as written
     - "zh": a faithful, word-for-word / phrase-for-phrase aligned Chinese translation designed for "Read Chinese & Speak English" (看中文说英文) recall practice:
       - **Every English word or phrase MUST have a clear corresponding Chinese meaning in the translation.** Do NOT omit, merge, or paraphrase away any words.
       - Explicitly translate all pronouns (he/she/it/they/my/our/this/that), articles/quantifiers when meaningful (a/one, some, many, every), adjectives (e.g. little, big, good), adverbs (e.g. too, very, now, again, up, down, away), prepositions (e.g. in, on, into, with, for), and modal/auxiliary nuances (e.g. can, will, want to, have to).
       - Avoid free/idiomatic translations that drop English words or add extra concepts not in the original sentence, so the student can reliably reconstruct every single English word just by looking at the Chinese sentence.
IMPORTANT:
- Page numbers start from 1 and correspond to the order of images provided.
- Keep sentence translations faithful and complete: prioritize 1-to-1 word/phrase cueing over literary paraphrasing, while keeping the Chinese understandable for children.
- If a page has no story text, still include it with an empty sentences array.
- Strictly ignore page numbers, header/footer titles, or post-reading activity questions when building the "pages" content.`;

interface Props {
  onBack: () => void;
  onLogout?: () => void;
}

export const ParentDashboard: React.FC<Props> = ({ onBack, onLogout }) => {
  const [islands, setIslands] = useState<Island[]>([]);
  const [loadingIslands, setLoadingIslands] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Total words count across all cognitive sectors
  const totalWordCount = useMemo(() => {
    return islands.reduce((acc, isl) => acc + (isl.words?.length || 0), 0);
  }, [islands]);
  
  // Island configuration states
  const [newIslandName, setNewIslandName] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('General');
  const [selectedSectorGroupTab, setSelectedSectorGroupTab] = useState<string>('ALL');
  const [storyTitle, setStoryTitle] = useState<string>('');
  const [storyPassage, setStoryPassage] = useState<string>('');
  const [storyPassageJson, setStoryPassageJson] = useState<any[]>([]);
  const [wordsList, setWordsList] = useState<any[]>([]);
  const [storyQuestions, setStoryQuestions] = useState<Array<{
    question: string;
    hint: string;
    answer: string;
  }>>([
    { question: '', hint: '', answer: '' },
    { question: '', hint: '', answer: '' }
  ]);
  
  // Story CSV upload states
  const [selectedIslandId, setSelectedIslandId] = useState<string>('');

  // AI Story Import states
  const [isSavingAI, setIsSavingAI] = useState<boolean>(false);
  const [aiImportMode, setAiImportMode] = useState<'new' | 'append'>('new');
  const [aiIslandName, setAiIslandName] = useState<string>('');
  const [aiGroupName, setAiGroupName] = useState<string>('General');
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(5);
  const [aiStoryImages, setAiStoryImages] = useState<FileList | null>(null);
  const [aiFileKey, setAiFileKey] = useState<number>(0);
  const [aiCli, setAiCli] = useState<'agy' | 'codex'>('agy');
  const [aiModel, setAiModel] = useState<string>('gemini-3.8-flash-high');
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>(DEFAULT_AI_PROMPT);
  const [savedPromptTemplate, setSavedPromptTemplate] = useState<string>(DEFAULT_AI_PROMPT);
  const [isSavingAiPrompt, setIsSavingAiPrompt] = useState<boolean>(false);
  const [promptSaveStatus, setPromptSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPromptConfig, setShowPromptConfig] = useState<boolean>(false);
  const [aiModelList, setAiModelList] = useState<Array<{ id: string; name: string; description?: string }>>([
    { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High)', description: 'High capability, recommended (Default)' },
    { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium)', description: 'Medium reasoning effort' },
    { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Low)', description: 'Fastest low reasoning' },
    { id: 'gemini-3.6-flash-high', name: 'Gemini 3.6 Flash (High)', description: 'High performance' },
    { id: 'gemini-3.6-flash-medium', name: 'Gemini 3.6 Flash (Medium)', description: 'Balanced performance' },
    { id: 'gemini-3.6-flash-low', name: 'Gemini 3.6 Flash (Low)', description: 'Lightweight' },
    { id: 'gemini-3.5-flash-high', name: 'Gemini 3.5 Flash (High)', description: 'Standard fast' },
    { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro (High)', description: 'Strongest capability' },
  ]);
  const [isLoadingAiModels, setIsLoadingAiModels] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab & User & Group Management States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'stories' | 'groups' | 'songs' | 'word_books' | 'vocab_stats' | 'ai_import' | 'game_settings' | 'rewards' | 'roadmap'>(() => {
    try {
      const saved = localStorage.getItem('wordquest_admin_tab_v2');
      if (saved && ['dashboard', 'users', 'stories', 'groups', 'songs', 'word_books', 'vocab_stats', 'ai_import', 'game_settings', 'rewards', 'roadmap'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('wordquest_admin_tab_v2', activeTab);
    } catch {}
  }, [activeTab]);

  const [isEditingStory, setIsEditingStory] = useState<boolean>(false);
  const [storyEditorTab, setStoryEditorTab] = useState<'content' | 'basic' | 'illustrations' | 'vocab_questions'>('content');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isEditingWords, setIsEditingWords] = useState<boolean>(false);
  const [editingWordsBookId, setEditingWordsBookId] = useState<number | null>(null);
  const [editingWordsCategory, setEditingWordsCategory] = useState<string | null>(null);
  const [editingWordsTitle, setEditingWordsTitle] = useState<string | null>(null);
  const [isEditingQuestions, setIsEditingQuestions] = useState<boolean>(false);
  const [editingQuestionsIsland, setEditingQuestionsIsland] = useState<Island | null>(null);
  const [editingQuestionsList, setEditingQuestionsList] = useState<Array<{ question: string; hint: string; answer: string }>>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [generateQuestionsCount, setGenerateQuestionsCount] = useState<number>(5);
  const [questionsEditStatus, setQuestionsEditStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingQuestions, setIsSavingQuestions] = useState<boolean>(false);
  const [storySearchQuery, setStorySearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [usersList, setUsersList] = useState<User[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>('');
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupNameInput, setEditingGroupNameInput] = useState<string>('');
  const [groupStatus, setGroupStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isGroupLoading, setIsGroupLoading] = useState<boolean>(false);
  const [storyListStatus, setStoryListStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Generate Story From Vocab Modal States
  const [isAiGenModalOpen, setIsAiGenModalOpen] = useState<boolean>(false);
  const [aiGenTargetIsland, setAiGenTargetIsland] = useState<Island | null>(null);
  const [aiGenWords, setAiGenWords] = useState<string>('');
  const [aiGenTitle, setAiGenTitle] = useState<string>('');
  const [aiGenCategory, setAiGenCategory] = useState<string>('General');
  const [aiGenThemeStyle, setAiGenThemeStyle] = useState<string>('animal_tale');
  const [aiGenTargetLevel, setAiGenTargetLevel] = useState<string>('RAZ C-E');
  const [aiGenPageCount, setAiGenPageCount] = useState<number>(4);
  const [aiGenQuestionCount, setAiGenQuestionCount] = useState<number>(4);
  const [aiGenCli, setAiGenCli] = useState<'agy' | 'codex'>('agy');
  const [aiGenModel, setAiGenModel] = useState<string>('gemini-3.8-flash-high');
  const [aiGenAutoSave, setAiGenAutoSave] = useState<boolean>(true);
  const [isAiGenLoading, setIsAiGenLoading] = useState<boolean>(false);
  const [aiGenStatus, setAiGenStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Game Settings States
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_FRONTEND_GAME_SETTINGS);
  const [isSettingsLoading, setIsSettingsLoading] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingStatus, setSettingStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Story Chase Sprint & Monster Preview Playground States
  const [previewBuddyAvatar, setPreviewBuddyAvatar] = useState<string>('🦖');
  const [previewMonsterEmoji, setPreviewMonsterEmoji] = useState<string>('👻');
  const [previewFloorTexture, setPreviewFloorTexture] = useState<string>('brick-medieval');
  const [previewIsSprinting, setPreviewIsSprinting] = useState<boolean>(true);
  const [previewIsMonsterWaiting, setPreviewIsMonsterWaiting] = useState<boolean>(false);
  const [previewDistance, setPreviewDistance] = useState<number>(6);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      localStorage.setItem('admin_sidebar_collapsed', String(!prev));
      return !prev;
    });
  };

  // 2-Level Nav Category Collapse States
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('admin_collapsed_nav_categories');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = { ...prev, [catId]: !prev[catId] };
      try {
        localStorage.setItem('admin_collapsed_nav_categories', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const navCategories = useMemo(() => [
    {
      id: 'content',
      title: '内容与课程资源',
      subtitle: 'Curriculum & Content',
      icon: '📚',
      items: [
        {
          id: 'stories' as const,
          title: '故事关卡库',
          subtitle: `Story Library (${islands.length})`,
          icon: '📚',
          onClick: () => { setActiveTab('stories'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); setUploadStatus(null); fetchIslands(); }
        },
        {
          id: 'groups' as const,
          title: '故事分组管理',
          subtitle: `Categories (${storyGroups.length})`,
          icon: '📁',
          onClick: () => { setActiveTab('groups'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); setGroupStatus(null); fetchStoryGroups(); }
        },
        {
          id: 'songs' as const,
          title: '歌曲学习管理',
          subtitle: 'MP3 & LRC Library',
          icon: '🎵',
          onClick: () => { setActiveTab('songs'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); setUploadStatus(null); }
        },
        {
          id: 'ai_import' as const,
          title: 'AI 绘本智能导入',
          subtitle: 'Multimodal OCR Studio',
          icon: '🤖',
          onClick: () => { setActiveTab('ai_import'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); setUploadStatus(null); }
        }
      ]
    },
    {
      id: 'students',
      title: '学员与学情分析',
      subtitle: 'Students & Analytics',
      icon: '👥',
      items: [
        {
          id: 'users' as const,
          title: '学员账号管理',
          subtitle: `Player Profiles (${usersList.length})`,
          icon: '👥',
          onClick: () => { setActiveTab('users'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); setUploadStatus(null); fetchUsersList(); }
        },
        {
          id: 'vocab_stats' as const,
          title: '单词学情看板',
          subtitle: 'Vocab Analytics & Weak Words',
          icon: '📈',
          onClick: () => { setActiveTab('vocab_stats'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); }
        }
      ]
    },
    {
      id: 'system',
      title: '游戏规则与系统',
      subtitle: 'Rules & System',
      icon: '⚙️',
      items: [
        {
          id: 'game_settings' as const,
          title: '游戏参数设定',
          subtitle: 'Story Chase & Rules',
          icon: '🎮',
          onClick: () => { setActiveTab('game_settings'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); setSettingStatus(null); fetchGameSettings(); }
        },
        {
          id: 'rewards' as const,
          title: '关卡奖励与经验',
          subtitle: 'Reward Rules & Rates',
          icon: '🪙',
          onClick: () => { setActiveTab('rewards'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); setSettingStatus(null); fetchGameSettings(); }
        },
        {
          id: 'roadmap' as const,
          title: '任务与改动追踪',
          subtitle: 'Roadmap & Changelog',
          icon: '📋',
          onClick: () => { setActiveTab('roadmap'); setIsEditingStory(false); setIsEditingWords(false); setIsEditingQuestions(false); }
        }
      ]
    }
  ], [islands.length, storyGroups.length, usersList.length]);

  // Keep active category expanded
  useEffect(() => {
    const parentCat = navCategories.find(cat => cat.items.some(item => item.id === activeTab));
    if (parentCat && collapsedCategories[parentCat.id]) {
      setCollapsedCategories(prev => {
        const next = { ...prev, [parentCat.id]: false };
        try {
          localStorage.setItem('admin_collapsed_nav_categories', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [activeTab, navCategories]);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState<string>('🦖');
  const [creatingPlayer, setCreatingPlayer] = useState<boolean>(false);
  const [playerStatus, setPlayerStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenEditStory = (island: Island) => {
    setIsEditingWords(false);
    setSelectedIslandId(String(island.id));
    setNewIslandName(island.name);
    setGroupName(island.group_name || 'General');
    setStoryTitle(island.story_title || '');
    setStoryPassage(island.story_passage || '');
    setStoryQuestions(island.story_questions && island.story_questions.length > 0 
      ? island.story_questions 
      : [{ question: '', hint: '', answer: '' }, { question: '', hint: '', answer: '' }]);
    setStoryPassageJson(island.story_passage_json || []);
    const existingWords = island.words || [];
    setWordsList(existingWords);
    setManualUserIds(island.assigned_user_ids || []);
    setStoryEditorTab('content');
    setIsEditingStory(true);
    setUploadStatus(null);
  };

  const handleOpenNewStory = () => {
    setIsEditingWords(false);
    setSelectedIslandId('');
    clearIslandFormFields();
    setStoryEditorTab('content');
    setIsEditingStory(true);
    setUploadStatus(null);
  };

  const handleOpenEditWords = async (sector: Island) => {
    setIsEditingStory(false);
    const storyTitle = sector.story_title || sector.name;
    const storyCategory = sector.group_name || 'General';
    setEditingWordsTitle(storyTitle);
    setEditingWordsCategory(storyCategory);

    if (sector.word_book_id) {
      setEditingWordsBookId(sector.word_book_id);
      setIsEditingWords(true);
      return;
    }

    try {
      const allBooks = await apiService.getWordBooks();
      const matched = allBooks.find((b: any) =>
        b.island_id === sector.id ||
        (b.title && b.title.trim() === storyTitle.trim())
      );
      if (matched) {
        setEditingWordsBookId(matched.id);
      } else {
        // Automatically create a dedicated word_book for this story if none exists yet
        const newBook = await apiService.createWordBook({
          category: storyCategory,
          title: storyTitle,
          description: `《${storyTitle}》绘本关卡专属生词宝库`,
          tags: `绘本,关卡生词,${storyCategory}`,
          island_id: sector.id,
          user_ids: sector.assigned_user_ids || []
        });
        setEditingWordsBookId(newBook.id);
        fetchIslands();
      }
    } catch (err) {
      console.error('Failed to resolve or create word book for story:', err);
      setEditingWordsBookId(null);
    }
    setIsEditingWords(true);
  };

  const handleOpenEditQuestions = (sector: Island) => {
    setIsEditingStory(false);
    setIsEditingWords(false);
    setEditingQuestionsIsland(sector);
    setEditingQuestionsList(
      sector.story_questions && sector.story_questions.length > 0
        ? sector.story_questions
        : [{ question: '', hint: '', answer: '' }]
    );
    setQuestionsEditStatus(null);
    setIsEditingQuestions(true);
  };

  const handleCloseEditQuestions = () => {
    setIsEditingQuestions(false);
    setEditingQuestionsIsland(null);
    setEditingQuestionsList([]);
    setQuestionsEditStatus(null);
    fetchIslands();
  };

  const addEditingQuestion = () => {
    setEditingQuestionsList((prev) => [...prev, { question: '', hint: '', answer: '' }]);
  };

  const removeEditingQuestion = (index: number) => {
    setEditingQuestionsList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEditingQuestion = (index: number, field: 'question' | 'hint' | 'answer', value: string) => {
    setEditingQuestionsList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleGenerateQuestionsForIsland = async (targetIsland?: Island) => {
    const island = targetIsland || editingQuestionsIsland;
    const islandId = island ? island.id : (selectedIslandId ? Number(selectedIslandId) : null);
    const title = island ? (island.story_title || island.name) : storyTitle;
    let text = island ? (island.story_passage || '') : storyPassage;

    const passageJson = island ? island.story_passage_json : storyPassageJson;
    if (passageJson && Array.isArray(passageJson) && passageJson.length > 0) {
      const sentenceTexts = passageJson.map((s: any) => s.sentence_text || s.en || '').filter(Boolean);
      if (sentenceTexts.length > 0) {
        text = sentenceTexts.join(' ');
      }
    }

    if (!text || !text.trim()) {
      setQuestionsEditStatus({
        type: 'error',
        text: '该故事暂无正文文本内容，无法生成阅读理解问题。请先完善故事正文。'
      });
      return;
    }

    setIsGeneratingQuestions(true);
    setQuestionsEditStatus(null);

    try {
      const url = islandId ? `/api/islands/${islandId}/generate-questions` : '/api/islands/generate-questions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          island_id: islandId,
          story_title: title,
          story_text: text,
          question_count: generateQuestionsCount,
          model: aiModel,
          cli: aiCli
        })
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions)) {
        if (isEditingQuestions) {
          setEditingQuestionsList(data.questions);
        }
        if (isEditingStory) {
          setStoryQuestions(data.questions);
        }
        setQuestionsEditStatus({
          type: 'success',
          text: `🎉 AI 成功生成 ${data.questions.length} 道阅读理解问答！请核对后点击下方保存。`
        });
      } else {
        setQuestionsEditStatus({
          type: 'error',
          text: data.error || 'AI 问题生成失败，请检查 AI 引擎配置。'
        });
      }
    } catch (err: any) {
      setQuestionsEditStatus({
        type: 'error',
        text: err.message || '网络通信异常，请重试。'
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleSaveQuestionsForIsland = async () => {
    if (!editingQuestionsIsland) return;
    setIsSavingQuestions(true);
    setQuestionsEditStatus(null);

    const validQuestions = editingQuestionsList.filter(
      (q) => (q.question && q.question.trim()) || (q.answer && q.answer.trim())
    );

    try {
      const res = await fetch(`/api/islands/${editingQuestionsIsland.id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: validQuestions
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQuestionsEditStatus({
          type: 'success',
          text: '✅ 阅读理解问答已成功保存到数据库！'
        });
        setIslands((prev) =>
          prev.map((isl) =>
            isl.id === editingQuestionsIsland.id
              ? { ...isl, story_questions: validQuestions }
              : isl
          )
        );
        setEditingQuestionsIsland((prev) =>
          prev ? { ...prev, story_questions: validQuestions } : null
        );
      } else {
        setQuestionsEditStatus({
          type: 'error',
          text: data.error || '保存问答失败。'
        });
      }
    } catch (err: any) {
      setQuestionsEditStatus({
        type: 'error',
        text: err.message || '网络连接异常。'
      });
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const handleCloseStoryEditor = () => {
    setIsEditingStory(false);
    clearIslandFormFields();
    setUploadStatus(null);
    fetchIslands();
  };

  const handleOpenAiGenStoryModal = (island?: Island) => {
    const target = island || (selectedIslandId ? islands.find(i => String(i.id) === selectedIslandId) : null);
    setAiGenTargetIsland(target || null);

    let wordsArr: string[] = [];
    if (target && target.words && target.words.length > 0) {
      wordsArr = target.words.map(w => w.word);
    } else if (wordsList && wordsList.length > 0) {
      wordsArr = wordsList.map(w => w.word);
    }
    setAiGenWords(wordsArr.join(', '));
    setAiGenTitle(target?.story_title || target?.name || storyTitle || newIslandName || '');
    setAiGenCategory(target?.group_name || groupName || 'General');
    setAiGenThemeStyle('animal_tale');
    setAiGenTargetLevel('RAZ C-E');
    setAiGenPageCount(4);
    setAiGenQuestionCount(4);
    setAiGenCli(aiCli || 'agy');
    setAiGenModel(aiModel || 'gemini-3.8-flash-high');
    setAiGenAutoSave(true);
    setAiGenStatus(null);
    setIsAiGenModalOpen(true);
  };

  const handleExecuteAiGenStory = async () => {
    const wordsListParsed = aiGenWords
      .split(/[\n,;，；、]+/)
      .map(w => w.trim())
      .filter(Boolean);

    if (wordsListParsed.length === 0 && (!aiGenTargetIsland || (!aiGenTargetIsland.words || aiGenTargetIsland.words.length === 0))) {
      setAiGenStatus({ type: 'error', text: '请至少输入或关联 1 个目标生词。' });
      return;
    }

    setIsAiGenLoading(true);
    setAiGenStatus(null);

    try {
      const result = await apiService.generateStoryFromVocab(aiGenTargetIsland?.id, {
        words: wordsListParsed.length > 0 ? wordsListParsed : undefined,
        title: aiGenTitle || undefined,
        category: aiGenCategory || undefined,
        theme_style: aiGenThemeStyle,
        target_level: aiGenTargetLevel,
        page_count: aiGenPageCount,
        question_count: aiGenQuestionCount,
        model: aiGenModel || undefined,
        cli: aiGenCli,
        auto_save: aiGenAutoSave && !!aiGenTargetIsland?.id,
      });

      if (!result.success) {
        throw new Error(result.error || '生成故事失败');
      }

      const generated = result.data;

      // If user is inside story editor (`isEditingStory`), populate the fields
      if (isEditingStory || (!aiGenAutoSave && aiGenTargetIsland)) {
        if (generated.title) setStoryTitle(generated.title);
        if (generated.passage) setStoryPassage(generated.passage);
        if (generated.story_passage_json) setStoryPassageJson(generated.story_passage_json);
        if (generated.story_questions) setStoryQuestions(generated.story_questions);
      }

      setAiGenStatus({
        type: 'success',
        text: `🎉 AI 成功生成绘本《${generated.title}》（涵盖 ${generated.target_words_covered?.length || 0} 个核心生词，${generated.pages?.length || 0} 页）！`
      });

      await fetchIslands();

      if (aiGenAutoSave && aiGenTargetIsland?.id && !isEditingStory) {
        setTimeout(() => {
          setIsAiGenModalOpen(false);
        }, 1500);
      }
    } catch (err: any) {
      setAiGenStatus({ type: 'error', text: err.message || '生成故事失败，请重试' });
    } finally {
      setIsAiGenLoading(false);
    }
  };

  const handleOpenAiAppend = () => {
    setAiImportMode('append');
    setIsEditingStory(false);
    setActiveTab('ai_import');
    if (newIslandName || storyTitle) {
      setAiIslandName(newIslandName || storyTitle);
    }
    if (groupName) {
      setAiGroupName(groupName);
    }
    setAiStatus(null);
  };

  const fetchAiModels = async (cli: 'agy' | 'codex') => {
    setIsLoadingAiModels(true);
    try {
      const res = await fetch(`/api/islands/ai-models?cli=${cli}`);
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAiModelList(data.models);
          setAiModel(data.default_model || data.models[0].id);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch dynamic AI models', err);
    } finally {
      setIsLoadingAiModels(false);
    }

    // Fallback if fetch fails
    if (cli === 'codex') {
      const fallbackCodex = [
        { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', description: 'Codex Flagship multimodal model (Default)' },
        { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI Flagship multimodal model' },
      ];
      setAiModelList(fallbackCodex);
      setAiModel('gpt-5.6-sol');
    } else {
      const fallbackAgy = [
        { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High)', description: 'High capability, recommended (Default)' },
        { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium)', description: 'Medium reasoning effort' },
        { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Low)', description: 'Fastest low reasoning' },
        { id: 'gemini-3.6-flash-high', name: 'Gemini 3.6 Flash (High)', description: 'High performance' },
        { id: 'gemini-3.6-flash-medium', name: 'Gemini 3.6 Flash (Medium)', description: 'Balanced performance' },
        { id: 'gemini-3.6-flash-low', name: 'Gemini 3.6 Flash (Low)', description: 'Lightweight' },
        { id: 'gemini-3.5-flash-high', name: 'Gemini 3.5 Flash (High)', description: 'Standard fast' },
        { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro (High)', description: 'Strongest capability' },
      ];
      setAiModelList(fallbackAgy);
      setAiModel('gemini-3.8-flash-high');
    }
    setIsLoadingAiModels(false);
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.filter((u: User) => u.username.toLowerCase() !== 'admin'));
      }
    } catch (err) {
      console.error('Failed to fetch user profiles', err);
    }
  };

  useEffect(() => {
    fetchUsersList();
    fetchAiModels('agy');
  }, []);

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      setPlayerStatus({ type: 'error', text: 'PLEASE ENTER A VALID PLAYER NAME.' });
      return;
    }
    setCreatingPlayer(true);
    setPlayerStatus(null);
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newPlayerName.trim(), avatar: newPlayerAvatar })
      });
      if (res.ok) {
        setPlayerStatus({ type: 'success', text: `Player profile "${newPlayerName.trim()}" created successfully!` });
        setNewPlayerName('');
        fetchUsersList();
      } else {
        const errData = await res.json().catch(() => ({}));
        setPlayerStatus({ type: 'error', text: errData.error || 'FAILED TO CREATE PLAYER IDENTITY.' });
      }
    } catch (err) {
      setPlayerStatus({ type: 'error', text: 'TRANSMISSION TIMEOUT. RETRY CONNECTION.' });
    } finally {
      setCreatingPlayer(false);
    }
  };

  const handleDeletePlayer = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete player profile "${user.username}"?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsersList();
      } else {
        alert('Failed to delete player profile.');
      }
    } catch (err) {
      alert('Error connecting to database.');
    }
  };

  const importAiIsland = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiStoryImages || aiStoryImages.length === 0) {
      setAiStatus({ type: 'error', text: 'PLEASE SELECT AT LEAST ONE SCANNED PAGE IMAGE.' });
      return;
    }
    if (aiStoryImages.length > 10) {
      setAiStatus({ type: 'error', text: 'MAXIMUM UPLOAD EXCEEDS limit (10 IMAGES MAX).' });
      return;
    }

    setIsSavingAI(true);
    setAiStatus(null);

    const formData = new FormData();
    formData.append('question_count', String(aiQuestionCount));
    formData.append('cli', aiCli);
    formData.append('model', aiModel);
    if (aiCustomPrompt && aiCustomPrompt.trim()) {
      formData.append('prompt', aiCustomPrompt.trim());
      formData.append('custom_prompt', aiCustomPrompt.trim());
    }
    if (aiIslandName.trim()) {
      formData.append('island_name', aiIslandName.trim());
    }
    formData.append('group_name', aiGroupName.trim() || 'General');
    for (let i = 0; i < aiStoryImages.length; i++) {
      formData.append('images', aiStoryImages[i]);
    }

    try {
      const res = await fetch('/api/islands/import-ai-story', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const aiResult = data.data;
        const extractedTitle = aiResult.title || 'New Sector';
        const sortedPages = [...(aiResult.pages || [])].sort((a: any, b: any) => (a.page || 0) - (b.page || 0));
        const sentencesList = sortedPages.flatMap((page: any) => page.sentences || []);
        const combinedPassage = sentencesList.map((s: any) => s.en).join(' ');

        if (aiImportMode === 'append') {
          // 1. Calculate max existing page number
          const existingMaxPage = (storyPassageJson && storyPassageJson.length > 0)
            ? Math.max(0, ...storyPassageJson.map((p: any) => p.paragraph_num || 1))
            : 0;

          // 2. Set or retain titles / groups
          if (!newIslandName) {
            setNewIslandName(aiIslandName.trim() || extractedTitle);
          }
          if (!storyTitle) {
            setStoryTitle(extractedTitle);
          }
          if (!groupName || groupName === 'General') {
            setGroupName(aiGroupName.trim() || 'General');
          }

          // 3. Append passage text
          setStoryPassage((prev) => {
            const prevTrimmed = (prev || '').trim();
            return prevTrimmed ? `${prevTrimmed}\n\n${combinedPassage}` : combinedPassage;
          });

          // 4. Offset paragraph numbers and append passage json
          const newTempJson: any[] = [];
          for (const page of sortedPages) {
            const assignedPageNum = existingMaxPage + (page.page || 1);
            let sentenceNum = 1;
            for (const s of (page.sentences || [])) {
              newTempJson.push({
                paragraph_num: assignedPageNum,
                sentence_num: sentenceNum++,
                sentence_text: s.en,
                translation: s.zh,
                illustration_url: page.illustration_url || null,
              });
            }
          }
          setStoryPassageJson((prev) => [...(prev || []), ...newTempJson]);

          // 5. Append questions (filter out empty initial templates)
          if (aiResult.questions && Array.isArray(aiResult.questions) && aiResult.questions.length > 0) {
            setStoryQuestions((prev) => {
              const validPrev = (prev || []).filter((q) => q.question && q.question.trim());
              return [...validPrev, ...aiResult.questions];
            });
          }

          // 6. Deduplicate and append vocabulary
          if (aiResult.vocabulary && Array.isArray(aiResult.vocabulary)) {
            const newRawTokens: string[] = [];
            setWordsList((prev) => {
              const existingList = prev || [];
              const existingWordSet = new Set(existingList.map((w: any) => (w.word || '').trim().toLowerCase()));
              const formattedWords: any[] = [];
              const minId = existingList.length > 0 
                ? Math.min(0, ...existingList.map((w: any) => (typeof w.id === 'number' ? w.id : 0))) 
                : 0;

              aiResult.vocabulary.forEach((v: any, index: number) => {
                const wStr = (typeof v === 'string' ? v : (v?.word || '')).trim().toLowerCase();
                if (wStr && !existingWordSet.has(wStr)) {
                  existingWordSet.add(wStr);
                  newRawTokens.push(wStr);
                  const meaning = typeof v === 'object' ? (v.meaning || '') : '';
                  const phonetic = typeof v === 'object' ? (v.phonetic || '') : '';
                  const sentence = typeof v === 'object' ? (v.example_sentence || '') : '';
                  const sentenceZh = typeof v === 'object' ? (v.example_translation || '') : '';
                  formattedWords.push({
                    id: minId - 1 - index,
                    word: wStr,
                    translation: meaning,
                    phonetic: phonetic,
                    sentence: sentence,
                    sentence_translation: sentenceZh,
                    fun_sentences: sentence ? [{ en: sentence, zh: sentenceZh }] : [],
                    antonyms: '',
                    synonyms: '',
                    root_affixes: '',
                    etymology: ''
                  });
                }
              });
              return [...existingList, ...formattedWords];
            });
          }

          const totalPagesNow = existingMaxPage + sortedPages.length;
          setAiStatus({
            type: 'success',
            text: `🎉 AI 成功追加 ${sortedPages.length} 页（当前故事现共计 ${totalPagesNow} 页）！已自动合并词汇与习题。`,
          });

          // Return to story editor
          setIsEditingStory(true);
          setActiveTab('stories');
          setAiStoryImages(null);
          setAiFileKey((prev) => prev + 1);
        } else {
          // 1. Populate island name and story title, strictly using the user-specified group name
          setNewIslandName(aiIslandName.trim() || extractedTitle);
          setGroupName(aiGroupName.trim() || 'General');
          setStoryTitle(extractedTitle);
          setStoryPassage(combinedPassage);

          // 3. Generate editable story passage translation array
          const tempJson: any[] = [];
          for (const page of sortedPages) {
            let sentenceNum = 1;
            for (const s of (page.sentences || [])) {
              tempJson.push({
                paragraph_num: page.page,
                sentence_num: sentenceNum++,
                sentence_text: s.en,
                translation: s.zh,
                illustration_url: page.illustration_url || null,
              });
            }
          }
          setStoryPassageJson(tempJson);

          // 4. Populate questions
          setStoryQuestions(aiResult.questions && aiResult.questions.length > 0 
            ? aiResult.questions 
            : [{ question: '', hint: '', answer: '' }]);

          // 5. Populate vocabulary words list and raw input
          if (aiResult.vocabulary && Array.isArray(aiResult.vocabulary)) {
            const rawWordsList: string[] = [];
            const formattedWords: any[] = [];
            aiResult.vocabulary.forEach((v: any, index: number) => {
              const wStr = (typeof v === 'string' ? v : (v?.word || '')).trim().toLowerCase();
              if (wStr && !rawWordsList.includes(wStr)) {
                rawWordsList.push(wStr);
                const meaning = typeof v === 'object' ? (v.meaning || '') : '';
                const phonetic = typeof v === 'object' ? (v.phonetic || '') : '';
                const sentence = typeof v === 'object' ? (v.example_sentence || '') : '';
                const sentenceZh = typeof v === 'object' ? (v.example_translation || '') : '';
                formattedWords.push({
                  id: -1 - index, // temporary negative IDs
                  word: wStr,
                  translation: meaning,
                  phonetic: phonetic,
                  sentence: sentence,
                  sentence_translation: sentenceZh,
                  fun_sentences: sentence ? [{ en: sentence, zh: sentenceZh }] : [],
                  antonyms: '',
                  synonyms: '',
                  root_affixes: '',
                  etymology: ''
                });
              }
            });
            setWordsList(formattedWords);
          }

          setAiStatus({
            type: 'success',
            text: `🎉 AI 绘本解析成功！正在载入故事编辑器...`,
          });
          
          setSelectedIslandId('');
          setManualUserIds([...aiUserIds]);
          setIsEditingStory(true);
          setActiveTab('stories');
          
          setAiIslandName('');
          setAiQuestionCount(5);
          setAiModel(aiCli === 'codex' ? 'gpt-4o' : 'gemini-3.8-flash-high');
          setAiStoryImages(null);
          setAiFileKey((prev) => prev + 1);
        }
      } else {
        setAiStatus({ type: 'error', text: data.error || 'AI SYNTHESIS COMPILATION FAILED.' });
      }
    } catch (err: any) {
      setAiStatus({ type: 'error', text: err.message || 'CONNECTION TRANSMISSION ERROR.' });
    } finally {
      setIsSavingAI(false);
    }
  };

  const handleSavePromptTemplate = async () => {
    if (!aiCustomPrompt.trim()) {
      setPromptSaveStatus({ type: 'error', text: '提示词模板内容不能为空。' });
      return;
    }
    setIsSavingAiPrompt(true);
    setPromptSaveStatus(null);
    try {
      const res = await fetch('/api/game-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_prompt_template: aiCustomPrompt.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedPromptTemplate(aiCustomPrompt.trim());
        setPromptSaveStatus({ type: 'success', text: '💾 提示词模板已永久保存至数据库！下次将自动重用。' });
      } else {
        setPromptSaveStatus({ type: 'error', text: data.error || '保存提示词模板失败。' });
      }
    } catch (err) {
      setPromptSaveStatus({ type: 'error', text: '网络连接异常，保存提示词模板失败。' });
    } finally {
      setIsSavingAiPrompt(false);
    }
  };

  const handleResetPromptTemplate = () => {
    if (window.confirm('确定要恢复系统内置的初始 AI 解析提示词模板吗？（恢复后如需永久保存请点击保存按钮）')) {
      setAiCustomPrompt(DEFAULT_AI_PROMPT);
      setPromptSaveStatus({ type: 'success', text: '已恢复系统初始模板，点击「💾 保存为默认模板」即可永久写入数据库。' });
    }
  };

  // Users list state
  const [users, setUsers] = useState<User[]>([]);
  const [manualUserIds, setManualUserIds] = useState<number[]>([]);
  const [aiUserIds, setAiUserIds] = useState<number[]>([]);

  // Modal state for updating sector user access
  const [accessModalIsland, setAccessModalIsland] = useState<Island | null>(null);
  const [accessModalUserIds, setAccessModalUserIds] = useState<number[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const renderUserSelectionGroup = (
    selectedIds: number[],
    onChange: (ids: number[]) => void,
    label = "归属用户设置 / Sector Ownership"
  ) => (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
        👥 {label}
      </label>
      <div className="flex flex-wrap gap-2.5 p-3 bg-slate-900 border border-slate-800 rounded-lg">
        {users.length === 0 ? (
          <span className="text-xs text-slate-500 italic font-mono">No users registered in system.</span>
        ) : (
          users.map((user) => {
            const isChecked = selectedIds.includes(user.id);
            return (
              <label
                key={user.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold'
                    : 'bg-[#0B0F19]/60 border-slate-800 text-slate-400 hover:border-slate-700'
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
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded font-mono ml-1">ADMIN</span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );

  useEffect(() => {
    fetchIslands();
    fetchUsers();
    fetchStoryGroups();
    fetchGameSettings();
  }, []);

  const fetchIslands = async () => {
    setLoadingIslands(true);
    try {
      const res = await fetch('/api/islands');
      const data = await res.json();
      setIslands(data);
      fetchStoryGroups();
    } catch (err) {
      console.error('Failed to fetch islands', err);
    } finally {
      setLoadingIslands(false);
    }
  };

  const fetchStoryGroups = async () => {
    setIsGroupLoading(true);
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setStoryGroups(data);
      }
    } catch (err) {
      console.error('Failed to fetch story groups', err);
    } finally {
      setIsGroupLoading(false);
    }
  };

  const handleCreateStoryGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupNameInput.trim()) {
      setGroupStatus({ type: 'error', text: 'Group name cannot be blank.' });
      return;
    }
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupNameInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setGroupStatus({ type: 'success', text: `Story group "${data.name}" created successfully!` });
        setNewGroupNameInput('');
        fetchStoryGroups();
        fetchIslands();
      } else {
        setGroupStatus({ type: 'error', text: data.error || 'Failed to create story group' });
      }
    } catch (err) {
      setGroupStatus({ type: 'error', text: 'Network transmission error' });
    }
  };

  const handleUpdateStoryGroup = async (groupId: number) => {
    if (!editingGroupNameInput.trim()) {
      setGroupStatus({ type: 'error', text: 'Group name cannot be blank.' });
      return;
    }
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingGroupNameInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setGroupStatus({ type: 'success', text: data.message || 'Group updated successfully!' });
        setEditingGroupId(null);
        setEditingGroupNameInput('');
        fetchStoryGroups();
        fetchIslands();
      } else {
        setGroupStatus({ type: 'error', text: data.error || 'Failed to update group' });
      }
    } catch (err) {
      setGroupStatus({ type: 'error', text: 'Network transmission error' });
    }
  };

  const handleDeleteStoryGroup = async (group: StoryGroup) => {
    if (group.name === 'General') {
      alert('默认分组 General 不可删除。');
      return;
    }
    const count = group.story_count || 0;
    const confirmMsg = count > 0
      ? `确定要删除分组 "${group.name}" 吗？\n该分组下的 ${count} 篇故事将自动转移到 "General" 通用分组中。`
      : `确定要删除空分组 "${group.name}" 吗？`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setGroupStatus({ type: 'success', text: data.message || `Group "${group.name}" deleted.` });
        fetchStoryGroups();
        fetchIslands();
      } else {
        setGroupStatus({ type: 'error', text: data.error || 'Failed to delete group' });
      }
    } catch (err) {
      setGroupStatus({ type: 'error', text: 'Network transmission error' });
    }
  };

  const fetchGameSettings = async () => {
    setIsSettingsLoading(true);
    try {
      const res = await fetch('/api/game-settings');
      if (res.ok) {
        const data = await res.json();
        setGameSettings(data);
        if (data.ai_prompt_template && typeof data.ai_prompt_template === 'string' && data.ai_prompt_template.trim()) {
          setAiCustomPrompt(data.ai_prompt_template);
          setSavedPromptTemplate(data.ai_prompt_template);
        }
      }
    } catch (err) {
      console.error('Failed to fetch game settings', err);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const handleSaveGameSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingStatus(null);
    try {
      const res = await fetch('/api/game-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameSettings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingStatus({ type: 'success', text: '🎉 游戏全局参数与怪兽池保存成功！' });
        if (data.settings) {
          setGameSettings(data.settings);
        }
      } else {
        setSettingStatus({ type: 'error', text: data.error || '保存游戏设定失败。' });
      }
    } catch (err) {
      setSettingStatus({ type: 'error', text: '网络连接异常，保存失败。' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetGameSettings = () => {
    if (window.confirm('确定要恢复系统默认的推荐游戏难度与怪兽池设定吗？')) {
      setGameSettings(DEFAULT_FRONTEND_GAME_SETTINGS);
      setSettingStatus({ type: 'success', text: '已恢复推荐预设值，点击「保存设定」即可写入生效。' });
    }
  };

  const handleToggleMonsterEmoji = (monsterKey: string) => {
    const key = normalizeMonsterKey(monsterKey);
    setGameSettings(prev => {
      // Normalize all existing items
      const currentKeys = prev.monster_emojis.map(e => normalizeMonsterKey(e));
      const exists = currentKeys.includes(key);
      if (exists) {
        if (currentKeys.length <= 1) {
          alert('怪兽池中至少需要保留 1 只怪兽！');
          return prev;
        }
        return {
          ...prev,
          monster_emojis: prev.monster_emojis.filter(e => normalizeMonsterKey(e) !== key)
        };
      } else {
        return {
          ...prev,
          monster_emojis: [...prev.monster_emojis, key]
        };
      }
    });
    setSettingStatus(null);
  };

  const clearIslandFormFields = () => {
    setNewIslandName('');
    setGroupName('General');
    setStoryTitle('');
    setStoryPassage('');
    setStoryQuestions([
      { question: '', hint: '', answer: '' },
      { question: '', hint: '', answer: '' }
    ]);
    setStoryPassageJson([]);
    setWordsList([]);
    setSelectedIslandId('');
    setManualUserIds([]);
  };

  const resetIslandForm = () => {
    clearIslandFormFields();
    setIsEditingStory(false);
  };

  const createNewIsland = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIslandName.trim()) {
      setStoryEditorTab('basic');
      setUploadStatus({ type: 'error', text: '关卡名称不能为空 (SECTOR NAME CANNOT BE BLANK).' });
      return;
    }

    const upper = groupName.trim().toUpperCase();
    if (upper === 'ALL' || upper === '__ALL__') {
      setUploadStatus({ type: 'error', text: `Group name "${groupName}" is reserved. Please choose a different group name.` });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/islands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIslandName,
          group_name: groupName.trim() || 'General',
          story_title: storyTitle,
          story_passage: storyPassage,
          story_passage_json: storyPassageJson,
          story_questions: storyQuestions,
          words: wordsList,
          user_ids: manualUserIds
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ 
          type: 'success', 
          text: selectedIslandId 
            ? `Sector "${newIslandName}" saved successfully!` 
            : `Sector "${newIslandName}" initialized successfully!` 
        });
        resetIslandForm();
        fetchIslands();
      } else {
        setUploadStatus({ type: 'error', text: data.error || 'DATABASE TRANSACTION FAILED' });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: 'TRANSMISSION ERROR. PLEASE RETRY.' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSentenceTranslation = (
    index: number,
    field: 'paragraph_num' | 'sentence_num' | 'sentence_text' | 'translation' | 'illustration_url',
    value: any
  ) => {
    const updated = [...storyPassageJson];
    updated[index] = { ...updated[index], [field]: value };
    setStoryPassageJson(updated);
  };

  const addSentenceSegment = () => {
    const last = storyPassageJson[storyPassageJson.length - 1];
    const newPara = last ? last.paragraph_num : 1;
    const newSent = last ? last.sentence_num + 1 : 1;
    setStoryPassageJson([
      ...storyPassageJson,
      {
        paragraph_num: newPara,
        sentence_num: newSent,
        sentence_text: '',
        translation: ''
      }
    ]);
  };

  const removeSentenceSegment = (index: number) => {
    const updated = storyPassageJson.filter((_, i) => i !== index);
    setStoryPassageJson(updated);
  };

  const updatePageIllustration = (pageNum: number, newUrl: string | null) => {
    const formattedUrl = newUrl && newUrl.trim() ? newUrl.trim() : null;
    const updated = storyPassageJson.map((item) =>
      (item.paragraph_num || 1) === pageNum ? { ...item, illustration_url: formattedUrl } : item
    );
    setStoryPassageJson(updated);
  };

  const pageIllustrationsList = useMemo(() => {
    const map = new Map<number, { pageNum: number; illustration_url: string | null; count: number }>();
    (storyPassageJson || []).forEach((item) => {
      const pNum = item.paragraph_num || 1;
      if (!map.has(pNum)) {
        map.set(pNum, { pageNum: pNum, illustration_url: item.illustration_url || null, count: 1 });
      } else {
        const entry = map.get(pNum)!;
        entry.count++;
        if (!entry.illustration_url && item.illustration_url) {
          entry.illustration_url = item.illustration_url;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.pageNum - b.pageNum);
  }, [storyPassageJson]);

  const handleDeleteIsland = async (sector: Island) => {
    const title = sector.story_title || sector.name;
    if (!window.confirm(`确定要删除故事关卡「${title}」吗？此操作将同时清理关联单词与练习记录，不可撤销。`)) return;
    try {
      const res = await fetch(`/api/islands/${sector.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStoryListStatus({ type: 'success', text: `故事关卡「${title}」已成功删除！` });
        fetchIslands();
      } else {
        setStoryListStatus({ type: 'error', text: data.error || '删除故事关卡失败，请重试' });
      }
    } catch (err) {
      setStoryListStatus({ type: 'error', text: '网络请求失败，请检查服务连接' });
    }
  };

  return (
    <div className="w-full min-h-screen theme-bg theme-text font-mono flex flex-col md:flex-row transition-colors duration-300">
      {/* Left Collapsible Sidebar */}
      <aside className={`admin-sidebar bg-[#090D16] border-b md:border-b-0 md:border-r border-[#1F2D4A] flex flex-col justify-between p-3 sm:p-4 z-40 shrink-0 ${
        isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
      }`}>
        {/* Top: Brand & Collapse Toggle */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1F2D4A]/70">
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl shrink-0">🏰</span>
                <div className="min-w-0">
                  <h2 className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-display truncate">
                    WORDQUEST
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono tracking-widest block">
                    ADMIN STUDIO
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-auto text-2xl" title="WordQuest Admin Studio">
                🏰
              </div>
            )}

            <button
              type="button"
              onClick={toggleSidebar}
              className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
              title={isSidebarCollapsed ? "展开侧边栏 / Expand Sidebar" : "折叠侧边栏 / Collapse Sidebar"}
            >
              {isSidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {/* Navigation Items (2-Level Categorization) */}
          <nav className="flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {/* Standalone Dashboard Home Entry */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setIsEditingStory(false);
                setIsEditingWords(false);
                setIsEditingQuestions(false);
                setUploadStatus(null);
              }}
              className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left transition-all shrink-0 ${
                activeTab === 'dashboard' && !isEditingStory && !isEditingWords && !isEditingQuestions
                  ? 'active'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="统计总览首页 (Dashboard Overview)"
            >
              <span className="text-lg shrink-0">📊</span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tracking-wide truncate">统计总览首页</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Dashboard Overview</div>
                </div>
              )}
            </button>

            {navCategories.map((cat, catIndex) => {
              const isCatCollapsed = !isSidebarCollapsed && !!collapsedCategories[cat.id];
              const hasActiveChild = cat.items.some(
                item => (item.id === activeTab && !isEditingStory && !isEditingWords && !isEditingQuestions) || (item.id === 'stories' && (isEditingStory || isEditingWords || isEditingQuestions))
              );

              return (
                <div key={cat.id} className="flex flex-col gap-1 shrink-0 md:shrink">
                  {/* Category Header (Only when sidebar is not collapsed) */}
                  {!isSidebarCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleCategoryCollapse(cat.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider rounded-lg transition-all cursor-pointer group ${
                        hasActiveChild
                          ? 'text-cyan-400 bg-cyan-950/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                      title={`${cat.title} (${cat.subtitle})`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs shrink-0">{cat.icon}</span>
                        <span className="font-bold truncate group-hover:text-cyan-300">{cat.title}</span>
                        <span className="text-3xs px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-normal">
                          {cat.items.length}
                        </span>
                      </div>
                      <span className="text-3xs text-slate-500 group-hover:text-cyan-400 transition-transform">
                        {isCatCollapsed ? '▸' : '▾'}
                      </span>
                    </button>
                  ) : (
                    catIndex > 0 && <div className="border-t border-[#1F2D4A]/50 my-1 mx-1" />
                  )}

                  {/* Category Children Items */}
                  {(!isCatCollapsed || isSidebarCollapsed) && (
                    <div className={`flex flex-row md:flex-col gap-1.5 ${!isSidebarCollapsed ? 'md:pl-1 md:border-l md:border-slate-800/80 md:ml-2.5' : ''}`}>
                      {cat.items.map((item) => {
                        const isActive = (item.id === activeTab && !isEditingStory && !isEditingWords && !isEditingQuestions) || (item.id === 'stories' && (isEditingStory || isEditingWords || isEditingQuestions));
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={item.onClick}
                            className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left transition-all ${
                              isActive
                                ? 'active'
                                : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                            title={`${item.title} (${item.subtitle})`}
                          >
                            <span className="text-lg shrink-0">{item.icon}</span>
                            {!isSidebarCollapsed && (
                              <div className="min-w-0">
                                <div className="text-xs font-bold font-mono tracking-wide truncate">{item.title}</div>
                                <div className="text-[10px] text-slate-500 font-mono truncate">{item.subtitle}</div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Return to Map, Change Password, and Logout buttons */}
        <div className="pt-4 border-t border-[#1F2D4A]/70 mt-4 md:mt-0 space-y-2">
          <button
            type="button"
            onClick={onBack}
            className={`w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 text-slate-400 hover:text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
            title="返回故事主地图 / Return to Map"
          >
            <span className="text-base shrink-0">⬅️</span>
            {!isSidebarCollapsed && <span className="truncate">返回主地图</span>}
          </button>
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className={`w-full p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/40 hover:border-amber-400 hover:bg-amber-900/30 text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
            title="修改管理员密码 / Change Admin Password"
          >
            <span className="text-base shrink-0">🔐</span>
            {!isSidebarCollapsed && <span className="truncate">修改管理员密码</span>}
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className={`w-full p-2.5 rounded-xl bg-red-950/30 border border-red-900/50 hover:border-red-500/50 hover:bg-red-900/40 text-red-400 hover:text-red-300 font-mono text-xs font-bold transition-all cursor-pointer flex items-center ${
                isSidebarCollapsed ? 'justify-center' : 'gap-2.5'
              }`}
              title="退出管理后台登录 / Logout Admin"
            >
              <span className="text-base shrink-0">🚪</span>
              {!isSidebarCollapsed && <span className="truncate">退出管理登录</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Right Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-5 w-full max-w-7xl mx-auto overflow-y-auto">
        {/* Top Header for non-stories & non-dashboard tabs */}
        {!isEditingStory && !isEditingWords && !isEditingQuestions && !['stories', 'groups', 'ai_import', 'dashboard'].includes(activeTab) && (
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border pb-3">
              <div>
                <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 font-display flex items-center gap-2">
                  {activeTab === 'users' && '👥 学员账号管理 (PLAYER ACCOUNTS)'}
                  {activeTab === 'groups' && '📁 故事分组管理 (STORY GROUPS DIRECTORY)'}
                  {activeTab === 'songs' && '🎵 歌曲歌词学习管理 (SONG LEARNING LIBRARY)'}
                  {activeTab === 'word_books' && '📚 单词宝库与生词导入 (WORD BANK & AI LAB)'}
                  {activeTab === 'vocab_stats' && '📈 单词学情与生词弱项看板 (VOCABULARY ANALYTICS)'}
                  {activeTab === 'ai_import' && '🤖 AI 智能绘本导入工作室 (AI SYNTHESIS STUDIO)'}
                  {activeTab === 'game_settings' && '🎮 游戏玩法与难度参数配置 (GAME SETTINGS)'}
                  {activeTab === 'rewards' && '🪙 关卡奖励与经验配置 (REWARDS & XP)'}
                  {activeTab === 'roadmap' && '📋 任务与改动追踪看板 (PROJECT ROADMAP & CHANGELOG)'}
                </h1>
                <p className="text-2xs text-slate-400 font-mono mt-0.5">
                  {activeTab === 'users' && '创建与管理学生档案，分配阅读关卡与追踪单词进度'}
                  {activeTab === 'groups' && '管理故事所属分类与关卡分组，支持增删改查及故事自动归并'}
                  {activeTab === 'songs' && '上传 MP3，通过 LRCLIB 匹配同步歌词，确认版本并校对逐句播放边界'}
                  {activeTab === 'word_books' && '维护独立词单体系，支持多行生词批量粘贴与 AI 自动解析例句/反义词/词根/词源'}
                  {activeTab === 'vocab_stats' && '实时透视学员在单词宝库各模式下的答题频次、错误率与弱项生词排行'}
                  {activeTab === 'ai_import' && '通过 Agent CLI 与多模态大模型一键提取绘本中英文与问答'}
                  {activeTab === 'game_settings' && '调整 Story Chase 打字追逐游戏的怪兽移动速度、退后距离、等待冷却时间及可用怪兽 Emoji 池'}
                  {activeTab === 'rewards' && '配置各阶段通关金币奖励、连胜倍率与复习系数'}
                  {activeTab === 'roadmap' && '追踪全站各版本技术演进、已上线改动步骤、涉及代码文件与待开发规划'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View 0: 📊 Dashboard Overview (统计总览首页) */}
        {activeTab === 'dashboard' && !isEditingStory && !isEditingWords && !isEditingQuestions && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b theme-border pb-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 font-display flex items-center gap-2">
                  📊 统计分析总览 (DASHBOARD OVERVIEW)
                </h1>
                <p className="text-2xs text-slate-400 font-mono mt-0.5">
                  全站故事关卡、词汇规模、学员档案与学情统计总览
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('stories')}
                  className="px-3.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>📚</span> <span>管理故事关卡</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai_import')}
                  className="px-3.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>🤖</span> <span>AI 绘本导入</span>
                </button>
              </div>
            </div>

            {/* 4 Core KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('stories')}
                className="theme-card border theme-border rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all cursor-pointer"
              >
                <span className="text-xs font-mono uppercase tracking-wider theme-text-muted mb-1">Total Stories (故事总数)</span>
                <span className="theme-text font-display text-2xl font-black">{islands.length}</span>
              </div>
              <div
                onClick={() => setActiveTab('vocab_stats')}
                className="theme-card border theme-border rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all cursor-pointer"
              >
                <span className="text-xs font-mono uppercase tracking-wider theme-text-muted mb-1">Word Count (关卡词汇)</span>
                <span className="text-cyan-400 font-display text-2xl font-black">{totalWordCount}</span>
              </div>
              <div
                onClick={() => setActiveTab('users')}
                className="theme-card border theme-border rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all cursor-pointer"
              >
                <span className="text-xs font-mono uppercase tracking-wider theme-text-muted mb-1">Registered Students (学员)</span>
                <span className="text-emerald-400 font-display text-2xl font-black">{usersList.length}</span>
              </div>
              <div className="theme-card border theme-border rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                <span className="text-xs font-mono uppercase tracking-wider theme-text-muted mb-1">Study Hours (累计学习)</span>
                <span className="text-purple-400 font-display text-2xl font-black">24.5h</span>
              </div>
            </div>

            {/* Category Distribution & Student Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Story Categories Breakdown */}
              <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-2.5">
                  <h3 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span>📁</span> <span>各分类故事关卡分布 ({storyGroups.length} 个分组)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('groups')}
                    className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 cursor-pointer"
                  >
                    管理分组 →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {storyGroups.map((grp) => {
                    const count = islands.filter(i => ((i.group_name && i.group_name.trim()) || 'General') === grp.name).length;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => {
                          setSelectedSectorGroupTab(grp.name);
                          setActiveTab('stories');
                        }}
                        className="bg-slate-900/90 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-2.5 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-mono text-slate-200 truncate font-bold">{grp.name}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 shrink-0">
                          {count} 篇
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Overview */}
              <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-2.5">
                  <h3 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span>👥</span> <span>注册学员档案 ({usersList.length} 人)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className="text-[11px] font-mono text-slate-400 hover:text-emerald-300 cursor-pointer"
                  >
                    学员管理 →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {usersList.map((u) => (
                    <div
                      key={u.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{u.avatar || '👤'}</span>
                        <span className="text-xs font-mono font-bold text-slate-200 truncate">{u.username}</span>
                      </div>
                      <span className="text-[11px] font-mono text-amber-300 bg-amber-950/50 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                        🪙 {u.coins || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Embedded Vocabulary Analytics */}
            <VocabularyAnalytics users={users} />
          </div>
        )}

      {/* View: 🎵 Song Learning Management */}
      {activeTab === 'songs' && !isEditingStory && (
        <SongManager />
      )}

      {/* View: 📚 Word Bank Management */}
      {(activeTab === 'word_books' || (activeTab === 'stories' && isEditingWords)) && !isEditingStory && (
        <WordBankManager
          initialBookId={editingWordsBookId}
          initialCategory={editingWordsCategory}
          storyTitle={editingWordsTitle}
          onBack={() => {
            setIsEditingWords(false);
            setEditingWordsBookId(null);
            setEditingWordsCategory(null);
            setEditingWordsTitle(null);
            setActiveTab('stories');
            fetchIslands();
          }}
        />
      )}

      {/* View: 📈 Vocabulary Analytics & Weak Words (TASK-12.1) */}
      {activeTab === 'vocab_stats' && !isEditingStory && (
        <VocabularyAnalytics users={users} />
      )}

      {/* View 1: 👥 Player & User Accounts Management */}
      {activeTab === 'users' && !isEditingStory && (
        <div className="space-y-8 animate-fade-in">
          {/* Create Player Profile Card */}
          <div className="theme-card border theme-border rounded-xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-cyan-400 font-mono mb-2 flex items-center gap-2">
              ➕ Create New Player Profile (创建新学员账号)
            </h3>
            <p className="text-xs theme-text-muted font-mono mb-6">
              Initialize a new student identity for learning and tracking word progress.
            </p>

            {playerStatus && (
              <div className={`p-3 rounded-lg text-xs font-mono mb-6 border ${
                playerStatus.type === 'success' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                {playerStatus.text}
              </div>
            )}

            <FormBoundary>
              <form onSubmit={handleCreatePlayer} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-bold theme-text-muted mb-2 font-mono">PLAYER NAME (学员姓名 / 昵称)</label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Enter student name (e.g. Alex)..."
                    disabled={creatingPlayer}
                    className="w-full bg-[#0D1322] border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-cyan-100 placeholder:text-slate-500 rounded-lg px-4 py-2.5 text-sm font-mono outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold theme-text-muted mb-2 font-mono">AVATAR BADGE (选择探险伙伴角色: 8款侧身双腿可跑)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {BUDDY_CHARACTERS.map((char) => {
                      const isSelected = normalizeBuddyKey(newPlayerAvatar) === char.key;
                      return (
                        <button
                          key={char.key}
                          type="button"
                          onClick={() => setNewPlayerAvatar(char.key)}
                          className={`p-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer border group overflow-hidden ${
                            isSelected
                              ? 'bg-cyan-950/60 border-cyan-400 shadow-md scale-105'
                              : 'theme-card border-slate-800 hover:border-cyan-500/60'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 border border-cyan-500/30 overflow-hidden shrink-0">
                            <RunnerSprite avatar={char.key} isSprinting={false} />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">{char.name}</div>
                            <div className="text-[10px] text-cyan-400 font-mono">{char.badge}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingPlayer}
                  className="px-6 py-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs uppercase rounded-lg shadow-md shadow-cyan-500/30 hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
                >
                  {creatingPlayer ? 'Creating Player...' : 'Create Player Profile'}
                </button>
              </form>
            </FormBoundary>
          </div>

          {/* Registered Players List Table */}
          <div className="theme-card border theme-border rounded-xl p-6 shadow-xl">
            <h3 className="text-base font-bold theme-text font-mono mb-4 flex items-center gap-2">
              📋 Registered Player Profiles ({usersList.length})
            </h3>
            {usersList.length === 0 ? (
              <p className="text-xs theme-text-muted italic font-mono">No student profiles found. Create one above!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {usersList.map((u) => {
                  const isAdmin = u.is_admin === 1 || u.username?.toLowerCase() === 'admin';
                  return (
                    <div key={u.id} className="theme-card border theme-border rounded-lg p-4 flex items-center justify-between hover:border-cyan-500/40 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-tr from-cyan-950/80 to-blue-900/80 border border-cyan-500/40 text-lg text-white font-bold shrink-0 overflow-hidden shadow-sm">
                          <RunnerSprite avatar={u.avatar} isSprinting={false} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold theme-text font-mono truncate flex items-center gap-1.5">
                            {isAdmin && <span>👑</span>}
                            <span>{u.username}</span>
                          </div>
                          <div className="text-2xs text-cyan-400 font-mono">Coins: {u.coins || 0} 🪙</div>
                        </div>
                      </div>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setIsChangePasswordOpen(true)}
                          className="px-2.5 py-1 text-2xs font-bold text-amber-300 hover:bg-amber-500/10 border border-amber-500/40 rounded transition-all cursor-pointer font-mono shadow-sm"
                          title="修改管理员密码"
                        >
                          修改密码 🔐
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeletePlayer(u)}
                          className="px-2.5 py-1 text-2xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 rounded transition-all cursor-pointer font-mono"
                          title="Delete student profile"
                        >
                          Delete 🗑️
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 1: 📁 Story Groups Management (故事分组管理) */}
      {activeTab === 'groups' && !isEditingStory && (
        <div className="flex flex-col gap-3 animate-fade-in">
          {/* Single-Row Compact Toolbar: Title + Inline Create Group Form + Refresh */}
          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl px-4 py-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-base">📁</span>
              <h3 className="text-sm font-black text-cyan-400 font-mono tracking-wide">
                故事分组管理
              </h3>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                {storyGroups.length}个分组
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FormBoundary>
                <form onSubmit={handleCreateStoryGroup} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newGroupNameInput}
                    onChange={(e) => setNewGroupNameInput(e.target.value)}
                    placeholder="输入新分组名称 (如 Level A)..."
                    className="w-48 sm:w-64 bg-slate-900 border border-slate-700 focus:border-cyan-400 text-cyan-100 placeholder:text-slate-500 rounded-lg px-3 py-1.5 text-xs font-mono outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <span>➕</span> <span>创建分组</span>
                  </button>
                </form>
              </FormBoundary>

              <button
                type="button"
                onClick={fetchStoryGroups}
                className="text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 rounded-lg font-mono transition-all cursor-pointer flex items-center gap-1 shrink-0"
                title="刷新分组列表"
              >
                <span>🔄</span> <span>刷新</span>
              </button>
            </div>
          </div>

          {groupStatus && (
            <div className={`px-3 py-2 rounded-lg text-xs font-mono border flex items-center justify-between ${
              groupStatus.type === 'success' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}>
              <span>{groupStatus.text}</span>
              <button
                type="button"
                onClick={() => setGroupStatus(null)}
                className="opacity-60 hover:opacity-100 font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Group List & Stats Table Card */}
          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl shadow-xl overflow-hidden">
            <SuspenseState isLoading={isGroupLoading}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-[#1F2D4A] text-slate-400 text-[11px] tracking-wider">
                      <th className="py-2.5 px-4 font-bold">分组名称</th>
                      <th className="py-2.5 px-4 font-bold text-center">故事数量</th>
                      <th className="py-2.5 px-4 font-bold text-center">类型</th>
                      <th className="py-2.5 px-4 font-bold text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2D4A]/80">
                    {storyGroups.map((grp) => {
                      const isDefault = grp.name === 'General';
                      const isEditing = editingGroupId === grp.id;

                      return (
                        <tr key={grp.id} className="hover:bg-cyan-950/20 transition-colors">
                          {/* Name / Inline Edit */}
                          <td className="py-2.5 px-4 font-medium theme-text">
                            {isEditing ? (
                              <div className="flex items-center gap-2 max-w-xs">
                                <input
                                  type="text"
                                  value={editingGroupNameInput}
                                  onChange={(e) => setEditingGroupNameInput(e.target.value)}
                                  className="w-full bg-[#0D1322] border border-cyan-400 text-cyan-100 rounded px-2.5 py-1 text-xs font-mono outline-none"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">📁</span>
                                <span className="font-bold text-slate-100">{grp.name}</span>
                              </div>
                            )}
                          </td>

                          {/* Story count */}
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                              {grp.story_count} 篇
                            </span>
                          </td>

                          {/* Group type */}
                          <td className="py-2.5 px-4 text-center">
                            {isDefault ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
                                🔒 系统默认
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                                🏷️ 自定义
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStoryGroup(grp.id)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-2xs font-bold transition-all cursor-pointer"
                                  >
                                    💾 保存
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingGroupId(null); setEditingGroupNameInput(''); }}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-2xs font-bold transition-all cursor-pointer"
                                  >
                                    ✕ 取消
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('stories');
                                      setSelectedSectorGroupTab(grp.name);
                                    }}
                                    className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 rounded text-2xs font-bold transition-all cursor-pointer"
                                    title="查看该分组下的所有故事"
                                  >
                                    📚 查看故事
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingGroupId(grp.id);
                                      setEditingGroupNameInput(grp.name);
                                    }}
                                    disabled={isDefault}
                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 rounded text-2xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={isDefault ? "默认分组无法重命名" : "重命名分组"}
                                  >
                                    ✏️ 重命名
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStoryGroup(grp)}
                                    disabled={isDefault}
                                    className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-950 border border-rose-500/30 hover:border-rose-500 text-rose-400 rounded text-2xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={isDefault ? "默认分组无法删除" : "删除分组并将故事转移至 General"}
                                  >
                                    🗑️ 删除
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SuspenseState>
          </div>
        </div>
      )}

      {/* View 2: ✏️ Dedicated Story Editor (独立全屏故事编辑器工作台 - 紧凑一屏标签化布局) */}
      {isEditingStory && (
        <div className="flex flex-col gap-2.5 animate-fade-in">
          {/* Top Sticky Compact Action Bar */}
          <div className="story-editor-sticky-bar bg-[#0F172A]/95 border border-cyan-500/30 rounded-xl px-3.5 py-2 shadow-lg flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleCloseStoryEditor}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                <span>◀</span> <span>返回故事库</span>
              </button>
              <div className="h-4 w-px bg-slate-700 hidden sm:block shrink-0" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-cyan-400 font-bold shrink-0">
                    {selectedIslandId ? `SECTOR #${selectedIslandId}` : 'NEW SECTOR'}
                  </span>
                  <h2 className="text-sm sm:text-base font-bold theme-text font-mono truncate max-w-xs sm:max-w-md">
                    {storyTitle || newIslandName || '未命名故事'}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {uploadStatus && (
                <span className={`px-2.5 py-1 text-xs font-mono rounded-lg border ${
                  uploadStatus.type === 'success' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}>
                  {uploadStatus.text}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleOpenAiGenStoryModal()}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-mono text-xs font-black rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-400/40"
                title="基于当前关卡关联的生词库，利用 AI 一键构思并生成完整的英文绘本故事"
              >
                <span>✨</span> <span>AI 生词生成故事</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAiAppend}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-purple-400/40"
                title="追加上传后续绘本页面，自动顺延页码并合并生词和习题"
              >
                <span>🤖 ➕</span> <span>AI 追加新页</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById('story-editor-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                disabled={isSaving}
                className="px-5 py-1.5 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 font-mono active:scale-95"
              >
                <span>💾</span> <span>{isSaving ? 'SAVING...' : (selectedIslandId ? '保存更改 (SAVE)' : '创建故事 (CREATE)')}</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs Switcher Bar */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setStoryEditorTab('content')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                storyEditorTab === 'content'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>📖</span>
              <span>故事正文与段落翻译</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                storyEditorTab === 'content' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-cyan-400'
              }`}>
                {storyPassageJson.length}句
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStoryEditorTab('basic')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                storyEditorTab === 'basic'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>📌</span>
              <span>基础信息与学员权限</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                storyEditorTab === 'basic' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                {manualUserIds.length ? `${manualUserIds.length}人` : '公开'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStoryEditorTab('illustrations')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                storyEditorTab === 'illustrations'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>🖼️</span>
              <span>绘本插图画廊</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                storyEditorTab === 'illustrations' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-purple-300'
              }`}>
                {pageIllustrationsList.filter(p => p.illustration_url).length}/{pageIllustrationsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStoryEditorTab('vocab_questions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                storyEditorTab === 'vocab_questions'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>📚</span>
              <span>专属生词与阅读问答</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                storyEditorTab === 'vocab_questions' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-indigo-300'
              }`}>
                {wordsList.length}词 · {storyQuestions.filter(q => q.question?.trim()).length}题
              </span>
            </button>
          </div>

          {/* Story Editor Main Form */}
          <FormBoundary>
            <form id="story-editor-form" onSubmit={createNewIsland} className="flex flex-col gap-3">
              {/* TAB 1: 📖 故事文本与段落句子对照 */}
              {storyEditorTab === 'content' && (
                <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-3 sm:p-4 shadow-xl flex flex-col gap-3">
                  {/* Top Row: Sector Name + Story Title + Full Story Passage (3-column compact layout) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-3 flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 uppercase tracking-wider font-mono font-bold flex items-center gap-1">
                        <span>🏷️</span>
                        <span>关卡名称 (Sector Name) *</span>
                      </label>
                      <input
                        type="text"
                        value={newIslandName}
                        onChange={(e) => setNewIslandName(e.target.value)}
                        placeholder="例如: S1 Magic Forest"
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">关卡在地图与列表的唯一标识</span>
                    </div>

                    <div className="md:col-span-4 flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 uppercase tracking-wider font-mono font-bold flex items-center gap-1">
                        <span>📖</span>
                        <span>英文标题 (Story Title)</span>
                      </label>
                      <input
                        type="text"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        placeholder="例如: The Brave Little Fox"
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">绘本原书英文标题</span>
                    </div>

                    <div className="md:col-span-5 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-400 uppercase tracking-wider font-mono font-bold flex items-center gap-1">
                          <span>📝</span>
                          <span>故事完整文本 (Full Story Text)</span>
                        </label>
                        <span className="text-[10px] text-cyan-500/80 font-mono">
                          {storyPassage ? `${storyPassage.split(/\s+/).filter(Boolean).length} 词` : '空'}
                        </span>
                      </div>
                      <textarea
                        value={storyPassage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStoryPassage(val);
                          if (val.trim()) {
                            const rawParagraphs = val.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
                            const autoJson: any[] = [];
                            rawParagraphs.forEach((paraText, pIdx) => {
                              const matches = paraText.match(/[^.!?]+(?:[.!?]+['"’”)]*|(?=$))/g) || [paraText];
                              let sentenceNum = 1;
                              matches.forEach((s) => {
                                const cleanSent = s.trim();
                                if (cleanSent) {
                                  autoJson.push({
                                    paragraph_num: pIdx + 1,
                                    sentence_num: sentenceNum++,
                                    sentence_text: cleanSent,
                                    translation: ''
                                  });
                                }
                              });
                            });
                            setStoryPassageJson(autoJson);
                          } else {
                            setStoryPassageJson([]);
                          }
                        }}
                        placeholder="在此粘贴或输入故事全文，会自动切分下方表格..."
                        rows={2}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y"
                      />
                    </div>
                  </div>

                  {/* Sentence Breakdown & Chinese Translation Table */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono font-bold">
                          逐句段落与中文对照 (SENTENCE BREAKDOWN & TRANSLATION)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                          {storyPassageJson.length} 句
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={addSentenceSegment}
                        className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1 active:scale-95"
                      >
                        ➕ 添加句子 (ADD SENTENCE)
                      </button>
                    </div>

                    <div className="table-responsive bg-[#0F172A] border border-[#1F2D4A] rounded-xl overflow-hidden shadow-inner max-h-[calc(100vh-250px)] min-h-[220px] overflow-y-auto">
                      <table className="w-full text-xs text-left font-mono" id="table-story-preview">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-[#131B2E] border-b border-[#1F2D4A] text-slate-400 font-mono shadow-sm">
                            <th className="p-2 font-semibold uppercase tracking-wider w-[14%] text-center">段落 / 序号</th>
                            <th className="p-2 font-semibold uppercase tracking-wider w-[44%]">英文原句 (ENGLISH)</th>
                            <th className="p-2 font-semibold uppercase tracking-wider w-[36%]">中文翻译 (CHINESE)</th>
                            <th className="p-2 font-semibold uppercase tracking-wider w-[6%] text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storyPassageJson.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-500 italic font-mono">
                                暂无句子划分，请在上方文本框输入文本或点击【➕ 添加句子】
                              </td>
                            </tr>
                          ) : (
                            storyPassageJson.map((item, index) => (
                              <tr key={`${item.paragraph_num}-${item.sentence_num}-${index}`} className="border-b border-[#1F2D4A]/50 hover:bg-[#131B2E]/40 transition-colors">
                                <td className="p-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-[10px] text-slate-500">P#</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="99"
                                      value={item.paragraph_num || 1}
                                      onChange={(e) => updateSentenceTranslation(index, 'paragraph_num', parseInt(e.target.value) || 1)}
                                      className="w-10 bg-slate-900 border border-slate-800 text-cyan-300 text-center font-mono font-bold px-1 py-0.5 rounded text-xs focus:outline-none focus:border-cyan-500"
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-600 mt-0.5">#{index + 1}</div>
                                </td>
                                <td className="p-1.5">
                                  <textarea
                                    value={item.sentence_text}
                                    onChange={(e) => updateSentenceTranslation(index, 'sentence_text', e.target.value)}
                                    placeholder="English sentence..."
                                    rows={1}
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 min-h-[30px] resize-y"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <textarea
                                    value={item.translation || ''}
                                    onChange={(e) => updateSentenceTranslation(index, 'translation', e.target.value)}
                                    placeholder="中文释义..."
                                    rows={1}
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-sans focus:outline-none focus:border-cyan-500 min-h-[30px] resize-y"
                                  />
                                </td>
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeSentenceSegment(index)}
                                    className="text-rose-400 hover:text-rose-300 cursor-pointer p-1 text-xs transition-all hover:scale-110"
                                    title="删除此句"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 📌 基础配置与学员权限 */}
              {storyEditorTab === 'basic' && (
                <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1F2D4A] pb-2.5">
                    <span className="text-lg">📌</span>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">
                      基础信息与学员权限 (Basic Information & Permissions)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
                        Sector Name (关卡/岛屿名称) *
                      </label>
                      <input
                        type="text"
                        value={newIslandName}
                        onChange={(e) => setNewIslandName(e.target.value)}
                        placeholder="e.g. Magic Forest"
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
                          Group Name (所属分组 / 级别)
                        </label>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('groups'); setIsEditingStory(false); }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-200 underline font-mono cursor-pointer"
                        >
                          ⚙️ 管理所有分组
                        </button>
                      </div>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. General, Level A, Science..."
                        list="existing-group-names"
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                      <datalist id="existing-group-names">
                        {storyGroups.map(g => (
                          <option key={g.id} value={g.name} />
                        ))}
                      </datalist>

                      {/* Quick group selector chips */}
                      {storyGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono self-center">快速选择:</span>
                          {storyGroups.map(g => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setGroupName(g.name)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                                groupName === g.name
                                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                              }`}
                            >
                              📁 {g.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned Players */}
                  <div className="pt-2 border-t border-[#1F2D4A]/60">
                    {renderUserSelectionGroup(manualUserIds, setManualUserIds)}
                  </div>
                </div>
              )}

              {/* TAB 3: 🖼️ 绘本逐页插图 (Page Illustrations Gallery) */}
              {storyEditorTab === 'illustrations' && (
                <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-3 sm:p-4 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🖼️</span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">
                          绘本逐页插图 (PAGE ILLUSTRATIONS GALLERY)
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono">
                          AI 智能提取的绘本纯画面插图，按页码（段落）对应展示。
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenAiAppend}
                        className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer border border-purple-400/40 active:scale-95"
                      >
                        <span>🤖 ➕</span>
                        <span>追加新页面</span>
                      </button>
                      <span className="text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                        {pageIllustrationsList.filter((p) => p.illustration_url).length} / {pageIllustrationsList.length} 页含插图
                      </span>
                    </div>
                  </div>

                  {pageIllustrationsList.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic font-mono text-xs bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
                      <span>暂无页码数据。请在【故事正文】输入段落或通过 AI 导入绘本图片。</span>
                      <button
                        type="button"
                        onClick={handleOpenAiAppend}
                        className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1 mt-1"
                      >
                        <span>🤖 ➕</span> <span>前往 AI 智能绘本导入</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                      {pageIllustrationsList.map((pageItem) => (
                        <div
                          key={pageItem.pageNum}
                          className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/30 rounded-xl p-2.5 flex flex-col justify-between gap-2 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                              第 {pageItem.pageNum} 页 (Para #{pageItem.pageNum})
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {pageItem.count} 句文本
                            </span>
                          </div>

                          {/* Illustration Preview */}
                          {pageItem.illustration_url ? (
                            <div className="relative group rounded-lg overflow-hidden border border-slate-800 bg-black/50 aspect-video flex items-center justify-center">
                              <StoryIllustration
                                src={pageItem.illustration_url}
                                pageNumber={pageItem.pageNum}
                                allowZoom={true}
                                className="border-none bg-transparent w-full h-full object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => updatePageIllustration(pageItem.pageNum, null)}
                                className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 rounded text-[10px] font-mono font-bold cursor-pointer shadow"
                              >
                                🗑️ 移除
                              </button>
                            </div>
                          ) : (
                            <div className="aspect-video rounded-lg border border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600 text-xs font-mono gap-0.5">
                              <span>📄 无本页插图</span>
                              <span className="text-[10px] text-slate-700">（纯文本）</span>
                            </div>
                          )}

                          {/* URL input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={pageItem.illustration_url || ''}
                              onChange={(e) => updatePageIllustration(pageItem.pageNum, e.target.value)}
                              placeholder="/api/illustrations/... 或 https://..."
                              className="flex-1 bg-[#0B0F19] border border-slate-800 text-slate-200 text-[11px] font-mono px-2 py-1 rounded focus:outline-none focus:border-cyan-500"
                            />
                            {pageItem.illustration_url && (
                              <button
                                type="button"
                                onClick={() => updatePageIllustration(pageItem.pageNum, null)}
                                className="text-slate-500 hover:text-rose-400 text-xs px-1"
                                title="清空"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: 📚 专属生词库与问答配置快捷入口 */}
              {storyEditorTab === 'vocab_questions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: 专属生词库 */}
                  <div className="bg-[#131B2E] border border-[#1F2D4A] hover:border-indigo-500/40 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col justify-between gap-4 transition-all">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📖</span>
                          <div>
                            <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest font-mono">
                              专属生词库 (VOCABULARY BANK)
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              生词管理与 AI 深度解析
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {wordsList.length} 词
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-mono leading-relaxed">
                        生词已与独立单词宝库打通，支持一键 AI 深度解析音标、核心释义、趣味例句、反义词与词源趣谈。
                      </p>

                      {/* Tag cloud */}
                      {wordsList.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl max-h-48 overflow-y-auto">
                          {wordsList.map((w, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-2xs font-mono bg-indigo-950/60 text-indigo-200 border border-indigo-800/50"
                            >
                              {w.word}
                              {w.translation ? ` (${w.translation})` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500 font-mono">
                          当前故事尚未提取或添加生词
                        </div>
                      )}
                    </div>

                    <div className="border-t border-[#1F2D4A] pt-3">
                      {selectedIslandId ? (
                        <button
                          type="button"
                          onClick={() => {
                            const currentIsland = islands.find((isl) => isl.id === Number(selectedIslandId));
                            if (currentIsland) {
                              handleOpenEditWords(currentIsland);
                            }
                          }}
                          className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <span>📖</span>
                          <span>前往编辑单词与 AI 解析 ➔</span>
                        </button>
                      ) : (
                        <div className="w-full text-center py-2 text-xs text-amber-400 font-mono bg-amber-950/20 border border-amber-500/20 rounded-xl">
                          💡 保存故事后，即可直接前往「编辑单词」
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: 阅读理解问答 */}
                  <div className="bg-[#131B2E] border border-[#1F2D4A] hover:border-purple-500/40 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col justify-between gap-4 transition-all">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🧩</span>
                          <div>
                            <h4 className="text-sm font-bold text-purple-400 uppercase tracking-widest font-mono">
                              阅读理解问答 (COMPREHENSION QUESTIONS)
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              独立问答配置与 AI 智能出题
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {storyQuestions.filter((q) => q.question && q.question.trim()).length} 题
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-mono leading-relaxed">
                        学员在第 3 阶段「挑战测试」时作答。支持由 AI 研读故事正文一键智能生成中英文问答及参考答案。
                      </p>

                      {/* Questions preview */}
                      {storyQuestions.filter((q) => q.question && q.question.trim()).length > 0 ? (
                        <div className="flex flex-col gap-1.5 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl max-h-48 overflow-y-auto">
                          {storyQuestions
                            .filter((q) => q.question && q.question.trim())
                            .map((q, idx) => (
                              <div key={idx} className="text-xs font-mono text-purple-200 truncate flex items-center gap-1.5">
                                <span className="text-purple-400 font-bold shrink-0">Q{idx + 1}:</span>
                                <span className="truncate">{q.question}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500 font-mono">
                          当前故事尚未配置阅读理解问答
                        </div>
                      )}
                    </div>

                    <div className="border-t border-[#1F2D4A] pt-3">
                      {selectedIslandId ? (
                        <button
                          type="button"
                          onClick={() => {
                            const currentIsland = islands.find((isl) => isl.id === Number(selectedIslandId));
                            if (currentIsland) {
                              handleOpenEditQuestions(currentIsland);
                            }
                          }}
                          className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <span>🧩</span>
                          <span>前往编辑问题与 AI 出题 ➔</span>
                        </button>
                      ) : (
                        <div className="w-full text-center py-2 text-xs text-amber-400 font-mono bg-amber-950/20 border border-amber-500/20 rounded-xl">
                          💡 保存故事后，即可直接前往「编辑问题」
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </FormBoundary>
        </div>
      )}

      {/* View: 🧩 Story Comprehension Questions Editor (故事阅读理解问答独立管理 - 紧凑双栏一屏工作台) */}
      {activeTab === 'stories' && isEditingQuestions && editingQuestionsIsland && !isEditingStory && (
        <div className="flex flex-col gap-2.5 animate-fade-in">
          {/* Top Bar: Compact Single-Row Action Bar */}
          <div className="bg-[#0F172A]/95 border border-purple-500/30 rounded-xl px-3.5 py-2 shadow-lg flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleCloseEditQuestions}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-purple-400 text-slate-300 hover:text-purple-300 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>◀</span> <span>返回故事库</span>
              </button>
              <div className="h-4 w-px bg-slate-700 hidden sm:block shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">🧩</span>
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider font-mono truncate max-w-xs sm:max-w-md">
                  {editingQuestionsIsland.story_title || editingQuestionsIsland.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  #{editingQuestionsIsland.id}
                </span>
                {editingQuestionsIsland.group_name && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hidden md:inline shrink-0">
                    {editingQuestionsIsland.group_name}
                  </span>
                )}
              </div>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              {questionsEditStatus && (
                <span className={`px-2.5 py-1 text-xs font-mono rounded-lg border ${
                  questionsEditStatus.type === 'success' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}>
                  {questionsEditStatus.text}
                </span>
              )}
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-lg">
                <span className="text-[10px] text-slate-400 font-mono">出题:</span>
                <select
                  value={generateQuestionsCount}
                  onChange={(e) => setGenerateQuestionsCount(Number(e.target.value))}
                  className="bg-transparent text-purple-300 text-xs font-mono font-bold focus:outline-none cursor-pointer"
                >
                  <option value={3} className="bg-slate-900 text-slate-200">3 题</option>
                  <option value={5} className="bg-slate-900 text-slate-200">5 题 (推荐)</option>
                  <option value={8} className="bg-slate-900 text-slate-200">8 题</option>
                  <option value={10} className="bg-slate-900 text-slate-200">10 题</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleGenerateQuestionsForIsland()}
                disabled={isGeneratingQuestions}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                title="让 AI 自动阅读当前故事并生成中英阅读理解问答"
              >
                <span>🤖</span>
                <span>{isGeneratingQuestions ? 'AI 出题中...' : 'AI 智能出题'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveQuestionsForIsland}
                disabled={isSavingQuestions}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 font-mono active:scale-95"
              >
                <span>💾</span>
                <span>{isSavingQuestions ? 'SAVING...' : '保存问答 (SAVE)'}</span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Split Studio */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* Left Column: 📖 Story Passage Reference Panel (4 cols) */}
            <div className="lg:col-span-4 bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-3 shadow-xl flex flex-col gap-2 h-[calc(100vh-140px)] min-h-[400px]">
              <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📖</span>
                  <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                    故事参考正文 (STORY TEXT)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {Array.isArray(editingQuestionsIsland.story_passage_json) ? `${editingQuestionsIsland.story_passage_json.length} 句` : ''}
                </span>
              </div>

              {/* Scrollable Story Passage Text */}
              <div className="flex-1 overflow-y-auto text-xs font-mono text-slate-300 leading-relaxed pr-1 whitespace-pre-wrap divide-y divide-slate-800/60">
                {(() => {
                  if (
                    editingQuestionsIsland.story_passage_json &&
                    Array.isArray(editingQuestionsIsland.story_passage_json) &&
                    editingQuestionsIsland.story_passage_json.length > 0
                  ) {
                    return editingQuestionsIsland.story_passage_json.map((s: any, idx: number) => (
                      <div key={idx} className="py-1.5 first:pt-0 last:pb-0">
                        <span className="text-cyan-400 font-bold mr-1.5">#{idx + 1}</span>
                        <span className="text-slate-200">{s.sentence_text || s.en || ''}</span>
                        {(s.translation || s.zh) && (
                          <p className="text-slate-400 text-[11px] font-sans pl-5 mt-0.5">
                            {s.translation || s.zh}
                          </p>
                        )}
                      </div>
                    ));
                  }
                  return (
                    <div className="p-2 text-slate-400">
                      {editingQuestionsIsland.story_passage || <span className="text-slate-500 italic">暂无故事正文文本</span>}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2 border-t border-[#1F2D4A] text-[10px] text-slate-500 font-mono flex items-center gap-1">
                <span>💡</span> <span>AI 出题与学员测试将基于以上正文</span>
              </div>
            </div>

            {/* Right Column: 🧩 Questions List Panel (8 cols) */}
            <div className="lg:col-span-8 bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-3 shadow-xl flex flex-col gap-2 h-[calc(100vh-140px)] min-h-[400px]">
              <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                    阅读理解问答列表 ({editingQuestionsList.length} 题)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    · 用于 Stage 3 挑战测试
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addEditingQuestion}
                  className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <span>➕</span> <span>添加问题</span>
                </button>
              </div>

              {/* Questions Scrollable List */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                {editingQuestionsList.length === 0 ? (
                  <div className="py-12 px-4 text-center border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2.5 my-auto">
                    <div className="text-2xl">🧩</div>
                    <p className="text-xs font-mono text-slate-400">
                      当前故事关卡暂无阅读理解问答
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => handleGenerateQuestionsForIsland()}
                        disabled={isGeneratingQuestions}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>🤖</span> <span>一键 AI 生成</span>
                      </button>
                      <button
                        type="button"
                        onClick={addEditingQuestion}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        <span>➕</span> <span>手动添加</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  editingQuestionsList.map((item, index) => (
                    <div
                      key={index}
                      className="bg-[#0B101B] border border-[#1F2D4A] hover:border-purple-500/40 rounded-lg p-2.5 flex flex-col gap-2 transition-colors"
                    >
                      {/* Top Row: Q# Badge + Question Input + Delete */}
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                          Q{index + 1}
                        </span>
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) => updateEditingQuestion(index, 'question', e.target.value)}
                          placeholder="英文问题 (Question) *，例如: Why did the little bird leave its nest?"
                          className="flex-1 bg-[#131B2E] border border-[#1F2D4A] focus:border-purple-400 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditingQuestion(index)}
                          className="text-slate-500 hover:text-rose-400 p-1 text-xs transition-colors cursor-pointer shrink-0"
                          title="删除此题"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Bottom Row: Hint & Answer in 2 columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-8">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">提示:</span>
                          <input
                            type="text"
                            value={item.hint || ''}
                            onChange={(e) => updateEditingQuestion(index, 'hint', e.target.value)}
                            placeholder="中文引导提示 (选填)..."
                            className="w-full bg-[#131B2E] border border-[#1F2D4A] focus:border-purple-400 rounded-md px-2 py-0.5 text-xs text-slate-300 font-sans"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">答案:</span>
                          <input
                            type="text"
                            value={item.answer || ''}
                            onChange={(e) => updateEditingQuestion(index, 'answer', e.target.value)}
                            placeholder="参考标准答案 (Answer) *..."
                            className="w-full bg-[#131B2E] border border-[#1F2D4A] focus:border-purple-400 rounded-md px-2 py-0.5 text-xs text-cyan-300 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: 📚 Story Library (故事关卡库管理列表) */}
      {activeTab === 'stories' && !isEditingStory && !isEditingWords && !isEditingQuestions && (
        <div className="flex flex-col gap-3 animate-fade-in">
          {/* Single-Row Compact Toolbar: Title + Category Select + Search + Action Buttons */}
          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl px-4 py-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
            {/* Left: Title + Category Dropdown + Manage Groups + Search */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0 mr-1">
                <span className="text-base">📚</span>
                <h3 className="text-sm font-black text-cyan-400 font-mono tracking-wide">
                  故事关卡库
                </h3>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                  {islands.length}篇
                </span>
              </div>

              {/* Category Select Dropdown */}
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={selectedSectorGroupTab}
                  onChange={(e) => setSelectedSectorGroupTab(e.target.value)}
                  className="bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-cyan-200 outline-none cursor-pointer transition-all"
                  title="按分类筛选故事"
                >
                  <option value="ALL">📁 全部分类 ({islands.length})</option>
                  {storyGroups.map((grp) => {
                    const grpCount = islands.filter(i => {
                      let g = (i.group_name && i.group_name.trim()) || 'General';
                      const upper = g.toUpperCase();
                      if (upper === 'ALL' || upper === '__ALL__') g = 'General';
                      return g === grp.name;
                    }).length;
                    return (
                      <option key={grp.id} value={grp.name}>
                        📁 {grp.name} ({grpCount})
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => { setActiveTab('groups'); setGroupStatus(null); fetchStoryGroups(); }}
                  className="px-2 py-1.5 text-xs rounded-lg font-mono text-cyan-400 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/40 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  title="管理所有故事分组"
                >
                  <span>⚙️</span> <span>分组</span>
                </button>
              </div>

              {/* Search Bar (same row) */}
              <div className="relative w-48 sm:w-60 shrink-0">
                <input
                  type="text"
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  placeholder="🔍 搜索标题..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg pl-3 pr-7 py-1.5 text-xs font-mono text-cyan-200 placeholder-slate-500 outline-none transition-all"
                />
                {storySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStorySearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Right: Compact Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEditingStory(false);
                  setEditingWordsTitle(null);
                  setEditingWordsCategory(null);
                  setEditingWordsBookId(null);
                  setIsEditingWords(true);
                }}
                className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 font-mono active:scale-95"
                title="管理所有独立词单、通用分类词库与生词批量导入"
              >
                <span>📖</span> <span>独立词库</span>
              </button>
              <button
                type="button"
                onClick={handleOpenNewStory}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 font-mono active:scale-95"
              >
                <span>➕</span> <span>新建故事</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('ai_import'); setUploadStatus(null); }}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 font-mono active:scale-95"
              >
                <span>🤖</span> <span>AI导入</span>
              </button>
            </div>
          </div>

          {storyListStatus && (
            <div className={`px-3 py-2 rounded-lg text-xs font-mono border flex items-center justify-between shadow-sm ${
              storyListStatus.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <span>{storyListStatus.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{storyListStatus.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStoryListStatus(null)}
                className="opacity-60 hover:opacity-100 font-bold px-2 py-0.5 rounded cursor-pointer transition-opacity"
                title="Close"
              >
                ✕
              </button>
            </div>
          )}

          {/* Story Cards Grid */}
          <SuspenseState isLoading={loadingIslands}>
            {(() => {
              const filteredIslands = islands.filter((sector) => {
                const matchesGroup = selectedSectorGroupTab === 'ALL' || (sector.group_name || 'General') === selectedSectorGroupTab;
                const matchesSearch = !storySearchQuery.trim() ||
                  sector.name.toLowerCase().includes(storySearchQuery.toLowerCase()) ||
                  (sector.story_title && sector.story_title.toLowerCase().includes(storySearchQuery.toLowerCase())) ||
                  (sector.group_name && sector.group_name.toLowerCase().includes(storySearchQuery.toLowerCase()));
                return matchesGroup && matchesSearch;
              });

              if (filteredIslands.length === 0) {
                return (
                  <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-12 text-center flex flex-col items-center gap-4">
                    <div className="text-4xl">🏝️</div>
                    <h4 className="text-sm font-bold text-slate-300 font-mono">未找到匹配的故事关卡</h4>
                    <p className="text-xs text-slate-500 font-mono max-w-sm">
                      当前分组或搜索条件下暂无故事。您可以尝试切换分组，或者点击上方按钮创建新故事。
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenNewStory}
                      className="mt-2 px-4 py-2 bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      ➕ 立即创建新故事
                    </button>
                  </div>
                );
              }

              return (
                <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-[#1F2D4A] text-slate-400 text-[11px] tracking-wider">
                          <th className="py-2.5 px-2.5 font-bold w-14">ID</th>
                          <th className="py-2.5 px-2.5 font-bold w-28">分组</th>
                          <th className="py-2.5 px-2.5 font-bold w-40">标题</th>
                          <th className="py-2.5 px-2.5 font-bold text-center w-44">内容统计</th>
                          <th className="py-2.5 px-2.5 font-bold w-32">学员权限</th>
                          <th className="py-2.5 px-2.5 font-bold text-right w-64">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F2D4A]/80">
                        {filteredIslands.map((sector) => {
                          const assignedUsers = usersList.filter((u) => (sector.assigned_user_ids || []).includes(u.id));
                          const sentencesCount = (sector.story_passage_json || []).length;
                          const wordsCount = (sector.words || []).length;
                          const questionsCount = (sector.story_questions || []).length;
                          const illustrationsCount = new Set(
                            (sector.story_passage_json || [])
                              .filter((p) => p.illustration_url)
                              .map((p) => p.illustration_url)
                          ).size;
                          const displayTitle = sector.story_title || sector.name;

                          return (
                            <tr
                              key={sector.id}
                              className="hover:bg-cyan-950/15 transition-colors group"
                            >
                              {/* ID */}
                              <td className="py-2.5 px-2.5 text-slate-500 font-mono whitespace-nowrap">
                                #{sector.id}
                              </td>

                              {/* Group */}
                              <td className="py-2.5 px-2.5 whitespace-nowrap truncate">
                                <span
                                  className="text-[11px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded inline-block max-w-full truncate"
                                  title={sector.group_name || 'General'}
                                >
                                  {sector.group_name || 'General'}
                                </span>
                              </td>

                              {/* Title */}
                              <td className="py-2.5 px-2.5 truncate" title={displayTitle}>
                                <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                                  {displayTitle}
                                </span>
                              </td>

                              {/* Stats */}
                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 justify-center">
                                  <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded" title="句子数量">
                                    {sentencesCount}句
                                  </span>
                                  <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded" title="单词数量">
                                    {wordsCount}词
                                  </span>
                                  <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded" title="阅读理解问答数量">
                                    {questionsCount}问
                                  </span>
                                  {illustrationsCount > 0 && (
                                    <span className="text-[10px] font-mono bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 px-1.5 py-0.5 rounded" title="插图数量">
                                      {illustrationsCount}图
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Assigned Users */}
                              <td className="py-2.5 px-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {assignedUsers.length === 0 ? (
                                    <span className="text-[10px] font-mono text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                      全体公开
                                    </span>
                                  ) : (
                                    assignedUsers.map((u) => (
                                      <span
                                        key={u.id}
                                        className="text-[10px] font-mono bg-[#0B0F19] border border-slate-800 px-1.5 py-0.5 rounded text-cyan-300 inline-flex items-center gap-0.5"
                                      >
                                        <span>{u.avatar || '👤'}</span>
                                        <span>{u.username}</span>
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStory(sector)}
                                    className="px-2 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 rounded text-[11px] font-mono font-bold transition-all cursor-pointer"
                                    title="编辑故事文本与句子"
                                  >
                                    故事
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditWords(sector)}
                                    className="px-2 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 rounded text-[11px] font-mono font-bold transition-all cursor-pointer"
                                    title="编辑当前故事的生词库"
                                  >
                                    单词
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditQuestions(sector)}
                                    className="px-2 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-purple-200 rounded text-[11px] font-mono font-bold transition-all cursor-pointer"
                                    title="编辑阅读理解问答"
                                  >
                                    问答
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenAiGenStoryModal(sector)}
                                    className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 rounded text-[11px] font-mono font-bold transition-all cursor-pointer"
                                    title="根据本关卡生词一键由 AI 生成故事绘本"
                                  >
                                    AI绘本
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAccessModalIsland(sector);
                                      setAccessModalUserIds(sector.assigned_user_ids || []);
                                    }}
                                    className="px-1.5 py-1 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 rounded text-[11px] font-mono transition-all cursor-pointer"
                                    title="修改学员分配权限"
                                  >
                                    👥
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteIsland(sector)}
                                    className="px-1.5 py-1 bg-rose-950/40 hover:bg-rose-950 border border-rose-500/30 hover:border-rose-500 text-rose-400 rounded text-[11px] font-mono transition-all cursor-pointer"
                                    title="删除故事关卡"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </SuspenseState>
        </div>
      )}

      {/* View 3: 🤖 AI Story Synthesis & Import Studio (AI 绘本导入工作室) */}
      {activeTab === 'ai_import' && !isEditingStory && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <FormBoundary>
            <div className="relative bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-4 sm:p-5 shadow-xl">
              <SuspenseState isLoading={isSavingAI} fallback={
                <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md rounded-none z-[100] flex items-center justify-center p-4 text-center">
                  <div className="max-w-md w-full theme-card border theme-border rounded-2xl p-6 shadow-2xl shadow-cyan-500/20 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
                    <h3 className="text-base font-bold theme-text font-mono">🤖 COMPILING AI STORY ADVENTURE...</h3>
                    <p className="text-xs theme-text-muted font-mono">Gemini AI is performing multimodal analysis on uploaded pages</p>
                    <div className="w-full text-left bg-black/20 dark:bg-white/5 border theme-border rounded-xl p-4 text-2xs font-mono space-y-2.5 mt-1">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <span>📸</span> <span>Extracting printed text patterns (Multimodal OCR)</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <span>✍️</span> <span>Translating & polishing bilingual passages</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <span>📝</span> <span>Extracting core lexical units & compiled vocabularies</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <span>🧩</span> <span>Generating comprehension questionnaires</span>
                      </div>
                    </div>
                    <p className="text-2xs theme-text-muted font-mono">⏳ Compilation takes 15-30 seconds. Please do not refresh page or interrupt connection.</p>
                  </div>
                </div>
              }>
                {/* Single-Row Compact Header + Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2D4A] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <h3 className="text-sm font-black text-cyan-400 font-mono tracking-wide">
                      AI 绘本智能导入
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAiImportMode('new')}
                        className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                          aiImportMode === 'new'
                            ? 'bg-cyan-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🆕 创建新故事
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiImportMode('append')}
                        className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          aiImportMode === 'append'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>➕ 追加到当前故事</span>
                        {storyPassageJson.length > 0 && (
                          <span className="bg-purple-950 text-purple-200 border border-purple-400/30 text-[10px] px-1.5 rounded-full font-normal">
                            已有{Math.max(0, ...storyPassageJson.map((p: any) => p.paragraph_num || 1))}页
                          </span>
                        )}
                      </button>
                    </div>

                    {(storyPassageJson.length > 0 || storyTitle || newIslandName) && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingStory(true);
                          setActiveTab('stories');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>📖</span>
                        <span>返回故事编辑器 ({storyTitle || newIslandName || '当前故事'})</span>
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={importAiIsland} className="flex flex-col gap-3.5">
                  {aiImportMode === 'append' && (
                    <div className="px-3.5 py-2 bg-purple-950/40 border border-purple-500/40 rounded-lg flex items-center justify-between gap-2 text-xs font-mono text-purple-200">
                      <span>
                        🔄 追加模式：目标故事《<strong>{storyTitle || newIslandName || '当前故事'}</strong>》，将从第 <strong className="text-amber-300">{(storyPassageJson.length > 0 ? Math.max(0, ...storyPassageJson.map((p: any) => p.paragraph_num || 1)) : 0) + 1}</strong> 页起顺延合并。
                      </span>
                    </div>
                  )}

                  {/* Row 1: 5-Column Compact Config Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    {/* 1. Sector Name (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col gap-1">
                      <label htmlFor="input-ai-island-name" className="text-[11px] text-slate-400 font-mono font-bold">
                        故事名称 (选填，默认AI提取)
                      </label>
                      <input
                        type="text"
                        id="input-ai-island-name"
                        value={aiIslandName}
                        onChange={(e) => setAiIslandName(e.target.value)}
                        placeholder="留空则由 AI 自动识别标题"
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* 2. Story Group Name (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col gap-1">
                      <label htmlFor="input-ai-group-name" className="text-[11px] text-slate-400 font-mono font-bold">
                        📁 所属分组 *
                      </label>
                      <input
                        type="text"
                        id="input-ai-group-name"
                        value={aiGroupName}
                        onChange={(e) => setAiGroupName(e.target.value)}
                        placeholder="选择或输入分组..."
                        list="ai-existing-group-names"
                        required
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <datalist id="ai-existing-group-names">
                        {storyGroups.map(g => (
                          <option key={g.id} value={g.name} />
                        ))}
                      </datalist>
                    </div>

                    {/* 3. AGENT CLI (2 cols) */}
                    <div className="lg:col-span-2 flex flex-col gap-1">
                      <label htmlFor="input-ai-cli" className="text-[11px] text-slate-400 font-mono font-bold">
                        ⚡ CLI 引擎
                      </label>
                      <select
                        id="input-ai-cli"
                        value={aiCli}
                        onChange={(e) => {
                          const newCli = e.target.value as 'agy' | 'codex';
                          setAiCli(newCli);
                          fetchAiModels(newCli);
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="agy">Antigravity (agy)</option>
                        <option value="codex">Codex (codex)</option>
                      </select>
                    </div>

                    {/* 4. AI MODEL (2 cols) */}
                    <div className="lg:col-span-2 flex flex-col gap-1">
                      <label htmlFor="input-ai-model" className="text-[11px] text-slate-400 font-mono font-bold flex items-center justify-between">
                        <span>🧠 AI 模型</span>
                        {isLoadingAiModels && <span className="text-[10px] text-cyan-400 animate-pulse">...</span>}
                      </label>
                      <select
                        id="input-ai-model"
                        value={aiModel}
                        disabled={isLoadingAiModels}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer disabled:opacity-60"
                      >
                        {aiModelList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 5. Comprehension Questions Count (2 cols) */}
                    <div className="lg:col-span-2 flex flex-col gap-1">
                      <label htmlFor="input-ai-question-count" className="text-[11px] text-slate-400 font-mono font-bold">
                        🧩 阅读题数 ({aiQuestionCount}题)
                      </label>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 h-[30px]">
                        <input
                          type="range"
                          id="input-ai-question-count"
                          min="1"
                          max="10"
                          value={aiQuestionCount}
                          onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                          className="flex-1 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs font-bold text-cyan-400 font-mono">{aiQuestionCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Scanned Page Images Upload + Prompt Template Accordion */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                    {/* Scanned Page Images Upload (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col gap-1">
                      <label htmlFor="input-ai-story-images" className="text-[11px] text-slate-400 font-mono font-bold">
                        📸 上传绘本扫描图 (按页码顺序多选，最多10张，支持 jpg/png/webp) *
                      </label>
                      <input
                        type="file"
                        id="input-ai-story-images"
                        key={aiFileKey}
                        multiple
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => setAiStoryImages(e.target.files)}
                        required
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono file:bg-[#131B2E] file:border file:border-[#1F2D4A] file:text-cyan-400 file:px-2.5 file:py-0.5 file:rounded file:mr-3 file:text-xs file:font-mono hover:file:bg-[#1A2642] transition-all cursor-pointer"
                      />
                    </div>

                    {/* AI Prompt Customization Compact Bar (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-1">
                      <span className="text-[11px] text-slate-400 font-mono font-bold flex items-center gap-1.5">
                        <span>⚙️ AI 解析提示词模板</span>
                        {aiCustomPrompt.trim() !== savedPromptTemplate.trim() ? (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 rounded font-mono">未保存</span>
                        ) : aiCustomPrompt.trim() !== DEFAULT_AI_PROMPT.trim() ? (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 rounded font-mono">自定义</span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded font-mono">系统预设</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
                        <button
                          type="button"
                          id="btn-toggle-ai-prompt"
                          onClick={() => setShowPromptConfig(!showPromptConfig)}
                          className="text-xs px-2 py-0.5 bg-[#131B2E] border border-[#1F2D4A] text-cyan-400 rounded hover:border-cyan-500/50 transition-all cursor-pointer font-mono"
                        >
                          {showPromptConfig ? '🔼 收起模板' : '🔽 展开编辑'}
                        </button>
                        <button
                          type="button"
                          id="btn-save-ai-prompt"
                          onClick={handleSavePromptTemplate}
                          disabled={isSavingAiPrompt || aiCustomPrompt.trim() === savedPromptTemplate.trim()}
                          className="text-xs px-2 py-0.5 bg-[#131B2E] border border-cyan-500/40 text-cyan-300 rounded hover:border-cyan-400 transition-all cursor-pointer font-mono disabled:opacity-40 disabled:pointer-events-none"
                        >
                          {isSavingAiPrompt ? '保存中...' : '💾 保存'}
                        </button>
                        <button
                          type="button"
                          id="btn-reset-ai-prompt"
                          onClick={handleResetPromptTemplate}
                          disabled={aiCustomPrompt.trim() === DEFAULT_AI_PROMPT.trim()}
                          className="text-xs px-2 py-0.5 bg-[#131B2E] border border-[#1F2D4A] text-slate-400 rounded hover:text-rose-400 transition-all cursor-pointer font-mono disabled:opacity-40 disabled:pointer-events-none"
                        >
                          🔄 预设
                        </button>
                      </div>
                    </div>
                  </div>

                  {promptSaveStatus && (
                    <div className={`text-xs px-3 py-1.5 rounded-lg border font-mono ${
                      promptSaveStatus.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}>
                      {promptSaveStatus.text}
                    </div>
                  )}

                  {showPromptConfig && (
                    <div className="flex flex-col gap-1.5">
                      <textarea
                        id="input-ai-custom-prompt"
                        value={aiCustomPrompt}
                        onChange={(e) => setAiCustomPrompt(e.target.value)}
                        rows={7}
                        className="ai-prompt-textarea w-full bg-[#0D1322] border border-cyan-500/30 focus:border-cyan-400 text-cyan-200 rounded-lg p-2.5 text-xs font-mono leading-relaxed resize-y"
                        placeholder="Enter custom prompt instructions for the AI model..."
                      />
                    </div>
                  )}

                  {renderUserSelectionGroup(aiUserIds, setAiUserIds)}

                  <button 
                    type="submit" 
                    id="btn-submit-ai-island" 
                    className={`w-full py-2.5 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer font-mono ${
                      aiImportMode === 'append'
                        ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 shadow-purple-600/25 hover:from-purple-500 hover:to-cyan-500'
                        : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-600 shadow-cyan-500/25 hover:from-cyan-400 hover:to-pink-500'
                    }`}
                    disabled={isSavingAI}
                  >
                    {isSavingAI 
                      ? 'AI COMPILATION RUNNING...' 
                      : (aiImportMode === 'append'
                          ? `➕ 开始解析并追加至第 ${(storyPassageJson.length > 0 ? Math.max(0, ...storyPassageJson.map((p: any) => p.paragraph_num || 1)) : 0) + 1} 页起`
                          : '🚀 开始 AI 解析并导入新绘本')}
                  </button>
                  {aiStatus && (
                    <p className={`p-2.5 text-xs rounded-lg border font-mono ${
                      aiStatus.type === 'success' 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                    }`} id="ai-island-msg">
                      {aiStatus.text}
                    </p>
                  )}
                </form>
              </SuspenseState>
            </div>
          </FormBoundary>
        </div>
      )}

      {/* View 5: 🎮 Game Settings Tab */}
      {activeTab === 'game_settings' && !isEditingStory && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <FormBoundary>
            <SuspenseState isLoading={isSettingsLoading}>
              <form onSubmit={handleSaveGameSettings} className="space-y-6">
                {/* Status Notice */}
                {settingStatus && (
                  <p className={`p-3.5 text-xs rounded-xl border text-center font-mono font-bold ${
                    settingStatus.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                  }`}>
                    {settingStatus.text}
                  </p>
                )}

                {/* Section 0: Interactive Live Running & Monster Chase Preview Runway */}
                <div className="bg-[#131B2E] border border-cyan-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F2D4A] pb-4 mb-6 gap-3">
                    <div>
                      <h3 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300 uppercase tracking-widest font-mono flex items-center gap-2">
                        <span>🏰</span> 跑酷追逐与侧身奔跑实时预览演练场 (LIVE SPRINT & CHASE RUNWAY)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        测试与验证学员角色（Buddy）破风冲刺、全怪兽（Monster）侧身追逐狂奔动作及跑道贴图效果。
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewIsSprinting(!previewIsSprinting)}
                        className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${
                          previewIsSprinting
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span>{previewIsSprinting ? '🏃 冲刺状态' : '🛑 待机状态'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewIsMonsterWaiting(!previewIsMonsterWaiting)}
                        className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${
                          previewIsMonsterWaiting
                            ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                            : 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                        }`}
                      >
                        <span>{previewIsMonsterWaiting ? '💤 怪兽冷却' : '👾 怪兽狂奔'}</span>
                      </button>

                      <a
                        href="/side-runners-gallery.html"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl font-mono font-bold text-xs border border-amber-500/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span>🎭 8款侧身双腿可跑角色演练台 ➔</span>
                      </a>
                    </div>
                  </div>

                  {/* Interactive Selector Toolbar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Buddy Selector */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                      <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono block mb-2">
                        🏃 伙伴角色 (Buddy):
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {BUDDY_CHARACTERS.map((b) => {
                          const isSelected = normalizeBuddyKey(previewBuddyAvatar) === b.key;
                          return (
                            <button
                              key={b.key}
                              type="button"
                              onClick={() => setPreviewBuddyAvatar(b.key)}
                              className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all text-left truncate flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-sm'
                                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200'
                              }`}
                            >
                              <span>{b.emoji}</span>
                              <span className="truncate">{b.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Monster Selector */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                      <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider font-mono block mb-2">
                        👾 追击怪兽 (Monster):
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {MONSTER_CHARACTERS.map((m) => {
                          const isSelected = normalizeMonsterKey(previewMonsterEmoji) === m.key;
                          return (
                            <button
                              key={m.key}
                              type="button"
                              onClick={() => setPreviewMonsterEmoji(m.key)}
                              className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all text-left truncate flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-purple-500/30 border-purple-400 text-purple-200 shadow-sm'
                                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-purple-500/40 hover:text-slate-200'
                              }`}
                            >
                              <span>{m.emoji}</span>
                              <span className="truncate">{m.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Floor Texture Selector */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                      <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono block mb-2">
                        🧱 跑道地板贴图 (Floor):
                      </label>
                      <select
                        value={previewFloorTexture}
                        onChange={(e) => setPreviewFloorTexture(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="brick-medieval">🧱 中世纪红石砌砖 (默认)</option>
                        <option value="paving-3d">🏰 3D 浮雕灰石板 (Gothic)</option>
                        <option value="checker-palace">♟️ 皇家宫殿黑白石砖 (Palace)</option>
                        <option value="obsidian-magma">🌋 炽热黑曜石熔岩砖 (Magma)</option>
                        <option value="rune-magic">✨ 奥术发光符文石 (Runes)</option>
                        <option value="gold-marble">👑 黄金黑石大理石 (Marble)</option>
                        <option value="cobblestone-round">🪨 粗砂鹅卵石地牢路 (Cobble)</option>
                      </select>
                    </div>

                    {/* Distance Slider */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider font-mono">
                          📏 追击间距:
                        </label>
                        <span className={`text-xs font-mono font-black ${previewDistance <= 3 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
                          {previewDistance} 字符 {previewDistance <= 3 ? '🔥 危险!' : ''}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={previewDistance}
                        onChange={(e) => setPreviewDistance(parseInt(e.target.value, 10) || 1)}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* The Live Castle Runway Stage */}
                  <div className="bg-castle-wall border border-slate-800 rounded-xl p-4 sm:p-6 shadow-2xl relative flex items-center overflow-hidden">
                    {/* Left Stone Pillar */}
                    <CastleSidePillars side="left" />

                    {/* Central Runway Corridor */}
                    <div className="flex-grow mx-3 sm:mx-4 space-y-4 font-mono">
                      {/* Floor Row Container */}
                      <div className="relative group select-none">
                        {/* Sample Prompt Text */}
                        <div className="mb-1.5 flex items-center justify-between text-2xs font-mono px-1">
                          <span className="text-slate-400">
                            1F // 城堡地牢大门 🏰 <span className="text-emerald-400 font-bold ml-2">✓ 实时像素对齐模拟跑道</span>
                          </span>
                          <span className="text-slate-500 tabular-nums">
                            {previewIsMonsterWaiting ? '💤 冷却恢复中...' : `怪兽相距 ${previewDistance} 字符`}
                          </span>
                        </div>

                        {/* Castle Runway Track */}
                        <div className={`castle-stone-runway floor-texture-${previewFloorTexture} h-11 rounded-lg relative flex items-center px-4 overflow-visible shadow-lg transition-all`}>
                          {/* Sample Text Glyphs */}
                          <div className="flex items-center text-sm font-black tracking-wide font-mono z-10 w-full justify-between opacity-80">
                            {'The brave hero rushed forward across the dark castle halls!'.split('').slice(0, 36).map((ch, idx) => (
                              <span
                                key={idx}
                                className={`inline-block text-center w-3 ${
                                  idx < 24 ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'text-slate-500'
                                }`}
                              >
                                {ch === ' ' ? '␣' : ch}
                              </span>
                            ))}
                          </div>

                          {/* Monster Sprite on Runway */}
                          <div
                            className="absolute z-20 top-1/2 -translate-y-1/2 -translate-x-1/2 character-smooth-pos flex items-center pointer-events-none transition-all duration-200"
                            style={{
                              left: `${Math.max(10, Math.min(85, 70 - previewDistance * 3))}%`
                            }}
                          >
                            <MonsterSprite
                              emoji={previewMonsterEmoji}
                              isWaiting={previewIsMonsterWaiting}
                              waitCountdown={3}
                              distanceToBuddy={previewDistance}
                            />
                          </div>

                          {/* Runner Buddy Sprite on Runway */}
                          <div
                            className="absolute z-20 top-1/2 -translate-y-1/2 -translate-x-1/2 character-smooth-pos flex items-center pointer-events-none transition-all duration-200"
                            style={{
                              left: '70%'
                            }}
                          >
                            <RunnerSprite
                              avatar={previewBuddyAvatar}
                              isSprinting={previewIsSprinting}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Stone Pillar */}
                    <CastleSidePillars side="right" />
                  </div>
                </div>

                {/* Section 1: Story Chase Parameters */}
                <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 sm:p-8 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-4 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-2">
                        🏃 STORY CHASE 追击机制与难度参数
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        配置 Story Chase 打字追逐关卡中的怪兽移动速度、惩罚冷却、连续错字锁定及金币结算规则。
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Slow Speed */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>🐢 慢速速度 (Slow)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="10"
                          value={gameSettings.monster_speed_slow}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, monster_speed_slow: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">字符/秒</span>
                      </div>
                    </div>

                    {/* Medium Speed */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>🦊 中速速度 (Medium)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="15"
                          value={gameSettings.monster_speed_medium}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, monster_speed_medium: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">字符/秒</span>
                      </div>
                    </div>

                    {/* Fast Speed */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>⚡ 快速速度 (Fast)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="20"
                          value={gameSettings.monster_speed_fast}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, monster_speed_fast: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-purple-300 font-mono font-bold focus:border-purple-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">字符/秒</span>
                      </div>
                    </div>

                    {/* Retreat Distance */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>🏃 被追上退后距离</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={gameSettings.monster_retreat_distance}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, monster_retreat_distance: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">字符格</span>
                      </div>
                    </div>

                    {/* Wait Seconds */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>⏳ 怪兽等待冷却时间</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={gameSettings.monster_wait_seconds}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, monster_wait_seconds: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">秒</span>
                      </div>
                    </div>

                    {/* Consecutive Error Limit */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>🚫 连续错字锁定阈值</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="3"
                          max="30"
                          value={gameSettings.consecutive_error_limit}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, consecutive_error_limit: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-rose-300 font-mono font-bold focus:border-rose-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">字符</span>
                      </div>
                    </div>

                    {/* Max Lines Per Page */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>📄 单页最大行数 (分页)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="2"
                          max="8"
                          value={gameSettings.max_lines_per_page}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, max_lines_per_page: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">行/页</span>
                      </div>
                    </div>

                    {/* Initial Hearts */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>❤️ 初始生命值 (Hearts)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={gameSettings.initial_hearts}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, initial_hearts: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-rose-300 font-mono font-bold focus:border-rose-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">颗心</span>
                      </div>
                    </div>

                    {/* Completion Reward Coins */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>🪙 通关基础金币奖励</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          value={gameSettings.coins_completion}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, coins_completion: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">Coins</span>
                      </div>
                    </div>

                    {/* Speed Bonus Coins */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>⚡ 快速模式额外加成</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value={gameSettings.coins_speed_bonus}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, coins_speed_bonus: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">Coins</span>
                      </div>
                    </div>

                    {/* Full Hearts Bonus Coins */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>💖 满血无伤通关加成</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value={gameSettings.coins_full_hearts_bonus}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, coins_full_hearts_bonus: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">Coins</span>
                      </div>
                    </div>

                    {/* Word Bank Reading Coins */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>📖 单词看句选义奖励</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value={gameSettings.coins_vocab_reading ?? 10}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, coins_vocab_reading: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">Coins</span>
                      </div>
                    </div>

                    {/* Word Bank Spelling Coins */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5 mb-2">
                        <span>✍️ 单词听音拼写奖励</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value={gameSettings.coins_vocab_spelling ?? 20}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, coins_vocab_spelling: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono shrink-0">Coins</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: 8-Monster Articulated Pool Management */}
                <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 sm:p-8 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F2D4A] pb-4 mb-6 gap-3">
                    <div>
                      <h3 className="text-base font-bold text-purple-400 uppercase tracking-widest font-mono flex items-center gap-2">
                        👾 8 款侧身双腿可跑怪兽池管理 (MONSTER POOL)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        点击卡片即可开启或停用关卡追击怪兽。Story Chase 关卡将从已激活的怪兽池中随机抽取追击怪兽（至少保留 1 只）。
                      </p>
                    </div>
                    <div className="text-xs font-mono font-bold bg-purple-950/70 border border-purple-500/40 text-purple-300 px-3.5 py-1.5 rounded-xl shrink-0">
                      已激活: <span className="text-amber-300 font-black">{gameSettings.monster_emojis.length} / 8</span> 只
                    </div>
                  </div>

                  {/* 8 Monster Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {MONSTER_CHARACTERS.map((char) => {
                      const isActive = gameSettings.monster_emojis.some(
                        (e) => normalizeMonsterKey(e) === char.key
                      );
                      return (
                        <div
                          key={char.key}
                          onClick={() => handleToggleMonsterEmoji(char.key)}
                          className={`relative flex flex-col justify-between rounded-2xl p-4 border-2 transition-all cursor-pointer group select-none ${
                            isActive
                              ? 'bg-purple-950/30 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)] scale-[1.01]'
                              : 'bg-slate-950/60 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                          }`}
                        >
                          {/* Mini Stone Runway with Animated Monster */}
                          <div className="h-24 castle-stone-runway rounded-xl relative flex items-center justify-center mb-3 overflow-hidden shadow-inner border border-red-900/40">
                            <div className="scale-95">
                              <MonsterSprite emoji={char.key} isWaiting={!isActive} />
                            </div>
                          </div>

                          {/* Info */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-black text-slate-100 group-hover:text-purple-300 transition truncate">
                                {char.name}
                              </span>
                              <span className="text-[10px] bg-slate-900 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">
                                {char.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight">
                              {char.desc}
                            </p>
                          </div>

                          {/* Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMonsterEmoji(char.key);
                            }}
                            className={`w-full py-2 px-3 rounded-xl font-mono font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              isActive
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <span>✅ 已激活</span>
                                <span className="text-[10px] opacity-80">(点击停用)</span>
                              </>
                            ) : (
                              <>
                                <span>⚪ 未激活</span>
                                <span className="text-[10px] opacity-80">(点击启用)</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Submit Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1F2D4A]">
                  <button
                    type="button"
                    onClick={handleResetGameSettings}
                    className="px-5 py-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs font-bold transition-all cursor-pointer"
                  >
                    🔄 恢复推荐默认设定
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 text-slate-950 font-mono text-xs font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSettings ? '💾 正在保存中...' : '💾 保存游戏全局设定'}
                  </button>
                </div>
              </form>
            </SuspenseState>
          </FormBoundary>
        </div>
      )}

      {/* View: 🪙 关卡奖励与经验机制独立控制页 */}
      {activeTab === 'rewards' && !isEditingStory && (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
          {/* Header Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F2D4A] pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪙</span>
                <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 font-mono tracking-wider">
                  关卡经验（金币）与奖励机制控制台
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
                集中配置全站所有故事关卡、单词宝库与挑战模式的金币发放参数、防刷复习衰减倍率与战败惩罚结算规则。
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={fetchGameSettings}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔄</span> <span>重新加载</span>
              </button>
            </div>
          </div>

          {settingStatus && (
            <div
              className={`p-4 rounded-xl text-xs font-mono font-bold border transition-all ${
                settingStatus.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {settingStatus.text}
            </div>
          )}

          {/* Form Boundary for Saving Settings */}
          <FormBoundary>
            <SuspenseState isLoading={isSettingsLoading}>
              <form onSubmit={handleSaveGameSettings} className="space-y-8">
                {/* 1. Full Reward Overview & Dynamic Configuration Table */}
                <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 sm:p-8 shadow-xl overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F2D4A] pb-4 mb-6 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-2">
                        📊 全关卡经验（金币）计算规则与实时调控矩阵
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        所有关卡当前生效的结算公式与参数。直接在输入框修改即可实时应用。
                      </p>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-lg shrink-0">
                      全局复习折算率: <span className="font-extrabold text-amber-300">{((gameSettings.coins_review_multiplier ?? 0.2) * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-950/50">
                          <th className="py-3 px-3">关卡 / 模块</th>
                          <th className="py-3 px-3">玩法与代号</th>
                          <th className="py-3 px-3">通关判定条件</th>
                          <th className="py-3 px-3">首通全额奖励 (100%)</th>
                          <th className="py-3 px-3">复习/重玩奖励 (防刷衰减)</th>
                          <th className="py-3 px-3">战败 / 未通过</th>
                          <th className="py-3 px-3 min-w-[150px]">实时可调参数</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {/* Stage 1 */}
                        <tr className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-cyan-300">故事关卡 01</td>
                          <td className="py-3.5 px-3">📖 Reading & Typing<br /><span className="text-[10px] text-slate-500">故事解码与填空</span></td>
                          <td className="py-3.5 px-3 text-slate-400">完成全文填空并提交</td>
                          <td className="py-3.5 px-3 font-bold text-amber-400">+{gameSettings.coins_stage1_reading ?? 100} 🪙</td>
                          <td className="py-3.5 px-3 text-emerald-400">
                            +{Math.round((gameSettings.coins_stage1_reading ?? 100) * (gameSettings.coins_review_multiplier ?? 0.2))} 🪙
                            <span className="text-[10px] text-slate-500 block">({((gameSettings.coins_review_multiplier ?? 0.2) * 100).toFixed(0)}% 衰减)</span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-500 font-mono">0 🪙</td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500">首通:</span>
                              <input
                                type="number"
                                min="0"
                                max="10000"
                                value={gameSettings.coins_stage1_reading ?? 100}
                                onChange={(e) => setGameSettings(prev => ({ ...prev, coins_stage1_reading: parseInt(e.target.value, 10) || 0 }))}
                                className="w-20 bg-[#0B0F19] border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:border-cyan-500 outline-none"
                              />
                            </div>
                          </td>
                        </tr>

                        {/* Stage 2 */}
                        <tr className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-purple-300">故事关卡 02</td>
                          <td className="py-3.5 px-3">🏃💨 Story Chase<br /><span className="text-[10px] text-slate-500">地牢打字追逐</span></td>
                          <td className="py-3.5 px-3 text-slate-400">通过全部页面且生命 &gt; 0</td>
                          <td className="py-3.5 px-3 font-bold text-amber-400">
                            +{(gameSettings.coins_completion || 150)} ~ {(gameSettings.coins_completion || 150) + (gameSettings.coins_speed_bonus || 50) + (gameSettings.coins_full_hearts_bonus || 30)} 🪙
                            <span className="text-[10px] text-slate-500 block">包含极速/满血加成</span>
                          </td>
                          <td className="py-3.5 px-3 text-emerald-400">
                            +{Math.round((gameSettings.coins_completion || 150) * (gameSettings.coins_review_multiplier ?? 0.2))} ~ {Math.round(((gameSettings.coins_completion || 150) + (gameSettings.coins_speed_bonus || 50) + (gameSettings.coins_full_hearts_bonus || 30)) * (gameSettings.coins_review_multiplier ?? 0.2))} 🪙
                            <span className="text-[10px] text-slate-500 block">总收益 × 衰减率</span>
                          </td>
                          <td className="py-3.5 px-3 text-rose-400 font-mono">0 🪙<span className="text-[10px] text-slate-500 block">扣光爱心 Game Over</span></td>
                          <td className="py-3.5 px-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">基础:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="10000"
                                  value={gameSettings.coins_completion}
                                  onChange={(e) => setGameSettings(prev => ({ ...prev, coins_completion: parseInt(e.target.value, 10) || 0 }))}
                                  className="w-20 bg-[#0B0F19] border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:border-cyan-500 outline-none"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Stage 3 */}
                        <tr className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-cyan-300">故事关卡 03</td>
                          <td className="py-3.5 px-3">🔤 Word Matching<br /><span className="text-[10px] text-slate-500">朗读与中英匹配</span></td>
                          <td className="py-3.5 px-3 text-slate-400">句子朗读达标全通</td>
                          <td className="py-3.5 px-3 font-bold text-amber-400">+{gameSettings.coins_stage3_matching ?? 100} 🪙</td>
                          <td className="py-3.5 px-3 text-emerald-400">
                            +{Math.round((gameSettings.coins_stage3_matching ?? 100) * (gameSettings.coins_review_multiplier ?? 0.2))} 🪙
                            <span className="text-[10px] text-slate-500 block">({((gameSettings.coins_review_multiplier ?? 0.2) * 100).toFixed(0)}% 衰减)</span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-500 font-mono">0 🪙</td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500">首通:</span>
                              <input
                                type="number"
                                min="0"
                                max="10000"
                                value={gameSettings.coins_stage3_matching ?? 100}
                                onChange={(e) => setGameSettings(prev => ({ ...prev, coins_stage3_matching: parseInt(e.target.value, 10) || 0 }))}
                                className="w-20 bg-[#0B0F19] border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:border-cyan-500 outline-none"
                              />
                            </div>
                          </td>
                        </tr>

                        {/* Stage 4 */}
                        <tr className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-rose-300">故事关卡 04</td>
                          <td className="py-3.5 px-3">👾 Space Defender<br /><span className="text-[10px] text-slate-500">太空防卫下落打字</span></td>
                          <td className="py-3.5 px-3 text-slate-400">击落全部单词且护盾 &gt; 0（胜利）</td>
                          <td className="py-3.5 px-3 font-bold text-amber-400">
                            得分 × 难度倍率
                            <span className="text-[10px] text-slate-500 block">普:1.0x / 难:1.5x / 狱:2.0x</span>
                          </td>
                          <td className="py-3.5 px-3 text-emerald-400">
                            全额得分 × {((gameSettings.coins_review_multiplier ?? 0.2) * 100).toFixed(0)}%
                            <span className="text-[10px] text-slate-500 block">鼓励金币</span>
                          </td>
                          <td className="py-3.5 px-3 text-rose-400 font-bold">
                            0 🪙
                            <span className="text-[10px] text-rose-300/80 block">【选项 B】战败不发金币</span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                            随得分动态结算<br /><span className="text-emerald-400">战败严格清零</span>
                          </td>
                        </tr>

                        {/* Word Bank Reading */}
                        <tr className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-amber-300">单词宝库 01</td>
                          <td className="py-3.5 px-3">📖 看句选义<br /><span className="text-[10px] text-slate-500">Reading Choice</span></td>
                          <td className="py-3.5 px-3 text-slate-400">选出单词在语境中的正确释义</td>
                          <td className="py-3.5 px-3 font-bold text-amber-400">+{gameSettings.coins_vocab_reading ?? 10} 🪙</td>
                          <td className="py-3.5 px-3 text-emerald-400">
                            +{Math.max(1, Math.round((gameSettings.coins_vocab_reading ?? 10) * (gameSettings.coins_review_multiplier ?? 0.2)))} 🪙
                            <span className="text-[10px] text-slate-500 block">复习巩固奖励</span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-500 font-mono">0 🪙</td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500">首通:</span>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={gameSettings.coins_vocab_reading ?? 10}
                                onChange={(e) => setGameSettings(prev => ({ ...prev, coins_vocab_reading: parseInt(e.target.value, 10) || 0 }))}
                                className="w-20 bg-[#0B0F19] border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:border-cyan-500 outline-none"
                              />
                            </div>
                          </td>
                        </tr>

                        {/* Word Bank Spelling */}
                        <tr className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-amber-300">单词宝库 02</td>
                          <td className="py-3.5 px-3">✍️ 听音拼写<br /><span className="text-[10px] text-slate-500">Audio Spelling</span></td>
                          <td className="py-3.5 px-3 text-slate-400">听发音完整拼写正确单词</td>
                          <td className="py-3.5 px-3 font-bold text-amber-400">+{gameSettings.coins_vocab_spelling ?? 20} 🪙</td>
                          <td className="py-3.5 px-3 text-emerald-400">
                            +{Math.max(1, Math.round((gameSettings.coins_vocab_spelling ?? 20) * (gameSettings.coins_review_multiplier ?? 0.2)))} 🪙
                            <span className="text-[10px] text-slate-500 block">复习巩固奖励</span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-500 font-mono">0 🪙</td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500">首通:</span>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={gameSettings.coins_vocab_spelling ?? 20}
                                onChange={(e) => setGameSettings(prev => ({ ...prev, coins_vocab_spelling: parseInt(e.target.value, 10) || 0 }))}
                                className="w-20 bg-[#0B0F19] border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:border-cyan-500 outline-none"
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Global Anti-Farm & Additional Multipliers Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Anti-Farm Decay Controller */}
                  <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      🛡️ 防刷衰减倍率控制 (ANTI-FARM RATIO)
                    </h3>
                    <p className="text-xs text-slate-400 font-mono leading-relaxed">
                      当学员重复挑战已通关的绘本故事关卡，或重复练习已掌握的单词宝库词汇时，系统将按此比例折算发放鼓励金币。
                    </p>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-300 font-bold">重复通关折算比例:</span>
                        <span className="text-amber-300 font-black text-sm">{((gameSettings.coins_review_multiplier ?? 0.2) * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={gameSettings.coins_review_multiplier ?? 0.2}
                        onChange={(e) => setGameSettings(prev => ({ ...prev, coins_review_multiplier: parseFloat(e.target.value) || 0 }))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>0% (无重复奖励)</span>
                        <span>20% (标准防刷推荐)</span>
                        <span>50% (高奖励)</span>
                        <span>100% (不衰减)</span>
                      </div>
                    </div>
                  </div>

                  {/* Story Chase Bonuses */}
                  <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      ⚡ STORY CHASE 技能额外加成
                    </h3>
                    <p className="text-xs text-slate-400 font-mono leading-relaxed">
                      鼓励学员在高难度极速模式下高速打字，或全程专注保持满血不被怪兽追上。
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                        <label className="text-[11px] font-bold text-slate-300 font-mono block mb-1.5">
                          ⚡ 极速冲刺加成
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={gameSettings.coins_speed_bonus}
                            onChange={(e) => setGameSettings(prev => ({ ...prev, coins_speed_bonus: parseInt(e.target.value, 10) || 0 }))}
                            className="w-full bg-[#0B0F19] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-purple-300 font-bold focus:border-purple-500 outline-none"
                          />
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">🪙</span>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                        <label className="text-[11px] font-bold text-slate-300 font-mono block mb-1.5">
                          💖 满血无伤加成
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={gameSettings.coins_full_hearts_bonus}
                            onChange={(e) => setGameSettings(prev => ({ ...prev, coins_full_hearts_bonus: parseInt(e.target.value, 10) || 0 }))}
                            className="w-full bg-[#0B0F19] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-rose-300 font-bold focus:border-rose-500 outline-none"
                          />
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">🪙</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Security & Anti-Cheat Mechanism Indicators */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-lg">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
                    🔒 系统安全与防刷安全锁机制状态
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-slate-300">
                    <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-xl">
                      <div className="font-bold text-cyan-300 mb-1">✅ 战败清零机制 (选项 B)</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed">
                        太空防卫战基地护盾归零战败时，发放 0 金币，杜绝挂机自杀刷金币漏洞。
                      </div>
                    </div>

                    <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-xl">
                      <div className="font-bold text-cyan-300 mb-1">✅ 单次入账上限阀门</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed">
                        服务端严格校验 `0 &lt;= coins &lt;= 50,000`，杜绝恶意负数扣减与数值溢出伪造。
                      </div>
                    </div>

                    <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-xl">
                      <div className="font-bold text-cyan-300 mb-1">✅ 幂等与离线防重放</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed">
                        PWA 离线同步队列执行单条幂等校验，网络抖动重试不会引发金币重复累加。
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Submit Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1F2D4A]">
                  <button
                    type="button"
                    onClick={fetchGameSettings}
                    className="px-5 py-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs font-bold transition-all cursor-pointer"
                  >
                    🔄 放弃修改并还原
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-cyan-500 text-slate-950 font-mono text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSettings ? '💾 正在保存中...' : '💾 保存所有关卡奖励与经验参数'}
                  </button>
                </div>
              </form>
            </SuspenseState>
          </FormBoundary>
        </div>
      )}

      {/* View 6: 📋 Project Roadmap & Changelog Tab */}
      {activeTab === 'roadmap' && !isEditingStory && (
        <div className="animate-fade-in">
          <ProjectRoadmap onNavigateTab={(tab) => {
            if (tab === 'rewards' || tab === 'game_settings' || tab === 'stories' || tab === 'users') {
              setActiveTab(tab);
              if (tab === 'rewards' || tab === 'game_settings') fetchGameSettings();
              if (tab === 'stories') fetchIslands();
              if (tab === 'users') fetchUsersList();
            }
          }} />
        </div>
      )}
      </main>

      {/* Sector Ownership Access Assignment Modal */}
      {accessModalIsland && (
        <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-6 w-full max-w-lg shadow-2xl shadow-cyan-950/50 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-[#1F2D4A] pb-3 mb-4">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                👥 归属设置 // {accessModalIsland.name}
              </h3>
              <button
                onClick={() => setAccessModalIsland(null)}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 font-mono">
              Select users authorized to access this sector. If no users are selected, access defaults to public (all users).
            </p>

            {renderUserSelectionGroup(
              accessModalUserIds,
              setAccessModalUserIds,
              "Sector Ownership Users"
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAccessModalIsland(null)}
                className="text-xs px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:bg-slate-800 transition-all cursor-pointer font-mono"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isSavingAccess}
                onClick={async () => {
                  setIsSavingAccess(true);
                  try {
                    const res = await fetch(`/api/islands/${accessModalIsland.id}/access`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_ids: accessModalUserIds })
                    });
                    if (res.ok) {
                      setUploadStatus({ type: 'success', text: `Sector access for "${accessModalIsland.name}" updated successfully!` });
                      setAccessModalIsland(null);
                      fetchIslands();
                    } else {
                      const errData = await res.json();
                      setUploadStatus({ type: 'error', text: errData.error || 'Failed to update access permissions' });
                    }
                  } catch (err) {
                    setUploadStatus({ type: 'error', text: 'Network transmission error' });
                  } finally {
                    setIsSavingAccess(false);
                  }
                }}
                className="text-xs px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-lg shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-purple-500 transition-all cursor-pointer disabled:opacity-50 font-mono"
              >
                {isSavingAccess ? 'SAVING...' : 'SAVE ACCESS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Story From Vocab Modal */}
      {isAiGenModalOpen && (
        <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-amber-500/40 rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-amber-950/50 animate-in fade-in zoom-in duration-150 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[#1F2D4A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">✨</span>
                <div>
                  <h3 className="text-base font-bold text-amber-300 font-mono flex items-center gap-2">
                    AI 一键构思与生成绘本故事
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    基于核心生词库，由 AI 自动生成连贯故事情节、中英逐词逐句对照、插图提示词及阅读理解问答
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isAiGenLoading && setIsAiGenModalOpen(false)}
                disabled={isAiGenLoading}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold p-1 cursor-pointer disabled:opacity-30"
              >
                ✕
              </button>
            </div>

            {/* Target Sector Info Badge */}
            {aiGenTargetIsland && (
              <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">🏝️ 目标关卡:</span>
                  <span className="text-slate-200">{aiGenTargetIsland.name}</span>
                  <span className="text-slate-500 text-[10px]">(ID: {aiGenTargetIsland.id})</span>
                </div>
                <span className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 rounded text-[10px]">
                  📁 {aiGenTargetIsland.group_name || 'General'}
                </span>
              </div>
            )}

            {/* Status Alert */}
            {aiGenStatus && (
              <div className={`p-3 rounded-xl text-xs font-mono border ${
                aiGenStatus.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                {aiGenStatus.text}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Words textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 font-mono">
                    🔤 核心目标单词 (Target Vocabulary) *
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    支持逗号、空格或换行分隔
                  </span>
                </div>
                <textarea
                  value={aiGenWords}
                  onChange={(e) => setAiGenWords(e.target.value)}
                  placeholder="e.g. sofa, table, chair, bed, lamp, kitchen..."
                  rows={3}
                  disabled={isAiGenLoading}
                  className="w-full bg-[#0D1322] border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 text-amber-100 placeholder:text-slate-600 rounded-xl p-3 text-xs font-mono outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                    📖 故事标题 / 主题线索 (Title / Seed)
                  </label>
                  <input
                    type="text"
                    value={aiGenTitle}
                    onChange={(e) => setAiGenTitle(e.target.value)}
                    placeholder="如: Barnaby's Cozy Room"
                    disabled={isAiGenLoading}
                    className="w-full bg-[#0D1322] border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                    📁 关卡分类 (Category)
                  </label>
                  <input
                    type="text"
                    value={aiGenCategory}
                    onChange={(e) => setAiGenCategory(e.target.value)}
                    placeholder="如: House and Furniture"
                    disabled={isAiGenLoading}
                    className="w-full bg-[#0D1322] border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all"
                  />
                </div>
              </div>

              {/* Story Theme Style */}
              <div>
                <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                  🎨 故事风格与基调 (Story Style)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'animal_tale', name: '🐱 趣味动物故事', desc: '温馨可爱的小动物' },
                    { id: 'daily_life', name: '🏠 日常生活情境', desc: '家庭、学校与伙伴' },
                    { id: 'adventure', name: '🗺️ 奇幻魔法探险', desc: '探索未知与寻宝' },
                    { id: 'detective', name: '🔍 侦探线索解谜', desc: '寻找失物与推理' },
                    { id: 'humor', name: '🎈 幽默搞笑风趣', desc: '搞怪反转与欢笑' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      disabled={isAiGenLoading}
                      onClick={() => setAiGenThemeStyle(style.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        aiGenThemeStyle === style.id
                          ? 'bg-amber-950/60 border-amber-400 text-amber-200 shadow-md shadow-amber-950/30'
                          : 'bg-[#0D1322] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{style.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pages & Questions Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                    📑 绘本页数 (Pages)
                  </label>
                  <select
                    value={aiGenPageCount}
                    onChange={(e) => setAiGenPageCount(Number(e.target.value))}
                    disabled={isAiGenLoading}
                    className="w-full bg-[#0D1322] border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                  >
                    <option value={3}>3 页 (短小精练)</option>
                    <option value={4}>4 页 (标准推荐)</option>
                    <option value={5}>5 页 (故事丰富)</option>
                    <option value={6}>6 页 (深度阅读)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                    🧩 问答题数 (Questions)
                  </label>
                  <select
                    value={aiGenQuestionCount}
                    onChange={(e) => setAiGenQuestionCount(Number(e.target.value))}
                    disabled={isAiGenLoading}
                    className="w-full bg-[#0D1322] border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                  >
                    <option value={3}>3 道问答题</option>
                    <option value={4}>4 道问答题 (推荐)</option>
                    <option value={5}>5 道问答题</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                    🎯 目标阅读难度 (Level)
                  </label>
                  <select
                    value={aiGenTargetLevel}
                    onChange={(e) => setAiGenTargetLevel(e.target.value)}
                    disabled={isAiGenLoading}
                    className="w-full bg-[#0D1322] border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                  >
                    <option value="RAZ C-E">RAZ C-E (小学低段)</option>
                    <option value="RAZ F-I">RAZ F-I (进阶阅读)</option>
                    <option value="RAZ A-B">RAZ A-B (零基础启蒙)</option>
                  </select>
                </div>
              </div>

              {/* CLI & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                    ⚙️ 执行引擎 (Engine CLI)
                  </label>
                  <select
                    value={aiGenCli}
                    onChange={(e) => {
                      const newCli = e.target.value as 'agy' | 'codex';
                      setAiGenCli(newCli);
                      fetchAiModels(newCli);
                    }}
                    disabled={isAiGenLoading}
                    className="w-full bg-[#0D1322] border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                  >
                    <option value="agy">Antigravity CLI (agy)</option>
                    <option value="codex">Codex CLI (codex)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-mono mb-1.5">
                    🤖 选用模型 (AI Model)
                  </label>
                  <select
                    value={aiGenModel}
                    onChange={(e) => setAiGenModel(e.target.value)}
                    disabled={isAiGenLoading}
                    className="w-full bg-[#0D1322] border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                  >
                    {aiModelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto Save Option */}
              {aiGenTargetIsland && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                    <input
                      type="checkbox"
                      checked={aiGenAutoSave}
                      onChange={(e) => setAiGenAutoSave(e.target.checked)}
                      disabled={isAiGenLoading}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span>直接将生成结果自动保存至该关卡（更新故事正文、逐句对照及阅读理解题）</span>
                  </label>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 border-t border-[#1F2D4A] pt-4">
              <button
                type="button"
                onClick={() => setIsAiGenModalOpen(false)}
                disabled={isAiGenLoading}
                className="text-xs px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl hover:bg-slate-800 transition-all cursor-pointer font-mono disabled:opacity-50"
              >
                取消 (CANCEL)
              </button>
              <button
                type="button"
                onClick={handleExecuteAiGenStory}
                disabled={isAiGenLoading}
                className="text-xs px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 font-mono flex items-center gap-2"
              >
                {isAiGenLoading ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>AI 正在构思创作绘本故事中...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>立即生成绘本故事 (SYNTHESIZE)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        userId={1}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

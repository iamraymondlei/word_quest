import React, { useState, useEffect } from 'react';
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
  }>;
  story_questions: Array<{
    question: string;
    hint: string;
    answer: string;
  }>;
  words: WordItem[];
  unlocked_stage: number;
  assigned_user_ids?: number[];
}

export const DEFAULT_AI_PROMPT = `You are an English education expert specializing in analyzing English picture books for elementary school students.

Your target audience: Chinese elementary school students who can read RAZ (Reading A-Z) Level E books.

TASK:
Analyze the provided picture book page images and return a structured JSON object matching the requested schema.

RULES:
1. **title**: Extract the title of the picture book. If not visible, infer from content.
2. **theme**: Write a concise Chinese summary (2-3 sentences) describing what the story is about and its educational value.
3. **vocabulary**: Extract a comprehensive list of approximately 18-25 core practice vocabulary words (target ~20 words) from the story for typing and spelling practice.
   - Prioritize key narrative words, verbs, adjectives, and nouns suitable for RAZ Level E learning.
   - If the story has fewer than 20 rare words, include all meaningful action verbs, descriptive adjectives, and thematic nouns from the story sentences so the list reaches ~20 words.
   - Ensure all extracted vocabulary words actually appear in the story text.
   - For each word provide:
     - "word": the English word (lowercase)
     - "phonetic": IPA phonetic transcription (e.g. /luːn/)
     - "meaning": clear and accurate Chinese translation
     - "example_sentence": an original sentence from the story containing this word
     - "example_translation": the Chinese translation of the example sentence
4. **pages**: For each image (in order), extract ONLY the core narrative/story text. DO NOT extract exercise questions, quizzes, captions, metadata, or activity questions (such as 'Activity 1', 'Questions:', or book reflection prompts) that are not part of the main story content. Split into individual sentences. For each sentence provide:
   - "en": the original English sentence exactly as written
   - "zh": natural, child-friendly Chinese translation
5. **questions**: Generate exactly {question_count} comprehension questions in English. Each question should:
   - Test understanding of the story (who, what, when, where, why, how)
   - Be appropriate for the target reading level
   - Include a "hint" (a clue to help the student find the answer)
   - Include an "answer" (a complete English sentence)

IMPORTANT:
- Page numbers start from 1 and correspond to the order of images provided.
- Keep translations natural and age-appropriate for children.
- If a page has no story text, still include it with an empty sentences array.
- Strictly ignore page numbers, header/footer titles, or post-reading activity questions when building the "pages" content.`;

interface Props {
  onBack: () => void;
}

export const ParentDashboard: React.FC<Props> = ({ onBack }) => {
  const [words, setWords] = useState<WordItem[]>([]);
  const [islands, setIslands] = useState<Island[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingIslands, setLoadingIslands] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fileKey, setFileKey] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
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
  
  // Error words state
  const [errorWords, setErrorWords] = useState<Array<{
    word: string;
    translation: string;
    error_count: number;
  }>>([]);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [selectedIslandForUpload, setSelectedIslandForUpload] = useState<string>('');
  
  // Story CSV upload states
  const [selectedIslandId, setSelectedIslandId] = useState<string>('');

  // AI Story Import states
  const [isSavingAI, setIsSavingAI] = useState<boolean>(false);
  const [aiIslandName, setAiIslandName] = useState<string>('');
  const [aiGroupName, setAiGroupName] = useState<string>('General');
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(5);
  const [aiStoryImages, setAiStoryImages] = useState<FileList | null>(null);
  const [aiFileKey, setAiFileKey] = useState<number>(0);
  const [aiCli, setAiCli] = useState<'agy' | 'codex'>('agy');
  const [aiModel, setAiModel] = useState<string>('gemini-3.7-flash-high');
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>(DEFAULT_AI_PROMPT);
  const [savedPromptTemplate, setSavedPromptTemplate] = useState<string>(DEFAULT_AI_PROMPT);
  const [isSavingAiPrompt, setIsSavingAiPrompt] = useState<boolean>(false);
  const [promptSaveStatus, setPromptSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPromptConfig, setShowPromptConfig] = useState<boolean>(true);
  const [aiModelList, setAiModelList] = useState<Array<{ id: string; name: string; description?: string }>>([
    { id: 'gemini-3.7-flash-high', name: 'Gemini 3.7 Flash (High)', description: 'High capability, recommended (Default)' },
    { id: 'gemini-3.7-flash-medium', name: 'Gemini 3.7 Flash (Medium)', description: 'Medium reasoning effort' },
    { id: 'gemini-3.7-flash-low', name: 'Gemini 3.7 Flash (Low)', description: 'Fastest low reasoning' },
    { id: 'gemini-3.6-flash-high', name: 'Gemini 3.6 Flash (High)', description: 'High performance' },
    { id: 'gemini-3.6-flash-medium', name: 'Gemini 3.6 Flash (Medium)', description: 'Balanced performance' },
    { id: 'gemini-3.6-flash-low', name: 'Gemini 3.6 Flash (Low)', description: 'Lightweight' },
    { id: 'gemini-3.5-flash-high', name: 'Gemini 3.5 Flash (High)', description: 'Standard fast' },
    { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro (High)', description: 'Strongest capability' },
  ]);
  const [isLoadingAiModels, setIsLoadingAiModels] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab & User & Group Management States
  const [activeTab, setActiveTab] = useState<'users' | 'stories' | 'groups' | 'ai_import' | 'vocabulary' | 'errors' | 'game_settings'>('stories');
  const [isEditingStory, setIsEditingStory] = useState<boolean>(false);
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
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState<string>('🦖');
  const [creatingPlayer, setCreatingPlayer] = useState<boolean>(false);
  const [playerStatus, setPlayerStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenEditStory = (island: Island) => {
    setSelectedIslandId(String(island.id));
    setNewIslandName(island.name);
    setGroupName(island.group_name || 'General');
    setStoryTitle(island.story_title || '');
    setStoryPassage(island.story_passage || '');
    setStoryQuestions(island.story_questions && island.story_questions.length > 0 
      ? island.story_questions 
      : [{ question: '', hint: '', answer: '' }, { question: '', hint: '', answer: '' }]);
    setStoryPassageJson(island.story_passage_json || []);
    setWordsList(island.words || []);
    setManualUserIds(island.assigned_user_ids || []);
    setIsEditingStory(true);
    setUploadStatus(null);
  };

  const handleOpenNewStory = () => {
    setSelectedIslandId('');
    clearIslandFormFields();
    setIsEditingStory(true);
    setUploadStatus(null);
  };

  const handleCloseStoryEditor = () => {
    setIsEditingStory(false);
    clearIslandFormFields();
    setUploadStatus(null);
    fetchIslands();
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
        { id: 'gemini-3.7-flash-high', name: 'Gemini 3.7 Flash (High)', description: 'High capability, recommended (Default)' },
        { id: 'gemini-3.7-flash-medium', name: 'Gemini 3.7 Flash (Medium)', description: 'Medium reasoning effort' },
        { id: 'gemini-3.7-flash-low', name: 'Gemini 3.7 Flash (Low)', description: 'Fastest low reasoning' },
        { id: 'gemini-3.6-flash-high', name: 'Gemini 3.6 Flash (High)', description: 'High performance' },
        { id: 'gemini-3.6-flash-medium', name: 'Gemini 3.6 Flash (Medium)', description: 'Balanced performance' },
        { id: 'gemini-3.6-flash-low', name: 'Gemini 3.6 Flash (Low)', description: 'Lightweight' },
        { id: 'gemini-3.5-flash-high', name: 'Gemini 3.5 Flash (High)', description: 'Standard fast' },
        { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro (High)', description: 'Strongest capability' },
      ];
      setAiModelList(fallbackAgy);
      setAiModel('gemini-3.7-flash-high');
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
        
        // 1. Populate island name and story title, strictly using the user-specified group name
        setNewIslandName(aiIslandName.trim() || extractedTitle);
        setGroupName(aiGroupName.trim() || 'General');
        setStoryTitle(extractedTitle);
        
        // 2. Flatten sentences and join with space for storyPassage
        const sortedPages = [...(aiResult.pages || [])].sort((a: any, b: any) => (a.page || 0) - (b.page || 0));
        const sentencesList = sortedPages.flatMap((page: any) => page.sentences || []);
        const combinedPassage = sentencesList.map((s: any) => s.en).join(' ');
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
              translation: s.zh
            });
          }
        }
        setStoryPassageJson(tempJson);

        // 4. Populate questions
        setStoryQuestions(aiResult.questions && aiResult.questions.length > 0 
          ? aiResult.questions 
          : [{ question: '', hint: '', answer: '' }]);

        // 5. Populate vocabulary words list
        if (aiResult.vocabulary && Array.isArray(aiResult.vocabulary)) {
          const formattedWords = aiResult.vocabulary.map((v: any, index: number) => ({
            id: -1 - index, // temporary negative IDs
            word: v.word || '',
            translation: v.meaning || '',
            sentence: v.example_sentence || '',
            sentence_translation: v.example_translation || ''
          }));
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
        setAiModel(aiCli === 'codex' ? 'gpt-4o' : 'gemini-3.7-flash-high');
        setAiStoryImages(null);
        setAiFileKey((prev) => prev + 1);
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

  const fetchWords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/words');
      const data = await res.json();
      setWords(data);
    } catch (err) {
      console.error('Failed to fetch words', err);
    } finally {
      setLoading(false);
    }
  };

  // Users list state
  const [users, setUsers] = useState<User[]>([]);
  const [manualUserIds, setManualUserIds] = useState<number[]>([]);
  const [aiUserIds, setAiUserIds] = useState<number[]>([]);
  const [csvUserIds, setCsvUserIds] = useState<number[]>([]);

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
    fetchWords();
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

  const fetchErrorWords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/islands/export-errors?user_id=1');
      const data = await res.json();
      setErrorWords(data.csv ? parseErrorCSV(data.csv) : []);
      setAiPrompt(data.prompt || '');
    } catch (err) {
      console.error('Failed to fetch error words', err);
    } finally {
      setLoading(false);
    }
  };

  const parseErrorCSV = (csv: string) => {
    const lines = csv.split('\n');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [word, translation, error_count] = line.split(',');
      if (word && translation && error_count) {
        result.push({
          word: word.replace(/"/g, ''),
          translation: translation.replace(/"/g, ''),
          error_count: parseInt(error_count)
        });
      }
    }
    return result;
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
      setUploadStatus({ type: 'error', text: 'SECTOR ALIAS CANNOT BE BLANK.' });
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

  const uploadWordsToIsland = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIslandForUpload || !file) {
      setUploadStatus({ type: 'error', text: 'SELECT COGNITIVE SECTOR AND TARGET CSV FILE.' });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('island_name', selectedIslandForUpload);

    try {
      const res = await fetch('/api/islands/upload-words', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        if (csvUserIds.length > 0) {
          const targetIsland = islands.find(isl => isl.name === selectedIslandForUpload);
          if (targetIsland) {
            await fetch(`/api/islands/${targetIsland.id}/access`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_ids: csvUserIds })
            });
          }
        }
        setUploadStatus({ type: 'success', text: data.message });
        setFile(null);
        setFileKey(prev => prev + 1);
        setCsvUserIds([]);
        fetchIslands();
      } else {
        setUploadStatus({ type: 'error', text: data.error || 'TRANSMISSION COMPILATION FAILED.' });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: 'TRANSMISSION ERROR. PLEASE RETRY.' });
    } finally {
      setIsUploading(false);
    }
  };

  const updateSentenceTranslation = (
    index: number,
    field: 'paragraph_num' | 'sentence_num' | 'sentence_text' | 'translation',
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

  const updateWordInList = (index: number, field: 'word' | 'translation' | 'sentence' | 'sentence_translation', value: string) => {
    const updated = [...wordsList];
    updated[index][field] = value;
    setWordsList(updated);
  };

  const addWordToList = () => {
    setWordsList([
      ...wordsList,
      {
        id: -1 - wordsList.length,
        word: '',
        translation: '',
        sentence: '',
        sentence_translation: ''
      }
    ]);
  };

  const removeWordFromList = (index: number) => {
    const updated = wordsList.filter((_, i) => i !== index);
    setWordsList(updated);
  };

  const copyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setUploadStatus({ type: 'success', text: 'AI Prompt copied to clipboard!' });
    } catch (err) {
      setUploadStatus({ type: 'error', text: 'Copy failed. Please copy manually.' });
    }
  };

  const addQuestion = () => {
    setStoryQuestions([...storyQuestions, { question: '', hint: '', answer: '' }]);
  };

  const updateQuestion = (index: number, field: 'question' | 'hint' | 'answer', value: string) => {
    const updated = [...storyQuestions];
    updated[index][field] = value;
    setStoryQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setStoryQuestions(storyQuestions.filter((_, i) => i !== index));
  };

  const handleDeleteIsland = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this story sector?')) return;
    try {
      const res = await fetch(`/api/islands/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUploadStatus({ type: 'success', text: 'Sector deleted successfully!' });
        fetchIslands();
      } else {
        const data = await res.json();
        setUploadStatus({ type: 'error', text: data.error || 'Failed to delete sector' });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', text: 'Network transmission error' });
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

          {/* Navigation Items */}
          <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {/* Nav 1: 学员账号 */}
            <button
              type="button"
              onClick={() => { setActiveTab('users'); setIsEditingStory(false); setUploadStatus(null); fetchUsersList(); }}
              className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left ${
                activeTab === 'users' && !isEditingStory
                  ? 'active'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="学员账号 (PLAYER ACCOUNTS)"
            >
              <span className="text-lg shrink-0">👥</span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tracking-wide truncate">学员账号</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Player Profiles ({usersList.length})</div>
                </div>
              )}
            </button>

            {/* Nav 2: 故事关卡库 */}
            <button
              type="button"
              onClick={() => { setActiveTab('stories'); setIsEditingStory(false); setUploadStatus(null); fetchIslands(); }}
              className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left ${
                (activeTab === 'stories' || isEditingStory)
                  ? 'active'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="故事关卡库 (STORY LIBRARY)"
            >
              <span className="text-lg shrink-0">📚</span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tracking-wide truncate">故事关卡库</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Story Library ({islands.length})</div>
                </div>
              )}
            </button>

            {/* Nav 3: 故事分组管理 */}
            <button
              type="button"
              onClick={() => { setActiveTab('groups'); setIsEditingStory(false); setGroupStatus(null); fetchStoryGroups(); }}
              className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left ${
                activeTab === 'groups' && !isEditingStory
                  ? 'active'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="故事分组管理 (STORY GROUPS)"
            >
              <span className="text-lg shrink-0">📁</span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tracking-wide truncate">故事分组管理</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Categories ({storyGroups.length})</div>
                </div>
              )}
            </button>

            {/* Nav 4: AI 绘本导入 */}
            <button
              type="button"
              onClick={() => { setActiveTab('ai_import'); setIsEditingStory(false); setUploadStatus(null); }}
              className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left ${
                activeTab === 'ai_import' && !isEditingStory
                  ? 'active'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="AI 绘本导入 (AI STORY SYNTHESIS)"
            >
              <span className="text-lg shrink-0">🤖</span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tracking-wide truncate">AI 绘本导入</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Multimodal OCR Studio</div>
                </div>
              )}
            </button>

            {/* Nav 5: 词库中心 */}
            <button
              type="button"
              onClick={() => { setActiveTab('vocabulary'); setIsEditingStory(false); setUploadStatus(null); fetchWords(); }}
              className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left ${
                activeTab === 'vocabulary' && !isEditingStory
                  ? 'active'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="词库中心 (VOCABULARY DATABASE)"
            >
              <span className="text-lg shrink-0">📖</span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tracking-wide truncate">词库中心</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Vocabulary ({words.length})</div>
                </div>
              )}
            </button>

            {/* Nav 6: 错题管理 */}
            <button
              type="button"
              onClick={() => { setActiveTab('errors'); setIsEditingStory(false); fetchErrorWords(); setUploadStatus(null); }}
              className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left ${
                activeTab === 'errors' && !isEditingStory
                  ? 'active'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="错题管理 (ERROR LOG MANAGER)"
            >
              <span className="text-lg shrink-0">⚠️</span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tracking-wide truncate">错题管理</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Error Word Logs</div>
                </div>
              )}
            </button>

            {/* Nav 7: 游戏参数设定 */}
            <button
              type="button"
              onClick={() => { setActiveTab('game_settings'); setIsEditingStory(false); setSettingStatus(null); fetchGameSettings(); }}
              className={`admin-nav-item w-full p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer text-left ${
                activeTab === 'game_settings' && !isEditingStory
                  ? 'active'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="游戏设定 (GAME SETTINGS)"
            >
              <span className="text-lg shrink-0">🎮</span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono tracking-wide truncate">游戏参数设定</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">Story Chase & Rules</div>
                </div>
              )}
            </button>
          </nav>
        </div>

        {/* Bottom: Return to Map button */}
        <div className="pt-4 border-t border-[#1F2D4A]/70 mt-4 md:mt-0">
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
        </div>
      </aside>

      {/* Right Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-y-auto">
        {/* Top Header & Stats (when !isEditingStory) */}
        {!isEditingStory && (
          <div className="mb-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b theme-border pb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 font-display flex items-center gap-2">
                  {activeTab === 'users' && '👥 学员账号管理 (PLAYER ACCOUNTS)'}
                  {activeTab === 'stories' && '📚 故事关卡库 (STORY & SECTOR LIBRARY)'}
                  {activeTab === 'groups' && '📁 故事分组管理 (STORY GROUPS DIRECTORY)'}
                  {activeTab === 'ai_import' && '🤖 AI 智能绘本导入工作室 (AI SYNTHESIS STUDIO)'}
                  {activeTab === 'vocabulary' && '📖 词库数据库管理 (VOCABULARY DATABASE)'}
                  {activeTab === 'errors' && '⚠️ 高频错题与提示词管理 (ERROR LOG MANAGER)'}
                  {activeTab === 'game_settings' && '🎮 游戏玩法与难度参数配置 (GAME SETTINGS)'}
                </h1>
                <p className="text-2xs text-slate-400 font-mono mt-1">
                  {activeTab === 'users' && '创建与管理学生档案，分配阅读关卡与追踪单词进度'}
                  {activeTab === 'stories' && '管理全站英语故事关卡，支持独立多功能故事编辑器'}
                  {activeTab === 'groups' && '管理故事所属分类与关卡分组，支持增删改查及故事自动归并'}
                  {activeTab === 'ai_import' && '通过 Agent CLI 与多模态大模型一键提取绘本中英文与问答'}
                  {activeTab === 'vocabulary' && '查看核心单词表，支持通过 CSV 批量导入词库'}
                  {activeTab === 'errors' && '导出学生高频练习错词，生成个性化复习故事 Prompt'}
                  {activeTab === 'game_settings' && '调整 Story Chase 打字追逐游戏的怪兽移动速度、退后距离、等待冷却时间及可用怪兽 Emoji 池'}
                </p>
              </div>
            </div>

            {/* Dark Glass Metric Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="theme-card border theme-border rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                <span className="text-xs font-mono uppercase tracking-wider theme-text-muted mb-1">Total Stories</span>
                <span className="theme-text font-display text-2xl font-black">{islands.length}</span>
              </div>
              <div className="theme-card border theme-border rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                <span className="text-xs font-mono uppercase tracking-wider theme-text-muted mb-1">Word Count</span>
                <span className="text-cyan-400 font-display text-2xl font-black">{words.length}</span>
              </div>
              <div className="theme-card border theme-border rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                <span className="text-xs font-mono uppercase tracking-wider theme-text-muted mb-1">Registered Students</span>
                <span className="text-emerald-400 font-display text-2xl font-black">{usersList.length}</span>
              </div>
              <div className="theme-card border theme-border rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                <span className="text-xs font-mono uppercase tracking-wider theme-text-muted mb-1">Study Hours</span>
                <span className="text-purple-400 font-display text-2xl font-black">24.5h</span>
              </div>
            </div>
          </div>
        )}

      {/* View 0: 👥 Player & User Accounts Management */}
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
                  return (
                    <div key={u.id} className="theme-card border theme-border rounded-lg p-4 flex items-center justify-between hover:border-cyan-500/40 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-tr from-cyan-950/80 to-blue-900/80 border border-cyan-500/40 text-lg text-white font-bold shrink-0 overflow-hidden shadow-sm">
                          <RunnerSprite avatar={u.avatar} isSprinting={false} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold theme-text font-mono truncate">{u.username}</div>
                          <div className="text-2xs text-cyan-400 font-mono">Coins: {u.coins || 0} 🪙</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePlayer(u)}
                        className="px-2.5 py-1 text-2xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 rounded transition-all cursor-pointer font-mono"
                        title="Delete student profile"
                      >
                        Delete 🗑️
                      </button>
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
        <div className="space-y-8 animate-fade-in">
          {/* Create Group Form Card */}
          <div className="theme-card border theme-border rounded-xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-cyan-400 font-mono mb-2 flex items-center gap-2">
              ➕ Create New Story Group (新建故事分组)
            </h3>
            <p className="text-xs theme-text-muted font-mono mb-6">
              Create modular story categories (e.g., Level A, Fairy Tales, Science & Nature) to organize your reading curriculum.
            </p>

            {groupStatus && (
              <div className={`p-3 rounded-lg text-xs font-mono mb-6 border ${
                groupStatus.type === 'success' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                {groupStatus.text}
              </div>
            )}

            <FormBoundary>
              <form onSubmit={handleCreateStoryGroup} className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <input
                  type="text"
                  value={newGroupNameInput}
                  onChange={(e) => setNewGroupNameInput(e.target.value)}
                  placeholder="Enter group name (e.g. Science & Nature)..."
                  className="flex-1 bg-[#0D1322] border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-cyan-100 placeholder:text-slate-500 rounded-lg px-4 py-2.5 text-sm font-mono outline-none transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs uppercase rounded-lg shadow-md shadow-cyan-500/30 hover:scale-105 transition-all cursor-pointer shrink-0"
                >
                  Create Group (创建分组)
                </button>
              </form>
            </FormBoundary>
          </div>

          {/* Group List & Stats Table Card */}
          <div className="theme-card border theme-border rounded-xl p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold theme-text font-mono flex items-center gap-2">
                  📁 Story Groups Directory ({storyGroups.length})
                </h3>
                <p className="text-xs theme-text-muted font-mono mt-1">
                  Manage categories, rename groups or delete unused groups.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchStoryGroups}
                className="text-xs px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 rounded-lg font-mono transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🔄</span> <span>REFRESH</span>
              </button>
            </div>

            <SuspenseState isLoading={isGroupLoading}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b theme-border text-slate-400 uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4 font-bold">分组名称 (GROUP NAME)</th>
                      <th className="py-3 px-4 font-bold text-center">故事数量 (STORIES)</th>
                      <th className="py-3 px-4 font-bold text-center">类型 (TYPE)</th>
                      <th className="py-3 px-4 font-bold text-right">操作 (ACTIONS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-divide">
                    {storyGroups.map((grp) => {
                      const isDefault = grp.name === 'General';
                      const isEditing = editingGroupId === grp.id;

                      return (
                        <tr key={grp.id} className="hover:bg-cyan-950/20 transition-colors">
                          {/* Name / Inline Edit */}
                          <td className="py-3.5 px-4 font-medium theme-text">
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
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">📁</span>
                                <span className="font-bold text-slate-100">{grp.name}</span>
                              </div>
                            )}
                          </td>

                          {/* Story count */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                              {grp.story_count} 篇
                            </span>
                          </td>

                          {/* Group type */}
                          <td className="py-3.5 px-4 text-center">
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
                          <td className="py-3.5 px-4 text-right">
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

      {/* View 2: ✏️ Dedicated Story Editor (独立全屏故事编辑器工作台) */}
      {isEditingStory && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Sticky Action Bar */}
          <div className="story-editor-sticky-bar bg-[#0F172A]/90 border border-cyan-500/30 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCloseStoryEditor}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <span>◀</span> <span>返回故事库 (BACK)</span>
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest font-mono text-cyan-400 font-bold">
                  {selectedIslandId ? `EDITING STORY SECTOR // ID: ${selectedIslandId}` : 'CREATING NEW STORY SECTOR'}
                </span>
                <h2 className="text-base sm:text-lg font-bold theme-text font-mono truncate max-w-md">
                  {storyTitle || newIslandName || '未命名故事 (Untitled Story)'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {uploadStatus && (
                <span className={`px-3 py-1 text-xs font-mono rounded-lg border ${
                  uploadStatus.type === 'success' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}>
                  {uploadStatus.text}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById('story-editor-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                disabled={isSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 font-mono active:scale-95"
              >
                <span>💾</span> <span>{isSaving ? 'SAVING...' : (selectedIslandId ? 'COMMIT SECTOR CONFIG (保存更改)' : 'INITIALIZE SECTOR (创建故事)')}</span>
              </button>
            </div>
          </div>

          {/* Story Editor Main Form */}
          <FormBoundary>
            <form id="story-editor-form" onSubmit={createNewIsland} className="flex flex-col gap-6">
              {/* Section 1: 📌 基础配置与学员权限 */}
              <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center gap-2 border-b border-[#1F2D4A] pb-3">
                  <span className="text-xl">📌</span>
                  <h3 className="text-base font-bold text-slate-100 uppercase tracking-widest font-mono">
                    基础信息与学员权限 (Basic Information & Permissions)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
                      Sector Name (关卡/岛屿名称) *
                    </label>
                    <input
                      type="text"
                      value={newIslandName}
                      onChange={(e) => setNewIslandName(e.target.value)}
                      placeholder="e.g. Magic Forest"
                      required
                      className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
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
                      className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                    <datalist id="existing-group-names">
                      {storyGroups.map(g => (
                        <option key={g.id} value={g.name} />
                      ))}
                    </datalist>

                    {/* Quick group selector chips */}
                    {storyGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
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
                {renderUserSelectionGroup(manualUserIds, setManualUserIds)}
              </div>

              {/* Section 2: 📖 故事文本与句子段落对照 */}
              <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center gap-2 border-b border-[#1F2D4A] pb-3">
                  <span className="text-xl">📖</span>
                  <h3 className="text-base font-bold text-slate-100 uppercase tracking-widest font-mono">
                    故事文本与句子级翻译对照 (Story Passage & Sentence Translation)
                  </h3>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
                    Story English Title (故事英文标题) *
                  </label>
                  <input
                    type="text"
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                    placeholder="e.g. The Brave Little Fox"
                    required
                    className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
                      Full Story Text (完整故事文本)
                    </label>
                    <span className="text-3xs text-slate-500 font-mono">
                      修改此框文本会自动切分下方的段落句子表格
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
                    placeholder="Paste or write full story passage here..."
                    rows={5}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-sm text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 leading-relaxed"
                  />
                </div>

                {/* Paragraph & Sentence Breakdown Table */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
                      SENTENCE BREAKDOWN & CHINESE TRANSLATION ({storyPassageJson.length} 句子)
                    </label>
                    <button
                      type="button"
                      onClick={addSentenceSegment}
                      className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 rounded-lg px-3.5 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      ➕ 添加句子 (ADD SENTENCE)
                    </button>
                  </div>
                  <p className="text-3xs text-slate-500 font-mono">
                    Para # 代表所属段落（相同数字归为同一段落）。每句对应 Stage 1 故事阅读与 Stage 3 口语练习。
                  </p>

                  <div className="table-responsive bg-[#0F172A] border border-[#1F2D4A] rounded-xl overflow-hidden shadow-xl">
                    <table className="w-full text-xs text-left font-mono" id="table-story-preview">
                      <thead>
                        <tr className="bg-[#131B2E] border-b border-[#1F2D4A] text-slate-400 font-mono">
                          <th className="p-3 font-semibold uppercase tracking-wider w-[18%]">段落 / 序号</th>
                          <th className="p-3 font-semibold uppercase tracking-wider w-[40%]">英文原句 (ENGLISH)</th>
                          <th className="p-3 font-semibold uppercase tracking-wider w-[34%]">中文翻译 (CHINESE)</th>
                          <th className="p-3 font-semibold uppercase tracking-wider w-[8%] text-center">操作</th>
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
                              <td className="p-3 text-slate-400 font-bold leading-relaxed">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[10px] text-slate-500">Para #</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={item.paragraph_num || 1}
                                    onChange={(e) => updateSentenceTranslation(index, 'paragraph_num', parseInt(e.target.value) || 1)}
                                    className="w-14 bg-slate-900 border border-slate-800 text-cyan-300 text-center font-mono font-bold px-1.5 py-0.5 rounded focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                  />
                                </div>
                                <div className="text-[10px] text-slate-600">Sent #{index + 1}</div>
                              </td>
                              <td className="p-2">
                                <textarea
                                  value={item.sentence_text}
                                  onChange={(e) => updateSentenceTranslation(index, 'sentence_text', e.target.value)}
                                  placeholder="English sentence..."
                                  rows={2}
                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y"
                                />
                              </td>
                              <td className="p-2">
                                <textarea
                                  value={item.translation || ''}
                                  onChange={(e) => updateSentenceTranslation(index, 'translation', e.target.value)}
                                  placeholder="中文释义（用于 Stage 3 口语与阅读释义）..."
                                  rows={2}
                                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-sans focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeSentenceSegment(index)}
                                  className="text-rose-400 hover:text-rose-300 cursor-pointer p-1 text-sm transition-all"
                                  title="删除此句"
                                >
                                  ❌
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

              {/* Section 3: 🧩 阅读理解问答 */}
              <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🧩</span>
                    <h3 className="text-base font-bold text-slate-100 uppercase tracking-widest font-mono">
                      阅读理解问答 (Comprehension Questions)
                    </h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={addQuestion} 
                    className="bg-[#131B2E] border border-[#1F2D4A] text-cyan-400 hover:border-cyan-500/50 hover:bg-[#1A2642] rounded-lg px-3.5 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    ➕ 添加问题 (ADD QUESTION)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {storyQuestions.map((q, index) => (
                    <div key={index} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 relative group">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-cyan-400 font-mono flex items-center gap-1.5">
                          <span>Q{index + 1}</span>
                        </h4>
                        {storyQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="text-rose-400 hover:text-rose-300 text-xs font-bold font-mono cursor-pointer"
                          >
                            删除 ✕
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                        placeholder="Question text (e.g. Where did the fox go?)"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <input
                        type="text"
                        value={q.hint}
                        onChange={(e) => updateQuestion(index, 'hint', e.target.value)}
                        placeholder="Hint / 提示 (Optional)"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <input
                        type="text"
                        value={q.answer}
                        onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                        placeholder="Correct Answer (e.g. He went to the forest.)"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: 🔤 核心练习单词库 */}
              <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔤</span>
                    <h3 className="text-base font-bold text-slate-100 uppercase tracking-widest font-mono">
                      核心练习单词库 (Associated Vocabulary - {wordsList.length} Words)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addWordToList}
                    className="bg-[#131B2E] border border-[#1F2D4A] text-cyan-400 hover:border-cyan-500/50 hover:bg-[#1A2642] rounded-lg px-3.5 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    ➕ 添加单词 (ADD WORD)
                  </button>
                </div>

                <div className="table-responsive bg-[#0F172A] border border-[#1F2D4A] rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-xs text-left font-mono" id="table-vocabulary-edit">
                    <thead>
                      <tr className="bg-[#131B2E] border-b border-[#1F2D4A] text-slate-400 font-mono">
                        <th className="p-3 font-semibold uppercase tracking-wider w-[18%]">英文单词 *</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[22%]">中文释义 *</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[27%]">例句 (CONTEXT)</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[27%]">例句翻译</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[6%] text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wordsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 italic select-none font-mono">
                            暂无关联词汇。可点击【➕ 添加单词】或使用 AI 绘本导入引擎自动提取。
                          </td>
                        </tr>
                      ) : (
                        wordsList.map((w, index) => (
                          <tr key={w.id || index} className="border-b border-[#1F2D4A]/50 hover:bg-[#131B2E]/40 transition-colors">
                            <td className="p-2">
                              <input
                                type="text"
                                value={w.word}
                                placeholder="word"
                                required
                                onChange={(e) => updateWordInList(index, 'word', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={w.translation}
                                placeholder="Meaning"
                                required
                                onChange={(e) => updateWordInList(index, 'translation', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={w.sentence}
                                placeholder="Context sentence"
                                onChange={(e) => updateWordInList(index, 'sentence', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={w.sentence_translation}
                                placeholder="Sentence translation"
                                onChange={(e) => updateWordInList(index, 'sentence_translation', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeWordFromList(index)}
                                className="text-rose-400 hover:text-rose-300 cursor-pointer p-1 text-sm transition-all"
                                title="删除单词"
                              >
                                ❌
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Save Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#131B2E] border border-[#1F2D4A] rounded-2xl shadow-xl">
                <button
                  type="button"
                  onClick={handleCloseStoryEditor}
                  className="px-5 py-2.5 bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
                >
                  ◀ 返回故事关卡库 (CANCEL)
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 font-mono active:scale-95"
                >
                  <span>💾</span> <span>{isSaving ? 'SAVING...' : (selectedIslandId ? 'COMMIT SECTOR CONFIG (保存更改)' : 'INITIALIZE SECTOR (创建故事)')}</span>
                </button>
              </div>
            </form>
          </FormBoundary>
        </div>
      )}

      {/* View 2: 📚 Story Library (故事关卡库管理列表) */}
      {activeTab === 'stories' && !isEditingStory && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Top Story Library Action & Filter Bar */}
          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 shadow-xl flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2D4A] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl">
                  📚
                </div>
                <div>
                  <h3 className="text-base font-bold text-cyan-400 uppercase tracking-widest font-mono">
                    STORY & SECTOR LIBRARY (故事关卡库)
                  </h3>
                  <p className="text-2xs text-slate-400 font-mono">
                    浏览、检索与管理所有英语学习故事，支持独立编辑故事文本、翻译、问答与关联学员。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenNewStory}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5 font-mono active:scale-95"
                >
                  <span>➕</span> <span>手动新建故事</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('ai_import'); setUploadStatus(null); }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5 font-mono active:scale-95"
                >
                  <span>🤖</span> <span>AI 绘本一键导入</span>
                </button>
              </div>
            </div>

            {/* Filter and Search controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Group Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedSectorGroupTab('ALL')}
                  className={`px-3 py-1 text-xs rounded-lg font-mono font-bold transition-all cursor-pointer border ${
                    selectedSectorGroupTab === 'ALL'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm'
                      : 'bg-slate-900 border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ALL ({islands.length})
                </button>
                {storyGroups.map((grp) => {
                  const grpCount = islands.filter(i => {
                    let g = (i.group_name && i.group_name.trim()) || 'General';
                    const upper = g.toUpperCase();
                    if (upper === 'ALL' || upper === '__ALL__') g = 'General';
                    return g === grp.name;
                  }).length;
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setSelectedSectorGroupTab(grp.name)}
                      className={`px-3 py-1 text-xs rounded-lg font-mono font-bold transition-all cursor-pointer border ${
                        selectedSectorGroupTab === grp.name
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm'
                          : 'bg-slate-900 border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      📁 {grp.name} ({grpCount})
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => { setActiveTab('groups'); setGroupStatus(null); fetchStoryGroups(); }}
                  className="px-2.5 py-1 text-xs rounded-lg font-mono text-cyan-400 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/40 transition-all cursor-pointer flex items-center gap-1 ml-1"
                  title="管理所有故事分组"
                >
                  <span>⚙️</span> <span>管理分组</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <input
                  type="text"
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  placeholder="🔍 搜索故事名称 / 标题..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-1.5 text-xs font-mono text-cyan-200 placeholder-slate-500 outline-none transition-all"
                />
                {storySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredIslands.map((sector) => {
                    const assignedUsers = usersList.filter((u) => (sector.assigned_user_ids || []).includes(u.id));
                    const sentencesCount = (sector.story_passage_json || []).length;
                    const wordsCount = (sector.words || []).length;
                    const questionsCount = (sector.story_questions || []).length;

                    return (
                      <div
                        key={sector.id}
                        className="story-grid-card bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl hover:border-cyan-500/40 transition-all group"
                      >
                        <div className="space-y-3">
                          {/* Card Top: Badge, Group & ID */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-sm">
                                🏝️
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-slate-100 font-mono group-hover:text-cyan-300 transition-colors">
                                  {sector.name}
                                </h4>
                                <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded inline-block mt-0.5">
                                  📁 {sector.group_name || 'General'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 bg-[#0B0F19] border border-slate-800 px-2 py-0.5 rounded shrink-0">
                              ID: {sector.id}
                            </span>
                          </div>

                          {/* Story Title */}
                          <div>
                            <div className="text-xs font-bold text-cyan-400 font-mono line-clamp-1 flex items-center gap-1.5">
                              <span>📖</span> <span>{sector.story_title || 'No Story Title'}</span>
                            </div>
                            {sector.story_passage && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 font-sans leading-relaxed">
                                {sector.story_passage}
                              </p>
                            )}
                          </div>

                          {/* Metric Chips */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <span>📝</span> <span>{sentencesCount} 句子</span>
                            </span>
                            <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <span>🔤</span> <span>{wordsCount} 单词</span>
                            </span>
                            <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <span>🧩</span> <span>{questionsCount} 问答</span>
                            </span>
                          </div>

                          {/* Assigned Users Badge */}
                          <div className="pt-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1">
                              学员权限 (ACCESS):
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {assignedUsers.length === 0 ? (
                                <span className="text-[10px] font-mono text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                                  🌐 全体公开 (Public)
                                </span>
                              ) : (
                                assignedUsers.map((u) => (
                                  <span key={u.id} className="text-[10px] font-mono bg-[#0B0F19] border border-slate-800 px-2 py-0.5 rounded text-cyan-300 flex items-center gap-1">
                                    <span>{u.avatar || '👤'}</span>
                                    <span>{u.username}</span>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="flex items-center justify-between border-t border-[#1F2D4A] pt-3 mt-1 gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStory(sector)}
                            className="flex-1 text-xs py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 rounded-lg font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            <span>✏️</span> <span>编辑故事</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAccessModalIsland(sector);
                              setAccessModalUserIds(sector.assigned_user_ids || []);
                            }}
                            className="text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 rounded-lg font-mono transition-all cursor-pointer flex items-center gap-1"
                            title="修改学员分配"
                          >
                            <span>👥</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteIsland(sector.id)}
                            className="text-xs px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950 border border-rose-500/30 hover:border-rose-500 text-rose-400 rounded-lg font-mono transition-all cursor-pointer flex items-center gap-1"
                            title="删除故事关卡"
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </SuspenseState>
        </div>
      )}

      {/* View 3: 🤖 AI Story Synthesis & Import Studio (AI 绘本导入工作室) */}
      {activeTab === 'ai_import' && !isEditingStory && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <FormBoundary>
            <div className="relative bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 sm:p-8 shadow-xl">
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
                <div className="flex items-center gap-3 border-b border-[#1F2D4A] pb-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-cyan-400 uppercase tracking-widest font-mono">
                      AI MULTIMODAL STORY SYNTHESIS ENGINE (AI 智能绘本导入工作室)
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      基于本地 Agent CLI (<span className="text-cyan-300 font-semibold">agy</span> / <span className="text-purple-300 font-semibold">codex</span>) 与多模态大模型。上传故事绘本扫描件，AI 将自动识别图文、生成中英对照句子、提炼核心生词并生成阅读理解题。
                    </p>
                  </div>
                </div>

                <form onSubmit={importAiIsland} className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Sector Name */}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="input-ai-island-name" className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
                        Sector Name (关卡/故事名称)
                      </label>
                      <input
                        type="text"
                        id="input-ai-island-name"
                        value={aiIslandName}
                        onChange={(e) => setAiIslandName(e.target.value)}
                        placeholder="选填（默认使用 AI 识别提取的故事英文标题）"
                        className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    {/* 2. Story Group Name (Explicit Assignment) */}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="input-ai-group-name" className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span>📁</span> Story Group (所属分组) *</span>
                        <span className="text-[10px] text-cyan-400 font-mono font-normal">指定分组（非 AI 识别）</span>
                      </label>
                      <input
                        type="text"
                        id="input-ai-group-name"
                        value={aiGroupName}
                        onChange={(e) => setAiGroupName(e.target.value)}
                        placeholder="e.g. General, RAZ Level E, Animals..."
                        list="ai-existing-group-names"
                        required
                        className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <datalist id="ai-existing-group-names">
                        {storyGroups.map(g => (
                          <option key={g.id} value={g.name} />
                        ))}
                      </datalist>

                      {/* Quick group selector chips */}
                      {storyGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono self-center">快捷选择:</span>
                          {storyGroups.map(g => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setAiGroupName(g.name)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                                aiGroupName === g.name
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

                  {/* Comprehension Questions Count */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="input-ai-question-count" className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">
                      COMPREHENSION QUESTIONS ({aiQuestionCount} items / 阅读理解题数量)
                    </label>
                    <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5">
                      <input
                        type="range"
                        id="input-ai-question-count"
                        min="1"
                        max="10"
                        value={aiQuestionCount}
                        onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                        className="flex-1 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-sm font-bold text-cyan-400 font-mono min-w-8 text-center">{aiQuestionCount} 题</span>
                    </div>
                  </div>
                  
                  {/* Two-level Cascading Selectors: Agent CLI & AI Model */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. AGENT CLI */}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="input-ai-cli" className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                        <span>⚡</span> AGENT CLI ENGINE
                      </label>
                      <select
                        id="input-ai-cli"
                        value={aiCli}
                        onChange={(e) => {
                          const newCli = e.target.value as 'agy' | 'codex';
                          setAiCli(newCli);
                          fetchAiModels(newCli);
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                      >
                        <option value="agy">Google Antigravity (agy)</option>
                        <option value="codex">OpenAI Codex (codex)</option>
                      </select>
                      <p className="text-3xs text-slate-500 font-mono">Select the local Agent CLI runner for multimodal story extraction.</p>
                    </div>

                    {/* 2. AI MODEL */}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="input-ai-model" className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span>🧠</span> AI MODEL ENGINE</span>
                        {isLoadingAiModels && <span className="text-3xs text-cyan-400 animate-pulse font-mono">⏳ Fetching models...</span>}
                      </label>
                      <select
                        id="input-ai-model"
                        value={aiModel}
                        disabled={isLoadingAiModels}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer appearance-none disabled:opacity-60"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                      >
                        {aiModelList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}{m.description && m.description !== m.name ? ` — ${m.description}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-3xs text-slate-500 font-mono">Real-time model options available under the active CLI environment.</p>
                    </div>
                  </div>

                  {/* AI Prompt Customization Section */}
                  <div className="ai-prompt-section flex flex-col gap-2 p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
                    <div className="ai-prompt-header flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <label htmlFor="input-ai-custom-prompt" className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                          <span>⚙️</span> AI 解析提示词模板 (AI PROMPT TEMPLATE)
                        </label>
                        {aiCustomPrompt.trim() !== savedPromptTemplate.trim() ? (
                          <span className="ai-prompt-badge text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-semibold">
                            MODIFIED (有未保存修改)
                          </span>
                        ) : aiCustomPrompt.trim() !== DEFAULT_AI_PROMPT.trim() ? (
                          <span className="ai-prompt-badge text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-semibold">
                            SAVED (已保存自定义模板)
                          </span>
                        ) : (
                          <span className="ai-prompt-badge text-[10px] bg-slate-700/40 text-slate-400 border border-slate-600/40 px-2 py-0.5 rounded font-mono font-semibold">
                            DEFAULT (系统预设)
                          </span>
                        )}
                      </div>
                      <div className="ai-prompt-actions flex items-center flex-wrap gap-2">
                        <button
                          type="button"
                          id="btn-toggle-ai-prompt"
                          onClick={() => setShowPromptConfig(!showPromptConfig)}
                          className="ai-prompt-toggle-btn text-xs px-2.5 py-1 bg-[#131B2E] border border-[#1F2D4A] text-cyan-400 rounded hover:border-cyan-500/50 hover:bg-[#1A2642] transition-all cursor-pointer font-mono"
                        >
                          {showPromptConfig ? '🔼 折叠提示词 / HIDE' : '🔽 展开并编辑提示词 / EDIT'}
                        </button>
                        <button
                          type="button"
                          id="btn-save-ai-prompt"
                          onClick={handleSavePromptTemplate}
                          disabled={isSavingAiPrompt || aiCustomPrompt.trim() === savedPromptTemplate.trim()}
                          className="ai-prompt-save-btn text-xs px-2.5 py-1 bg-[#131B2E] border border-cyan-500/40 text-cyan-300 rounded hover:border-cyan-400 hover:bg-[#1A2642] transition-all cursor-pointer font-mono disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
                        >
                          {isSavingAiPrompt ? '⏳ 保存中...' : '💾 保存为默认模板 / SAVE'}
                        </button>
                        <button
                          type="button"
                          id="btn-reset-ai-prompt"
                          onClick={handleResetPromptTemplate}
                          disabled={aiCustomPrompt.trim() === DEFAULT_AI_PROMPT.trim()}
                          className="ai-prompt-reset-btn text-xs px-2.5 py-1 bg-[#131B2E] border border-[#1F2D4A] text-slate-400 rounded hover:border-rose-500/50 hover:text-rose-400 hover:bg-[#1A2642] transition-all cursor-pointer font-mono disabled:opacity-40 disabled:pointer-events-none"
                        >
                          🔄 恢复系统预设 / RESET
                        </button>
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
                      <div className="flex flex-col gap-2 mt-2">
                        <textarea
                          id="input-ai-custom-prompt"
                          value={aiCustomPrompt}
                          onChange={(e) => setAiCustomPrompt(e.target.value)}
                          rows={11}
                          className="ai-prompt-textarea w-full bg-[#0D1322] border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 text-cyan-200 placeholder:text-slate-600 rounded-lg p-3 text-xs font-mono leading-relaxed resize-y"
                          placeholder="Enter custom prompt instructions for the AI model..."
                        />
                        <p className="text-3xs text-slate-500 font-mono">
                          ℹ️ System uses <code className="text-cyan-400">{`{question_count}`}</code> placeholder to dynamically inject the question count.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Scanned Page Images Upload */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="input-ai-story-images" className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                      <span>📸</span> STORY SCANNED PAGE IMAGES (多张绘本按顺序多选上传, MAX 10 IMAGES) *
                    </label>
                    <input
                      type="file"
                      id="input-ai-story-images"
                      key={aiFileKey}
                      multiple
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => setAiStoryImages(e.target.files)}
                      required
                      className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-300 font-mono file:bg-[#131B2E] file:border file:border-[#1F2D4A] file:text-cyan-400 file:px-3 file:py-1 file:rounded-md file:mr-4 file:text-xs file:font-mono hover:file:bg-[#1A2642] transition-all cursor-pointer"
                    />
                    <p className="text-3xs text-slate-500 font-mono">
                      支持 .jpg, .jpeg, .png, .webp 格式。请在系统文件选择框中按页码顺序多选上传。
                    </p>
                  </div>

                  {renderUserSelectionGroup(aiUserIds, setAiUserIds)}
                  
                  <button 
                    type="submit" 
                    id="btn-submit-ai-island" 
                    className="w-full mt-2 py-3.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-pink-500 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer font-mono" 
                    disabled={isSavingAI}
                  >
                    {isSavingAI ? 'AI COMPILATION RUNNING...' : '🚀 LAUNCH AI SYNTHESIS PROCESS (开始解析并自动跳转编辑)'}
                  </button>
                  {aiStatus && (
                    <p className={`p-3 text-xs rounded-lg border mt-2 font-mono ${
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

      {/* View 4: 📖 Vocabulary Database Management Tab */}
      {activeTab === 'vocabulary' && !isEditingStory && (
        <div className="flex flex-col gap-8 animate-fade-in">
          <FormBoundary>
            <form onSubmit={uploadWordsToIsland} className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">IMPORT VOCABULARY VIA CSV</h3>
              <p className="text-3xs text-slate-500 mb-6 font-mono">Upload a CSV file structured as: word, translation, sentence, sentence_translation.</p>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">SELECT TARGET SECTOR</label>
                  <SuspenseState isLoading={loadingIslands}>
                    <select 
                      value={selectedIslandForUpload}
                      onChange={(e) => setSelectedIslandForUpload(e.target.value)}
                      required
                      className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="">Select sector</option>
                      {islands.map((island) => (
                        <option key={island.id} value={island.name}>
                          {island.name}
                        </option>
                      ))}
                    </select>
                  </SuspenseState>
                </div>
                
                {renderUserSelectionGroup(csvUserIds, setCsvUserIds)}

                <div className="flex gap-4 items-center flex-wrap pt-2">
                  <input 
                    key={fileKey} 
                    type="file" 
                    accept=".csv" 
                    disabled={isUploading} 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono rounded-lg px-4 py-2 text-sm file:bg-[#131B2E] file:border file:border-[#1F2D4A] file:text-cyan-400 file:px-3 file:py-1 file:rounded-md file:mr-4 file:text-xs file:font-mono hover:file:bg-[#1A2642] transition-all cursor-pointer"
                  />
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-purple-500 transition-all disabled:opacity-50 cursor-pointer font-mono" 
                    disabled={isUploading}
                  >
                    {isUploading ? 'IMPORTING...' : 'EXECUTE IMPORT'}
                  </button>
                </div>
              </div>
              {uploadStatus && (
                <p className={`p-3 text-xs rounded-lg border text-center mt-4 font-mono ${
                  uploadStatus.type === 'success' 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                }`}>
                  {uploadStatus.text}
                </p>
              )}
            </form>
          </FormBoundary>

          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-100 border-b border-[#1F2D4A] pb-3 mb-6 uppercase tracking-widest font-mono">ACTIVE VOCABULARY LIST</h3>
            <SuspenseState isLoading={loading}>
              {words.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-8 text-center select-none font-mono">Vocabulary database is empty. Import words using the CSV upload form above.</p>
              ) : (
                <div className="table-responsive bg-[#0F172A] border border-[#1F2D4A] rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-xs text-left font-mono">
                    <thead>
                      <tr className="bg-[#131B2E] border-b border-[#1F2D4A] text-slate-400 font-mono">
                        <th className="p-3 font-semibold uppercase tracking-wider w-[15%]">WORD</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[20%]">CHINESE MEANING</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[40%]">CONTEXT & TRANSLATION</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[6%] text-center">LISTENING</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[6%] text-center">SPEAKING</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[6%] text-center">READING</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-[7%] text-center">WRITING</th>
                      </tr>
                    </thead>
                    <tbody>
                      {words.map((item) => (
                        <tr key={item.id} className="border-b border-[#1F2D4A]/50 hover:bg-[#131B2E]/40 transition-colors">
                          <td className="p-3 text-sm font-bold text-cyan-400 select-all font-mono">{item.word}</td>
                          <td className="p-3 text-slate-300 font-mono">{item.translation}</td>
                          <td className="p-3 text-slate-400 leading-relaxed font-sans">
                            <div className="font-medium text-slate-200">{item.sentence}</div>
                            <div className="text-slate-500 text-2xs mt-0.5">{item.sentence_translation}</div>
                          </td>
                          <td className="p-3 text-center font-bold tracking-tighter font-mono">
                            {item.progress.listening_passed ? <span className="text-emerald-400">🟢 PASSED</span> : <span className="text-slate-600">🔴 PENDING</span>}
                          </td>
                          <td className="p-3 text-center font-bold tracking-tighter font-mono">
                            {item.progress.speaking_passed ? <span className="text-emerald-400">🟢 PASSED</span> : <span className="text-slate-600">🔴 PENDING</span>}
                          </td>
                          <td className="p-3 text-center font-bold tracking-tighter font-mono">
                            {item.progress.reading_passed ? <span className="text-emerald-400">🟢 PASSED</span> : <span className="text-slate-600">🔴 PENDING</span>}
                          </td>
                          <td className="p-3 text-center font-bold tracking-tighter font-mono">
                            {item.progress.writing_passed ? <span className="text-emerald-400">🟢 PASSED</span> : <span className="text-slate-600">🔴 PENDING</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SuspenseState>
          </div>
        </div>
      )}

      {/* View 5: ⚠️ Error Words Management Tab */}
      {activeTab === 'errors' && !isEditingStory && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="flex justify-between items-center bg-[#131B2E] border border-[#1F2D4A] p-6 rounded-xl shadow-xl">
            <div>
              <h3 className="text-base font-bold text-cyan-400 uppercase tracking-widest font-mono">ERROR LOG MANAGER</h3>
              <p className="text-3xs text-slate-500 mt-1 font-mono">Export high-frequency user error logs to generated AI synthesis prompt templates.</p>
            </div>
            <button 
              onClick={copyAiPrompt} 
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-purple-500 transition-all cursor-pointer font-mono"
            >
              📋 COPY AI PROMPT TEMPLATE
            </button>
          </div>

          {uploadStatus && (
            <p className={`p-3 text-xs rounded-lg border text-center font-mono ${
              uploadStatus.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
            }`}>
              {uploadStatus.text}
            </p>
          )}
          
          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-6 shadow-xl">
            <h4 className="text-xs uppercase tracking-widest text-slate-400 font-mono font-bold mb-4">🤖 AI INDIVIDUALIZED STORY GENERATOR PROMPT</h4>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 max-h-[300px] overflow-y-auto font-mono text-xs text-cyan-300 leading-relaxed whitespace-pre-wrap select-all">
              <pre>{aiPrompt}</pre>
            </div>
          </div>
          
          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-xl p-6 shadow-xl">
            <h4 className="text-xs uppercase tracking-widest text-slate-400 font-mono font-bold mb-4">HIGH-FREQUENCY ERROR STATISTICS</h4>
            <SuspenseState isLoading={loading}>
              {errorWords.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center font-mono">No error logs detected in database.</p>
              ) : (
                <div className="table-responsive bg-[#0F172A] border border-[#1F2D4A] rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-xs text-left font-mono">
                    <thead>
                      <tr className="bg-[#131B2E] border-b border-[#1F2D4A] text-slate-400 font-mono">
                        <th className="p-3 font-semibold uppercase tracking-wider w-1/3">WORD</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-1/3">TRANSLATION</th>
                        <th className="p-3 font-semibold uppercase tracking-wider w-1/3">ERROR COUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorWords.map((item, index) => (
                        <tr key={index} className="border-b border-[#1F2D4A]/50 hover:bg-[#131B2E]/40 transition-colors">
                          <td className="p-3 text-sm font-bold text-rose-400 select-all font-mono">{item.word}</td>
                          <td className="p-3 text-slate-300 font-mono">{item.translation}</td>
                          <td className="p-3 text-slate-400 font-bold font-mono">{item.error_count} times</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SuspenseState>
          </div>
        </div>
      )}

      {/* View 6: 🎮 Game Settings Tab */}
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
    </div>
  );
};


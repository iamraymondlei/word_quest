// 场景描写作文（Describe a Scene）离线规则自检纯函数

export interface SceneWritingDraft {
  title: string;
  beginning: string;
  bodyLocation: string;
  bodyActions: string;
  bodyDetails: string;
  ending: string;
  finalEssay: string;
}

export interface SceneWritingCheckItem {
  key: 'structure' | 'present_continuous' | 'clothes' | 'adj_prep' | 'word_count';
  label: string;
  passed: boolean;
  detail: string;
  matches?: string[];
}

export interface SceneWritingIssue {
  snippet: string;
  message: string;
  suggestion: string;
}

export interface SceneWritingCheckResult {
  wordCount: number;
  minWords: number;
  items: SceneWritingCheckItem[];
  issues: SceneWritingIssue[];
  passedCount: number;
  totalChecks: number;
  allPassed: boolean;
  score: number; // 全通过且无常见错误为 100；否则最高 75（不触发通关奖励）
}

const CLOTHES_WORDS = [
  'wearing',
  'wear',
  'wears',
  'coat',
  'dress',
  'jeans',
  'jumper',
  'sweater',
  'trousers',
  'pants',
  'shorts',
  'skirt',
  'shoe',
  'shoes',
  'sock',
  'socks',
  't-shirt',
  'tshirt',
  'shirt',
  'trainer',
  'trainers',
  'sneakers',
  'jacket',
  'hat',
  'cap',
  'glasses',
  'sunglasses',
  'boots',
];

const ADJECTIVES = [
  'fine',
  'sunny',
  'windy',
  'cloudy',
  'rainy',
  'snowy',
  'warm',
  'cool',
  'hot',
  'cold',
  'clear',
  'green',
  'blue',
  'red',
  'yellow',
  'pink',
  'white',
  'black',
  'brown',
  'purple',
  'orange',
  'colourful',
  'colorful',
  'bright',
  'big',
  'small',
  'tall',
  'short',
  'long',
  'young',
  'cute',
  'pretty',
  'lovely',
  'beautiful',
  'nice',
  'happy',
  'excited',
  'relaxed',
  'tired',
  'quiet',
  'great',
  'wonderful',
  'fantastic',
  'amazing',
  'lively',
  'loud',
  'busy',
  'funny',
  'fast',
  'shiny',
  'new',
];

const PREPOSITIONS = [
  'in front of',
  'next to',
  'in the middle of',
  'in',
  'on',
  'at',
  'under',
  'behind',
  'near',
  'between',
  'beside',
  'around',
];

const WEATHER_KEYWORDS = ['sunny', 'fine', 'windy', 'cloudy', 'rainy', 'snowy', 'warm', 'cool', 'clear', 'hot', 'cold'];
const FEELING_KEYWORDS = [
  'happy',
  'excited',
  'relaxed',
  'tired',
  'sad',
  'bored',
  'angry',
  'great',
  'wonderful',
  'fantastic',
  'amazing',
  'fun',
  'good',
  'feel',
  'enjoy',
  'love',
];

const ING_TYPO_MAP: Record<string, string> = {
  runing: 'running',
  swiming: 'swimming',
  siting: 'sitting',
  shoping: 'shopping',
  stoping: 'stopping',
  geting: 'getting',
  claping: 'clapping',
  danceing: 'dancing',
  makeing: 'making',
  rideing: 'riding',
  writeing: 'writing',
  smileing: 'smiling',
  leaveing: 'leaving',
  takeing: 'taking',
  haveing: 'having',
  dieing: 'dying',
  lieing: 'lying',
  tieing: 'tying',
  taliking: 'talking',
};

const COMMON_BASE_VERBS_FOR_MISSING_ING = [
  'play',
  'run',
  'dance',
  'sing',
  'read',
  'sit',
  'swim',
  'walk',
  'talk',
  'ride',
  'fly',
  'wear',
  'eat',
  'drink',
  'smile',
  'jump',
  'watch',
  'listen',
  'clap',
  'cheer',
  'wait',
  'sleep',
  'cook',
  'take',
];

export function composeEssayFromDraft(draft: Omit<SceneWritingDraft, 'finalEssay'>): string {
  const parts: string[] = [];
  const p1 = [draft.beginning.trim(), draft.bodyLocation.trim()].filter(Boolean).join(' ');
  if (p1) parts.push(p1);
  const p2 = [draft.bodyActions.trim(), draft.bodyDetails.trim()].filter(Boolean).join(' ');
  if (p2) parts.push(p2);
  if (draft.ending.trim()) parts.push(draft.ending.trim());
  return parts.join('\n\n');
}

export function countEnglishWords(text: string): number {
  const tokens = text.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g);
  return tokens ? tokens.length : 0;
}

export function checkSceneWriting(draft: SceneWritingDraft): SceneWritingCheckResult {
  const minWords = 40;
  const titleText = draft.title.trim();
  const essayBody = draft.finalEssay.trim() || composeEssayFromDraft(draft);
  const lowerBody = essayBody.toLowerCase();
  const wordCount = countEnglishWords(essayBody);

  // 1. Structure check: Title (capitalized) + weather beginning + location + feeling ending
  const titleCapitalized = /^[A-Z]/.test(titleText);
  const hasWeather = WEATHER_KEYWORDS.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(essayBody));
  const hasLocation = /\b(in|on|at)\s+(the\s+)?[a-z]+/i.test(essayBody);
  const hasFeeling = FEELING_KEYWORDS.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(essayBody));

  const missingStruct: string[] = [];
  if (!titleText) missingStruct.push('标题');
  else if (!titleCapitalized) missingStruct.push('标题首字母需大写');
  if (!hasWeather) missingStruct.push('天气开头');
  if (!hasLocation) missingStruct.push('地点句');
  if (!hasFeeling) missingStruct.push('感受结尾');

  const structurePassed = missingStruct.length === 0;

  // 2. Present continuous: match be + (optional adverb/not) + verb-ing (at least 3)
  const pcRegex =
    /\b(?:am|is|are|'m|'s|'re|isn't|aren't)\s+(?:not\s+)?(?:also\s+|still\s+|happily\s+|loudly\s+|fast\s+)?([a-z]{2,}ing)\b/gi;
  const pcMatches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pcRegex.exec(essayBody)) !== null) {
    const verb = m[1].toLowerCase();
    // Exclude non-verb nouns ending in -ing
    if (['morning', 'evening', 'thing', 'something', 'anything', 'nothing', 'everything', 'spring'].includes(verb)) {
      continue;
    }
    pcMatches.push(m[0].trim());
  }
  // Also count coordinated second verbs like "is sitting ... and reading" or "are dancing and cheering"
  const coordPcRegex = /\b[a-z]{2,}ing\s+(?:[a-z]+\s+){0,4}and\s+([a-z]{2,}ing)\b/gi;
  while ((m = coordPcRegex.exec(essayBody)) !== null) {
    const verb = m[1].toLowerCase();
    if (!['morning', 'evening', 'thing', 'something'].includes(verb)) {
      pcMatches.push(`and ${verb}`);
    }
  }
  const pcPassed = pcMatches.length >= 3;

  // 3. Clothes description (>= 1)
  const clothesFound = Array.from(
    new Set(
      CLOTHES_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(lowerBody))
    )
  );
  const clothesPassed = clothesFound.length >= 1;

  // 4. Adjectives & Prepositions (at least 1 adjective + 1 preposition, total >= 2 distinct)
  const adjFound = Array.from(
    new Set(
      ADJECTIVES.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(lowerBody))
    )
  );
  const prepFound = Array.from(
    new Set(
      PREPOSITIONS.filter((p) => new RegExp(`\\b${p.replace(/\s+/g, '\\s+')}\\b`, 'i').test(lowerBody))
    )
  );
  const adjPrepPassed = adjFound.length >= 1 && prepFound.length >= 1 && adjFound.length + prepFound.length >= 2;

  // 5. Word count >= 40
  const wordCountPassed = wordCount >= minWords;

  // 6. Common mistake detection
  const issues: SceneWritingIssue[] = [];

  // 6a. Spelling typos in -ing verbs
  Object.entries(ING_TYPO_MAP).forEach(([typo, correct]) => {
    const re = new RegExp(`\\b${typo}\\b`, 'i');
    if (re.test(essayBody)) {
      issues.push({
        snippet: typo,
        message: `动词 -ing 拼写有误：“${typo}”`,
        suggestion: `请改为正确拼写 “${correct}”。`,
      });
    }
  });

  // 6b. "is/are/am + base verb" (missing -ing), e.g. "is play", "are run"
  const baseVerbPattern = COMMON_BASE_VERBS_FOR_MISSING_ING.join('|');
  const missingIngRe = new RegExp(`\\b(am|is|are|'m|'s|'re)\\s+(${baseVerbPattern})\\b`, 'gi');
  while ((m = missingIngRe.exec(essayBody)) !== null) {
    issues.push({
      snippet: m[0],
      message: `现在进行时漏掉了 -ing：“${m[0]}”`,
      suggestion: `be 动词后面需要接动词 -ing 形式（如 ${m[1]} ${m[2]}ing）。`,
    });
  }

  // 6c. Missing "be" before verb-ing, e.g. "They playing", "She dancing", "I flying"
  const missingBeRe = /\b(I|He|She|We|They|Kids|Boys|Girls|People|Friends)\s+([a-z]{3,}ing)\b/g;
  while ((m = missingBeRe.exec(essayBody)) !== null) {
    const verb = m[2].toLowerCase();
    if (['morning', 'evening', 'thing', 'something', 'during'].includes(verb)) continue;
    issues.push({
      snippet: m[0],
      message: `可能漏掉了 be 动词：“${m[0]}”`,
      suggestion: `现在进行时必须有 be 动词（am / is / are），不能直接写 “${m[0]}”。`,
    });
  }

  const items: SceneWritingCheckItem[] = [
    {
      key: 'structure',
      label: '文章结构完整 (Title / Beginning / Body / Ending)',
      passed: structurePassed,
      detail: structurePassed
        ? '标题首字母大写，且已包含天气开头、地点与感受结尾。'
        : `还缺少或需修正：${missingStruct.join('、')}。`,
    },
    {
      key: 'present_continuous',
      label: '① 现在进行时 ≥ 3 处 (be + doing)',
      passed: pcPassed,
      detail: pcPassed
        ? `已检测到 ${pcMatches.length} 处现在进行时表达。`
        : `当前检测到 ${pcMatches.length} 处，建议至少写出 3 处正在进行的动作（如 is running / are dancing）。`,
      matches: pcMatches.slice(0, 6),
    },
    {
      key: 'clothes',
      label: '② 服饰描述 ≥ 1 处 (wearing / 衣物词)',
      passed: clothesPassed,
      detail: clothesPassed
        ? `已使用服饰表达：${clothesFound.slice(0, 5).join(', ')}。`
        : '还没有描写人物穿着，可以加一句如 She is wearing a yellow T-shirt.。',
      matches: clothesFound.slice(0, 5),
    },
    {
      key: 'adj_prep',
      label: '③ 形容词 + 方位介词 ≥ 2 处 (细节加分)',
      passed: adjPrepPassed,
      detail: adjPrepPassed
        ? `形容词 (${adjFound.slice(0, 4).join(', ')}) + 介词 (${prepFound.slice(0, 4).join(', ')}) 搭配丰富！`
        : `当前形容词 ${adjFound.length} 个、方位介词 ${prepFound.length} 个，建议补充颜色/大小形容词及 in/on/at/under 等介词。`,
      matches: [...adjFound.slice(0, 3), ...prepFound.slice(0, 3)],
    },
    {
      key: 'word_count',
      label: `正文字数达标 (≥ ${minWords} 词)`,
      passed: wordCountPassed,
      detail: wordCountPassed
        ? `当前正文共 ${wordCount} 词，篇幅充实！`
        : `当前正文 ${wordCount} 词，还差 ${minWords - wordCount} 词达到 ${minWords} 词目标。`,
    },
  ];

  const passedCount = items.filter((it) => it.passed).length;
  const totalChecks = items.length;
  const allPassed = passedCount === totalChecks && issues.length === 0;
  const score = allPassed ? 100 : Math.min(75, Math.round((passedCount / totalChecks) * 75));

  return {
    wordCount,
    minWords,
    items,
    issues,
    passedCount,
    totalChecks,
    allPassed,
    score,
  };
}

/**
 * rankService.ts
 * 
 * WordQuest 核心学员金币/经验换算与五大探险职阶（Career Tier）纯函数计算引擎
 * 
 * 核心设计原则：
 * 1. 1 金币 (Coin) = 1 累计探险经验值 (Total EXP)。
 * 2. 纯函数映射，无损计算，兼顾离线 PWA 与在线即时响应。
 * 3. 精准锚定全站领跑学员：
 *    - Murphy (135,530 币) -> 第 2 职阶·星轨游侠 Lv.1 (进度 5,530 / 40,000 EXP)
 *    - Eugenie (74,809 币) -> 第 1 职阶·启航学员 Lv.4 (进度 4,809 / 30,000 EXP)
 *    - Raymond (8,909 币)  -> 第 1 职阶·启航学员 Lv.1 (进度 8,909 / 15,000 EXP)
 *    - Admin (282 币)     -> 第 1 职阶·启航学员 Lv.1 (稳健起步)
 */

export type TierId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

export interface RankLevelConfig {
  level: number;
  minExp: number;
  maxExp: number;
  span: number;
  title: string;
  description: string;
  perk?: string;
}

export interface RankTierTheme {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeGlow: string;
  progressBarGradient: string;
  accentText: string;
  cardBorder: string;
  cardBg: string;
}

export interface RankTier {
  id: TierId;
  order: number;
  name: string;
  nameEn: string;
  badge: string;
  summary: string;
  minExp: number;
  maxExp: number;
  theme: RankTierTheme;
  perkSummary: string;
  levels: RankLevelConfig[];
}

export interface RankProgress {
  tierId: TierId;
  tierName: string;
  tierNameEn: string;
  badge: string;
  level: number;
  fullTitle: string;
  shortTitle: string;
  currentExp: number;
  levelMinExp: number;
  levelMaxExp: number;
  expInLevel: number;
  levelSpan: number;
  progressPercent: number; // 0 ~ 100 with 1 decimal precision
  remainingExpToNextLevel: number;
  isMaxLevel: boolean;
  theme: RankTierTheme;
  nextTierName?: string;
  nextTierMinExp?: number;
  tierMinExp: number;
  tierMaxExp: number;
}

/**
 * 五大探险职阶与 25 级详细经验数值规则表
 */
export const CAREER_TIERS: RankTier[] = [
  {
    id: 'T1',
    order: 1,
    name: 'Cadet',
    nameEn: 'Cadet',
    badge: '🧭',
    summary: 'Begin your adventure on Word Quest Island. Read classic picture books and build solid English fundamentals.',
    minExp: 0,
    maxExp: 130000,
    perkSummary: 'Unlock companions Rex 🦖 & Bop 🐰 · Read aloud with bilingual audio',
    theme: {
      badgeBg: 'bg-cyan-950/80',
      badgeBorder: 'border-cyan-500/50',
      badgeText: 'text-cyan-300',
      badgeGlow: 'shadow-[0_0_12px_rgba(6,182,212,0.35)]',
      progressBarGradient: 'from-cyan-500 to-blue-500',
      accentText: 'text-cyan-400',
      cardBorder: 'border-cyan-500/30',
      cardBg: 'bg-slate-900/80'
    },
    levels: [
      {
        level: 1,
        minExp: 0,
        maxExp: 15000,
        span: 15000,
        title: 'Cadet Lv.1',
        description: 'Explore storybooks and take your first confident steps in English.',
        perk: 'Basic Explorer Badge'
      },
      {
        level: 2,
        minExp: 15000,
        maxExp: 40000,
        span: 25000,
        title: 'Cadet Lv.2',
        description: 'Master phonics and early vocabulary with growing fluency.',
        perk: 'Double Review Bonus Tip'
      },
      {
        level: 3,
        minExp: 40000,
        maxExp: 70000,
        span: 30000,
        title: 'Cadet Lv.3',
        description: 'Advance your read-aloud skills with sharper listening and speaking reflexes.',
        perk: 'Bronze Explorer Frame'
      },
      {
        level: 4,
        minExp: 70000,
        maxExp: 100000,
        span: 30000,
        title: 'Cadet Lv.4',
        description: 'Expand your core word bank and gear up for tier mastery!',
        perk: 'Castle Chase Speed Boost'
      },
      {
        level: 5,
        minExp: 100000,
        maxExp: 130000,
        span: 30000,
        title: 'Cadet Lv.5',
        description: 'Complete Tier 1 mastery and unlock the Ranger Trial.',
        perk: 'Ranger Trial Certification'
      }
    ]
  },
  {
    id: 'T2',
    order: 2,
    name: 'Ranger',
    nameEn: 'Ranger',
    badge: '🏹',
    summary: 'Break through foundational limits and master 1,000+ words like a nimble space ranger.',
    minExp: 130000,
    maxExp: 400000,
    perkSummary: 'Unlock companions Leo 🦁 & Spark ⚡ · Emerald aura ring · Space Defender shield',
    theme: {
      badgeBg: 'bg-emerald-950/80',
      badgeBorder: 'border-emerald-500/50',
      badgeText: 'text-emerald-300',
      badgeGlow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
      progressBarGradient: 'from-emerald-400 to-teal-500',
      accentText: 'text-emerald-400',
      cardBorder: 'border-emerald-500/40',
      cardBg: 'bg-emerald-950/20'
    },
    levels: [
      {
        level: 1,
        minExp: 130000,
        maxExp: 170000,
        span: 40000,
        title: 'Ranger Lv.1',
        description: 'Step into Tier 2 as a leading vanguard across the island.',
        perk: 'Emerald Ranger Badge'
      },
      {
        level: 2,
        minExp: 170000,
        maxExp: 220000,
        span: 50000,
        title: 'Ranger Lv.2',
        description: 'Build intermediate vocab with 95%+ spelling accuracy.',
        perk: 'Arcade Combo Sound Effects'
      },
      {
        level: 3,
        minExp: 220000,
        maxExp: 275000,
        span: 55000,
        title: 'Ranger Lv.3',
        description: 'Integrate syntax and grammar to read full stories independently.',
        perk: 'Emerald Animated Frame'
      },
      {
        level: 4,
        minExp: 275000,
        maxExp: 335000,
        span: 60000,
        title: 'Ranger Lv.4',
        description: 'Deconstruct root words and expand vocabulary past 2,000 words.',
        perk: 'Quest Acceleration Aura'
      },
      {
        level: 5,
        minExp: 335000,
        maxExp: 400000,
        span: 65000,
        title: 'Ranger Lv.5',
        description: 'Achieve Ranger mastery and prepare to navigate deep space nebulas.',
        perk: 'Deep Space Warp Permit'
      }
    ]
  },
  {
    id: 'T3',
    order: 3,
    name: 'Vanguard',
    nameEn: 'Vanguard',
    badge: '⚡',
    summary: 'Conquer deep space challenges with complex sentences and native-like reading speed.',
    minExp: 400000,
    maxExp: 1000000,
    perkSummary: 'Unlock Cyber-Mecha · Amethyst lightning aura · Instant vocab recall',
    theme: {
      badgeBg: 'bg-purple-950/80',
      badgeBorder: 'border-purple-500/50',
      badgeText: 'text-purple-300',
      badgeGlow: 'shadow-[0_0_12px_rgba(168,85,247,0.4)]',
      progressBarGradient: 'from-purple-500 to-indigo-500',
      accentText: 'text-purple-400',
      cardBorder: 'border-purple-500/40',
      cardBg: 'bg-purple-950/20'
    },
    levels: [
      {
        level: 1,
        minExp: 400000,
        maxExp: 500000,
        span: 100000,
        title: 'Vanguard Lv.1',
        description: 'Enter the Vanguard frontier with deep comprehension of advanced passages.',
        perk: 'Amethyst Vanguard Badge'
      },
      {
        level: 2,
        minExp: 500000,
        maxExp: 610000,
        span: 110000,
        title: 'Vanguard Lv.2',
        description: 'Think naturally in English and scan lengthy passages effortlessly.',
        perk: 'Deep Space Speed Boost'
      },
      {
        level: 3,
        minExp: 610000,
        maxExp: 730000,
        span: 120000,
        title: 'Vanguard Lv.3',
        description: 'Deliver authentic intonation and rhythm with top-tier oral scores.',
        perk: 'Vanguard Dynamic Nameplate'
      },
      {
        level: 4,
        minExp: 730000,
        maxExp: 860000,
        span: 130000,
        title: 'Vanguard Lv.4',
        description: 'Achieve lightning typing precision across hundreds of words.',
        perk: 'Amethyst Particle Trail'
      },
      {
        level: 5,
        minExp: 860000,
        maxExp: 1000000,
        span: 140000,
        title: 'Vanguard Lv.5',
        description: 'Surpass 1,000,000 EXP and stand out as an acclaimed explorer!',
        perk: 'Navigator Honor Ceremony'
      }
    ]
  },
  {
    id: 'T4',
    order: 4,
    name: 'Navigator',
    nameEn: 'Navigator',
    badge: '🌌',
    summary: 'Command the galactic knowledge map and read full chapter books with captain poise.',
    minExp: 1000000,
    maxExp: 2500000,
    perkSummary: 'Unlock Golden-Dragon · Golden nebula frame · Golden master badge',
    theme: {
      badgeBg: 'bg-amber-950/80',
      badgeBorder: 'border-amber-500/50',
      badgeText: 'text-amber-300',
      badgeGlow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]',
      progressBarGradient: 'from-amber-400 to-yellow-500',
      accentText: 'text-amber-400',
      cardBorder: 'border-amber-500/40',
      cardBg: 'bg-amber-950/20'
    },
    levels: [
      {
        level: 1,
        minExp: 1000000,
        maxExp: 1250000,
        span: 250000,
        title: 'Navigator Lv.1',
        description: 'Wear the golden navigator insignia and helm long chapter books.',
        perk: 'Golden Navigator Frame'
      },
      {
        level: 2,
        minExp: 1250000,
        maxExp: 1520000,
        span: 270000,
        title: 'Navigator Lv.2',
        description: 'Read English with native fluency and profound comprehension.',
        perk: 'Meteor Trail Effect'
      },
      {
        level: 3,
        minExp: 1520000,
        maxExp: 1810000,
        span: 290000,
        title: 'Navigator Lv.3',
        description: 'Understand instantly without translation, thinking directly in context.',
        perk: 'Galactic Wisdom Crown'
      },
      {
        level: 4,
        minExp: 1810000,
        maxExp: 2130000,
        span: 320000,
        title: 'Navigator Lv.4',
        description: 'Complete the entire galaxy of storybooks with 3,500+ words.',
        perk: 'Golden Navigator Cape'
      },
      {
        level: 5,
        minExp: 2130000,
        maxExp: 2500000,
        span: 370000,
        title: 'Navigator Lv.5',
        description: 'Reach the galactic summit and unlock the gateway to Legend.',
        perk: 'Cosmic Legend Key'
      }
    ]
  },
  {
    id: 'T5',
    order: 5,
    name: 'Legend',
    nameEn: 'Legend',
    badge: '👑',
    summary: 'Reach the pinnacle of mastery as a revered legend across all Word Quest islands!',
    minExp: 2500000,
    maxExp: Infinity,
    perkSummary: 'Unlock Neon Prism Ring · Cosmic Throne · Free island access',
    theme: {
      badgeBg: 'bg-rose-950/80',
      badgeBorder: 'border-rose-500/50',
      badgeText: 'text-rose-300',
      badgeGlow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]',
      progressBarGradient: 'from-rose-500 via-purple-500 to-amber-400',
      accentText: 'text-rose-400',
      cardBorder: 'border-rose-500/40',
      cardBg: 'bg-rose-950/20'
    },
    levels: [
      {
        level: 1,
        minExp: 2500000,
        maxExp: 3000000,
        span: 500000,
        title: 'Legend Lv.1',
        description: 'Step into the Hall of Legends crowned with supreme honor.',
        perk: 'Neon Legend Crown'
      },
      {
        level: 2,
        minExp: 3000000,
        maxExp: 3600000,
        span: 600000,
        title: 'Legend Lv.2',
        description: 'Master international grade-level reading, writing, and speaking.',
        perk: 'Cosmic Particle Orbit'
      },
      {
        level: 3,
        minExp: 3600000,
        maxExp: 4300000,
        span: 700000,
        title: 'Legend Lv.3',
        description: 'Explore literature and science classics with ease and insight.',
        perk: 'Omni-Realm Prestige'
      },
      {
        level: 4,
        minExp: 4300000,
        maxExp: 5100000,
        span: 800000,
        title: 'Legend Lv.4',
        description: 'Display artistic mastery in every quest, challenge, and race.',
        perk: 'Mythic Cosmic Insignia'
      },
      {
        level: 5,
        minExp: 5100000,
        maxExp: Infinity,
        span: 1000000,
        title: 'Legend Lv.5 (Max)',
        description: 'Eternal Legend! All 5 tiers mastered with ultimate lifetime prestige.',
        perk: 'Eternal Master Glory'
      }
    ]
  }
];

/**
 * 核心计算纯函数：输入金币返回完整职阶与等级成长模型
 * 
 * @param coins 学员当前金币（1 金币 = 1 累计 EXP）
 * @returns 完整的 RankProgress 计算结果
 */
export function calcRankProgress(coins: number = 0): RankProgress {
  const currentExp = Math.max(0, Math.floor(Number(coins) || 0));

  // 1. 查找所在大职阶
  let matchedTier = CAREER_TIERS[0];
  for (let i = CAREER_TIERS.length - 1; i >= 0; i--) {
    if (currentExp >= CAREER_TIERS[i].minExp) {
      matchedTier = CAREER_TIERS[i];
      break;
    }
  }

  // 2. 查找阶内等级 (Lv.1 ~ Lv.5)
  let matchedLevelConfig = matchedTier.levels[0];
  for (let i = matchedTier.levels.length - 1; i >= 0; i--) {
    if (currentExp >= matchedTier.levels[i].minExp) {
      matchedLevelConfig = matchedTier.levels[i];
      break;
    }
  }

  const isT5 = matchedTier.id === 'T5';
  const isMaxLevel = isT5 && matchedLevelConfig.level === 5 && currentExp >= 5100000;

  // 3. 计算阶内经验进度
  const levelMinExp = matchedLevelConfig.minExp;
  const levelMaxExp = matchedLevelConfig.maxExp;
  const levelSpan = matchedLevelConfig.span;
  
  let expInLevel = currentExp - levelMinExp;
  let remainingExpToNextLevel = isMaxLevel ? 0 : Math.max(0, levelMaxExp - currentExp);
  let progressPercent = 0;

  if (isMaxLevel) {
    progressPercent = 100;
    expInLevel = levelSpan;
  } else if (levelSpan > 0) {
    progressPercent = Math.min(100, Math.max(0, Number(((expInLevel / levelSpan) * 100).toFixed(1))));
  }

  // 4. 下一阶信息
  const currentTierIndex = CAREER_TIERS.findIndex(t => t.id === matchedTier.id);
  const nextTier = currentTierIndex < CAREER_TIERS.length - 1 ? CAREER_TIERS[currentTierIndex + 1] : undefined;

  const fullTitle = `${matchedTier.badge} ${matchedTier.nameEn} Lv.${matchedLevelConfig.level}`;
  const shortTitle = `${matchedTier.nameEn} Lv.${matchedLevelConfig.level}`;

  return {
    tierId: matchedTier.id,
    tierName: matchedTier.name,
    tierNameEn: matchedTier.nameEn,
    badge: matchedTier.badge,
    level: matchedLevelConfig.level,
    fullTitle,
    shortTitle,
    currentExp,
    levelMinExp,
    levelMaxExp,
    expInLevel,
    levelSpan,
    progressPercent,
    remainingExpToNextLevel,
    isMaxLevel,
    theme: matchedTier.theme,
    nextTierName: nextTier?.name,
    nextTierMinExp: nextTier?.minExp,
    tierMinExp: matchedTier.minExp,
    tierMaxExp: matchedTier.maxExp
  };
}

/**
 * 格式化大数值展示（如 135,530 或 135.5k）
 */
export function formatExpNumber(num: number): string {
  if (num === Infinity) return 'MAX';
  return num.toLocaleString();
}

/**
 * 格式化紧凑数值展示（如 135k）
 */
export function formatCompactExp(num: number): string {
  if (num === Infinity) return 'MAX';
  if (num >= 1000000) {
    const m = (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1);
    return `${m}M`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1);
    return `${k}k`;
  }
  return num.toString();
}

/**
 * 获取全量职阶配置表
 */
export function getAllCareerTiers(): RankTier[] {
  return CAREER_TIERS;
}

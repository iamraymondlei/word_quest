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
    name: '启航学员',
    nameEn: 'Cadet',
    badge: '🧭',
    summary: '踏入单词冒险岛，探索经典英语绘本，打下扎实听说读拼基石。',
    minExp: 0,
    maxExp: 130000,
    perkSummary: '解锁萌宠伙伴 Rex 🦖 / Bop 🐰 · 原著绘本双语原声跟读',
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
        title: '启航学员 Lv.1',
        description: '初识星际绘本，稳健踏出英语探险第一步。',
        perk: '基础探险徽章'
      },
      {
        level: 2,
        minExp: 15000,
        maxExp: 40000,
        span: 25000,
        title: '启航学员 Lv.2',
        description: '熟练掌握自然拼读与初级词汇，阅读渐入佳境。',
        perk: '解锁双倍复习加成提示'
      },
      {
        level: 3,
        minExp: 40000,
        maxExp: 70000,
        span: 30000,
        title: '启航学员 Lv.3',
        description: '绘本连贯朗读进阶，听力与口语反应更加敏捷。',
        perk: '专属青铜探险身份框'
      },
      {
        level: 4,
        minExp: 70000,
        maxExp: 100000,
        span: 30000,
        title: '启航学员 Lv.4',
        description: '高频核心词汇库大扩容，冲刺 1 阶大圆满！',
        perk: '解锁城堡追逐极速技能'
      },
      {
        level: 5,
        minExp: 100000,
        maxExp: 130000,
        span: 30000,
        title: '启航学员 Lv.5',
        description: '第 1 职阶极境大圆满，开启星轨游侠转职试炼。',
        perk: '星轨转职试炼认证'
      }
    ]
  },
  {
    id: 'T2',
    order: 2,
    name: '星轨游侠',
    nameEn: 'Ranger',
    badge: '🏹',
    summary: '突破初阶壁垒，掌握千词大关，如同在星轨中自由穿梭的神箭手。',
    minExp: 130000,
    maxExp: 400000,
    perkSummary: '解锁星轨伙伴 Leo 🦁 / Spark ⚡ · 翡翠流光微舱外环 · 太空防卫专属护盾',
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
        title: '星轨游侠 Lv.1',
        description: '成功破茧成蝶！成为全站首位踏入第 2 职阶的领跑先锋。',
        perk: '翡翠星轨专属徽章'
      },
      {
        level: 2,
        minExp: 170000,
        maxExp: 220000,
        span: 50000,
        title: '星轨游侠 Lv.2',
        description: '中阶星域稳步积累，单词盲拼准确率达 95% 以上。',
        perk: '太空战机连击音效'
      },
      {
        level: 3,
        minExp: 220000,
        maxExp: 275000,
        span: 55000,
        title: '星轨游侠 Lv.3',
        description: '词法句型融会贯通，自主阅读长篇冒险绘本毫无障碍。',
        perk: '绿野游侠动态头像框'
      },
      {
        level: 4,
        minExp: 275000,
        maxExp: 335000,
        span: 60000,
        title: '星轨游侠 Lv.4',
        description: '深谙生词构词拆解，词汇宝库收录突破两千词大关。',
        perk: '探索加速光环'
      },
      {
        level: 5,
        minExp: 335000,
        maxExp: 400000,
        span: 65000,
        title: '星轨游侠 Lv.5',
        description: '游侠巅峰圆满！具备带领小队穿梭深空星云的深厚底蕴。',
        perk: '深空跃迁准入许可'
      }
    ]
  },
  {
    id: 'T3',
    order: 3,
    name: '深空先锋',
    nameEn: 'Vanguard',
    badge: '⚡',
    summary: '征战深空星海，应对复杂句型与高级词汇，听辨与阅读母语化。',
    minExp: 400000,
    maxExp: 1000000,
    perkSummary: '解锁深空伙伴 Cyber-Mecha · 紫晶雷电外环 · 高阶词汇秒级速记特权',
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
        title: '深空先锋 Lv.1',
        description: '踏入深空先锋领域，开启高级段落深度理解探险。',
        perk: '紫晶雷电先锋徽章'
      },
      {
        level: 2,
        minExp: 500000,
        maxExp: 610000,
        span: 110000,
        title: '深空先锋 Lv.2',
        description: '英文思维逐步建立，长难句段落速读一目十行。',
        perk: '深空探索加速'
      },
      {
        level: 3,
        minExp: 610000,
        maxExp: 730000,
        span: 120000,
        title: '深空先锋 Lv.3',
        description: '语调语流精准地道，口语录音评分屡创全站新高。',
        perk: '先锋专属动态铭牌'
      },
      {
        level: 4,
        minExp: 730000,
        maxExp: 860000,
        span: 130000,
        title: '深空先锋 Lv.4',
        description: '单词拼写盲打达到职业电竞级手速，百词通关零失误。',
        perk: '紫晶粒子轨迹特效'
      },
      {
        level: 5,
        minExp: 860000,
        maxExp: 1000000,
        span: 140000,
        title: '深空先锋 Lv.5',
        description: '跨越百万经验门槛！成就深空全域瞩目传奇学者。',
        perk: '星系领航官受勋礼'
      }
    ]
  },
  {
    id: 'T4',
    order: 4,
    name: '星系领航官',
    nameEn: 'Navigator',
    badge: '🌌',
    summary: '掌控全星系知识星图，全本原著自主品读，探险队长级风范。',
    minExp: 1000000,
    maxExp: 2500000,
    perkSummary: '解锁星系领航伙伴 Golden-Dragon · 黄金流光星云边框 · 全图通关金牌徽章',
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
        title: '星系领航官 Lv.1',
        description: '身披黄金领航勋章，自主掌舵阅读长篇章节书。',
        perk: '黄金领航官边框'
      },
      {
        level: 2,
        minExp: 1250000,
        maxExp: 1520000,
        span: 270000,
        title: '星系领航官 Lv.2',
        description: '英语阅读如同母语般自然流利，理解深刻透彻。',
        perk: '星系流星轨迹'
      },
      {
        level: 3,
        minExp: 1520000,
        maxExp: 1810000,
        span: 290000,
        title: '星系领航官 Lv.3',
        description: '听力秒级条件反射，无需翻译直接进入情景思维。',
        perk: '星系智慧光冠'
      },
      {
        level: 4,
        minExp: 1810000,
        maxExp: 2130000,
        span: 320000,
        title: '星系领航官 Lv.4',
        description: '星系全域绘本大满贯，词汇储备达三千五百词以上。',
        perk: '领航官金色披风'
      },
      {
        level: 5,
        minExp: 2130000,
        maxExp: 2500000,
        span: 370000,
        title: '星系领航官 Lv.5',
        description: '登顶星系天花板！即将跨入至高无上的宇宙传奇殿堂。',
        perk: '宇宙传奇殿堂钥匙'
      }
    ]
  },
  {
    id: 'T5',
    order: 5,
    name: '宇宙传奇',
    nameEn: 'Legend',
    badge: '👑',
    summary: '登峰造极，学贯星海。成为万众敬仰的单词冒险岛巅峰传奇大师！',
    minExp: 2500000,
    maxExp: Infinity,
    perkSummary: '解锁全特效幻彩霓虹动态外环 · 宇宙至尊传奇神座 · 全岛屿免锁畅游',
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
        title: '宇宙传奇 Lv.1',
        description: '步入传奇圣殿！佩戴至尊皇冠，享受全站膜拜。',
        perk: '幻彩霓虹传奇皇冠'
      },
      {
        level: 2,
        minExp: 3000000,
        maxExp: 3600000,
        span: 600000,
        title: '宇宙传奇 Lv.2',
        description: '殿堂级学者荣誉，英语认知与表达全面达标国际母语同龄段。',
        perk: '宇宙粒子环绕'
      },
      {
        level: 3,
        minExp: 3600000,
        maxExp: 4300000,
        span: 700000,
        title: '宇宙传奇 Lv.3',
        description: '通晓文学与科学双域原版读物，思想与语言并驾齐驱。',
        perk: '全域至尊荣耀'
      },
      {
        level: 4,
        minExp: 4300000,
        maxExp: 5100000,
        span: 800000,
        title: '宇宙传奇 Lv.4',
        description: '星河霸主风采，每一次挑战都是完美的艺术级展示。',
        perk: '宇宙神话徽标'
      },
      {
        level: 5,
        minExp: 5100000,
        maxExp: Infinity,
        span: 1000000,
        title: '宇宙传奇 Lv.5 (极境满星)',
        description: '巅峰永恒传奇！五大职阶全满贯，解锁全服唯一至尊终极特权。',
        perk: '终极满星永恒荣耀'
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

  const fullTitle = `${matchedTier.badge} ${matchedTier.name} Lv.${matchedLevelConfig.level}`;
  const shortTitle = `${matchedTier.name} Lv.${matchedLevelConfig.level}`;

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

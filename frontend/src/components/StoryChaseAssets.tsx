import React from 'react';

// === 1. RETRO 8-BIT PIXEL HEART COMPONENT ===
interface PixelHeartProps {
  status: 'full' | 'empty' | 'cracking';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PixelHeart: React.FC<PixelHeartProps> = ({ status, size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  if (status === 'empty') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${sizeMap[size]} transition-all duration-300 opacity-25 grayscale ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 4h4v2H4V4zm4 2h8v2H8V6zm8-2h4v2h-4V4zM2 6h2v6H2V6zm20 6h-2V6h2v6zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2-2H8v2h2v-2zm-2-2H6v2h2v-2zm-2-2H4v2h2v-2zm-2-2H2v2h2v-2z"
          fill="#64748b"
        />
        <rect x="8" y="8" width="8" height="4" fill="#334155" />
      </svg>
    );
  }

  if (status === 'cracking') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${sizeMap[size]} animate-pulse filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 4h4v2H4V4zm4 2h8v2H8V6zm8-2h4v2h-4V4zM2 6h2v6H2V6zm20 6h-2V6h2v6zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2-2H8v2h2v-2zm-2-2H6v2h2v-2zm-2-2H4v2h2v-2zm-2-2H2v2h2v-2z"
          fill="#e11d48"
        />
        <path d="M4 6h4v4H4V6zm12 0h4v4h-4V6zM6 10h12v4H6v-4zm2 4h8v4H8v-4zm2 4h4v2h-4v-2z" fill="#f43f5e" />
        {/* Crack lightning bolt */}
        <path d="M12 4l-2 5h3l-3 7 4-5h-3l2-7z" fill="#fef08a" />
      </svg>
    );
  }

  // Full / Active Heart
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeMap[size]} transition-transform duration-200 hover:scale-110 filter drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 4h4v2H4V4zm4 2h8v2H8V6zm8-2h4v2h-4V4zM2 6h2v6H2V6zm20 6h-2V6h2v6zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2 2h2v-2h-2v2zm-2-2H8v2h2v-2zm-2-2H6v2h2v-2zm-2-2H4v2h2v-2zm-2-2H2v2h2v-2z"
        fill="#9f1239"
      />
      <path d="M4 6h4v4H4V6zm12 0h4v4h-4V6zM6 10h12v4H6v-4zm2 4h8v4H8v-4zm2 4h4v2h-4v-2z" fill="#f43f5e" />
      <path d="M6 6h2v2H6V6zm1 1h1v1H7V7zm-2 2h2v2H5V9z" fill="#ffe4e6" />
    </svg>
  );
};


// === 2. DYNAMIC BUDDY RUNNER ROSTER & CONFIG ===
export interface BuddyCharacter {
  key: string;
  name: string;
  enName: string;
  emoji: string;
  color: string;
  badge: string;
  desc: string;
}

export const BUDDY_CHARACTERS: BuddyCharacter[] = [
  {
    key: 'dino',
    name: '探险小恐龙',
    enName: 'Dino Explorer',
    emoji: '🦕',
    color: '#06b6d4',
    badge: '元气探险',
    desc: '双足大步蹬地摆动，头戴探险帽前倾冲刺，后脚蹬地喷出烟尘'
  },
  {
    key: 'fox',
    name: '探险赤狐',
    enName: 'Adventure Fox',
    emoji: '🦊',
    color: '#f97316',
    badge: '灵巧敏捷',
    desc: '低重心轻快腾跃，白尖大蓬松狐尾随跑摆动，尖尖狐耳破风'
  },
  {
    key: 'ninja',
    name: '暗影小忍者',
    enName: 'Shadow Ninja',
    emoji: '🥷',
    color: '#f43f5e',
    badge: '极速破风',
    desc: '双手后展破风冲刺（火影跑姿），脑后红发带飘扬，大跨步蹬地'
  },
  {
    key: 'robot',
    name: '发条复古机甲',
    enName: 'Clockwork Bot',
    emoji: '🤖',
    color: '#f59e0b',
    badge: '机械重装',
    desc: '活塞双腿沉稳踏地，天线小灯脉冲闪烁，胸口能量核心发光'
  },
  {
    key: 'wizard',
    name: '星光魔法学徒',
    enName: 'Wizard Apprentice',
    emoji: '🧙‍♂️',
    color: '#a855f7',
    badge: '星光奇幻',
    desc: '尖顶法师帽微仰，星光法杖手中紧握，法袍随风飘拂飞奔'
  },
  {
    key: 'cat',
    name: '灵巧猫咪',
    enName: 'Agile Feline',
    emoji: '🐱',
    color: '#10b981',
    badge: '轻盈踏风',
    desc: '尾巴高高翘起摇晃，尖猫耳敏锐警惕，四爪轻快踏风'
  },
  {
    key: 'lion',
    name: '勇气小狮王',
    enName: 'Brave Lion Cub',
    emoji: '🦁',
    color: '#eab308',
    badge: '威武霸气',
    desc: '金黄鬃毛威武霸气，尾巴小绒球轻晃，四肢矫健狂奔'
  },
  {
    key: 'rabbit',
    name: '飞毛腿兔兔',
    enName: 'Speedy Rabbit',
    emoji: '🐰',
    color: '#f472b6',
    badge: '跳跃冲刺',
    desc: '长长粉耳向后紧贴破风，短绒兔尾，强健大长腿蹬步飞奔'
  }
];

export function normalizeBuddyKey(avatar?: string): string {
  if (!avatar) return 'dino';
  const str = String(avatar).toLowerCase().trim();
  if (str === 'dino' || str === '🦕' || str === '🦖') return 'dino';
  if (str === 'fox' || str === '🦊') return 'fox';
  if (str === 'ninja' || str === '🥷') return 'ninja';
  if (str === 'robot' || str === 'bot' || str === '🤖') return 'robot';
  if (str === 'wizard' || str === 'mage' || str === '🧙‍♂️' || str === '🧙') return 'wizard';
  if (str === 'cat' || str === '🐱' || str === '🐈') return 'cat';
  if (str === 'lion' || str === '🦁') return 'lion';
  if (str === 'rabbit' || str === 'bunny' || str === '🐰' || str === '🐇') return 'rabbit';
  return 'dino';
}

export function getBuddySpriteConfig(_avatar?: string): { type: 'svg'; animClass: string } {
  return { type: 'svg', animClass: 'anim-body-sprint' };
}

interface RunnerSpriteProps {
  avatar?: string;
  isSprinting?: boolean;
  className?: string;
}

export const RunnerSprite: React.FC<RunnerSpriteProps> = ({
  avatar = 'dino',
  isSprinting = false,
  className = ''
}) => {
  const buddyKey = normalizeBuddyKey(avatar);

  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* 奔跑蹬地喷气烟尘 */}
      <div className="absolute -left-4 bottom-0 flex items-center pointer-events-none opacity-85">
        <span className="text-xs dust-particle font-mono text-cyan-300 select-none">💨</span>
      </div>

      {/* 地面奔跑阴影光台 */}
      <div className="absolute bottom-0 w-10 h-2 rounded-full bg-cyan-400/50 blur-[2px]"></div>

      {/* 侧身多关节奔跑角色 */}
      <div className={`flex items-center justify-center ${isSprinting ? 'scale-110' : ''}`}>
        {buddyKey === 'dino' && (
          <svg viewBox="0 0 80 80" className="w-11 h-11 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.85)] overflow-visible">
            <g className="anim-leg-back"><path d="M42 46 L36 68 L28 70" stroke="#0e7490" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="28" cy="70" rx="3.5" ry="2" fill="#0891b2" /></g>
            <g className="anim-arm-back"><path d="M52 38 L60 48" stroke="#0e7490" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
            <g className="anim-body-sprint">
              <path d="M28 42 Q10 40 4 32 Q12 50 28 48 Z" fill="#06b6d4" className="anim-tail" />
              <ellipse cx="38" cy="38" rx="16" ry="12" fill="#06b6d4" />
              <path d="M30 30 Q38 24 46 30" fill="none" stroke="#22d3ee" strokeWidth="2" />
              <circle cx="28" cy="32" r="2.5" fill="#f59e0b" /><circle cx="36" cy="28" r="2.5" fill="#f59e0b" /><circle cx="44" cy="30" r="2.5" fill="#f59e0b" />
              <g transform="translate(10, -4)">
                <circle cx="42" cy="26" r="10" fill="#22d3ee" />
                <path d="M34 20 L54 18 L56 22 L32 24 Z" fill="#b45309" /><ellipse cx="43" cy="18" rx="7" ry="3.5" fill="#d97706" />
                <circle cx="46" cy="24" r="3.5" fill="#082f49" /><circle cx="47" cy="23" r="1.2" fill="#ffffff" />
                <path d="M44 30 Q48 33 52 30" stroke="#082f49" strokeWidth="1.5" fill="none" /><polygon points="48,30 50,33 52,30" fill="#ffffff" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M46 40 L56 50" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" fill="none" /><circle cx="56" cy="50" r="2" fill="#06b6d4" /></g>
            <g className="anim-leg-front"><path d="M46 44 L54 66 L62 68" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" fill="none" /><ellipse cx="62" cy="68" rx="4" ry="2" fill="#22d3ee" /></g>
          </svg>
        )}

        {buddyKey === 'fox' && (
          <svg viewBox="0 0 80 80" className="w-11 h-11 filter drop-shadow-[0_0_8px_rgba(249,115,22,0.85)] overflow-visible">
            <g className="anim-leg-back"><path d="M38 46 L30 66 L22 68" stroke="#c2410c" strokeWidth="4" strokeLinecap="round" fill="none" /><ellipse cx="22" cy="68" rx="3.5" ry="2" fill="#ea580c" /></g>
            <g className="anim-arm-back"><path d="M50 42 L60 52" stroke="#c2410c" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
            <g className="anim-body-sprint">
              <path d="M26 44 Q8 48 2 36 Q14 26 28 38 Z" fill="#ea580c" className="anim-tail" />
              <path d="M8 40 Q2 36 6 30 Q12 34 16 38 Z" fill="#ffffff" className="anim-tail" />
              <ellipse cx="38" cy="40" rx="15" ry="10" fill="#f97316" />
              <ellipse cx="44" cy="42" rx="7" ry="6" fill="#ffffff" />
              <g transform="translate(12, -4)">
                <polygon points="34,22 38,10 44,20" fill="#ea580c" />
                <polygon points="36,20 38,13 42,20" fill="#fed7aa" />
                <ellipse cx="42" cy="26" rx="9" ry="8" fill="#f97316" />
                <path d="M44 26 L56 30 L46 34 Z" fill="#ea580c" /><path d="M46 30 L56 30 L48 34 Z" fill="#ffffff" />
                <circle cx="56" cy="30" r="1.5" fill="#0f172a" />
                <ellipse cx="45" cy="24" rx="2.5" ry="3.5" fill="#0f172a" /><circle cx="46" cy="23" r="1" fill="#ffffff" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M48 42 L58 56 L66 58" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" fill="none" /><ellipse cx="66" cy="58" rx="3.5" ry="2" fill="#fed7aa" /></g>
            <g className="anim-leg-front"><path d="M44 44 L52 66 L60 68" stroke="#f97316" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="60" cy="68" rx="4" ry="2" fill="#ea580c" /></g>
          </svg>
        )}

        {buddyKey === 'ninja' && (
          <svg viewBox="0 0 80 80" className="w-11 h-11 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.85)] overflow-visible">
            <g className="anim-leg-back"><path d="M40 44 L32 66 L24 68" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="24" cy="68" rx="3.5" ry="2" fill="#334155" /></g>
            <g className="anim-arm-back"><path d="M48 38 L30 32" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
            <g className="anim-body-sprint">
              <path d="M32 20 Q12 16 2 24 Q16 26 32 24 Z" fill="#e11d48" className="anim-ribbon" />
              <ellipse cx="38" cy="38" rx="14" ry="10" fill="#0f172a" />
              <path d="M32 36 L44 36" stroke="#e11d48" strokeWidth="2" />
              <g transform="translate(10, -4)">
                <circle cx="40" cy="24" r="9" fill="#0f172a" />
                <path d="M31 20 L49 20" stroke="#e11d48" strokeWidth="3" />
                <ellipse cx="44" cy="23" rx="3" ry="2" fill="#ffffff" /><circle cx="45" cy="23" r="1.2" fill="#0f172a" />
                <path d="M41 21 L47 21" stroke="#0f172a" strokeWidth="1.5" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M46 38 L32 44" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" fill="none" /></g>
            <g className="anim-leg-front"><path d="M44 44 L56 64 L66 66" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" fill="none" /><ellipse cx="66" cy="66" rx="4" ry="2" fill="#334155" /></g>
          </svg>
        )}

        {buddyKey === 'robot' && (
          <svg viewBox="0 0 80 80" className="w-11 h-11 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.85)] overflow-visible">
            <g className="anim-leg-back"><path d="M38 46 L30 66 L22 68" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" fill="none" /><rect x="18" y="66" width="8" height="4" rx="1" fill="#b45309" /></g>
            <g className="anim-arm-back"><path d="M48 36 L58 46" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" fill="none" /></g>
            <g className="anim-body-sprint">
              <rect x="26" y="28" width="22" height="18" rx="3" fill="#d97706" stroke="#78350f" strokeWidth="2" />
              <circle cx="37" cy="37" r="4" fill="#0284c7" /><circle cx="37" cy="37" r="2" fill="#38bdf8" />
              <g transform="translate(10, -4)">
                <line x1="37" y1="18" x2="37" y2="12" stroke="#78350f" strokeWidth="2" />
                <circle cx="37" cy="11" r="3" fill="#f59e0b" />
                <rect x="28" y="18" width="18" height="13" rx="2" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
                <rect x="32" y="22" width="10" height="4" rx="1" fill="#0284c7" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M44 38 L54 50" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none" /><circle cx="54" cy="50" r="2.5" fill="#78350f" /></g>
            <g className="anim-leg-front"><path d="M44 46 L54 66 L64 68" stroke="#d97706" strokeWidth="5" strokeLinecap="round" fill="none" /><rect x="60" y="66" width="9" height="4" rx="1" fill="#78350f" /></g>
          </svg>
        )}

        {buddyKey === 'wizard' && (
          <svg viewBox="0 0 80 80" className="w-11 h-11 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.85)] overflow-visible">
            <g className="anim-leg-back"><path d="M38 46 L30 66 L24 68" stroke="#4c1d95" strokeWidth="4" strokeLinecap="round" fill="none" /><ellipse cx="24" cy="68" rx="3.5" ry="2" fill="#581c87" /></g>
            <g className="anim-arm-back"><path d="M48 38 L60 46" stroke="#4c1d95" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
            <g className="anim-body-sprint">
              <path d="M28 34 L20 54 L44 50 Z" fill="#6b21a8" className="anim-ribbon" />
              <ellipse cx="38" cy="38" rx="12" ry="14" fill="#7e22ce" />
              <g transform="translate(10, -4)">
                <circle cx="38" cy="24" r="8" fill="#fed7aa" />
                <ellipse cx="42" cy="23" rx="2" ry="2.5" fill="#0f172a" /><circle cx="43" cy="22" r="0.8" fill="#ffffff" />
                <path d="M26 22 L50 20 L48 24 L24 26 Z" fill="#581c87" /><path d="M28 22 L36 4 L48 20 Z" fill="#7e22ce" />
                <polygon points="36,4 37,2 39,4 37,6" fill="#facc15" />
              </g>
            </g>
            <g className="anim-arm-front">
              <path d="M44 38 L54 44" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <line x1="52" y1="52" x2="58" y2="30" stroke="#b45309" strokeWidth="2" />
              <circle cx="59" cy="28" r="3.5" fill="#facc15" />
            </g>
            <g className="anim-leg-front"><path d="M44 46 L54 66 L62 68" stroke="#7e22ce" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="62" cy="68" rx="4" ry="2" fill="#4c1d95" /></g>
          </svg>
        )}

        {buddyKey === 'cat' && (
          <svg viewBox="0 0 80 80" className="w-11 h-11 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.85)] overflow-visible">
            <g className="anim-leg-back"><path d="M36 46 L28 66 L20 68" stroke="#047857" strokeWidth="4" strokeLinecap="round" fill="none" /><ellipse cx="20" cy="68" rx="3.5" ry="2" fill="#065f46" /></g>
            <g className="anim-arm-back"><path d="M48 42 L58 52" stroke="#047857" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
            <g className="anim-body-sprint">
              <path d="M26 44 Q14 42 10 24 Q14 22 18 36 Z" fill="#10b981" className="anim-tail" />
              <ellipse cx="38" cy="40" rx="14" ry="10" fill="#10b981" />
              <ellipse cx="42" cy="42" rx="6" ry="6" fill="#ecfdf5" />
              <g transform="translate(12, -4)">
                <polygon points="34,22 36,12 42,20" fill="#047857" /><polygon points="40,20 44,12 48,22" fill="#047857" />
                <circle cx="42" cy="24" r="8" fill="#10b981" />
                <ellipse cx="44" cy="23" rx="2.5" ry="3" fill="#0f172a" /><circle cx="45" cy="22" r="1" fill="#ffffff" />
                <line x1="46" y1="26" x2="54" y2="25" stroke="#ecfdf5" strokeWidth="1" />
                <line x1="46" y1="28" x2="54" y2="29" stroke="#ecfdf5" strokeWidth="1" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M46 42 L56 56 L64 58" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" fill="none" /><ellipse cx="64" cy="58" rx="3.5" ry="2" fill="#ecfdf5" /></g>
            <g className="anim-leg-front"><path d="M42 44 L50 66 L58 68" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="58" cy="68" rx="4" ry="2" fill="#047857" /></g>
          </svg>
        )}

        {buddyKey === 'lion' && (
          <svg viewBox="0 0 80 80" className="w-11 h-11 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.85)] overflow-visible">
            <g className="anim-leg-back"><path d="M38 46 L30 66 L22 68" stroke="#a16207" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="22" cy="68" rx="3.5" ry="2" fill="#ca8a04" /></g>
            <g className="anim-arm-back"><path d="M50 42 L60 52" stroke="#a16207" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
            <g className="anim-body-sprint">
              <path d="M26 44 Q12 46 6 36" stroke="#ca8a04" strokeWidth="2.5" fill="none" className="anim-tail" />
              <circle cx="6" cy="36" r="3" fill="#854d0e" className="anim-tail" />
              <ellipse cx="38" cy="40" rx="15" ry="11" fill="#eab308" />
              <g transform="translate(12, -4)">
                <circle cx="42" cy="24" r="11" fill="#a16207" /><circle cx="43" cy="24" r="8" fill="#eab308" />
                <circle cx="46" cy="23" r="2.5" fill="#0f172a" /><circle cx="47" cy="22" r="1" fill="#ffffff" />
                <path d="M46 28 Q50 30 54 28" stroke="#713f12" strokeWidth="1.5" fill="none" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M48 42 L58 56 L66 58" stroke="#eab308" strokeWidth="4" strokeLinecap="round" fill="none" /><ellipse cx="66" cy="58" rx="3.5" ry="2" fill="#fef08a" /></g>
            <g className="anim-leg-front"><path d="M44 44 L52 66 L60 68" stroke="#ca8a04" strokeWidth="5" strokeLinecap="round" fill="none" /><ellipse cx="60" cy="68" rx="4" ry="2" fill="#a16207" /></g>
          </svg>
        )}

        {buddyKey === 'rabbit' && (
          <svg viewBox="0 0 80 80" className="w-11 h-11 filter drop-shadow-[0_0_8px_rgba(244,114,182,0.85)] overflow-visible">
            <g className="anim-leg-back"><path d="M36 44 L26 66 L18 68" stroke="#db2777" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="18" cy="68" rx="4" ry="2" fill="#f472b6" /></g>
            <g className="anim-arm-back"><path d="M48 40 L58 48" stroke="#db2777" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
            <g className="anim-body-sprint">
              <circle cx="24" cy="40" r="3.5" fill="#ffffff" className="anim-tail" />
              <ellipse cx="38" cy="38" rx="14" ry="11" fill="#f472b6" />
              <g transform="translate(12, -4)">
                <g className="anim-ear">
                  <path d="M30 18 Q16 10 8 14 Q14 20 30 22 Z" fill="#f472b6" />
                  <path d="M26 18 Q16 12 12 15 Q16 19 26 20 Z" fill="#fbcfe8" />
                </g>
                <circle cx="40" cy="24" r="8" fill="#f472b6" />
                <circle cx="43" cy="23" r="2.5" fill="#0f172a" /><circle cx="44" cy="22" r="1" fill="#ffffff" />
                <polygon points="46,26 48,27 46,28" fill="#ffffff" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M46 40 L56 52 L64 54" stroke="#f472b6" strokeWidth="3.5" strokeLinecap="round" fill="none" /><ellipse cx="64" cy="54" rx="3.5" ry="2" fill="#fbcfe8" /></g>
            <g className="anim-leg-front"><path d="M42 42 L52 66 L62 68" stroke="#db2777" strokeWidth="5" strokeLinecap="round" fill="none" /><ellipse cx="62" cy="68" rx="4.5" ry="2" fill="#f472b6" /></g>
          </svg>
        )}
      </div>
    </div>
  );
};


// === 3. MONSTER ROSTER & CONFIG ===
export interface MonsterCharacter {
  key: string;
  name: string;
  enName: string;
  emoji: string;
  color: string;
  badge: string;
  desc: string;
}

export const MONSTER_CHARACTERS: MonsterCharacter[] = [
  {
    key: 'dragon',
    name: '炼狱喷火巨龙',
    enName: 'Inferno Dragon',
    emoji: '🐉',
    color: '#ef4444',
    badge: '烈焰龙威',
    desc: '双翼高频煽动，下颚利齿咬合咆哮，健硕龙腿大步蹬地狂奔'
  },
  {
    key: 'ogre',
    name: '狂暴食人魔',
    enName: 'Berserk Ogre',
    emoji: '👹',
    color: '#a855f7',
    badge: '重装撼地',
    desc: '头顶金独角，獠牙毕露，手握重拳，粗壮巨腿撼地踩踏'
  },
  {
    key: 'goblin',
    name: '地牢哥布林',
    enName: 'Dungeon Goblin',
    emoji: '👺',
    color: '#10b981',
    badge: '敏捷飞扑',
    desc: '尖长大耳朵，手持匕首弯刀，小步快速窜跳飞扑'
  },
  {
    key: 'wolf',
    name: '暗夜魔狼',
    enName: 'Shadow Direwolf',
    emoji: '🐺',
    color: '#6366f1',
    badge: '暗影疾风',
    desc: '凶厉血红狼眸，背部幽紫鬃毛随风飘动，四爪狂奔飞扑'
  },
  {
    key: 'mech',
    name: '狂暴战斗机甲',
    enName: 'Rage Mech Stomper',
    emoji: '🤖',
    color: '#dc2626',
    badge: '机械狂暴',
    desc: '红色警报眼光芒闪烁，机械利爪突进，重型活塞腿踏地冲撞'
  },
  {
    key: 'ghost',
    name: '城堡深渊怨灵',
    enName: 'Castle Phantom Wraith',
    emoji: '👻',
    color: '#c084fc',
    badge: '深渊幽魂',
    desc: '破烂斗篷尾部波浪俯冲，鬼爪向前抓挠，空洞双瞳发光追击'
  },
  {
    key: 'zombie',
    name: '狂暴地牢僵尸',
    enName: 'Furious Zombie',
    emoji: '🧟',
    color: '#14b8a6',
    badge: '不死狂潮',
    desc: '双手前伸狂乱抓挠，双腿大跨步飞速追赶，暗青皮肤'
  },
  {
    key: 'spider',
    name: '深渊暗影魔蛛',
    enName: 'Abyssal Shadow Spider',
    emoji: '🕷️',
    color: '#f59e0b',
    badge: '多足侵袭',
    desc: '多对步足极速交替爬行，血红复眼闪烁，毒牙滴落荧光毒液'
  }
];

export function normalizeMonsterKey(emojiOrKey?: string): string {
  if (!emojiOrKey) return 'ghost';
  const str = String(emojiOrKey).toLowerCase().trim();
  if (str === 'dragon' || str === '🐉' || str === '🐲') return 'dragon';
  if (str === 'ogre' || str === '👹') return 'ogre';
  if (str === 'goblin' || str === '👺') return 'goblin';
  if (str === 'wolf' || str === '🐺') return 'wolf';
  if (str === 'mech' || str === '🤖') return 'mech';
  if (str === 'ghost' || str === '👻') return 'ghost';
  if (str === 'zombie' || str === '🧟') return 'zombie';
  if (str === 'spider' || str === '🕷️') return 'spider';
  return 'ghost';
}

export function getMonsterSpriteConfig(_emoji?: string): { type: 'svg'; animClass: string } {
  return { type: 'svg', animClass: 'anim-monster-body' };
}

interface MonsterSpriteProps {
  emoji?: string;
  isWaiting: boolean;
  waitCountdown?: number;
  distanceToBuddy?: number;
  className?: string;
}

export const MonsterSprite: React.FC<MonsterSpriteProps> = ({
  emoji = 'ghost',
  isWaiting,
  waitCountdown = 0,
  distanceToBuddy = 10,
  className = ''
}) => {
  const monsterKey = normalizeMonsterKey(emoji);
  const isClose = distanceToBuddy <= 3 && !isWaiting;

  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* 怪兽暗影地台 */}
      <div
        className={`absolute bottom-0 w-12 h-2.5 rounded-full blur-[2px] ${
          isWaiting
            ? 'bg-purple-500/30'
            : isClose
            ? 'bg-rose-600/80 animate-pulse'
            : 'bg-purple-600/60'
        }`}
      ></div>

      {/* 侧身追逐怪兽 */}
      <div
        className={`flex items-center justify-center transition-transform duration-200 ${
          isWaiting
            ? 'opacity-80 scale-90'
            : isClose
            ? 'scale-115'
            : ''
        }`}
      >
        {monsterKey === 'dragon' && (
          <svg viewBox="0 0 90 80" className="w-13 h-13 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.9)] overflow-visible">
            <g className="anim-wing"><path d="M48 24 Q30 0 10 12 Q24 24 38 32 Z" fill="#7c2d12" opacity="0.8" /></g>
            <g className="anim-leg-back"><path d="M38 48 L26 68 L16 70" stroke="#991b1b" strokeWidth="5" strokeLinecap="round" fill="none" /><polygon points="16,70 12,68 14,73" fill="#fca5a5" /></g>
            <g className="anim-monster-body">
              <path d="M30 46 Q16 52 4 48 Q14 60 28 54 Z" fill="#b91c1c" />
              <ellipse cx="44" cy="42" rx="18" ry="12" fill="#dc2626" />
              <path d="M34 32 L38 26 L42 32 L46 26 L50 32" fill="#f59e0b" />
              <g transform="translate(18, -2)">
                <path d="M42 24 L58 20 L66 28 L46 36 Z" fill="#ef4444" />
                <path d="M44 22 L36 10 L48 18" fill="#7f1d1d" />
                <circle cx="54" cy="24" r="3.5" fill="#fef08a" /><circle cx="55" cy="24" r="1.5" fill="#7f1d1d" />
                <g className="anim-jaw"><path d="M46 34 L62 36 L54 42 Z" fill="#991b1b" /><polygon points="50,34 52,31 54,34 56,31 58,34" fill="#ffffff" /></g>
              </g>
            </g>
            <g className="anim-wing"><path d="M44 28 Q24 2 2 16 Q18 30 36 38 Z" fill="#dc2626" /></g>
            <g className="anim-leg-front"><path d="M52 46 L64 66 L74 68" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" fill="none" /><polygon points="74,68 78,66 76,71" fill="#fef08a" /></g>
          </svg>
        )}

        {monsterKey === 'ogre' && (
          <svg viewBox="0 0 90 80" className="w-13 h-13 filter drop-shadow-[0_0_10px_rgba(168,85,247,0.9)] overflow-visible">
            <g className="anim-leg-back"><path d="M36 48 L26 68 L16 70" stroke="#4c1d95" strokeWidth="6" strokeLinecap="round" fill="none" /><rect x="12" y="68" width="10" height="5" rx="2" fill="#581c87" /></g>
            <g className="anim-arm-back"><path d="M50 36 L68 28" stroke="#4c1d95" strokeWidth="5" strokeLinecap="round" fill="none" /><circle cx="70" cy="26" r="6" fill="#3b0764" /></g>
            <g className="anim-monster-body">
              <ellipse cx="42" cy="42" rx="18" ry="14" fill="#6b21a8" />
              <path d="M30 38 L54 38" stroke="#a855f7" strokeWidth="2" />
              <g transform="translate(14, -4)">
                <polygon points="36,18 40,6 44,18" fill="#eab308" />
                <circle cx="42" cy="24" r="10" fill="#7e22ce" />
                <circle cx="46" cy="23" r="3.5" fill="#facc15" /><circle cx="47" cy="23" r="1.5" fill="#7f1d1d" />
                <path d="M42 30 Q48 34 54 30" stroke="#3b0764" strokeWidth="2" fill="none" />
                <polygon points="46,30 48,25 50,30" fill="#ffffff" /><polygon points="51,30 53,26 55,30" fill="#ffffff" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M48 38 L62 48 L72 44" stroke="#7e22ce" strokeWidth="5.5" strokeLinecap="round" fill="none" /><circle cx="72" cy="44" r="4" fill="#4c1d95" /></g>
            <g className="anim-leg-front"><path d="M48 48 L58 66 L68 70" stroke="#7e22ce" strokeWidth="6.5" strokeLinecap="round" fill="none" /><rect x="64" y="68" width="10" height="5" rx="2" fill="#4c1d95" /></g>
          </svg>
        )}

        {monsterKey === 'goblin' && (
          <svg viewBox="0 0 90 80" className="w-13 h-13 filter drop-shadow-[0_0_10px_rgba(16,185,129,0.9)] overflow-visible">
            <g className="anim-leg-back"><path d="M38 46 L28 66 L18 68" stroke="#065f46" strokeWidth="4" strokeLinecap="round" fill="none" /><ellipse cx="18" cy="68" rx="3.5" ry="2" fill="#047857" /></g>
            <g className="anim-arm-back"><path d="M48 38 L60 48" stroke="#065f46" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
            <g className="anim-monster-body">
              <ellipse cx="40" cy="40" rx="14" ry="10" fill="#059669" />
              <g transform="translate(14, -4)">
                <polygon points="30,22 20,12 36,18" fill="#047857" />
                <polygon points="32,20 24,14 36,18" fill="#a7f3d0" />
                <circle cx="42" cy="24" r="8" fill="#10b981" />
                <path d="M44 26 L54 28 L46 32 Z" fill="#059669" />
                <ellipse cx="44" cy="22" rx="2.5" ry="3" fill="#facc15" /><circle cx="45" cy="22" r="1.2" fill="#0f172a" />
                <path d="M44 32 Q48 34 52 32" stroke="#065f46" strokeWidth="1.5" fill="none" />
              </g>
            </g>
            <g className="anim-arm-front">
              <path d="M46 40 L56 50" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M56 50 L68 44 L64 42 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
            </g>
            <g className="anim-leg-front"><path d="M44 44 L54 66 L64 68" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="64" cy="68" rx="4" ry="2" fill="#047857" /></g>
          </svg>
        )}

        {monsterKey === 'wolf' && (
          <svg viewBox="0 0 90 80" className="w-13 h-13 filter drop-shadow-[0_0_10px_rgba(99,102,241,0.9)] overflow-visible">
            <g className="anim-leg-back"><path d="M34 46 L24 66 L16 68" stroke="#1e1b4b" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="16" cy="68" rx="3.5" ry="2" fill="#312e81" /></g>
            <g className="anim-arm-back"><path d="M48 42 L60 52" stroke="#1e1b4b" strokeWidth="3.5" strokeLinecap="round" fill="none" /></g>
            <g className="anim-monster-body">
              <path d="M24 42 Q10 46 2 34 Q12 30 26 38 Z" fill="#3730a3" className="anim-tail" />
              <ellipse cx="38" cy="40" rx="16" ry="11" fill="#4338ca" />
              <path d="M30 30 L36 24 L42 30 L48 24 L52 32" fill="#6366f1" />
              <g transform="translate(14, -4)">
                <polygon points="34,20 38,8 44,18" fill="#312e81" />
                <ellipse cx="42" cy="24" rx="9" ry="8" fill="#4338ca" />
                <path d="M44 26 L58 28 L48 34 Z" fill="#3730a3" />
                <circle cx="58" cy="28" r="1.5" fill="#0f172a" />
                <ellipse cx="45" cy="22" rx="2.5" ry="3" fill="#ef4444" /><circle cx="46" cy="22" r="1" fill="#ffffff" />
                <polygon points="50,30 52,34 54,30" fill="#ffffff" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M48 42 L58 56 L68 58" stroke="#4338ca" strokeWidth="4" strokeLinecap="round" fill="none" /><ellipse cx="68" cy="58" rx="3.5" ry="2" fill="#818cf8" /></g>
            <g className="anim-leg-front"><path d="M42 44 L52 66 L62 68" stroke="#3730a3" strokeWidth="5" strokeLinecap="round" fill="none" /><ellipse cx="62" cy="68" rx="4" ry="2" fill="#1e1b4b" /></g>
          </svg>
        )}

        {monsterKey === 'mech' && (
          <svg viewBox="0 0 90 80" className="w-13 h-13 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.9)] overflow-visible">
            <g className="anim-leg-back"><path d="M36 46 L26 66 L16 68" stroke="#450a0a" strokeWidth="5" strokeLinecap="round" fill="none" /><rect x="12" y="66" width="10" height="5" rx="1" fill="#7f1d1d" /></g>
            <g className="anim-arm-back"><path d="M48 36 L62 26" stroke="#450a0a" strokeWidth="4" strokeLinecap="round" fill="none" /><polygon points="62,26 68,22 66,32" fill="#dc2626" /></g>
            <g className="anim-monster-body">
              <rect x="24" y="26" width="24" height="20" rx="3" fill="#991b1b" stroke="#450a0a" strokeWidth="2" />
              <circle cx="36" cy="36" r="4" fill="#ef4444" /><circle cx="36" cy="36" r="2" fill="#fef08a" />
              <g transform="translate(12, -4)">
                <rect x="28" y="16" width="20" height="14" rx="2" fill="#7f1d1d" stroke="#450a0a" strokeWidth="2" />
                <rect x="32" y="21" width="12" height="4" rx="1" fill="#ef4444" />
                <line x1="38" y1="16" x2="38" y2="10" stroke="#450a0a" strokeWidth="2" /><circle cx="38" cy="9" r="2.5" fill="#ef4444" />
              </g>
            </g>
            <g className="anim-arm-front"><path d="M46 38 L60 48" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" fill="none" /><circle cx="60" cy="48" r="4" fill="#450a0a" /></g>
            <g className="anim-leg-front"><path d="M46 46 L58 66 L70 68" stroke="#991b1b" strokeWidth="6" strokeLinecap="round" fill="none" /><rect x="66" y="66" width="10" height="5" rx="1" fill="#450a0a" /></g>
          </svg>
        )}

        {monsterKey === 'ghost' && (
          <svg viewBox="0 0 90 80" className="w-13 h-13 filter drop-shadow-[0_0_10px_rgba(168,85,247,0.9)] overflow-visible">
            <g className="anim-monster-body">
              <path d="M20 48 Q8 44 2 28 Q14 36 28 40 Z" fill="#9333ea" className="anim-tail" />
              <path d="M24 52 Q12 50 6 36 Q16 42 30 44 Z" fill="#a855f7" className="anim-tail" />
              <ellipse cx="42" cy="38" rx="16" ry="14" fill="#c084fc" />
              <g transform="translate(14, -4)">
                <circle cx="40" cy="22" r="10" fill="#e9d5ff" />
                <ellipse cx="44" cy="21" rx="2.5" ry="3.5" fill="#581c87" />
                <path d="M42 27 Q46 32 50 27" stroke="#581c87" strokeWidth="2" fill="none" />
              </g>
            </g>
            <g className="anim-arm-front">
              <path d="M48 38 L64 36 L72 38" stroke="#e9d5ff" strokeWidth="4" strokeLinecap="round" fill="none" />
              <polygon points="72,38 76,36 74,41" fill="#9333ea" />
            </g>
          </svg>
        )}

        {monsterKey === 'zombie' && (
          <svg viewBox="0 0 90 80" className="w-13 h-13 filter drop-shadow-[0_0_10px_rgba(20,184,166,0.9)] overflow-visible">
            <g className="anim-leg-back"><path d="M38 46 L30 66 L22 68" stroke="#134e4a" strokeWidth="4.5" strokeLinecap="round" fill="none" /><ellipse cx="22" cy="68" rx="3.5" ry="2" fill="#0f766e" /></g>
            <g className="anim-monster-body">
              <ellipse cx="40" cy="40" rx="14" ry="12" fill="#14b8a6" />
              <path d="M30 36 L48 36" stroke="#0f766e" strokeWidth="2" />
              <g transform="translate(14, -4)">
                <circle cx="40" cy="22" r="9" fill="#2dd4bf" />
                <circle cx="44" cy="21" r="2.5" fill="#ffffff" /><circle cx="45" cy="21" r="1.2" fill="#0f172a" />
                <path d="M40 28 L48 27" stroke="#134e4a" strokeWidth="2" />
              </g>
            </g>
            <g className="anim-arm-front">
              <path d="M46 36 L66 34 L72 38" stroke="#2dd4bf" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            </g>
            <g className="anim-leg-front"><path d="M44 44 L54 66 L64 68" stroke="#14b8a6" strokeWidth="5" strokeLinecap="round" fill="none" /><ellipse cx="64" cy="68" rx="4" ry="2" fill="#0f766e" /></g>
          </svg>
        )}

        {monsterKey === 'spider' && (
          <svg viewBox="0 0 90 80" className="w-13 h-13 filter drop-shadow-[0_0_10px_rgba(245,158,11,0.9)] overflow-visible">
            <g className="anim-leg-back"><path d="M36 42 L22 34 L12 60" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" fill="none" /></g>
            <g className="anim-leg-front"><path d="M38 44 L28 48 L18 68" stroke="#92400e" strokeWidth="3.5" strokeLinecap="round" fill="none" /></g>
            <g className="anim-monster-body">
              <ellipse cx="30" cy="40" rx="14" ry="11" fill="#b45309" />
              <circle cx="28" cy="38" r="3" fill="#f59e0b" />
              <circle cx="44" cy="42" r="7" fill="#78350f" />
              <circle cx="46" cy="40" r="1.5" fill="#ef4444" /><circle cx="48" cy="42" r="1.5" fill="#ef4444" />
              <polygon points="50,44 54,50 48,48" fill="#fef08a" />
            </g>
            <g className="anim-arm-back"><path d="M46 44 L56 36 L66 62" stroke="#b45309" strokeWidth="3.5" strokeLinecap="round" fill="none" /></g>
            <g className="anim-arm-front"><path d="M48 44 L60 46 L70 66" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" fill="none" /></g>
          </svg>
        )}
      </div>

      {/* State Badges */}
      {isWaiting && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-900/95 border border-purple-500/50 text-[10px] font-mono font-black text-purple-300 shadow-md">
          <span className="text-[10px] animate-pulse">💤</span>
          <span>{waitCountdown.toFixed(0)}s</span>
        </div>
      )}
      {isClose && !isWaiting && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-rose-950/95 border border-rose-500 text-[10px] font-mono font-black text-rose-200 animate-pulse shadow-md shadow-rose-500/40">
          🔥 CLOSE!
        </div>
      )}
    </div>
  );
};


// === 3.1 BUDDY SELECTOR MODAL COMPONENT ===
interface BuddySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  onSelectBuddy: (buddyKey: string, emoji: string) => void;
  loading?: boolean;
}

export const BuddySelectorModal: React.FC<BuddySelectorModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onSelectBuddy,
  loading = false
}) => {
  if (!isOpen) return null;

  const currentKey = normalizeBuddyKey(currentAvatar);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0f19] border border-cyan-500/40 w-full max-w-4xl max-h-[90vh] rounded-3xl p-6 shadow-2xl overflow-y-auto flex flex-col relative text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300 tracking-wider">
                选择你的跑酷探险伙伴 (CHOOSE YOUR BUDDY)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                8 款侧身双腿可跑学员伙伴，每位均搭载真实物理蹬地冲刺与喷烟动效。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer font-bold text-sm"
          >
            ✕ 关闭
          </button>
        </div>

        {/* 8 Buddy Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {BUDDY_CHARACTERS.map((char) => {
            const isSelected = char.key === currentKey;
            return (
              <div
                key={char.key}
                onClick={() => !loading && onSelectBuddy(char.key, char.emoji)}
                className={`relative flex flex-col justify-between rounded-2xl p-3.5 border-2 transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] scale-[1.02]'
                    : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/60 hover:scale-[1.01]'
                }`}
              >
                {/* Active Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 bg-cyan-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1 z-20">
                    <span>✓</span> 当前出战
                  </div>
                )}

                {/* Mini Runway Animated Preview */}
                <div className="h-24 castle-stone-runway rounded-xl relative flex items-center justify-center mb-3 overflow-hidden shadow-inner border border-red-900/40">
                  <div className="scale-95">
                    <RunnerSprite avatar={char.key} isSprinting={true} />
                  </div>
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-slate-100 group-hover:text-cyan-300 transition">
                      {char.name}
                    </span>
                    <span className="text-[10px] bg-slate-900 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                      {char.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight mb-3">
                    {char.desc}
                  </p>
                </div>

                {/* Select Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBuddy(char.key, char.emoji);
                  }}
                  className={`w-full py-1.5 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-md pointer-events-none'
                      : 'bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  }`}
                >
                  {loading && isSelected ? (
                    <span>保存中...</span>
                  ) : isSelected ? (
                    <span>★ 正在出战中</span>
                  ) : (
                    <span>设为探险伙伴 ➔</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
          <span>💡 提示：选定伙伴后将在全岛 Story Chase 关卡及地图中实时以该角色冲刺跑酷！</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};


// === 4. CASTLE DECORATIVE COMPONENTS ===
export const CastleBattlement: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="w-5 h-4 castle-battlement rounded-t"></div>
    <div className="w-5 h-4 castle-battlement rounded-t"></div>
    <div className="w-5 h-4 castle-battlement rounded-t"></div>
    <div className="w-5 h-4 castle-battlement rounded-t"></div>
  </div>
);

export const CastleSidePillars: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const isLeft = side === 'left';
  return (
    <div
      className={`w-6 sm:w-8 ${isLeft ? 'castle-pillar-left' : 'castle-pillar-right'} shrink-0 relative flex flex-col justify-around items-center py-6 select-none z-20`}
    >
      <div className="torch-flame text-base">🔥</div>
      <div className="torch-flame text-base">🔥</div>
      <div className="torch-flame text-base">🔥</div>
      <div className="torch-flame text-base">🔥</div>
      <div className="torch-flame text-base">🔥</div>
    </div>
  );
};

// Canvas Helper: Draw Spire Tower
function drawSpireTower(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  baseY: number,
  towerWidth: number,
  totalHeight: number,
  stoneColor: string,
  roofColor: string,
  isForeground: boolean,
  time: number,
  side: string = ''
) {
  const bodyHeight = totalHeight * 0.45;
  const roofTopY = baseY - totalHeight;
  const bodyTopY = baseY - bodyHeight;

  // 1. Tower Body
  ctx.fillStyle = stoneColor;
  ctx.fillRect(centerX - towerWidth / 2, bodyTopY, towerWidth, bodyHeight);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - towerWidth / 2, bodyTopY, towerWidth, bodyHeight);

  // Brick lines
  if (isForeground) {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 1;
    for (let y = bodyTopY + 12; y < baseY; y += 14) {
      ctx.beginPath();
      ctx.moveTo(centerX - towerWidth / 2, y);
      ctx.lineTo(centerX + towerWidth / 2, y);
      ctx.stroke();
    }

    // Gothic Arched Window
    const winW = 12;
    const winH = 18;
    const winY = bodyTopY + 14;
    ctx.fillStyle = '#020617';
    ctx.fillRect(centerX - winW / 2, winY, winW, winH);

    const winGlow = ctx.createRadialGradient(centerX, winY + 6, 2, centerX, winY + 6, 12);
    winGlow.addColorStop(0, 'rgba(251, 191, 36, 0.95)');
    winGlow.addColorStop(0.6, 'rgba(245, 158, 11, 0.6)');
    winGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = winGlow;
    ctx.beginPath();
    ctx.arc(centerX, winY + 6, winW / 2, Math.PI, 0);
    ctx.rect(centerX - winW / 2, winY + 6, winW, winH - 6);
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, winY);
    ctx.lineTo(centerX, winY + winH);
    ctx.moveTo(centerX - winW / 2, winY + 8);
    ctx.lineTo(centerX + winW / 2, winY + 8);
    ctx.stroke();
  }

  // 2. Corbel table
  ctx.fillStyle = '#334155';
  ctx.fillRect(centerX - towerWidth / 2 - 4, bodyTopY - 4, towerWidth + 8, 6);
  ctx.strokeStyle = '#64748b';
  ctx.strokeRect(centerX - towerWidth / 2 - 4, bodyTopY - 4, towerWidth + 8, 6);

  // 3. Cone Spire Roof
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(centerX, roofTopY);
  ctx.lineTo(centerX + towerWidth / 2 + 3, bodyTopY - 4);
  ctx.lineTo(centerX - towerWidth / 2 - 3, bodyTopY - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(centerX, roofTopY);
  ctx.lineTo(centerX, bodyTopY - 4);
  ctx.lineTo(centerX - towerWidth / 2 - 3, bodyTopY - 4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Finial & Waving Pennant
  if (isForeground) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(centerX, roofTopY - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, roofTopY - 3);
    ctx.lineTo(centerX, roofTopY - 18);
    ctx.stroke();

    const waveOffset = Math.sin(time * 2 + (side === 'left' ? 0 : 2)) * 4;
    ctx.fillStyle = side === 'left' ? '#f43f5e' : '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(centerX, roofTopY - 18);
    ctx.lineTo(centerX + 18, roofTopY - 14 + waveOffset);
    ctx.lineTo(centerX, roofTopY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

// Canvas Helper: Draw Central Great Keep
function drawCentralKeep(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  baseY: number,
  width: number,
  height: number
) {
  const topY = baseY - height;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(centerX - width / 2, topY + 20, width, height - 20);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - width / 2, topY + 20, width, height - 20);

  const turretW = 44;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(centerX - turretW / 2, topY - 10, turretW, 30);

  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(centerX, topY - 34);
  ctx.lineTo(centerX + turretW / 2 + 2, topY - 10);
  ctx.lineTo(centerX - turretW / 2 - 2, topY - 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(centerX, topY + 4, 6, 0, Math.PI * 2);
  ctx.fill();

  const merlonW = 16;
  const merlonH = 12;
  const gapW = 12;
  const startX = centerX - width / 2 + 6;
  const endX = centerX + width / 2 - 6;

  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;

  for (let x = startX; x + merlonW <= endX; x += merlonW + gapW) {
    ctx.fillRect(x, topY + 12, merlonW, merlonH);
    ctx.strokeRect(x, topY + 12, merlonW, merlonH);
  }
}

// Canvas Helper: Draw Curtain Wall
function drawCurtainWall(ctx: CanvasRenderingContext2D, startX: number, endX: number, y: number, height: number) {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(startX, y, endX - startX, height);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, y, endX - startX, height);
}

// === 5. PROCEDURAL CANVAS CASTLE ROOF COMPONENT ===
export const CastleRoofCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let animTime = 0;

    const stars = Array.from({ length: 35 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.65,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random(),
      speed: Math.random() * 0.03 + 0.01
    }));

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Deep Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.5, '#0f172a');
      skyGrad.addColorStop(0.85, '#1e1b4b');
      skyGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Moon & Glow
      const moonGrad = ctx.createRadialGradient(width * 0.72, height * 0.28, 4, width * 0.72, height * 0.28, 60);
      moonGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
      moonGrad.addColorStop(0.25, 'rgba(253, 224, 71, 0.4)');
      moonGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(width * 0.72, height * 0.28, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(width * 0.72, height * 0.28, 14, 0, Math.PI * 2);
      ctx.fill();

      // 3. Twinkling Stars
      stars.forEach(s => {
        s.alpha += s.speed;
        const currentAlpha = (Math.sin(s.alpha) + 1) / 2 * 0.8 + 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Distant Background Spires
      drawSpireTower(ctx, width * 0.22, height * 0.85, 34, 90, '#0c1222', '#1e1b4b', false, animTime);
      drawSpireTower(ctx, width * 0.82, height * 0.85, 38, 100, '#0c1222', '#1e1b4b', false, animTime);

      // 5. Foreground Spires & Keep
      const baseGroundY = height;
      drawSpireTower(ctx, width * 0.12, baseGroundY, 68, 140, '#1e293b', '#312e81', true, animTime, 'left');
      drawSpireTower(ctx, width * 0.88, baseGroundY, 64, 135, '#1e293b', '#0e7490', true, animTime, 'right');
      drawCentralKeep(ctx, width * 0.5, baseGroundY, width * 0.52, 120);
      drawCurtainWall(ctx, 0, width, height - 20, 24);

      ctx.restore();
      animTime += 0.03;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={`relative w-full h-44 sm:h-52 overflow-visible select-none pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};


// === 4. DIFFICULTY CARDS & SHIELDS ===
interface DifficultyCardProps {
  speed: 'slow' | 'medium' | 'fast';
  charsPerSec: number;
  speedBonus?: number;
  isSelected?: boolean;
  onClick: () => void;
}

export const DifficultyCard: React.FC<DifficultyCardProps> = ({
  speed,
  charsPerSec,
  speedBonus = 50,
  isSelected = false,
  onClick
}) => {
  if (speed === 'slow') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative group p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center gap-3 cursor-pointer text-center font-mono overflow-hidden ${
          isSelected
            ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.35)] scale-105'
            : 'bg-slate-900/80 hover:bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-400 hover:scale-103 shadow-lg'
        }`}
      >
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>

        {/* Shield Icon */}
        <div className="relative w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
          <span className="text-3xl">🐢</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
        </div>

        {/* Badge & Mode Title */}
        <div className="flex flex-col items-center">
          <span className="text-base font-black text-emerald-300 tracking-wide">慢速模式</span>
          <span className="text-3xs text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
            Breeze Explorer
          </span>
        </div>

        <p className="text-xs text-slate-300 line-clamp-2 max-w-[200px] leading-relaxed">
          怪兽移动缓慢，适合初次打字与熟悉指法的小朋友
        </p>

        {/* Speed Pill */}
        <div className="mt-auto px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-xs font-bold text-emerald-300">
          ⚡ {charsPerSec} 字符/秒
        </div>
      </button>
    );
  }

  if (speed === 'medium') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative group p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center gap-3 cursor-pointer text-center font-mono overflow-hidden ${
          isSelected
            ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.35)] scale-105'
            : 'bg-slate-900/80 hover:bg-amber-950/30 border-amber-500/30 hover:border-amber-400 hover:scale-103 shadow-lg'
        }`}
      >
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none"></div>

        {/* Shield Icon */}
        <div className="relative w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
          <span className="text-3xl">🦊</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping"></div>
        </div>

        {/* Badge & Mode Title */}
        <div className="flex flex-col items-center">
          <span className="text-base font-black text-amber-300 tracking-wide">中速模式</span>
          <span className="text-3xs text-amber-400 font-bold uppercase tracking-wider mt-0.5">
            Standard Adventure
          </span>
        </div>

        <p className="text-xs text-slate-300 line-clamp-2 max-w-[200px] leading-relaxed">
          标准追击节奏，平衡打字速度与准确率的进阶挑战
        </p>

        {/* Speed Pill */}
        <div className="mt-auto px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/40 text-xs font-bold text-amber-300">
          ⚡ {charsPerSec} 字符/秒
        </div>
      </button>
    );
  }

  // Fast mode
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative group p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center gap-3 cursor-pointer text-center font-mono overflow-hidden ${
        isSelected
          ? 'bg-purple-950/70 border-purple-400 ring-2 ring-purple-400/60 shadow-[0_0_25px_rgba(168,85,247,0.35)] scale-105'
          : 'bg-slate-900/80 hover:bg-purple-950/30 border-purple-500/30 hover:border-purple-400 hover:scale-103 shadow-lg'
      }`}
    >
      {/* Top Bonus Tag */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-rose-500 text-[10px] font-black text-slate-950 shadow-sm animate-pulse">
        +{speedBonus} 🪙
      </div>

      {/* Subtle Ambient Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none"></div>

      {/* Shield Icon */}
      <div className="relative w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
        <span className="text-3xl">⚡</span>
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-400 animate-ping"></div>
      </div>

      {/* Badge & Mode Title */}
      <div className="flex flex-col items-center">
        <span className="text-base font-black text-purple-300 tracking-wide">极速冲刺</span>
        <span className="text-3xs text-purple-400 font-bold uppercase tracking-wider mt-0.5">
          Hyper Lightning
        </span>
      </div>

      <p className="text-xs text-slate-300 line-clamp-2 max-w-[200px] leading-relaxed">
        怪兽紧追不舍！通关额外奖赏 +{speedBonus} 探险金币
      </p>

      {/* Speed Pill */}
      <div className="mt-auto px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500/40 text-xs font-bold text-purple-300">
        ⚡ {charsPerSec} 字符/秒
      </div>
    </button>
  );
};


// === 5. PORTAL DOOR & TREASURE CHEST ICONS ===
export const PortalDoorBadge: React.FC<{
  pageIndex: number;
  isCurrent: boolean;
  isPassed: boolean;
}> = ({ pageIndex, isCurrent, isPassed }) => {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all duration-300 ${
        isPassed
          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm'
          : isCurrent
          ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/40 scale-105 shadow-md shadow-cyan-500/20'
          : 'bg-slate-900 border-slate-800 text-slate-600'
      }`}
      title={isPassed ? `Page ${pageIndex + 1} 已开启通过` : `Page ${pageIndex + 1}`}
    >
      <span className={`text-sm ${isPassed ? 'text-emerald-400' : isCurrent ? 'animate-spin text-cyan-400' : 'text-slate-600'}`}>
        {isPassed ? '🌀' : isCurrent ? '✨' : '🔒'}
      </span>
      <span>PAGE {pageIndex + 1}</span>
    </div>
  );
};

export const TreasureChestBadge: React.FC<{
  isPassed: boolean;
  isCurrent: boolean;
}> = ({ isPassed, isCurrent }) => {
  return (
    <div
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all duration-300 ${
        isPassed
          ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/25 scale-105 animate-pulse'
          : isCurrent
          ? 'bg-purple-950/80 border-purple-500 text-purple-300 ring-2 ring-purple-400/40'
          : 'bg-slate-900 border-slate-800 text-slate-600'
      }`}
      title={isPassed ? '终点宝箱已开启！' : '终点藏宝箱'}
    >
      <span className="text-base">{isPassed ? '🏆✨' : '🎁'}</span>
      <span>FINISH 终点</span>
    </div>
  );
};

// === 6. CASTLE FLOOR ROW WITH DOM-MEASURED 1:1 CHARACTER ALIGNMENT ===
export interface CastleFloorRowProps {
  line: { text: string; startCharGlobal: number };
  lineIdx: number;
  totalLines: number;
  chaseCorrectLen: number;
  chaseTypedText: string;
  chaseMonsterPos: number;
  chaseMonsterWaiting: boolean;
  chaseWaitCountdown: number;
  chaseCurrentMonster: string;
  chasePageIdx: number;
  storyChasePagesLength: number;
  currentUserAvatar: string;
  lines: { text: string; startCharGlobal: number }[];
}

export const CastleFloorRow: React.FC<CastleFloorRowProps> = ({
  line,
  lineIdx,
  totalLines,
  chaseCorrectLen,
  chaseTypedText,
  chaseMonsterPos,
  chaseMonsterWaiting,
  chaseWaitCountdown: _chaseWaitCountdown,
  chaseCurrentMonster,
  chasePageIdx,
  storyChasePagesLength,
  currentUserAvatar,
  lines
}) => {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const spanRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const [buddyPixelX, setBuddyPixelX] = React.useState<number | null>(null);
  const [monsterPixelX, setMonsterPixelX] = React.useState<number | null>(null);

  const getLineAndCol = (
    globalIdx: number,
    lineList: { text: string; startCharGlobal: number }[]
  ) => {
    if (!lineList || lineList.length === 0) return { lineIndex: 0, col: 0 };

    for (let i = 0; i < lineList.length; i++) {
      const l = lineList[i];
      const lineLen = l.text.length;
      const lineEnd = l.startCharGlobal + lineLen;

      if (globalIdx >= l.startCharGlobal && globalIdx < lineEnd) {
        return { lineIndex: i, col: globalIdx - l.startCharGlobal };
      }

      if (globalIdx === lineEnd || (i < lineList.length - 1 && globalIdx < lineList[i + 1].startCharGlobal)) {
        if (i < lineList.length - 1) {
          return { lineIndex: i + 1, col: 0 };
        } else {
          return { lineIndex: i, col: lineLen };
        }
      }
    }

    const lastIdx = lineList.length - 1;
    return { lineIndex: lastIdx, col: lineList[lastIdx].text.length };
  };

  const buddyLoc = getLineAndCol(chaseCorrectLen, lines);
  const monsterGlobalChar = Math.floor(chaseMonsterPos);
  const monsterLoc = getLineAndCol(monsterGlobalChar, lines);

  const isBuddyOnLine = buddyLoc.lineIndex === lineIdx;
  const isMonsterOnLine = monsterLoc.lineIndex === lineIdx;
  const isLineCompleted = buddyLoc.lineIndex > lineIdx;
  const isRoofFloor = lineIdx === totalLines - 1;

  const updatePositions = React.useCallback(() => {
    if (!trackRef.current) return;
    const trackRect = trackRef.current.getBoundingClientRect();

    if (isBuddyOnLine) {
      const targetCol = Math.min(buddyLoc.col, line.text.length - 1);
      const spanEl = spanRefs.current[targetCol];
      if (spanEl) {
        const spanRect = spanEl.getBoundingClientRect();
        const x = spanRect.left + spanRect.width / 2 - trackRect.left;
        setBuddyPixelX(Math.max(20, x));
      } else {
        setBuddyPixelX(24);
      }
    } else {
      setBuddyPixelX(null);
    }

    if (isMonsterOnLine) {
      const targetCol = Math.min(monsterLoc.col, line.text.length - 1);
      const spanEl = spanRefs.current[targetCol];
      if (spanEl) {
        const spanRect = spanEl.getBoundingClientRect();
        const x = spanRect.left + spanRect.width / 2 - trackRect.left;
        setMonsterPixelX(Math.max(10, x - 4));
      } else {
        setMonsterPixelX(10);
      }
    } else {
      setMonsterPixelX(null);
    }
  }, [buddyLoc.col, isBuddyOnLine, isMonsterOnLine, line.text.length, monsterLoc.col]);

  React.useEffect(() => {
    updatePositions();
  }, [updatePositions, chaseCorrectLen, chaseMonsterPos]);

  React.useEffect(() => {
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [updatePositions]);

  return (
    <div
      className={`relative rounded-xl p-2.5 sm:p-3 transition-all duration-200 ${
        isBuddyOnLine
          ? 'border-2 border-emerald-500/80 bg-slate-950/95 shadow-lg shadow-emerald-950/40 scale-[1.005]'
          : isLineCompleted
          ? 'border border-emerald-500/30 bg-emerald-950/15 opacity-75'
          : 'border border-slate-700/50 bg-slate-950/50 opacity-40'
      }`}
    >
      {/* Line Text Row with Compact Floor Badge & Char Slots (Strictly 1 Single Horizontal Line) */}
      <div className="text-sm sm:text-base font-bold tracking-wider leading-relaxed font-mono flex flex-nowrap items-center whitespace-nowrap overflow-hidden relative z-10">
        {/* Minimal Floor Badge (e.g. 1F, 2F, 3F, 4F, 5F) */}
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-black mr-2 select-none shrink-0 border ${
            isRoofFloor
              ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
              : isBuddyOnLine
              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 animate-pulse'
              : isLineCompleted
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-900 text-slate-500 border-slate-700'
          }`}
        >
          {isRoofFloor ? '👑 5F' : `${lineIdx + 1}F`}
        </span>

        {Array.from(line.text).map((char, charInLineIdx) => {
          const globalCharIdx = line.startCharGlobal + charInLineIdx;
          const isCorrect = globalCharIdx < chaseCorrectLen;
          const isError = globalCharIdx >= chaseCorrectLen && globalCharIdx < chaseTypedText.length;
          const isCurrentCursor = globalCharIdx === chaseCorrectLen;

          return (
            <span
              key={charInLineIdx}
              ref={(el) => {
                spanRefs.current[charInLineIdx] = el;
              }}
              className={`char-slot ${
                isCorrect
                  ? 'bg-emerald-500/25 text-emerald-400 border-b-2 border-emerald-400 font-extrabold shadow-sm'
                  : isError
                  ? 'bg-rose-500/25 text-rose-300 border-b-2 border-rose-500 animate-pulse font-extrabold'
                  : isLineCompleted
                  ? 'text-emerald-400 font-extrabold'
                  : isBuddyOnLine
                  ? 'text-slate-200'
                  : 'text-slate-500'
              } ${isCurrentCursor ? 'bg-amber-500/30 text-amber-300 border-b-2 border-amber-400 font-extrabold ring-1 ring-amber-400 rounded' : ''}`}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>

      {/* Under-Text Compact Castle Stone Runway Track with Exact DOM 1:1 Character Alignment */}
      <div ref={trackRef} className="h-8 sm:h-9 w-full relative mt-1.5 rounded-lg castle-stone-runway flex items-center overflow-visible">
        {/* Start & Portal Flags */}
        <div className="absolute left-2 text-[11px] select-none z-10 flex items-center gap-1 font-bold text-amber-400/80">
          <span>🕯️</span>
        </div>
        <div className="absolute right-2 text-[11px] select-none z-10 flex items-center gap-1 text-cyan-300 font-bold">
          <span>{isRoofFloor ? (chasePageIdx === storyChasePagesLength - 1 && isLineCompleted ? '🏆✨' : 'PORTAL 🌀') : `🪜 ➔ ${lineIdx + 2}F`}</span>
        </div>

        {/* Monster Sprite (Only appears after initial cooldown timer finishes) */}
        {isMonsterOnLine && monsterPixelX !== null && !chaseMonsterWaiting && (
          <div
            className="absolute z-20 top-1/2 -translate-y-1/2 -translate-x-1/2 character-smooth-pos flex items-center select-none pointer-events-none"
            style={{
              left: `${monsterPixelX}px`
            }}
          >
            <MonsterSprite
              emoji={chaseCurrentMonster}
              isWaiting={false}
              waitCountdown={0}
              distanceToBuddy={Math.max(0, chaseCorrectLen - monsterGlobalChar)}
            />
          </div>
        )}

        {/* Runner Buddy Sprite (Aligned with exact pixel center of currently typed character) */}
        {isBuddyOnLine && buddyPixelX !== null && (
          <div
            className="absolute z-20 top-1/2 -translate-y-1/2 -translate-x-1/2 character-smooth-pos flex items-center select-none pointer-events-none"
            style={{
              left: `${buddyPixelX}px`
            }}
          >
            <RunnerSprite
              avatar={currentUserAvatar || '🦖'}
              isSprinting={chaseTypedText.length > 0}
            />
          </div>
        )}
      </div>
    </div>
  );
};

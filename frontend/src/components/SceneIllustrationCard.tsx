import React from 'react';
import { PictureWritingItem } from '../data/presentSimpleExercises';

interface SceneIllustrationCardProps {
  type: PictureWritingItem['sceneIllustration'];
  title: string;
}

export const SceneIllustrationCard: React.FC<SceneIllustrationCardProps> = ({ type, title }) => {
  const renderScene = () => {
    switch (type) {
      case 'basketball':
        return (
          <svg viewBox="0 0 220 130" className="w-full h-32">
            <rect width="220" height="130" rx="12" fill="#0f172a" />
            <rect x="0" y="96" width="220" height="34" fill="#1e293b" />
            {/* Hoop & Backboard */}
            <rect x="172" y="18" width="6" height="80" fill="#64748b" />
            <rect x="148" y="16" width="32" height="24" rx="2" fill="#f8fafc" stroke="#ef4444" strokeWidth="2.5" />
            <rect x="157" y="23" width="14" height="10" fill="none" stroke="#ef4444" strokeWidth="1.5" />
            <line x1="138" y1="36" x2="152" y2="36" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
            <path d="M139 36 L142 48 L149 48 L151 36" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
            {/* Player (Tom) */}
            <circle cx="72" cy="48" r="11" fill="#fcd34d" />
            <path d="M62 43 Q72 34 82 43" fill="#334155" />
            <rect x="64" y="59" width="16" height="24" rx="4" fill="#3b82f6" />
            {/* Arms reaching up */}
            <path d="M78 63 L98 46" stroke="#fcd34d" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M66 63 L54 74" stroke="#fcd34d" strokeWidth="4.5" strokeLinecap="round" />
            {/* Legs running */}
            <path d="M68 83 L60 104" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round" />
            <path d="M76 83 L86 102" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round" />
            {/* Basketball */}
            <circle cx="110" cy="40" r="9" fill="#f97316" stroke="#7c2d12" strokeWidth="1.5" />
            <path d="M102 40 Q110 34 118 40" fill="none" stroke="#7c2d12" strokeWidth="1.2" />
            <path d="M110 31 L110 49" stroke="#7c2d12" strokeWidth="1.2" />
            {/* Motion arc */}
            <path d="M119 36 Q130 28 140 33" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeDasharray="3 3" />
          </svg>
        );
      case 'dancing':
        return (
          <svg viewBox="0 0 220 130" className="w-full h-32">
            <rect width="220" height="130" rx="12" fill="#1e1b4b" />
            {/* Stage Floor & Spotlights */}
            <polygon points="40,0 90,100 130,100 180,0" fill="#a855f7" opacity="0.14" />
            <rect x="10" y="96" width="200" height="24" rx="4" fill="#312e81" />
            {/* Music Notes */}
            <text x="34" y="42" fontSize="18" fill="#f472b6">🎵</text>
            <text x="166" y="38" fontSize="18" fill="#38bdf8">🎶</text>
            <text x="155" y="72" fontSize="14" fill="#fde047">✨</text>
            {/* Girl (Lily) dancing */}
            <circle cx="110" cy="42" r="10.5" fill="#fde68a" />
            <path d="M99 40 Q110 26 121 40" fill="#78350f" />
            <circle cx="122" cy="39" r="4" fill="#78350f" />
            {/* Dress */}
            <path d="M104 53 L116 53 L126 82 L94 82 Z" fill="#ec4899" />
            {/* Arms in dance pose */}
            <path d="M104 56 L82 44" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
            <path d="M116 56 L136 66" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
            {/* Legs */}
            <path d="M104 82 L98 100" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
            <path d="M115 82 L126 97" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
          </svg>
        );
      case 'reading':
        return (
          <svg viewBox="0 0 220 130" className="w-full h-32">
            <rect width="220" height="130" rx="12" fill="#0c192c" />
            {/* Window & Lamp */}
            <rect x="24" y="18" width="44" height="44" rx="4" fill="#0284c7" opacity="0.35" stroke="#38bdf8" strokeWidth="2" />
            <line x1="46" y1="18" x2="46" y2="62" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="24" y1="40" x2="68" y2="40" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Desk */}
            <rect x="35" y="88" width="150" height="8" rx="3" fill="#92400e" />
            <rect x="46" y="96" width="8" height="24" fill="#78350f" />
            <rect x="166" y="96" width="8" height="24" fill="#78350f" />
            {/* Girl (Amy) sitting & reading */}
            <circle cx="110" cy="44" r="11" fill="#fde68a" />
            <path d="M98 44 Q110 28 122 44 L123 58 L97 58 Z" fill="#451a03" opacity="0.7" />
            <rect x="98" y="55" width="24" height="24" rx="5" fill="#10b981" />
            {/* Open Book */}
            <path d="M88 74 L110 78 L132 74 L132 88 L110 92 L88 88 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="110" y1="78" x2="110" y2="92" stroke="#94a3b8" strokeWidth="1.5" />
          </svg>
        );
      case 'swimming':
        return (
          <svg viewBox="0 0 220 130" className="w-full h-32">
            <rect width="220" height="130" rx="12" fill="#082f49" />
            {/* Water surface */}
            <rect x="0" y="64" width="220" height="66" fill="#0284c7" opacity="0.65" />
            <path d="M0 64 Q25 56 50 64 T100 64 T150 64 T200 64 T220 64" fill="none" stroke="#7dd3fc" strokeWidth="3" />
            <path d="M15 92 Q40 86 65 92 T115 92 T165 92 T215 92" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.6" />
            {/* Swimmer (Jack) */}
            <circle cx="122" cy="56" r="10.5" fill="#fcd34d" />
            {/* Swim cap & goggles */}
            <path d="M112 53 Q122 42 132 53 Z" fill="#ef4444" />
            <rect x="123" y="53" width="8" height="4" rx="1" fill="#0f172a" />
            {/* Body & Arm Stroke */}
            <path d="M74 66 Q98 62 115 65" stroke="#fcd34d" strokeWidth="7" strokeLinecap="round" />
            <path d="M108 62 L132 42 L148 54" fill="none" stroke="#fcd34d" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Splash drops */}
            <circle cx="148" cy="60" r="2.5" fill="#e0f2fe" />
            <circle cx="64" cy="62" r="2.5" fill="#e0f2fe" />
            <circle cx="56" cy="56" r="2" fill="#e0f2fe" />
          </svg>
        );
      case 'riding':
        return (
          <svg viewBox="0 0 220 130" className="w-full h-32">
            <rect width="220" height="130" rx="12" fill="#064e3b" opacity="0.85" />
            <rect x="0" y="96" width="220" height="34" fill="#334155" />
            {/* Sun */}
            <circle cx="190" cy="24" r="12" fill="#fde047" />
            {/* Kid 1 on Bike */}
            <circle cx="52" cy="94" r="12" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
            <circle cx="88" cy="94" r="12" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
            <path d="M52 94 L66 76 L84 76 L88 94 M66 76 L72 94 L52 94" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="68" cy="52" r="8" fill="#fcd34d" />
            <path d="M62 49 Q68 42 74 49" fill="#ef4444" />
            <path d="M68 60 L66 76" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
            <path d="M68 64 L82 72" stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round" />
            {/* Kid 2 on Bike */}
            <circle cx="132" cy="94" r="12" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
            <circle cx="168" cy="94" r="12" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
            <path d="M132 94 L146 76 L164 76 L168 94 M146 76 L152 94 L132 94" fill="none" stroke="#f472b6" strokeWidth="2.5" />
            <circle cx="148" cy="52" r="8" fill="#fde68a" />
            <path d="M142 49 Q148 42 154 49" fill="#10b981" />
            <path d="M148 60 L146 76" stroke="#ec4899" strokeWidth="6" strokeLinecap="round" />
            <path d="M148 64 L162 72" stroke="#fde68a" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );
      case 'cooking':
        return (
          <svg viewBox="0 0 220 130" className="w-full h-32">
            <rect width="220" height="130" rx="12" fill="#1e293b" />
            {/* Kitchen counter & stove */}
            <rect x="20" y="84" width="180" height="40" rx="4" fill="#475569" />
            <rect x="115" y="76" width="44" height="8" fill="#0f172a" />
            {/* Cooking Pot & Steam */}
            <rect x="122" y="58" width="30" height="18" rx="3" fill="#94a3b8" />
            <path d="M128 52 Q125 44 130 38" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
            <path d="M139 50 Q142 42 137 35" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
            {/* Mum with apron & spatula */}
            <circle cx="80" cy="40" r="10.5" fill="#fde68a" />
            <path d="M70 38 Q80 26 90 38" fill="#78350f" />
            <rect x="70" y="51" width="20" height="33" rx="4" fill="#f59e0b" />
            <rect x="73" y="58" width="14" height="24" rx="2" fill="#f8fafc" />
            <path d="M88 58 L114 66" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
            <line x1="112" y1="66" x2="128" y2="59" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case 'sleeping':
        return (
          <svg viewBox="0 0 220 130" className="w-full h-32">
            <rect width="220" height="130" rx="12" fill="#0f172a" />
            {/* Cushion */}
            <ellipse cx="110" cy="96" rx="68" ry="16" fill="#6366f1" opacity="0.45" />
            <ellipse cx="110" cy="92" rx="60" ry="12" fill="#4f46e5" />
            {/* Sleeping Cat curled up */}
            <ellipse cx="106" cy="80" rx="28" ry="16" fill="#fb923c" />
            <circle cx="130" cy="76" r="12" fill="#fb923c" />
            {/* Cat Ears */}
            <polygon points="122,67 125,57 130,66" fill="#ea580c" />
            <polygon points="132,66 138,57 140,68" fill="#ea580c" />
            {/* Closed eyes */}
            <path d="M126 76 Q128 79 131 76" fill="none" stroke="#1e293b" strokeWidth="1.5" />
            <path d="M134 76 Q136 79 139 76" fill="none" stroke="#1e293b" strokeWidth="1.5" />
            {/* Tail */}
            <path d="M80 84 Q68 78 76 68" fill="none" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />
            {/* Zzz */}
            <text x="148" y="54" fontSize="14" fontWeight="bold" fill="#93c5fd">Z</text>
            <text x="160" y="42" fontSize="17" fontWeight="bold" fill="#bae6fd">z</text>
            <text x="174" y="30" fontSize="20" fontWeight="bold" fill="#e0f2fe">z</text>
          </svg>
        );
      case 'waiting_train':
        return (
          <svg viewBox="0 0 220 130" className="w-full h-32">
            <rect width="220" height="130" rx="12" fill="#172554" />
            {/* Platform & Yellow Line */}
            <rect x="0" y="92" width="220" height="38" fill="#475569" />
            <rect x="0" y="92" width="220" height="4" fill="#eab308" />
            {/* Platform Sign */}
            <rect x="18" y="20" width="66" height="20" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="51" y="34" fontSize="10" fontWeight="bold" fill="#f8fafc" textAnchor="middle">PLATFORM</text>
            {/* Clock */}
            <circle cx="184" cy="30" r="12" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
            <line x1="184" y1="30" x2="184" y2="23" stroke="#0f172a" strokeWidth="1.8" />
            <line x1="184" y1="30" x2="190" y2="30" stroke="#0f172a" strokeWidth="1.8" />
            {/* Person 1 waiting */}
            <circle cx="96" cy="54" r="8" fill="#fcd34d" />
            <rect x="89" y="62" width="14" height="22" rx="3" fill="#06b6d4" />
            <line x1="92" y1="84" x2="92" y2="92" stroke="#1e293b" strokeWidth="4" />
            <line x1="100" y1="84" x2="100" y2="92" stroke="#1e293b" strokeWidth="4" />
            {/* Suitcase */}
            <rect x="74" y="76" width="11" height="14" rx="2" fill="#f97316" />
            {/* Person 2 waiting */}
            <circle cx="132" cy="56" r="8" fill="#fde68a" />
            <rect x="125" y="64" width="14" height="20" rx="3" fill="#ec4899" />
            <line x1="128" y1="84" x2="128" y2="92" stroke="#1e293b" strokeWidth="4" />
            <line x1="136" y1="84" x2="136" y2="92" stroke="#1e293b" strokeWidth="4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/80 shadow-inner">
      {renderScene()}
      <div className="px-3 py-1 bg-slate-900/90 border-t border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
        <span>🖼️ 场景：{title}</span>
        <span className="text-slate-500">Describe the action</span>
      </div>
    </div>
  );
};

import React from 'react';
import { SceneWritingId } from '../data/sceneWritingData';

interface SceneWritingIllustrationProps {
  sceneId: SceneWritingId;
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspotId: string) => void;
}

export const SceneWritingIllustration: React.FC<SceneWritingIllustrationProps> = ({
  sceneId,
  selectedHotspotId,
  onSelectHotspot,
}) => {
  const ringClass = (id: string) =>
    selectedHotspotId === id
      ? 'stroke-amber-300 stroke-[3] opacity-100'
      : 'stroke-cyan-300/70 stroke-[2] opacity-80 hover:opacity-100';

  if (sceneId === 'sw_park') {
    return (
      <svg
        viewBox="0 0 640 290"
        className="w-full h-auto rounded-2xl border border-slate-700/80 bg-slate-950 shadow-inner select-none"
        role="img"
        aria-label="A Day in the Park scene illustration"
      >
        {/* Sky & Sun */}
        <defs>
          <linearGradient id="parkSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <rect width="640" height="175" fill="url(#parkSky)" />
        <circle cx="570" cy="46" r="24" fill="#fde047" />
        <ellipse cx="145" cy="44" rx="34" ry="13" fill="#ffffff" opacity="0.85" />
        <ellipse cx="170" cy="48" rx="22" ry="11" fill="#ffffff" opacity="0.85" />
        <ellipse cx="420" cy="56" rx="30" ry="11" fill="#ffffff" opacity="0.8" />

        {/* Grass, Path & Lake */}
        <rect x="0" y="165" width="640" height="125" fill="#22c55e" />
        <path d="M0 242 Q220 218 440 236 T640 228 L640 264 Q440 272 220 254 T0 276 Z" fill="#d6d3d1" />
        <ellipse cx="520" cy="202" rx="95" ry="26" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="2" />

        {/* Big Tree (Left) */}
        <rect x="92" y="118" width="22" height="72" rx="4" fill="#78350f" />
        <circle cx="103" cy="96" r="46" fill="#15803d" />
        <circle cx="74" cy="112" r="30" fill="#16a34a" />
        <circle cx="132" cy="110" r="30" fill="#16a34a" />

        {/* Bench */}
        <rect x="330" y="176" width="54" height="8" rx="2" fill="#92400e" />
        <rect x="336" y="184" width="5" height="14" fill="#451a03" />
        <rect x="374" y="184" width="5" height="14" fill="#451a03" />

        {/* Hotspot 1: Girl under the tree reading */}
        <g
          className="cursor-pointer"
          onClick={() => onSelectHotspot('park_read')}
        >
          <circle cx="128" cy="186" r="28" fill="#0f172a" fillOpacity="0.18" className={ringClass('park_read')} />
          <circle cx="128" cy="171" r="9" fill="#fde68a" />
          <path d="M118 169 Q128 158 138 169" fill="#451a03" />
          <rect x="120" y="180" width="16" height="14" rx="3" fill="#facc15" />
          <path d="M117 194 L139 194 L142 203 L114 203 Z" fill="#ec4899" />
          <rect x="122" y="187" width="14" height="9" rx="1" fill="#ffffff" stroke="#64748b" strokeWidth="1" />
          <text x="128" y="220" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
            ① Girl
          </text>
        </g>

        {/* Hotspot 2: Me flying a kite */}
        <g
          className="cursor-pointer"
          onClick={() => onSelectHotspot('park_kite')}
        >
          <circle cx="240" cy="175" r="30" fill="#0f172a" fillOpacity="0.18" className={ringClass('park_kite')} />
          {/* Kite & string */}
          <line x1="252" y1="162" x2="296" y2="76" stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="3 2" />
          <polygon points="296,52 314,72 296,92 278,72" fill="#f43f5e" stroke="#fde047" strokeWidth="2" />
          <path d="M296 92 Q290 105 302 114" fill="none" stroke="#fde047" strokeWidth="2" />
          {/* Person */}
          <circle cx="238" cy="156" r="9.5" fill="#fcd34d" />
          <rect x="230" y="166" width="16" height="19" rx="3" fill="#2563eb" />
          <path d="M244 170 L254 160" stroke="#fcd34d" strokeWidth="4" strokeLinecap="round" />
          <line x1="234" y1="185" x2="230" y2="201" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          <line x1="242" y1="185" x2="246" y2="201" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          <text x="240" y="216" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
            ② Me (Kite)
          </text>
        </g>

        {/* Hotspot 3: Boy riding a red bike */}
        <g
          className="cursor-pointer"
          onClick={() => onSelectHotspot('park_bike')}
        >
          <circle cx="225" cy="245" r="30" fill="#0f172a" fillOpacity="0.18" className={ringClass('park_bike')} />
          <circle cx="206" cy="256" r="11" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          <circle cx="244" cy="256" r="11" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          <path d="M206 256 L220 240 L238 240 L244 256 M220 240 L226 256 L206 256" fill="none" stroke="#ef4444" strokeWidth="2.5" />
          <circle cx="222" cy="222" r="8" fill="#fcd34d" />
          <rect x="215" y="230" width="14" height="14" rx="3" fill="#16a34a" />
          <text x="225" y="282" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
            ③ Boy (Bike)
          </text>
        </g>

        {/* Hotspot 4: Man walking dog */}
        <g
          className="cursor-pointer"
          onClick={() => onSelectHotspot('park_dog')}
        >
          <circle cx="395" cy="222" r="30" fill="#0f172a" fillOpacity="0.18" className={ringClass('park_dog')} />
          <circle cx="385" cy="198" r="8.5" fill="#fde68a" />
          <rect x="377" y="207" width="16" height="22" rx="3" fill="#92400e" />
          <line x1="381" y1="229" x2="379" y2="244" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          <line x1="389" y1="229" x2="392" y2="244" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          {/* Leash & Dog */}
          <line x1="393" y1="216" x2="412" y2="232" stroke="#334155" strokeWidth="1.5" />
          <ellipse cx="418" cy="236" rx="10" ry="6" fill="#d97706" />
          <circle cx="428" cy="231" r="5" fill="#d97706" />
          <text x="398" y="262" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
            ④ Man & Dog
          </text>
        </g>

        {/* Hotspot 5: Two kids running near lake */}
        <g
          className="cursor-pointer"
          onClick={() => onSelectHotspot('park_run')}
        >
          <circle cx="515" cy="166" r="30" fill="#0f172a" fillOpacity="0.18" className={ringClass('park_run')} />
          {/* Kid A */}
          <circle cx="502" cy="150" r="7.5" fill="#fcd34d" />
          <rect x="496" y="158" width="12" height="14" rx="2" fill="#f97316" />
          <line x1="499" y1="172" x2="493" y2="184" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="505" y1="172" x2="511" y2="183" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          {/* Kid B */}
          <circle cx="529" cy="152" r="7.5" fill="#fde68a" />
          <rect x="523" y="160" width="12" height="14" rx="2" fill="#a855f7" />
          <line x1="526" y1="174" x2="520" y2="185" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="532" y1="174" x2="538" y2="184" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          <text x="515" y="198" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
            ⑤ Kids Running
          </text>
        </g>
      </svg>
    );
  }

  if (sceneId === 'sw_playground') {
    return (
      <svg
        viewBox="0 0 640 290"
        className="w-full h-auto rounded-2xl border border-slate-700/80 bg-slate-950 shadow-inner select-none"
        role="img"
        aria-label="Fun on the Playground scene illustration"
      >
        <rect width="640" height="125" fill="#0ea5e9" />
        <circle cx="575" cy="40" r="22" fill="#fde047" />
        {/* School building silhouette */}
        <rect x="30" y="52" width="190" height="73" fill="#cbd5e1" />
        <rect x="50" y="68" width="24" height="22" fill="#38bdf8" />
        <rect x="92" y="68" width="24" height="22" fill="#38bdf8" />
        <rect x="134" y="68" width="24" height="22" fill="#38bdf8" />
        <rect x="176" y="68" width="24" height="22" fill="#38bdf8" />

        {/* Playground court & red track */}
        <rect x="0" y="125" width="640" height="165" fill="#10b981" />
        <rect x="140" y="142" width="240" height="118" rx="8" fill="#f59e0b" opacity="0.85" stroke="#ffffff" strokeWidth="3" />
        <circle cx="260" cy="201" r="24" fill="none" stroke="#ffffff" strokeWidth="2.5" />
        {/* Running track */}
        <rect x="0" y="256" width="640" height="34" fill="#dc2626" />
        <line x1="0" y1="273" x2="640" y2="273" stroke="#ffffff" strokeWidth="2" strokeDasharray="10 8" />

        {/* Hoop */}
        <rect x="372" y="138" width="6" height="58" fill="#475569" />
        <rect x="352" y="134" width="26" height="18" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />
        <line x1="342" y1="150" x2="354" y2="150" stroke="#f97316" strokeWidth="3" />

        {/* Tree on right */}
        <rect x="526" y="112" width="18" height="56" fill="#78350f" />
        <circle cx="535" cy="96" r="36" fill="#15803d" />

        {/* Hotspot 1: Boys playing basketball */}
        <g className="cursor-pointer" onClick={() => onSelectHotspot('pg_basketball')}>
          <circle cx="282" cy="186" r="38" fill="#0f172a" fillOpacity="0.18" className={ringClass('pg_basketball')} />
          <circle cx="262" cy="168" r="9" fill="#fcd34d" />
          <rect x="255" y="177" width="14" height="18" rx="3" fill="#2563eb" />
          <line x1="258" y1="195" x2="254" y2="210" stroke="#0f172a" strokeWidth="4" />
          <line x1="266" y1="195" x2="270" y2="210" stroke="#0f172a" strokeWidth="4" />
          <circle cx="302" cy="170" r="9" fill="#fde68a" />
          <rect x="295" y="179" width="14" height="18" rx="3" fill="#1d4ed8" />
          <line x1="298" y1="197" x2="294" y2="212" stroke="#0f172a" strokeWidth="4" />
          <line x1="306" y1="197" x2="310" y2="212" stroke="#0f172a" strokeWidth="4" />
          <circle cx="284" cy="156" r="8" fill="#ea580c" stroke="#7c2d12" strokeWidth="1.5" />
          <text x="282" y="232" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
            ① Basketball
          </text>
        </g>

        {/* Hotspot 2: Girl running on track */}
        <g className="cursor-pointer" onClick={() => onSelectHotspot('pg_run')}>
          <circle cx="448" cy="252" r="28" fill="#0f172a" fillOpacity="0.18" className={ringClass('pg_run')} />
          <circle cx="448" cy="236" r="8.5" fill="#fde68a" />
          <rect x="441" y="245" width="14" height="14" rx="3" fill="#ef4444" />
          <line x1="444" y1="259" x2="435" y2="272" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          <line x1="452" y1="259" x2="462" y2="270" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          <text x="448" y="286" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
            ② Running Girl
          </text>
        </g>

        {/* Hotspot 3: Friends talking near tree */}
        <g className="cursor-pointer" onClick={() => onSelectHotspot('pg_talk')}>
          <circle cx="510" cy="196" r="34" fill="#0f172a" fillOpacity="0.18" className={ringClass('pg_talk')} />
          <circle cx="496" cy="180" r="8.5" fill="#fcd34d" />
          <rect x="489" y="189" width="14" height="17" rx="3" fill="#9333ea" />
          <line x1="493" y1="206" x2="493" y2="218" stroke="#1d4ed8" strokeWidth="4" />
          <line x1="500" y1="206" x2="500" y2="218" stroke="#1d4ed8" strokeWidth="4" />
          <circle cx="524" cy="180" r="8.5" fill="#fde68a" />
          <rect x="517" y="189" width="14" height="17" rx="3" fill="#06b6d4" />
          <line x1="521" y1="206" x2="521" y2="218" stroke="#1e293b" strokeWidth="4" />
          <line x1="528" y1="206" x2="528" y2="218" stroke="#1e293b" strokeWidth="4" />
          <text x="510" y="236" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
            ③ Friends Talking
          </text>
        </g>

        {/* Hotspot 4: Me jumping / playing */}
        <g className="cursor-pointer" onClick={() => onSelectHotspot('pg_jump')}>
          <circle cx="78" cy="196" r="32" fill="#0f172a" fillOpacity="0.18" className={ringClass('pg_jump')} />
          <path d="M58 188 Q78 228 98 188" fill="none" stroke="#fde047" strokeWidth="2" />
          <circle cx="78" cy="176" r="9" fill="#fcd34d" />
          <rect x="70" y="185" width="16" height="17" rx="3" fill="#f8fafc" />
          <line x1="74" y1="202" x2="70" y2="214" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          <line x1="82" y1="202" x2="86" y2="214" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          <text x="78" y="234" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
            ④ Me (Jumping)
          </text>
        </g>
      </svg>
    );
  }

  // sw_concert
  return (
    <svg
      viewBox="0 0 640 290"
      className="w-full h-auto rounded-2xl border border-slate-700/80 bg-slate-950 shadow-inner select-none"
      role="img"
      aria-label="At the Music Show scene illustration"
    >
      {/* Night club / concert background & Spotlights */}
      <rect width="640" height="290" fill="#0f172a" />
      <polygon points="80,0 180,175 260,175 140,0" fill="#ec4899" opacity="0.18" />
      <polygon points="560,0 380,175 460,175 500,0" fill="#06b6d4" opacity="0.18" />
      <polygon points="300,0 260,175 380,175 340,0" fill="#a855f7" opacity="0.2" />

      {/* Stage Platform */}
      <rect x="65" y="148" width="510" height="32" rx="6" fill="#312e81" stroke="#818cf8" strokeWidth="2" />
      <text x="115" y="42" fontSize="22" fill="#f472b6">🎵</text>
      <text x="510" y="48" fontSize="22" fill="#38bdf8">🎶</text>
      <text x="320" y="34" fontSize="12" fontWeight="bold" fill="#fde047" textAnchor="middle">
        ★ LIVE MUSIC STAGE ★
      </text>

      {/* Hotspot 1: Singer on stage */}
      <g className="cursor-pointer" onClick={() => onSelectHotspot('con_singer')}>
        <circle cx="240" cy="112" r="38" fill="#ffffff" fillOpacity="0.06" className={ringClass('con_singer')} />
        <circle cx="240" cy="92" r="10.5" fill="#fde68a" />
        <path d="M229 90 Q240 76 251 90" fill="#78350f" />
        <path d="M232 103 L248 103 L258 134 L222 134 Z" fill="#ec4899" />
        <line x1="235" y1="134" x2="233" y2="148" stroke="#fde68a" strokeWidth="4" />
        <line x1="245" y1="134" x2="247" y2="148" stroke="#fde68a" strokeWidth="4" />
        {/* Mic */}
        <line x1="252" y1="108" x2="262" y2="96" stroke="#cbd5e1" strokeWidth="2.5" />
        <circle cx="264" cy="94" r="3.5" fill="#94a3b8" />
        <text x="240" y="168" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#f9a8d4">
          ① Singer
        </text>
      </g>

      {/* Hotspot 2: DJ behind desk */}
      <g className="cursor-pointer" onClick={() => onSelectHotspot('con_dj')}>
        <circle cx="430" cy="112" r="38" fill="#ffffff" fillOpacity="0.06" className={ringClass('con_dj')} />
        <circle cx="430" cy="94" r="10" fill="#fcd34d" />
        <rect x="422" y="91" width="16" height="4" rx="1" fill="#0f172a" />
        <rect x="418" y="105" width="24" height="22" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
        {/* DJ Desk */}
        <rect x="394" y="122" width="72" height="26" rx="4" fill="#334155" stroke="#06b6d4" strokeWidth="1.5" />
        <circle cx="414" cy="134" r="7" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
        <circle cx="446" cy="134" r="7" fill="#0f172a" stroke="#f472b6" strokeWidth="1.5" />
        <text x="430" y="168" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#67e8f9">
          ② DJ
        </text>
      </g>

      {/* Hotspot 3: Crowd dancing in front of stage */}
      <g className="cursor-pointer" onClick={() => onSelectHotspot('con_crowd')}>
        <circle cx="190" cy="232" r="42" fill="#ffffff" fillOpacity="0.06" className={ringClass('con_crowd')} />
        {[162, 190, 218].map((cx, i) => (
          <g key={cx}>
            <circle cx={cx} cy={214 + (i % 2) * 4} r="8.5" fill={i === 1 ? '#fde68a' : '#fcd34d'} />
            <rect
              x={cx - 8}
              y={224 + (i % 2) * 4}
              width="16"
              height="20"
              rx="3"
              fill={i === 0 ? '#06b6d4' : i === 1 ? '#a855f7' : '#f97316'}
            />
            <line x1={cx - 7} y1={226} x2={cx - 14} y2={212} stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
            <line x1={cx + 7} y1={226} x2={cx + 14} y2={212} stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
        <text x="190" y="276" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#c4b5fd">
          ③ Crowd Dancing
        </text>
      </g>

      {/* Hotspot 4: Me clapping in the middle of the crowd */}
      <g className="cursor-pointer" onClick={() => onSelectHotspot('con_me')}>
        <circle cx="425" cy="232" r="38" fill="#ffffff" fillOpacity="0.06" className={ringClass('con_me')} />
        <circle cx="425" cy="212" r="9.5" fill="#fcd34d" />
        <rect x="415" y="222" width="20" height="22" rx="4" fill="#facc15" />
        <line x1="419" y1="244" x2="417" y2="258" stroke="#2563eb" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="431" y1="244" x2="433" y2="258" stroke="#2563eb" strokeWidth="4.5" strokeLinecap="round" />
        <text x="425" y="276" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fde047">
          ④ Me (Clapping)
        </text>
      </g>
    </svg>
  );
};

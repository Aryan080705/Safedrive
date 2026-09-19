import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { TrendDataPoint } from '../types';

interface RiskTrendChartProps {
  history: TrendDataPoint[];
  currentScore: number;
}

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({
  history,
  currentScore,
}) => {
  // SVG dimensions
  const width = 600;
  const height = 110;
  const padding = { top: 14, right: 14, bottom: 20, left: 32 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Points mapping
  const points =
    history.length > 1
      ? history
      : [
          { timestamp: Date.now() - 1000, score: currentScore, tier: 'LOW' as const },
          { timestamp: Date.now(), score: currentScore, tier: 'LOW' as const },
        ];

  const polylineCoords = points
    .map((pt, idx) => {
      const x = padding.left + (idx / Math.max(1, points.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - (pt.score / 100) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaCoords = `${padding.left},${padding.top + innerHeight} ${polylineCoords} ${
    padding.left + innerWidth
  },${padding.top + innerHeight}`;

  // Current stroke color based on latest score (RoadGuard AI Olive / Gold Palette)
  const strokeColor =
    currentScore >= 85
      ? '#D94B45'
      : currentScore >= 65
      ? '#B8892D'
      : currentScore >= 40
      ? '#D8C9A8'
      : '#5D9B64';

  return (
    <div className="hud-card p-4 flex flex-col justify-between border-white/[0.08]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#B8892D]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5EFE3]">
            REAL-TIME RISK TREND (ROLLING 45S)
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#777C6F]">
          INDEX: <strong style={{ color: strokeColor }} className="text-sm font-black">{currentScore}</strong> / 100
        </span>
      </div>

      <div className="w-full relative h-[100px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines & labels */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left + innerWidth}
            y2={padding.top}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="2 2"
            strokeWidth="0.8"
          />
          <text
            x={padding.left - 6}
            y={padding.top + 3}
            textAnchor="end"
            fill="#7F8995"
            fontSize="9"
            fontFamily="monospace"
          >
            100
          </text>

          {/* High risk threshold (65) */}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight * 0.35}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight * 0.35}
            stroke="rgba(184, 137, 45, 0.45)"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <text
            x={padding.left - 6}
            y={padding.top + innerHeight * 0.35 + 3}
            textAnchor="end"
            fill="#B8892D"
            fontSize="9"
            fontFamily="monospace"
          >
            65
          </text>

          {/* Moderate threshold (40) */}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight * 0.6}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight * 0.6}
            stroke="rgba(216, 201, 168, 0.35)"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <text
            x={padding.left - 6}
            y={padding.top + innerHeight * 0.6 + 3}
            textAnchor="end"
            fill="#D8C9A8"
            fontSize="9"
            fontFamily="monospace"
          >
            40
          </text>

          {/* Baseline (0) */}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight}
            stroke="rgba(245, 239, 227, 0.12)"
            strokeWidth="1"
          />
          <text
            x={padding.left - 6}
            y={padding.top + innerHeight + 3}
            textAnchor="end"
            fill="#777C6F"
            fontSize="9"
            fontFamily="monospace"
          >
            0
          </text>

          {/* Area Fill */}
          <polygon points={areaCoords} fill="url(#trendGradient)" />

          {/* Glowing Polyline */}
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            points={polylineCoords}
          />

          {/* Current head dot */}
          {points.length > 0 && (
            <circle
              cx={padding.left + innerWidth}
              cy={padding.top + innerHeight - (currentScore / 100) * innerHeight}
              r="4.5"
              fill={strokeColor}
              stroke="#090a0e"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-1 border-t border-zinc-800">
        <span>-45s WINDOW</span>
        <span>-30s</span>
        <span>-15s</span>
        <span className="text-zinc-300 font-bold">LIVE STATE</span>
      </div>
    </div>
  );
};

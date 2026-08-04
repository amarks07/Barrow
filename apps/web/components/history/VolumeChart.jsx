"use client";

import { fmtNum } from "../../lib/units";

// Last 10 sessions of weight × reps (or cardio distance) for an exercise.
export function VolumeChart({ data }) {
  const W = 320, H = 130, padX = 14, padTop = 22, padBottom = 20;
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;
  const values = data.map((d) => d.volume);
  const maxV = Math.max(...values);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? padX + plotW / 2 : padX + (i / (data.length - 1)) * plotW;
    const y = padTop + (1 - (d.volume - minV) / range) * plotH;
    return { ...d, x, y };
  });
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const fmtVolume = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : fmtNum(Math.round(v)));
  const fmtShortDate = (dateKey) => {
    const [, m, d] = dateKey.split("-").map(Number);
    return `${m}/${d}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="tabular">
      <line x1={padX} y1={padTop + plotH} x2={W - padX} y2={padTop + plotH} stroke="var(--line)" strokeWidth="1" />
      {data.length > 1 && <polyline points={linePoints} fill="none" stroke="var(--line)" strokeWidth="1.5" />}
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <g key={p.dateKey}>
            <circle cx={p.x} cy={p.y} r={isLast ? 3.5 : 2.75} fill={isLast ? "var(--accent)" : "var(--text-dim)"} />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="8" fill={isLast ? "var(--accent)" : "var(--text-dim)"}>
              {fmtVolume(p.volume)}
            </text>
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="8" fill="var(--text-dim)">
              {fmtShortDate(p.dateKey)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

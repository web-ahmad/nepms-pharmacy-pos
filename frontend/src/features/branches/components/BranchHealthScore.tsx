'use client';
// features/branches/components/BranchHealthScore.tsx
// Circular progress indicator for the branch health score (0-100).

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  score: number;
  size?: number;
  showLabel?: boolean;
}

function getColor(score: number) {
  if (score >= 80) return { stroke: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', label: 'Healthy' };
  if (score >= 60) return { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400',  label: 'Fair' };
  if (score >= 40) return { stroke: '#f97316', text: 'text-orange-600 dark:text-orange-400', label: 'Poor' };
  return { stroke: '#ef4444', text: 'text-red-600 dark:text-red-400', label: 'Critical' };
}

export function BranchHealthScore({ score, size = 64, showLabel = true }: Props) {
  const clamped = Math.min(100, Math.max(0, score));
  const { stroke, text, label } = getColor(clamped);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            className="text-zinc-200 dark:text-zinc-700"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold tabular-nums ${text}`}>
            {Math.round(clamped)}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${text}`}>{label}</span>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { getTaskAgeInfo } from '@/lib/date-utils';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AgeBadgeProps {
  sourceCreatedAt: string;
  statusUpdatedAt: string;
  isDone?: boolean;
}

export function AgeBadge({ sourceCreatedAt, statusUpdatedAt, isDone = false }: AgeBadgeProps) {
  const { createdAgeText, stalledAgeText, urgency, totalDays, stalledDays } = getTaskAgeInfo(
    sourceCreatedAt,
    statusUpdatedAt,
    isDone
  );

  if (isDone) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
        <CheckCircle2 className="w-3 h-3" />
        <span>Done</span>
      </div>
    );
  }

  const badgeStyles = {
    fresh: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
    warning: 'bg-amber-950/40 text-amber-300 border-amber-700/50',
    critical: 'bg-rose-950/50 text-rose-300 border-rose-700/60 shadow-sm shadow-rose-950 animate-pulse',
    archived: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  }[urgency];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${badgeStyles}`}
      title={`Age: ${createdAgeText} (${totalDays}d ago) • In this column: ${stalledAgeText} (${stalledDays}d)`}
    >
      {urgency === 'critical' ? (
        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
      ) : (
        <Clock className="w-3 h-3 shrink-0 opacity-70" />
      )}
      <span>Age {createdAgeText}</span>
      {stalledDays > 1 && (
        <span className="opacity-70 text-[10px] pl-0.5 border-l border-current/30">
          {stalledAgeText} here
        </span>
      )}
    </div>
  );
}

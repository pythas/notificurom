import { differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export type AgeUrgency = 'fresh' | 'warning' | 'critical' | 'archived';

export interface AgeInfo {
  createdAgeText: string;
  stalledAgeText: string;
  totalDays: number;
  stalledDays: number;
  urgency: AgeUrgency;
}

export function formatRelativeShort(dateString: string): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    const now = new Date();
    
    const minutes = differenceInMinutes(now, date);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = differenceInHours(now, date);
    if (hours < 24) return `${hours}h`;
    
    const days = differenceInDays(now, date);
    if (days < 30) return `${days}d`;
    
    const months = Math.floor(days / 30);
    return `${months}mo`;
  } catch {
    return 'unknown';
  }
}

export function getTaskAgeInfo(
  sourceCreatedAt: string,
  statusUpdatedAt: string,
  isDone: boolean = false
): AgeInfo {
  if (isDone) {
    return {
      createdAgeText: formatRelativeShort(sourceCreatedAt),
      stalledAgeText: formatRelativeShort(statusUpdatedAt),
      totalDays: 0,
      stalledDays: 0,
      urgency: 'archived',
    };
  }

  let totalDays = 0;
  let stalledDays = 0;

  try {
    const createdDate = parseISO(sourceCreatedAt);
    const now = new Date();
    totalDays = differenceInDays(now, createdDate);
  } catch {
    totalDays = 0;
  }

  try {
    const statusDate = parseISO(statusUpdatedAt);
    const now = new Date();
    stalledDays = differenceInDays(now, statusDate);
  } catch {
    stalledDays = 0;
  }

  let urgency: AgeUrgency = 'fresh';
  // If created > 5 days ago or stuck in non-inbox/non-done column > 4 days
  if (totalDays >= 7 || stalledDays >= 5) {
    urgency = 'critical';
  } else if (totalDays >= 3 || stalledDays >= 2) {
    urgency = 'warning';
  } else {
    urgency = 'fresh';
  }

  return {
    createdAgeText: formatRelativeShort(sourceCreatedAt),
    stalledAgeText: formatRelativeShort(statusUpdatedAt),
    totalDays,
    stalledDays,
    urgency,
  };
}

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

export function parseDate(dateInput: string | number | Date): Date {
  return dateInput instanceof Date ? dateInput : new Date(dateInput);
}

export function formatRelativeShort(dateString: string | number | Date): string {
  try {
    const date = parseDate(dateString);
    const time = date.getTime();
    if (Number.isNaN(time)) return 'unknown';

    const now = Date.now();
    const diffMs = Math.max(0, now - time);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d`;

    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo`;
  } catch {
    return 'unknown';
  }
}

export function getDaysDifference(pastDateString: string | number | Date): number {
  try {
    const date = parseDate(pastDateString);
    const time = date.getTime();
    if (Number.isNaN(time)) return 0;
    const now = Date.now();
    return Math.max(0, Math.floor((now - time) / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
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

  const totalDays = getDaysDifference(sourceCreatedAt);
  const stalledDays = getDaysDifference(statusUpdatedAt);

  let urgency: AgeUrgency = 'fresh';
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

import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface AppConfig {
  githubPat: string;
  githubQueries: string[];
  autoArchiveClosed: boolean; // Auto-move closed/merged PRs/issues to 'done'
  syncIntervalMinutes: number;
}

const DEFAULT_GITHUB_QUERIES = [
  'is:open is:issue assignee:@me',
  'is:open is:pr assignee:@me',
  'is:open is:pr review-requested:@me',
];

export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  try {
    const result = db.select().from(settings).where(eq(settings.key, key)).get();
    if (result && result.value !== undefined) {
      return result.value;
    }
  } catch {
    // ignore db read errors during bootstrap
  }
  return defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  db.insert(settings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: now },
    })
    .run();
}

export async function getAppConfig(): Promise<AppConfig> {
  const envPat = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN || '';
  const dbPat = await getSetting('github_pat', '');
  const githubPat = dbPat || envPat;

  const dbQueries = await getSetting('github_queries', '');
  let githubQueries = DEFAULT_GITHUB_QUERIES;
  if (dbQueries) {
    try {
      const parsed = JSON.parse(dbQueries);
      if (Array.isArray(parsed) && parsed.length > 0) {
        githubQueries = parsed;
      }
    } catch {
      githubQueries = dbQueries.split('\n').map((q) => q.trim()).filter(Boolean);
    }
  }

  const dbAutoArchive = await getSetting('auto_archive_closed', 'true');
  const autoArchiveClosed = dbAutoArchive === 'true';

  const dbInterval = await getSetting('sync_interval_mins', '15');
  const syncIntervalMinutes = parseInt(dbInterval, 10) || 15;

  return {
    githubPat,
    githubQueries,
    autoArchiveClosed,
    syncIntervalMinutes,
  };
}

export async function saveAppConfig(config: Partial<AppConfig>): Promise<void> {
  if (config.githubPat !== undefined) {
    await setSetting('github_pat', config.githubPat);
  }
  if (config.githubQueries !== undefined) {
    await setSetting('github_queries', JSON.stringify(config.githubQueries));
  }
  if (config.autoArchiveClosed !== undefined) {
    await setSetting('auto_archive_closed', String(config.autoArchiveClosed));
  }
  if (config.syncIntervalMinutes !== undefined) {
    await setSetting('sync_interval_mins', String(config.syncIntervalMinutes));
  }
}

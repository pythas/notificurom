import { db } from '@/db';
import { tasks } from '@/db/schema';
import { getAppConfig, getSetting } from '@/lib/config';
import { Dashboard } from '@/components/Dashboard';
import { asc, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const allTasks = db
    .select()
    .from(tasks)
    .orderBy(asc(tasks.sortOrder), desc(tasks.sourceCreatedAt))
    .all();

  const config = await getAppConfig();
  const lastSyncTime = await getSetting('last_sync_time', '');

  const isConnected = Boolean(
    config.githubAccessToken && config.githubAccessToken.trim().length > 0
  );
  const isConfigured = Boolean(
    config.githubClientId &&
    config.githubClientId.trim().length > 0 &&
    config.githubClientSecret &&
    config.githubClientSecret.trim().length > 0
  );

  let initialBanner: { type: 'success' | 'error'; message: string } | null = null;
  if (params.auth === 'success') {
    initialBanner = {
      type: 'success',
      message: 'Successfully connected to GitHub!',
    };
  } else if (params.auth === 'error') {
    const errorMsg =
      (typeof params.error === 'string' ? params.error : '') ||
      (typeof params.message === 'string' ? params.message : '') ||
      'Authentication failed';
    initialBanner = {
      type: 'error',
      message: `GitHub connection failed: ${errorMsg}`,
    };
  }

  return (
    <Dashboard
      initialTasks={allTasks}
      initialIsConnected={isConnected}
      initialIsConfigured={isConfigured}
      initialUser={isConnected ? config.githubUser : null}
      initialLastSync={lastSyncTime || null}
      initialBanner={initialBanner}
    />
  );
}

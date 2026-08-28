import { db } from '@/db';
import { tasks } from '@/db/schema';
import { getAppConfig, getSetting } from '@/lib/config';
import { Dashboard } from '@/components/Dashboard';
import { asc, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const allTasks = db
    .select()
    .from(tasks)
    .orderBy(asc(tasks.sortOrder), desc(tasks.sourceCreatedAt))
    .all();

  const config = await getAppConfig();
  const lastSyncTime = await getSetting('last_sync_time', '');

  return (
    <Dashboard
      initialTasks={allTasks}
      initialHasPat={Boolean(config.githubPat)}
      initialLastSync={lastSyncTime || null}
    />
  );
}

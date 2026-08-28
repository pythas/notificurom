import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { GitHubIngestor } from './ingestors/github';
import { Ingestor, SyncResult } from './types';
import { getAppConfig, setSetting } from './config';
import crypto from 'crypto';

const ingestors: Ingestor[] = [
  new GitHubIngestor(),
];

export async function runSync(): Promise<SyncResult[]> {
  const config = await getAppConfig();
  const results: SyncResult[] = [];
  const now = new Date().toISOString();

  for (const ingestor of ingestors) {
    const result: SyncResult = {
      source: ingestor.name,
      fetched: 0,
      created: 0,
      updated: 0,
      autoResolved: 0,
      errors: [],
    };

    try {
      const isEnabled = await ingestor.isEnabled();
      if (!isEnabled) {
        result.errors.push(`${ingestor.name} is not configured (missing credentials).`);
        results.push(result);
        continue;
      }

      const items = await ingestor.fetchItems();
      result.fetched = items.length;

      const seenSourceIds = new Set<string>();

      for (const item of items) {
        seenSourceIds.add(item.sourceId);
        const existing = db
          .select()
          .from(tasks)
          .where(eq(tasks.sourceId, item.sourceId))
          .get();

        const metadataStr = JSON.stringify(item.metadata || {});

        if (!existing) {
          // New task - insert into Inbox
          db.insert(tasks)
            .values({
              id: crypto.randomUUID(),
              source: item.source,
              sourceType: item.sourceType,
              sourceId: item.sourceId,
              title: item.title,
              url: item.url,
              repository: item.repository,
              author: item.author,
              authorAvatarUrl: item.authorAvatarUrl,
              status: 'inbox',
              sortOrder: 0,
              isClosed: item.isClosed,
              metadata: metadataStr,
              sourceCreatedAt: item.sourceCreatedAt,
              sourceUpdatedAt: item.sourceUpdatedAt || item.sourceCreatedAt,
              statusUpdatedAt: now,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          result.created++;
        } else {
          // Existing task - preserve Kanban column & statusUpdatedAt, update title/metadata
          let newStatus = existing.status;
          let newStatusUpdatedAt = existing.statusUpdatedAt;

          if (config.autoArchiveClosed && item.isClosed && existing.status !== 'done') {
            newStatus = 'done';
            newStatusUpdatedAt = now;
            result.autoResolved++;
          }

          db.update(tasks)
            .set({
              title: item.title,
              repository: item.repository || existing.repository,
              author: item.author || existing.author,
              authorAvatarUrl: item.authorAvatarUrl || existing.authorAvatarUrl,
              isClosed: item.isClosed,
              status: newStatus,
              statusUpdatedAt: newStatusUpdatedAt,
              metadata: metadataStr,
              sourceUpdatedAt: item.sourceUpdatedAt || existing.sourceUpdatedAt,
              updatedAt: now,
            })
            .where(eq(tasks.id, existing.id))
            .run();
          result.updated++;
        }
      }

      // Check items currently in DB that were not in the search results (closed, unassigned, or deleted)
      if (ingestor instanceof GitHubIngestor) {
        const activeTasks = db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.source, 'github'),
              eq(tasks.isClosed, false),
              ne(tasks.status, 'done')
            )
          )
          .all();

        const unreturnedTasks = activeTasks.filter((t) => !seenSourceIds.has(t.sourceId));

        if (unreturnedTasks.length > 0) {
          const checkedStatusMap = await ingestor.checkItemsStatus(
            unreturnedTasks.map((t) => t.sourceId)
          );

          for (const [sourceId, statusInfo] of checkedStatusMap.entries()) {
            if (statusInfo.isNotFound || statusInfo.isUnassigned) {
              // Assignment was removed or issue was deleted - remove from board
              db.delete(tasks)
                .where(eq(tasks.sourceId, sourceId))
                .run();
              result.removed = (result.removed || 0) + 1;
            } else if (statusInfo.isClosed) {
              if (config.autoArchiveClosed) {
                db.update(tasks)
                  .set({
                    isClosed: true,
                    status: 'done',
                    statusUpdatedAt: now,
                    updatedAt: now,
                    ...(statusInfo.title ? { title: statusInfo.title } : {}),
                  })
                  .where(eq(tasks.sourceId, sourceId))
                  .run();
                result.autoResolved++;
              } else {
                db.update(tasks)
                  .set({
                    isClosed: true,
                    updatedAt: now,
                    ...(statusInfo.title ? { title: statusInfo.title } : {}),
                  })
                  .where(eq(tasks.sourceId, sourceId))
                  .run();
              }
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg);
    }

    results.push(result);
  }

  await setSetting('last_sync_time', now);
  return results;
}

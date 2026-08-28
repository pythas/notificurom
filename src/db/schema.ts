import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type TaskStatus = 'inbox' | 'next' | 'in_progress' | 'waiting' | 'done';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  source: text('source').notNull(), // 'github', 'slack', etc.
  sourceType: text('source_type').notNull(), // 'issue', 'pr', 'review_request', etc.
  sourceId: text('source_id').notNull().unique(), // e.g. 'github:repo#123'
  title: text('title').notNull(),
  url: text('url').notNull(),
  repository: text('repository'), // e.g. 'owner/repo'
  author: text('author'),
  authorAvatarUrl: text('author_avatar_url'),
  status: text('status').$type<TaskStatus>().notNull().default('inbox'),
  sortOrder: integer('sort_order').notNull().default(0),
  isClosed: integer('is_closed', { mode: 'boolean' }).notNull().default(false),
  metadata: text('metadata'), // JSON string for platform-specific details (labels, pr details, etc.)
  sourceCreatedAt: text('source_created_at').notNull(), // ISO date string from source
  sourceUpdatedAt: text('source_updated_at'), // ISO date string from source
  statusUpdatedAt: text('status_updated_at').notNull(), // ISO date string when moved to current column
  createdAt: text('created_at').notNull(), // ISO date string when inserted
  updatedAt: text('updated_at').notNull(), // ISO date string when last synced
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Setting = typeof settings.$inferSelect;

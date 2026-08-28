import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { asc, desc } from 'drizzle-orm';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allTasks = db
      .select()
      .from(tasks)
      .orderBy(asc(tasks.sortOrder), desc(tasks.sourceCreatedAt))
      .all();

    return NextResponse.json({ tasks: allTasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();

    const id = crypto.randomUUID();
    const newTask = {
      id,
      source: body.source || 'manual',
      sourceType: body.sourceType || 'task',
      sourceId: body.sourceId || `manual:${id}`,
      title: body.title,
      url: body.url || '',
      repository: body.repository || null,
      author: body.author || 'me',
      authorAvatarUrl: body.authorAvatarUrl || null,
      status: body.status || 'inbox',
      sortOrder: body.sortOrder || 0,
      isClosed: false,
      metadata: JSON.stringify(body.metadata || {}),
      sourceCreatedAt: body.sourceCreatedAt || now,
      sourceUpdatedAt: now,
      statusUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(tasks).values(newTask).run();
    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

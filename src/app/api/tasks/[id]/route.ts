import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, TaskStatus } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const now = new Date().toISOString();

    const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updates: Partial<typeof tasks.$inferInsert> = {
      updatedAt: now,
    };

    if (body.status !== undefined) {
      updates.status = body.status as TaskStatus;
      if (body.status !== existing.status) {
        updates.statusUpdatedAt = now;
      }
    }

    if (typeof body.sortOrder === 'number') {
      updates.sortOrder = body.sortOrder;
    }

    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (body.isClosed !== undefined) {
      updates.isClosed = Boolean(body.isClosed);
    }

    db.update(tasks).set(updates).where(eq(tasks.id, id)).run();

    const updatedTask = db.select().from(tasks).where(eq(tasks.id, id)).get();
    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    db.delete(tasks).where(eq(tasks.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

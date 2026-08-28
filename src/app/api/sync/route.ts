import { NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Optional secret check if CRON_SECRET is set
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const results = await runSync();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}

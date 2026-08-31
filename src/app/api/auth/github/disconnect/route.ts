import { NextResponse } from 'next/server';
import { clearGitHubAuth } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await clearGitHubAuth();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

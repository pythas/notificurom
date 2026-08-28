import { NextResponse } from 'next/server';
import { getAppConfig, saveAppConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getAppConfig();
    // Return masked PAT for security if present
    const maskedPat = config.githubPat
      ? `${config.githubPat.slice(0, 4)}...${config.githubPat.slice(-4)}`
      : '';

    return NextResponse.json({
      ...config,
      hasPat: Boolean(config.githubPat),
      maskedPat,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await saveAppConfig({
      githubPat: body.githubPat,
      githubQueries: body.githubQueries,
      autoArchiveClosed: body.autoArchiveClosed,
      syncIntervalMinutes: body.syncIntervalMinutes,
    });

    const updated = await getAppConfig();
    return NextResponse.json({
      success: true,
      hasPat: Boolean(updated.githubPat),
      githubQueries: updated.githubQueries,
      autoArchiveClosed: updated.autoArchiveClosed,
      syncIntervalMinutes: updated.syncIntervalMinutes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

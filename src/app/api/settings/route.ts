import { NextResponse } from 'next/server';
import { getAppConfig, saveAppConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getAppConfig();
    const isConfigured = Boolean(
      config.githubClientId &&
      config.githubClientId.trim().length > 0 &&
      config.githubClientSecret &&
      config.githubClientSecret.trim().length > 0
    );
    const isConnected = Boolean(
      config.githubAccessToken && config.githubAccessToken.trim().length > 0
    );

    return NextResponse.json({
      isConnected,
      isConfigured,
      user: isConnected ? config.githubUser : null,
      githubQueries: config.githubQueries,
      autoArchiveClosed: config.autoArchiveClosed,
      syncIntervalMinutes: config.syncIntervalMinutes,
      githubClientId: config.githubClientId,
      hasClientSecret: Boolean(config.githubClientSecret),
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
      githubClientId: body.githubClientId,
      githubClientSecret: body.githubClientSecret,
      githubQueries: body.githubQueries,
      autoArchiveClosed: body.autoArchiveClosed,
      syncIntervalMinutes: body.syncIntervalMinutes,
    });

    const updated = await getAppConfig();
    const isConfigured = Boolean(
      updated.githubClientId &&
      updated.githubClientId.trim().length > 0 &&
      updated.githubClientSecret &&
      updated.githubClientSecret.trim().length > 0
    );
    const isConnected = Boolean(
      updated.githubAccessToken && updated.githubAccessToken.trim().length > 0
    );

    return NextResponse.json({
      success: true,
      isConnected,
      isConfigured,
      user: isConnected ? updated.githubUser : null,
      githubQueries: updated.githubQueries,
      autoArchiveClosed: updated.autoArchiveClosed,
      syncIntervalMinutes: updated.syncIntervalMinutes,
      githubClientId: updated.githubClientId,
      hasClientSecret: Boolean(updated.githubClientSecret),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/config';

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
      isConfigured,
      isConnected,
      user: isConnected ? config.githubUser : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get auth status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

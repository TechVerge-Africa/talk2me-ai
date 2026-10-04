import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/supabase-server';
import { NotificationDispatcher } from '@/services/notifications/dispatcher';
import { UrgentMessagePayload } from '@/services/notifications/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const authUser = await verifyAuthToken(authHeader);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid bearer token required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      messageId,
      workspaceId,
      workspaceName,
      channelName,
      senderId,
      senderName,
      content,
      priority = 'important',
    } = body;

    if (!messageId || !workspaceId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields (messageId, workspaceId, content)' },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin || 'https://talk2me.ai';
    const actionUrl = `${origin}/dashboard?tab=chat&workspaceId=${workspaceId}&channel=${encodeURIComponent(
      channelName || '# General'
    )}`;

    const payload: UrgentMessagePayload = {
      messageId,
      workspaceId,
      workspaceName: workspaceName || 'Workspace',
      channelName: (channelName || '# General').replace(/^#\s*/, ''),
      senderName: senderName || 'Team Member',
      content,
      priority,
      actionUrl,
    };

    const results = await NotificationDispatcher.dispatchUrgentMessage(payload, senderId || authUser.id);

    return NextResponse.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[API /api/notifications/urgent-message] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


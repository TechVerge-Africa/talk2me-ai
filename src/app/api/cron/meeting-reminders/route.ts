import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { NotificationDispatcher } from '@/services/notifications/dispatcher';
import { MeetingReminderPayload } from '@/services/notifications/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleCronReminders(req);
}

export async function POST(req: NextRequest) {
  return handleCronReminders(req);
}

async function handleCronReminders(req: NextRequest) {
  try {
    // 1. Authenticate Cron Request
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const headerSecret = req.headers.get('x-cron-secret');
    const querySecret = req.nextUrl.searchParams.get('secret');

    const providedSecret = authHeader?.replace(/^Bearer\s+/i, '') || headerSecret || querySecret;

    if (cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron trigger.' }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = Date.now();
    const origin = req.nextUrl.origin || 'https://talk2me.ai';

    // Scan for active or upcoming meetings in the next 20 minutes
    const minTimeIso = new Date(now - 300000).toISOString(); // meetings scheduled up to 5 min ago
    const maxTimeIso = new Date(now + 20 * 60000).toISOString(); // meetings up to 20 min in future

    const { data: meetings, error: meetErr } = await admin
      .from('meetings')
      .select('id, room_name, room_code, host_id, scheduled_at, is_active, ended_at, workspace_id, send_reminders, workspaces(name), profiles(full_name)')
      .filter('ended_at', 'is', null)
      .gte('scheduled_at', minTimeIso)
      .lte('scheduled_at', maxTimeIso);

    if (meetErr) {
      console.error('[MeetingRemindersCron] Error fetching scheduled meetings:', meetErr);
      return NextResponse.json({ error: meetErr.message }, { status: 500 });
    }

    const summary: Array<{ meetingId: string; reminderType: string; dispatchedCount: number }> = [];

    for (const m of (meetings || [])) {
      if (m.send_reminders === false) continue;
      if (!m.scheduled_at) continue;

      const scheduledMs = new Date(m.scheduled_at).getTime();
      const diffMs = scheduledMs - now;
      const diffMins = diffMs / 60000;

      let reminderType: '15m' | 'start' | null = null;

      // 15-minute window: between 8 and 16 minutes before meeting
      if (diffMins >= 8 && diffMins <= 16) {
        reminderType = '15m';
      }
      // Start-time window: between -5 and 3 minutes of scheduled time
      else if (diffMins >= -5 && diffMins <= 3) {
        reminderType = 'start';
      }

      if (!reminderType) continue;

      const wsName = (m as any).workspaces?.name || undefined;
      const hostName = (m as any).profiles?.full_name || undefined;

      const payload: MeetingReminderPayload = {
        meetingId: m.id,
        meetingTitle: m.room_name,
        roomCode: m.room_code,
        scheduledAt: m.scheduled_at,
        workspaceName: wsName,
        hostName,
        reminderType,
        joinUrl: `${origin}/room/${m.room_code}`,
      };

      const results = await NotificationDispatcher.dispatchMeetingReminder(payload, m.workspace_id || undefined);

      summary.push({
        meetingId: m.id,
        reminderType,
        dispatchedCount: results.length,
      });
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      processedCount: summary.length,
      summary,
    });
  } catch (error: any) {
    console.error('[MeetingRemindersCron] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal cron error' }, { status: 500 });
  }
}


import { createAdminClient } from '@/lib/supabase-server';
import { EmailService } from './email-service';
import { SmsService } from './sms-service';
import {
  MeetingReminderPayload,
  UrgentMessagePayload,
  RecipientInfo,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
  DispatchResult,
} from './types';

export const NotificationDispatcher = {
  /**
   * Fetches enriched recipient details (profile, auth email, preferences)
   */
  async getRecipientsForWorkspace(workspaceId: string): Promise<RecipientInfo[]> {
    const admin = createAdminClient();

    // 1. Get all approved workspace members with their profiles
    const { data: members, error: memErr } = await admin
      .from('workspace_members')
      .select('user_id, status, profiles(id, full_name, phone_number, phone_verified, notification_preferences)')
      .eq('workspace_id', workspaceId)
      .or('status.eq.approved,status.is.null');

    if (memErr || !members) {
      console.error('[NotificationDispatcher] Error fetching workspace members:', memErr);
      return [];
    }

    // 2. Fetch user emails from auth
    const recipients: RecipientInfo[] = [];

    for (const row of members) {
      const p = (row as any).profiles;
      const userId = row.user_id;

      let email: string | null = null;
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        email = authUser?.user?.email || null;
      } catch (e) {
        console.warn(`[NotificationDispatcher] Could not fetch auth email for user ${userId}:`, e);
      }

      const prefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(p?.notification_preferences || {}),
        channels: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
          ...(p?.notification_preferences?.channels || {}),
        },
        events: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.events,
          ...(p?.notification_preferences?.events || {}),
        },
      };

      recipients.push({
        userId,
        fullName: p?.full_name || null,
        email,
        phoneNumber: p?.phone_number || null,
        phoneVerified: p?.phone_verified ?? false,
        preferences: prefs,
      });
    }

    return recipients;
  },

  /**
   * Checks if an alert was already logged (prevents duplicate sends)
   */
  async hasNotificationBeenSent(
    recipientId: string,
    eventType: string,
    channel: string,
    referenceId: string
  ): Promise<boolean> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('notification_logs')
        .select('id')
        .eq('recipient_id', recipientId)
        .eq('event_type', eventType)
        .eq('channel', channel)
        .eq('reference_id', referenceId)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  },

  /**
   * Records a notification dispatch attempt
   */
  async logNotification(params: {
    recipientId: string;
    workspaceId?: string;
    eventType: string;
    channel: string;
    status: 'sent' | 'failed';
    referenceId: string;
    details?: any;
  }) {
    try {
      const admin = createAdminClient();
      await admin.from('notification_logs').upsert(
        {
          recipient_id: params.recipientId,
          workspace_id: params.workspaceId || null,
          event_type: params.eventType,
          channel: params.channel,
          status: params.status,
          reference_id: params.referenceId,
          details: params.details || {},
        },
        { onConflict: 'recipient_id,event_type,channel,reference_id' }
      );
    } catch (err) {
      console.warn('[NotificationDispatcher] Could not write to notification_logs:', err);
    }
  },

  /**
   * Dispatches meeting reminders to all workspace members/invitees
   */
  async dispatchMeetingReminder(
    payload: MeetingReminderPayload,
    workspaceId?: string
  ): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];
    const eventType = payload.reminderType === '15m' ? 'meeting_reminder_15m' : 'meeting_reminder_start';

    // If workspace-scoped, fetch workspace members; otherwise notify host/invitees
    let recipients: RecipientInfo[] = [];
    if (workspaceId) {
      recipients = await this.getRecipientsForWorkspace(workspaceId);
    }

    for (const recipient of recipients) {
      const prefs = recipient.preferences || DEFAULT_NOTIFICATION_PREFERENCES;

      // Check if user turned off meeting reminders overall
      if (!prefs.events.meeting_reminders) {
        continue;
      }

      // 1. Email notification
      if (prefs.channels.email && recipient.email) {
        const alreadySent = await this.hasNotificationBeenSent(
          recipient.userId,
          eventType,
          'email',
          payload.meetingId
        );

        if (!alreadySent) {
          const res = await EmailService.sendMeetingReminder(
            recipient.email,
            recipient.fullName || 'there',
            payload
          );

          await this.logNotification({
            recipientId: recipient.userId,
            workspaceId,
            eventType,
            channel: 'email',
            status: res.success ? 'sent' : 'failed',
            referenceId: payload.meetingId,
            details: { error: res.error, emailId: res.id },
          });

          results.push({
            recipientId: recipient.userId,
            channel: 'email',
            success: res.success,
            error: res.error,
          });
        }
      }

      // 2. SMS notification (only if enabled and phone number exists)
      if (prefs.channels.sms && recipient.phoneNumber) {
        const alreadySent = await this.hasNotificationBeenSent(
          recipient.userId,
          eventType,
          'sms',
          payload.meetingId
        );

        if (!alreadySent) {
          const res = await SmsService.sendMeetingReminderSms(recipient.phoneNumber, payload);

          await this.logNotification({
            recipientId: recipient.userId,
            workspaceId,
            eventType,
            channel: 'sms',
            status: res.success ? 'sent' : 'failed',
            referenceId: payload.meetingId,
            details: { error: res.error, data: res.data },
          });

          results.push({
            recipientId: recipient.userId,
            channel: 'sms',
            success: res.success,
            error: res.error,
          });
        }
      }
    }

    return results;
  },

  /**
   * Dispatches urgent/important channel message notifications to workspace members
   */
  async dispatchUrgentMessage(
    payload: UrgentMessagePayload,
    senderId?: string
  ): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];
    const eventType = 'urgent_channel_message';

    const recipients = await this.getRecipientsForWorkspace(payload.workspaceId);

    for (const recipient of recipients) {
      // Do not notify the sender themselves
      if (recipient.userId === senderId) continue;

      const prefs = recipient.preferences || DEFAULT_NOTIFICATION_PREFERENCES;
      if (!prefs.events.urgent_messages) continue;

      // 1. Email notification
      if (prefs.channels.email && recipient.email) {
        const res = await EmailService.sendUrgentChannelNotification(
          recipient.email,
          recipient.fullName || 'there',
          payload
        );

        await this.logNotification({
          recipientId: recipient.userId,
          workspaceId: payload.workspaceId,
          eventType,
          channel: 'email',
          status: res.success ? 'sent' : 'failed',
          referenceId: payload.messageId,
          details: { error: res.error, emailId: res.id },
        });

        results.push({
          recipientId: recipient.userId,
          channel: 'email',
          success: res.success,
          error: res.error,
        });
      }

      // 2. SMS notification (opted-in users)
      if (prefs.channels.sms && recipient.phoneNumber) {
        const res = await SmsService.sendUrgentChannelSms(recipient.phoneNumber, payload);

        await this.logNotification({
          recipientId: recipient.userId,
          workspaceId: payload.workspaceId,
          eventType,
          channel: 'sms',
          status: res.success ? 'sent' : 'failed',
          referenceId: payload.messageId,
          details: { error: res.error, data: res.data },
        });

        results.push({
          recipientId: recipient.userId,
          channel: 'sms',
          success: res.success,
          error: res.error,
        });
      }
    }

    return results;
  },
};


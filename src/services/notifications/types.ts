export type NotificationChannel = 'email' | 'sms' | 'push';

export type NotificationEventType =
  | 'meeting_reminder_15m'
  | 'meeting_reminder_start'
  | 'urgent_channel_message';

export interface NotificationPreferences {
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  events: {
    meeting_reminders: boolean;
    urgent_messages: boolean;
  };
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: {
    email: true,
    sms: false,
    push: true,
  },
  events: {
    meeting_reminders: true,
    urgent_messages: true,
  },
};

export interface RecipientInfo {
  userId: string;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  preferences?: NotificationPreferences;
}

export interface MeetingReminderPayload {
  meetingId: string;
  meetingTitle: string;
  roomCode: string;
  scheduledAt: string;
  workspaceName?: string;
  hostName?: string;
  reminderType: '15m' | 'start';
  joinUrl: string;
}

export interface UrgentMessagePayload {
  messageId: string;
  workspaceId: string;
  workspaceName: string;
  channelName: string;
  senderName: string;
  content: string;
  priority: 'important' | 'urgent';
  actionUrl: string;
}

export interface DispatchResult {
  recipientId: string;
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}


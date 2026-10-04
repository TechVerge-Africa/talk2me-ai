import { MeetingReminderPayload, UrgentMessagePayload } from './types';

const ARKESEL_SMS_API_URL = 'https://sms.arkesel.com/api/v2/sms/send';

/**
 * Normalizes a phone number for Arkesel (digits only, country code, no '+')
 * E.g., '+233 24 123 4567' -> '233241234567'
 *       '024 123 4567' -> '233241234567' (assumes Ghana for 10-digit 0-leading)
 */
export function normalizePhoneNumberForArkesel(raw: string): string | null {
  if (!raw) return null;
  // Remove all non-digit characters
  let digits = raw.replace(/\D/g, '');

  if (!digits) return null;

  // If local Ghanaian format (e.g. 0244123456)
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '233' + digits.substring(1);
  }

  // Must be at least 9-15 digits
  if (digits.length < 9 || digits.length > 15) {
    return null;
  }

  return digits;
}

export const SmsService = {
  /**
   * Sends an SMS via Arkesel SMS API v2
   */
  async sendSms(params: {
    recipients: string[];
    message: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const apiKey = process.env.ARKESEL_API_KEY;
    if (!apiKey) {
      console.warn('[SmsService] ARKESEL_API_KEY is not configured in environment.');
      return { success: false, error: 'ARKESEL_API_KEY missing' };
    }

    const sender = process.env.ARKESEL_SENDER_ID || 'Talk2Me';

    // Normalize all recipient phone numbers
    const validRecipients = params.recipients
      .map(normalizePhoneNumberForArkesel)
      .filter((n): n is string => Boolean(n));

    if (validRecipients.length === 0) {
      return { success: false, error: 'No valid phone numbers provided' };
    }

    try {
      const response = await fetch(ARKESEL_SMS_API_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: sender.substring(0, 11), // Arkesel sender IDs are max 11 alphanumeric chars
          message: params.message,
          recipients: validRecipients,
        }),
      });

      const resData = await response.json();

      if (!response.ok || (resData.status && resData.status !== 'success')) {
        console.error('[SmsService] Arkesel API error response:', resData);
        return { 
          success: false, 
          error: resData.message || 'Failed to send SMS via Arkesel', 
          data: resData 
        };
      }

      return { success: true, data: resData };
    } catch (err: any) {
      console.error('[SmsService] Network error sending SMS via Arkesel:', err);
      return { success: false, error: err.message || 'SMS network error' };
    }
  },

  /**
   * Dispatches a concise SMS reminder for a meeting
   */
  async sendMeetingReminderSms(phoneNumber: string, payload: MeetingReminderPayload) {
    const isStartingNow = payload.reminderType === 'start';
    const message = isStartingNow
      ? `Talk2Me: "${payload.meetingTitle}" is starting now! Join: ${payload.joinUrl}`
      : `Talk2Me: Reminder - "${payload.meetingTitle}" starts in 15 mins. Join: ${payload.joinUrl}`;

    return this.sendSms({
      recipients: [phoneNumber],
      message,
    });
  },

  /**
   * Dispatches a high-priority SMS for an urgent channel message
   */
  async sendUrgentChannelSms(phoneNumber: string, payload: UrgentMessagePayload) {
    const snippet = payload.content.length > 70 
      ? payload.content.substring(0, 67) + '...' 
      : payload.content;

    const message = `Talk2Me URGENT [${payload.workspaceName} #${payload.channelName}] ${payload.senderName}: "${snippet}" Open: ${payload.actionUrl}`;

    return this.sendSms({
      recipients: [phoneNumber],
      message,
    });
  },
};


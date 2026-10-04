import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumberForArkesel, SmsService } from '../sms-service';
import { EmailService } from '../email-service';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  MeetingReminderPayload,
  UrgentMessagePayload,
} from '../types';

describe('Notifications Service Unit Tests', () => {
  describe('1. Phone Number Normalization for Arkesel', () => {
    it('normalizes local 10-digit Ghanaian numbers (024... -> 23324...)', () => {
      assert.equal(normalizePhoneNumberForArkesel('0241234567'), '233241234567');
      assert.equal(normalizePhoneNumberForArkesel('0559876543'), '233559876543');
      assert.equal(normalizePhoneNumberForArkesel('0200000000'), '233200000000');
    });

    it('handles phone numbers with international prefix +', () => {
      assert.equal(normalizePhoneNumberForArkesel('+233241234567'), '233241234567');
      assert.equal(normalizePhoneNumberForArkesel('+14155552671'), '14155552671');
      assert.equal(normalizePhoneNumberForArkesel('+447911123456'), '447911123456');
    });

    it('strips whitespace, dashes, dots, and parentheses', () => {
      assert.equal(normalizePhoneNumberForArkesel('+233 (24) 123-4567'), '233241234567');
      assert.equal(normalizePhoneNumberForArkesel('024 123 4567'), '233241234567');
      assert.equal(normalizePhoneNumberForArkesel('+1 (555) 234-5678'), '15552345678');
    });

    it('returns null for invalid, non-digit, or malformed inputs', () => {
      assert.equal(normalizePhoneNumberForArkesel(''), null);
      assert.equal(normalizePhoneNumberForArkesel('abc'), null);
      assert.equal(normalizePhoneNumberForArkesel('12345'), null); // too short (< 9 digits)
      assert.equal(normalizePhoneNumberForArkesel('12345678901234567890'), null); // too long (> 15 digits)
      assert.equal(normalizePhoneNumberForArkesel(null as any), null);
      assert.equal(normalizePhoneNumberForArkesel(undefined as any), null);
    });
  });

  describe('2. SMS Service Formatting & Validation', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('fails gracefully when ARKESEL_API_KEY is missing', async () => {
      delete process.env.ARKESEL_API_KEY;
      const result = await SmsService.sendSms({
        recipients: ['0241234567'],
        message: 'Test message',
      });

      assert.equal(result.success, false);
      assert.equal(result.error, 'ARKESEL_API_KEY missing');
    });

    it('fails gracefully when all recipient phone numbers are invalid', async () => {
      process.env.ARKESEL_API_KEY = 'test_key';
      const result = await SmsService.sendSms({
        recipients: ['invalid', '123'],
        message: 'Test message',
      });

      assert.equal(result.success, false);
      assert.equal(result.error, 'No valid phone numbers provided');
    });

    it('formats meeting reminder SMS message appropriately for 15-min alerts', async () => {
      let capturedPayload: any = null;
      const originalFetch = global.fetch;

      // Mock fetch
      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedPayload = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({ status: 'success', data: { message: 'sent' } }),
        } as Response;
      }) as any;

      try {
        process.env.ARKESEL_API_KEY = 'test_key';
        const payload: MeetingReminderPayload = {
          meetingId: 'meet-123',
          meetingTitle: 'Sprint Planning',
          roomCode: 'PLAN-789',
          scheduledAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          joinUrl: 'https://talk2me.ai/room/PLAN-789',
          reminderType: '15m',
        };

        const result = await SmsService.sendMeetingReminderSms('0241234567', payload);
        assert.equal(result.success, true);
        assert.ok(capturedPayload);
        assert.equal(capturedPayload.recipients[0], '233241234567');
        assert.ok(capturedPayload.message.includes('Sprint Planning'));
        assert.ok(capturedPayload.message.includes('starts in 15 mins'));
        assert.ok(capturedPayload.message.includes('https://talk2me.ai/room/PLAN-789'));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('formats meeting reminder SMS message appropriately for start-now alerts', async () => {
      let capturedPayload: any = null;
      const originalFetch = global.fetch;

      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedPayload = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({ status: 'success', data: { message: 'sent' } }),
        } as Response;
      }) as any;

      try {
        process.env.ARKESEL_API_KEY = 'test_key';
        const payload: MeetingReminderPayload = {
          meetingId: 'meet-123',
          meetingTitle: 'Daily Standup',
          roomCode: 'STANDUP-1',
          scheduledAt: new Date().toISOString(),
          joinUrl: 'https://talk2me.ai/room/STANDUP-1',
          reminderType: 'start',
        };

        const result = await SmsService.sendMeetingReminderSms('0241234567', payload);
        assert.equal(result.success, true);
        assert.ok(capturedPayload.message.includes('Daily Standup'));
        assert.ok(capturedPayload.message.includes('is starting now!'));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('formats urgent channel announcement SMS with snippet truncation (> 70 chars)', async () => {
      let capturedPayload: any = null;
      const originalFetch = global.fetch;

      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedPayload = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({ status: 'success', data: { message: 'sent' } }),
        } as Response;
      }) as any;

      try {
        process.env.ARKESEL_API_KEY = 'test_key';
        const payload: UrgentMessagePayload = {
          messageId: 'msg-456',
          workspaceId: 'ws-1',
          workspaceName: 'Engineering',
          channelName: 'General',
          senderName: 'Alice',
          content: 'This is an extremely urgent announcement regarding production server outage that requires all engineers to check monitoring dashboards right away.',
          actionUrl: 'https://talk2me.ai/dashboard?tab=chat',
          priority: 'urgent',
        };

        const result = await SmsService.sendUrgentChannelSms('0241234567', payload);
        assert.equal(result.success, true);
        assert.ok(capturedPayload.message.includes('URGENT'));
        assert.ok(capturedPayload.message.includes('Engineering #General'));
        assert.ok(capturedPayload.message.includes('Alice:'));
        assert.ok(capturedPayload.message.includes('...')); // truncated
        assert.ok(capturedPayload.message.includes('Open: https://talk2me.ai/dashboard?tab=chat'));
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('3. Email Service Formatting & Validation', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('fails gracefully when RESEND_API_KEY is missing', async () => {
      delete process.env.RESEND_API_KEY;
      const result = await EmailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });

      assert.equal(result.success, false);
      assert.equal(result.error, 'RESEND_API_KEY missing');
    });

    it('formats meeting reminder email with proper subject and HTML buttons', async () => {
      let capturedEmail: any = null;
      const originalFetch = global.fetch;

      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedEmail = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({ id: 'email_test_123' }),
        } as Response;
      }) as any;

      try {
        process.env.RESEND_API_KEY = 're_test_123';
        const payload: MeetingReminderPayload = {
          meetingId: 'meet-999',
          meetingTitle: 'Product Roadmap Sync',
          roomCode: 'ROAD-001',
          scheduledAt: '2026-10-04T10:00:00.000Z',
          joinUrl: 'https://talk2me.ai/room/ROAD-001',
          reminderType: '15m',
          workspaceName: 'TechVerge',
        };

        const result = await EmailService.sendMeetingReminder(
          'lead@example.com',
          'Kofi',
          payload
        );

        assert.equal(result.success, true);
        assert.equal(result.id, 'email_test_123');
        assert.ok(capturedEmail.subject.includes('Product Roadmap Sync'));
        assert.ok(capturedEmail.subject.includes('starts in 15 minutes'));
        assert.ok(capturedEmail.html.includes('Kofi'));
        assert.ok(capturedEmail.html.includes('TechVerge'));
        assert.ok(capturedEmail.html.includes('https://talk2me.ai/room/ROAD-001'));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('formats urgent channel message email with alert badge and recipient context', async () => {
      let capturedEmail: any = null;
      const originalFetch = global.fetch;

      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedEmail = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({ id: 'email_urgent_456' }),
        } as Response;
      }) as any;

      try {
        process.env.RESEND_API_KEY = 're_test_123';
        const payload: UrgentMessagePayload = {
          messageId: 'msg-777',
          workspaceId: 'ws-10',
          workspaceName: 'DevOps Ops',
          channelName: 'Incidents',
          senderName: 'Sarah Jenkins',
          content: 'Database replica lag has spiked past threshold. Investigating failover.',
          actionUrl: 'https://talk2me.ai/dashboard?tab=chat',
          priority: 'urgent',
        };

        const result = await EmailService.sendUrgentChannelNotification(
          'engineer@example.com',
          'Alex',
          payload
        );

        assert.equal(result.success, true);
        assert.equal(result.id, 'email_urgent_456');
        assert.ok(capturedEmail.subject.includes('URGENT'));
        assert.ok(capturedEmail.subject.includes('DevOps Ops #Incidents'));
        assert.ok(capturedEmail.html.includes('Sarah Jenkins'));
        assert.ok(capturedEmail.html.includes('Database replica lag has spiked past threshold'));
        assert.ok(capturedEmail.html.includes('https://talk2me.ai/dashboard?tab=chat'));
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('4. Notification Preference Defaults', () => {
    it('verifies default user notification preferences', () => {
      assert.deepEqual(DEFAULT_NOTIFICATION_PREFERENCES, {
        channels: {
          email: true,
          sms: false,
          push: true,
        },
        events: {
          meeting_reminders: true,
          urgent_messages: true,
        },
      });
    });
  });
});

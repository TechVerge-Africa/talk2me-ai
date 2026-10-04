import { MeetingReminderPayload, UrgentMessagePayload } from './types';

const RESEND_API_URL = 'https://api.resend.com/emails';

export const EmailService = {
  /**
   * Sends a transactional email using Resend
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[EmailService] RESEND_API_KEY is not configured in environment.');
      return { success: false, error: 'RESEND_API_KEY missing' };
    }

    const from = process.env.RESEND_FROM_EMAIL || 'Talk2Me AI <onboarding@resend.dev>';

    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[EmailService] Resend API error:', data);
        return { success: false, error: data?.message || 'Failed to send email via Resend' };
      }

      return { success: true, id: data.id };
    } catch (err: any) {
      console.error('[EmailService] Network error sending email:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Formats and sends a scheduled meeting reminder email
   */
  async sendMeetingReminder(toEmail: string, recipientName: string, payload: MeetingReminderPayload) {
    const isStartingNow = payload.reminderType === 'start';
    const subject = isStartingNow
      ? `🔴 Starting Now: ${payload.meetingTitle} on Talk2Me AI`
      : `⏰ Reminder: ${payload.meetingTitle} starts in 15 minutes`;

    const formattedTime = new Date(payload.scheduledAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 20px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border-bottom: 1px solid #374151;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Talk2Me AI</span>
                    <h1 style="margin: 12px 0 4px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em;">
                      ${isStartingNow ? 'Your meeting is starting now!' : 'Upcoming Meeting in 15 Minutes'}
                    </h1>
                    <p style="margin: 0; font-size: 14px; color: #cbd5e1;">
                      ${payload.workspaceName ? `Workspace: ${payload.workspaceName}` : 'Accessible Smart Meeting'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #94a3b8;">
                Hi <strong style="color: #f1f5f9;">${recipientName || 'there'}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #cbd5e1;">
                You have a scheduled video session <strong>${payload.meetingTitle}</strong>
                ${isStartingNow ? 'ready to join right now.' : `starting at ${formattedTime}.`}
              </p>

              <table width="100%" style="background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">Meeting Title</div>
                    <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 12px;">${payload.meetingTitle}</div>
                    
                    <div style="display: flex; gap: 20px;">
                      <div>
                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Room Code</div>
                        <div style="font-family: monospace; font-size: 14px; font-weight: 700; color: #818cf8;">${payload.roomCode}</div>
                      </div>
                      ${payload.hostName ? `
                      <div style="margin-left: 24px;">
                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Host</div>
                        <div style="font-size: 14px; font-weight: 500; color: #e2e8f0;">${payload.hostName}</div>
                      </div>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${payload.joinUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                      Join Meeting Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 28px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                Need live captioning or sign language assistance? Talk2Me AI has built-in real-time captions and deaf mode.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 32px; background-color: #0d131f; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You received this email because you are a member of Talk2Me AI workspace. 
                Manage your notification preferences in your dashboard settings.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: toEmail,
      subject,
      html,
      text: `${subject}\n\nJoin link: ${payload.joinUrl}\nRoom code: ${payload.roomCode}`,
    });
  },

  /**
   * Formats and sends an urgent channel announcement email
   */
  async sendUrgentChannelNotification(toEmail: string, recipientName: string, payload: UrgentMessagePayload) {
    const subject = `🚨 URGENT [${payload.workspaceName} #${payload.channelName}]: ${payload.senderName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #111827; border: 1px solid #374151; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); border-bottom: 2px solid #ef4444;">
              <span style="background-color: #ef4444; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                HIGH PRIORITY ALERT
              </span>
              <h1 style="margin: 12px 0 4px 0; font-size: 20px; font-weight: 800; color: #ffffff;">
                Important Message in #${payload.channelName}
              </h1>
              <p style="margin: 0; font-size: 13px; color: #fca5a5;">
                Workspace: ${payload.workspaceName} &bull; Posted by ${payload.senderName}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #94a3b8;">
                Hello <strong style="color: #f1f5f9;">${recipientName || 'Team Member'}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #cbd5e1;">
                <strong>${payload.senderName}</strong> marked the following message as <strong>important</strong>:
              </p>

              <div style="background-color: #1e293b; border-left: 4px solid #ef4444; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #f8fafc; font-style: italic;">
                  "${payload.content}"
                </p>
              </div>

              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${payload.actionUrl}" target="_blank" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 700;">
                      Open Channel Chat &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 16px 32px; background-color: #0d131f; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You were notified because you are a member of this workspace and have important alerts enabled.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: toEmail,
      subject,
      html,
      text: `${subject}\n\nFrom: ${payload.senderName}\nMessage: ${payload.content}\n\nLink: ${payload.actionUrl}`,
    });
  },
};


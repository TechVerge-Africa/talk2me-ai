import fs from 'fs';
import path from 'path';
import { SmsService, normalizePhoneNumberForArkesel } from '../src/services/notifications/sms-service';
import { EmailService } from '../src/services/notifications/email-service';

// 1. Manually load .env.local if not loaded by runner
function loadLocalEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not read .env.local:', err);
  }
}

loadLocalEnv();

async function runLiveDiagnostics() {
  console.log('====================================================');
  console.log('  Talk2Me AI — Multi-Channel Notification Live Test ');
  console.log('====================================================\n');

  const arkeselKey = process.env.ARKESEL_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const arkeselSender = process.env.ARKESEL_SENDER_ID || 'Talk2Me';

  console.log('[CONFIG CHECK]');
  console.log(`- ARKESEL_API_KEY:  ${arkeselKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`- ARKESEL_SENDER_ID: ${arkeselSender}`);
  console.log(`- RESEND_API_KEY:   ${resendKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`- RESEND_FROM_EMAIL:${process.env.RESEND_FROM_EMAIL || 'Talk2Me AI <onboarding@resend.dev>'}`);
  console.log('----------------------------------------------------\n');

  let arkeselStatus = false;
  let resendStatus = false;

  // 1. Test Arkesel API
  console.log('[1/3] Testing Arkesel SMS API v2 Connection...');
  if (!arkeselKey) {
    console.error('❌ Skipping: ARKESEL_API_KEY is not defined in .env.local');
  } else {
    try {
      const res = await fetch('https://sms.arkesel.com/api/v2/clients/balance-details', {
        headers: { 'api-key': arkeselKey },
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        arkeselStatus = true;
        console.log('  ✅ Arkesel Authenticated Successfully');
        console.log(`  📊 Available SMS Balance: ${data.data?.sms_balance ?? 'N/A'} SMS credits`);
        console.log(`  💰 Account Main Balance:  ${data.data?.main_balance ?? 'N/A'}`);
      } else {
        console.error('  ❌ Arkesel Auth Failed:', data);
      }
    } catch (err: any) {
      console.error('  ❌ Arkesel Network Error:', err.message);
    }
  }

  // 2. Test Resend API
  console.log('\n[2/3] Testing Resend Email API Connection...');
  if (!resendKey) {
    console.error('❌ Skipping: RESEND_API_KEY is not defined in .env.local');
  } else {
    try {
      const res = await fetch('https://api.resend.com/api-keys', {
        headers: { Authorization: `Bearer ${resendKey}` },
      });
      const data = await res.json();
      if (res.ok) {
        resendStatus = true;
        console.log('  ✅ Resend Authenticated Successfully');
        console.log(`  🔑 Registered API Key: ${data.data?.[0]?.name || 'talk2me'} (${data.data?.[0]?.id})`);
      } else {
        console.error('  ❌ Resend Auth Failed:', data);
      }
    } catch (err: any) {
      console.error('  ❌ Resend Network Error:', err.message);
    }
  }

  // 3. Test Email Dispatch via Resend
  console.log('\n[3/3] Testing Email Dispatch via Resend...');
  const testEmailTarget = process.argv.find((a) => a.includes('@')) || 'delivered@resend.dev';
  try {
    const emailResult = await EmailService.sendMeetingReminder(
      testEmailTarget,
      'Test User',
      {
        meetingId: 'diag-meet-' + Date.now(),
        meetingTitle: 'Talk2Me Diagnostics Sync',
        roomCode: 'DIAG-123',
        scheduledAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        joinUrl: 'https://talk2me.ai/room/DIAG-123',
        reminderType: '15m',
        workspaceName: 'Engineering',
      }
    );

    if (emailResult.success) {
      console.log(`  ✅ Test Meeting Reminder Email Sent to <${testEmailTarget}>`);
      console.log(`  📬 Resend Message ID: ${emailResult.id}`);
    } else {
      console.error(`  ❌ Failed sending test email: ${emailResult.error}`);
    }
  } catch (err: any) {
    console.error('  ❌ Email send exception:', err.message);
  }

  // 4. Optional SMS dispatch if a phone number flag is provided
  const phoneArg = process.argv.find((a) => /^(\+?\d{9,15})$/.test(a.replace(/\s/g, '')));
  if (phoneArg) {
    console.log(`\n[SMS DISPATCH TEST] Sending live test SMS to ${phoneArg}...`);
    const normalized = normalizePhoneNumberForArkesel(phoneArg);
    console.log(`  📱 Normalized recipient number: ${normalized}`);
    const smsResult = await SmsService.sendSms({
      recipients: [phoneArg],
      message: `Talk2Me: Live notification system test successful! All channels operational.`,
    });

    if (smsResult.success) {
      console.log('  ✅ Live SMS Dispatched Successfully!');
      console.log('  📦 Arkesel Response:', smsResult.data);
    } else {
      console.error('  ❌ Live SMS Failed:', smsResult.error);
    }
  } else {
    console.log('\n💡 Tip: To send a real test SMS to your phone, pass your number:');
    console.log('   npm run test:live -- 024XXXXXXX (or +233XXXXXXXXX)');
  }

  console.log('\n====================================================');
  console.log('  DIAGNOSTICS SUMMARY');
  console.log('====================================================');
  console.log(`Arkesel SMS: ${arkeselStatus ? '🟢 OPERATIONAL' : '🔴 OFFLINE / FAILED'}`);
  console.log(`Resend Email: ${resendStatus ? '🟢 OPERATIONAL' : '🔴 OFFLINE / FAILED'}`);
  console.log('====================================================\n');
}

runLiveDiagnostics();

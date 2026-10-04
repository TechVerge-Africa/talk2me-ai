import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, createAdminClient } from '@/lib/supabase-server';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/services/notifications/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const authUser = await verifyAuthToken(authHeader);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, full_name, phone_number, phone_verified, notification_preferences')
      .eq('id', authUser.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(profile.notification_preferences || {}),
      channels: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
        ...(profile.notification_preferences?.channels || {}),
      },
      events: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.events,
        ...(profile.notification_preferences?.events || {}),
      },
    };

    return NextResponse.json({
      phoneNumber: profile.phone_number || '',
      phoneVerified: profile.phone_verified ?? false,
      preferences: prefs,
      email: authUser.email,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const authUser = await verifyAuthToken(authHeader);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phoneNumber, preferences } = body;

    const admin = createAdminClient();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof phoneNumber === 'string') {
      updatePayload.phone_number = phoneNumber.trim();
      updatePayload.phone_verified = Boolean(phoneNumber.trim().length >= 9);
    }

    if (preferences && typeof preferences === 'object') {
      updatePayload.notification_preferences = preferences;
    }

    const { data, error } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', authUser.id)
      .select('id, phone_number, phone_verified, notification_preferences')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      profile: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


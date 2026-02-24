import { NextResponse } from 'next/server';

import { createServiceSupabaseClient } from '@/lib/supabase-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const supabase = createServiceSupabaseClient();

    let query = supabase
      .from('reservations')
      .select('id, room_id, guest, checkin, checkout, status, rooms(name, capacity)')
      .order('checkin', { ascending: true });

    if (status) query = query.eq('status', status);
    if (from) query = query.gte('checkin', from);
    if (to) query = query.lte('checkout', to);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      provider: 'cloudbeds-mock',
      count: data.length,
      synced_at: new Date().toISOString(),
      reservations: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        provider: 'cloudbeds-mock',
        error: error instanceof Error ? error.message : 'Unable to fetch reservations',
      },
      { status: 500 },
    );
  }
}

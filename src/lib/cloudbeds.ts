import { z } from 'zod';

import { createServiceSupabaseClient } from '@/lib/supabase-service';

const statusSchema = z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']);

const webhookSchema = z.object({
  event: z.enum(['reservation.created', 'reservation.updated', 'reservation.cancelled']),
  reservation: z.object({
    id: z.string().uuid().optional(),
    room_id: z.string().uuid(),
    guest: z.string().min(1),
    checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: statusSchema.optional(),
  }),
});

type WebhookResponse = {
  status: number;
  body: Record<string, unknown>;
};

export async function processCloudbedsWebhook(payload: unknown): Promise<WebhookResponse> {
  const parsed = webhookSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'Invalid payload',
        details: parsed.error.flatten(),
      },
    };
  }

  const { event, reservation } = parsed.data;

  try {
    const supabase = createServiceSupabaseClient();

    if (event === 'reservation.cancelled') {
      if (!reservation.id) {
        return {
          status: 400,
          body: {
            ok: false,
            error: 'reservation.id is required for cancellation events',
          },
        };
      }

      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);

      if (error) throw error;

      return {
        status: 200,
        body: {
          ok: true,
          action: 'cancelled',
          reservation_id: reservation.id,
        },
      };
    }

    const record = {
      room_id: reservation.room_id,
      guest: reservation.guest,
      checkin: reservation.checkin,
      checkout: reservation.checkout,
      status: reservation.status ?? (event === 'reservation.created' ? 'confirmed' : 'pending'),
    };

    const mutation = reservation.id
      ? supabase.from('reservations').upsert({ id: reservation.id, ...record }, { onConflict: 'id' })
      : supabase.from('reservations').insert(record);

    const { data, error } = await mutation.select().single();

    if (error) throw error;

    return {
      status: 200,
      body: {
        ok: true,
        action: event,
        reservation: data,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown webhook failure',
      },
    };
  }
}

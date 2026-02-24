'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Database } from '@/lib/types';

type Room = Database['public']['Tables']['rooms']['Row'];
type Reservation = Database['public']['Tables']['reservations']['Row'];
type Housekeeping = Database['public']['Tables']['housekeeping']['Row'];

type ReservationFormState = {
  room_id: string;
  guest: string;
  checkin: string;
  checkout: string;
  status: Reservation['status'];
};

type HousekeepingFormState = {
  room_id: string;
  type: Housekeeping['type'];
  assigned: string;
  status: Housekeeping['status'];
};

const RESERVATION_STATUSES: Reservation['status'][] = [
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
];
const HOUSEKEEPING_STATUSES: Housekeeping['status'][] = ['pending', 'in_progress', 'done'];
const HOUSEKEEPING_TYPES: Housekeeping['type'][] = ['cleaning', 'linen', 'inspection', 'repair'];
const REVENUE_PER_NIGHT_USD = 120;

const EMPTY_RESERVATION_FORM: ReservationFormState = {
  room_id: '',
  guest: '',
  checkin: '',
  checkout: '',
  status: 'confirmed',
};

const EMPTY_HOUSEKEEPING_FORM: HousekeepingFormState = {
  room_id: '',
  type: 'cleaning',
  assigned: '',
  status: 'pending',
};

function calculateNights(checkin: string, checkout: string): number {
  const start = new Date(checkin);
  const end = new Date(checkout);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [housekeeping, setHousekeeping] = useState<Housekeeping[]>([]);

  const [reservationForm, setReservationForm] = useState<ReservationFormState>(EMPTY_RESERVATION_FORM);
  const [housekeepingForm, setHousekeepingForm] = useState<HousekeepingFormState>(EMPTY_HOUSEKEEPING_FORM);

  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [editingHousekeepingId, setEditingHousekeepingId] = useState<string | null>(null);

  const loadReservations = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('checkin', { ascending: true });

    if (error) {
      setMessage(`Reservations error: ${error.message}`);
      return;
    }

    setReservations((data as unknown as Reservation[]) ?? []);
  }, [supabase]);

  const loadAll = useCallback(async () => {
    const [roomsResult, reservationsResult, housekeepingResult] = await Promise.all([
      supabase.from('rooms').select('*').order('name', { ascending: true }),
      supabase.from('reservations').select('*').order('checkin', { ascending: true }),
      supabase.from('housekeeping').select('*').order('assigned', { ascending: true }),
    ]);

    if (roomsResult.error) {
      setMessage(`Rooms error: ${roomsResult.error.message}`);
    } else {
      setRooms((roomsResult.data as unknown as Room[]) ?? []);
    }

    if (reservationsResult.error) {
      setMessage(`Reservations error: ${reservationsResult.error.message}`);
    } else {
      setReservations((reservationsResult.data as unknown as Reservation[]) ?? []);
    }

    if (housekeepingResult.error) {
      setMessage(`Housekeeping error: ${housekeepingResult.error.message}`);
    } else {
      setHousekeeping((housekeepingResult.data as unknown as Housekeeping[]) ?? []);
    }
  }, [supabase]);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      const { data, error } = await supabase.auth.getSession();

      if (ignore) return;

      if (error || !data.session) {
        router.replace('/login');
        return;
      }

      setEmail(data.session.user.email ?? '');
      await loadAll();
      setLoading(false);
    }

    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login');
      }
    });

    return () => {
      ignore = true;
      data.subscription.unsubscribe();
    };
  }, [loadAll, router, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('reservations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, async () => {
        await loadReservations();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadReservations, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      room_id: reservationForm.room_id,
      guest: reservationForm.guest,
      checkin: reservationForm.checkin,
      checkout: reservationForm.checkout,
      status: reservationForm.status,
    };

    if (!payload.room_id || !payload.guest || !payload.checkin || !payload.checkout) {
      setMessage('Reservation form is incomplete.');
      return;
    }

    const query = editingReservationId
      ? supabase.from('reservations').update(payload).eq('id', editingReservationId)
      : supabase.from('reservations').insert(payload);

    const { error } = await query;

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(editingReservationId ? 'Reservation updated.' : 'Reservation created.');
    setEditingReservationId(null);
    setReservationForm(EMPTY_RESERVATION_FORM);
    await loadAll();
  }

  async function deleteReservation(id: string) {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Reservation deleted.');
    await loadAll();
  }

  async function submitHousekeeping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      room_id: housekeepingForm.room_id,
      type: housekeepingForm.type,
      assigned: housekeepingForm.assigned,
      status: housekeepingForm.status,
    };

    if (!payload.room_id || !payload.assigned) {
      setMessage('Housekeeping form is incomplete.');
      return;
    }

    const query = editingHousekeepingId
      ? supabase.from('housekeeping').update(payload).eq('id', editingHousekeepingId)
      : supabase.from('housekeeping').insert(payload);

    const { error } = await query;

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(editingHousekeepingId ? 'Housekeeping task updated.' : 'Housekeeping task created.');
    setEditingHousekeepingId(null);
    setHousekeepingForm(EMPTY_HOUSEKEEPING_FORM);
    await loadAll();
  }

  async function deleteHousekeeping(id: string) {
    const { error } = await supabase.from('housekeeping').delete().eq('id', id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Housekeeping task deleted.');
    await loadAll();
  }

  const roomNameById = useMemo(() => {
    return new Map(rooms.map((room) => [room.id, room.name]));
  }, [rooms]);

  const currency = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    [],
  );

  const estimatedRevenue = useMemo(() => {
    return reservations
      .filter((item) => ['confirmed', 'checked_in', 'checked_out'].includes(item.status))
      .reduce((total, item) => total + calculateNights(item.checkin, item.checkout) * REVENUE_PER_NIGHT_USD, 0);
  }, [reservations]);

  const activeReservations = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return reservations.filter(
      (item) => item.status !== 'cancelled' && item.checkin <= today && item.checkout >= today,
    ).length;
  }, [reservations]);

  const occupancy = rooms.length ? Math.round((activeReservations / rooms.length) * 100) : 0;

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-20">
        <p className="text-lg text-slate-600">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Hotel Autopilot Dashboard</h1>
          <p className="text-sm text-slate-600">Realtime reservations + operations for 43 rooms</p>
          {email ? <p className="mt-1 text-xs text-slate-500">Logged in as {email}</p> : null}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Home
          </button>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Rooms</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{rooms.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Occupancy Today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{occupancy}%</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Estimated Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{currency.format(estimatedRevenue)}</p>
          <p className="text-xs text-slate-500">Based on {currency.format(REVENUE_PER_NIGHT_USD)}/night</p>
        </article>
      </section>

      {message ? <p className="mb-5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{message}</p> : null}

      <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Reservations (Realtime)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{reservation.guest}</td>
                  <td className="px-4 py-3">{roomNameById.get(reservation.room_id) ?? reservation.room_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{reservation.checkin}</td>
                  <td className="px-4 py-3">{reservation.checkout}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {reservation.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingReservationId(reservation.id);
                          setReservationForm({
                            room_id: reservation.room_id,
                            guest: reservation.guest,
                            checkin: reservation.checkin,
                            checkout: reservation.checkout,
                            status: reservation.status,
                          });
                        }}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void deleteReservation(reservation.id)}
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                    No reservations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitReservation} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            {editingReservationId ? 'Update Reservation' : 'Create Reservation'}
          </h3>

          <label className="mt-4 block text-sm font-medium text-slate-700">Room</label>
          <select
            value={reservationForm.room_id}
            onChange={(event) => setReservationForm((prev) => ({ ...prev, room_id: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          >
            <option value="">Select room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm font-medium text-slate-700">Guest</label>
          <input
            value={reservationForm.guest}
            onChange={(event) => setReservationForm((prev) => ({ ...prev, guest: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Check-in</label>
              <input
                type="date"
                value={reservationForm.checkin}
                onChange={(event) => setReservationForm((prev) => ({ ...prev, checkin: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Check-out</label>
              <input
                type="date"
                value={reservationForm.checkout}
                onChange={(event) => setReservationForm((prev) => ({ ...prev, checkout: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
            </div>
          </div>

          <label className="mt-3 block text-sm font-medium text-slate-700">Status</label>
          <select
            value={reservationForm.status}
            onChange={(event) =>
              setReservationForm((prev) => ({ ...prev, status: event.target.value as Reservation['status'] }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {RESERVATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="mt-4 flex gap-2">
            <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
              {editingReservationId ? 'Save changes' : 'Create reservation'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingReservationId(null);
                setReservationForm(EMPTY_RESERVATION_FORM);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>

        <form onSubmit={submitHousekeeping} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            {editingHousekeepingId ? 'Update Housekeeping Task' : 'Create Housekeeping Task'}
          </h3>

          <label className="mt-4 block text-sm font-medium text-slate-700">Room</label>
          <select
            value={housekeepingForm.room_id}
            onChange={(event) => setHousekeepingForm((prev) => ({ ...prev, room_id: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          >
            <option value="">Select room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm font-medium text-slate-700">Type</label>
          <select
            value={housekeepingForm.type}
            onChange={(event) =>
              setHousekeepingForm((prev) => ({ ...prev, type: event.target.value as Housekeeping['type'] }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {HOUSEKEEPING_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm font-medium text-slate-700">Assigned</label>
          <input
            value={housekeepingForm.assigned}
            onChange={(event) => setHousekeepingForm((prev) => ({ ...prev, assigned: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />

          <label className="mt-3 block text-sm font-medium text-slate-700">Status</label>
          <select
            value={housekeepingForm.status}
            onChange={(event) =>
              setHousekeepingForm((prev) => ({ ...prev, status: event.target.value as Housekeeping['status'] }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {HOUSEKEEPING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="mt-4 flex gap-2">
            <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
              {editingHousekeepingId ? 'Save changes' : 'Create task'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingHousekeepingId(null);
                setHousekeepingForm(EMPTY_HOUSEKEEPING_FORM);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Housekeeping Tasks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {housekeeping.map((task) => (
                <tr key={task.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{roomNameById.get(task.room_id) ?? task.room_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{task.type}</td>
                  <td className="px-4 py-3">{task.assigned}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{task.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingHousekeepingId(task.id);
                          setHousekeepingForm({
                            room_id: task.room_id,
                            type: task.type,
                            assigned: task.assigned,
                            status: task.status,
                          });
                        }}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void deleteHousekeeping(task.id)}
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {housekeeping.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-center text-slate-500">
                    No housekeeping tasks yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

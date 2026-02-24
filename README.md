# Hotel Autopilot MVP

Next.js + Supabase hotel operations MVP with:
- Supabase Auth (`/login`, `/register`)
- Reservations dashboard with realtime updates
- Revenue metrics and occupancy snapshot
- CRUD for reservations and housekeeping
- Cloudbeds mock API/webhook endpoints

## 1) Supabase setup (`hotel-autopilot-envigado`)

Run SQL script in Supabase SQL editor:

```sql
-- file: supabase/hotel-autopilot-envigado.sql
```

This creates:
- `rooms` (`id uuid`, `name text`, `status text`, `capacity int`) + 43 mock rooms
- `reservations` (`id uuid`, `room_id uuid`, `guest text`, `checkin date`, `checkout date`, `status text`)
- `housekeeping` (`id uuid`, `room_id uuid`, `type text`, `assigned text`, `status text`)
- Realtime publication and authenticated RLS policies.

## 2) Local run

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 3) API endpoints

- `GET /api/cloudbeds/reservations`
- `POST /webhook`
- `POST /api/cloudbeds/webhook` (alias)

Webhook payload example:

```json
{
  "event": "reservation.created",
  "reservation": {
    "room_id": "<uuid>",
    "guest": "Jane Doe",
    "checkin": "2026-02-24",
    "checkout": "2026-02-27",
    "status": "confirmed"
  }
}
```

## 4) Deploy on Vercel

```bash
vercel
vercel --prod
```

Set these environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

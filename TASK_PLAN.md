# TASK_PLAN.md - Hotel Autopilot Fase 1

## Arquitectura
- Frontend: Next.js 15 app dir
- Styling: Tailwind + Shadcn UI
- Data: Supabase (auth, realtime DB, edge functions)
- Query: TanStack Query
- Forms: Zod + React Hook Form
- Locks: TTLock API mock (cloud QR/sync)
- PMS: Cloudbeds mock webhook

## Features Priority
1. Rooms mgmt (43 rooms, status realtime)
2. Reservations sync (mock Cloudbeds API)
3. Check-in QR/SMS (Twilio)
4. Dashboard revenue (ocupación, ADR)
5. Guest PWA

## Steps
1. pnpm init + deps
2. Supabase project + schema (rooms, reservations, housekeeping)
3. Shadcn init + core UI
4. Auth pages
5. /dashboard/rooms table realtime
6. /api/cloudbeds mock
7. Vercel deploy

Done when Vercel preview live + DB schema migrated.
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <p className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-1 text-sm font-medium text-teal-800">
        Hotel Autopilot Envigado
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Operations control in one screen</h1>
      <p className="max-w-2xl text-lg text-slate-600">
        Realtime reservations, housekeeping task tracking, and Cloudbeds webhook ingestion powered by Supabase.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white transition hover:bg-teal-800"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Register
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}

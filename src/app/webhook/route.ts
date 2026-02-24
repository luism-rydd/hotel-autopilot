import { NextResponse } from 'next/server';

import { processCloudbedsWebhook } from '@/lib/cloudbeds';

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Request body must be JSON' }, { status: 400 });
  }

  const result = await processCloudbedsWebhook(payload);

  return NextResponse.json(result.body, { status: result.status });
}

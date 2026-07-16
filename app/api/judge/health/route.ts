import { NextResponse } from 'next/server';
import { buildJudgeMetrics } from '@/lib/judge/metrics';
import { workerAuthError } from '@/lib/judge/worker';

export async function GET(req: Request) {
  const auth = workerAuthError(req);
  if (auth) return auth;

  try {
    const metrics = await buildJudgeMetrics();
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Judge health GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

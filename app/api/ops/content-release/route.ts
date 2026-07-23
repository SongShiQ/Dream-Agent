import { NextResponse } from 'next/server';
import { workerAuthError } from '@/lib/judge/worker';
import { buildContentReleaseCheck } from '@/lib/content/release-check';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = workerAuthError(req);
  if (auth) return auth;
  const mode = new URL(req.url).searchParams.get('mode') === 'release' ? 'release' : 'development';
  try {
    return NextResponse.json(await buildContentReleaseCheck({ mode }));
  } catch (error) {
    console.error('Ops content release GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

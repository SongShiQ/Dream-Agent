import { NextResponse } from 'next/server';

const DEFAULT_DEV_CONTENT_TOKEN = 'dev-content-ops-token';

export function contentOpsAuthError(req: Request) {
  const expected =
    process.env.CONTENT_OPS_TOKEN ||
    (process.env.NODE_ENV !== 'production' ? DEFAULT_DEV_CONTENT_TOKEN : '');
  if (!expected) {
    return NextResponse.json({ error: 'Content operations are not configured' }, { status: 503 });
  }
  if ((req.headers.get('x-content-ops-token') || '') !== expected) {
    return NextResponse.json({ error: 'Unauthorized content operator' }, { status: 401 });
  }
  return null;
}

export function getContentOpsActor(req: Request): string | null {
  const actor = (req.headers.get('x-content-ops-actor') || '').trim();
  if (actor.length < 2 || actor.length > 80 || /[\r\n\u0000-\u001f]/.test(actor)) return null;
  return actor;
}

import { NextResponse } from 'next/server';
import { buildReleaseSnapshot, releaseSnapshotToMarkdown, type ReleaseStage } from '@/lib/ops/release';
import { workerAuthError } from '@/lib/judge/worker';

function parseTarget(value: string | null): ReleaseStage {
  if (value === 'pilot_30' || value === 'foundation_200' || value === 'onboarding_2000') {
    return value;
  }
  return 'foundation_200';
}

export async function GET(req: Request) {
  const auth = workerAuthError(req);
  if (auth) return auth;

  try {
    const url = new URL(req.url);
    const snapshot = await buildReleaseSnapshot({
      cohortId: url.searchParams.get('cohortId') || undefined,
      target: parseTarget(url.searchParams.get('target')),
      dockerVerified: url.searchParams.get('dockerVerified') === 'true',
    });
    const format = url.searchParams.get('format') || 'json';
    if (format === 'md') {
      return new NextResponse(releaseSnapshotToMarkdown(snapshot), {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="opencamp-release-snapshot-${snapshot.generatedAt.slice(0, 10)}.md"`,
        },
      });
    }
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Ops release GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { workerAuthError } from '@/lib/judge/worker';
import {
  buildKnowledgeReviewQueue,
  type KnowledgeReviewFilters,
} from '@/lib/knowledge/review';
import { buildExperimentReviewQueue } from '@/lib/experiments/review';

export const dynamic = 'force-dynamic';

function filters(req: Request): KnowledgeReviewFilters {
  const params = new URL(req.url).searchParams;
  const publicationStatus = params.get('publicationStatus') || 'all';
  const reviewStatus = params.get('reviewStatus') || 'all';
  const severity = params.get('severity') || 'all';
  return {
    publicationStatus: ['published', 'draft', 'deprecated', 'all'].includes(publicationStatus)
      ? (publicationStatus as KnowledgeReviewFilters['publicationStatus'])
      : 'all',
    reviewStatus: ['reviewed', 'pending', 'all'].includes(reviewStatus)
      ? (reviewStatus as KnowledgeReviewFilters['reviewStatus'])
      : 'all',
    severity: ['error', 'warning', 'info', 'all'].includes(severity)
      ? (severity as KnowledgeReviewFilters['severity'])
      : 'all',
    query: params.get('q') || undefined,
  };
}

export async function GET(req: Request) {
  const auth = workerAuthError(req);
  if (auth) return auth;
  try {
    const [queue, experimentQueue] = await Promise.all([
      buildKnowledgeReviewQueue(filters(req)),
      buildExperimentReviewQueue(),
    ]);
    return NextResponse.json({ queue, experimentQueue });
  } catch (error) {
    console.error('Ops knowledge GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

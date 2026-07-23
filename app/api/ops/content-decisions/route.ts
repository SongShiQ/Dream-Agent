import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';
import { contentOpsAuthError, getContentOpsActor } from '@/lib/ops/content-auth';
import {
  cancelContentReviewDecision,
  ContentDecisionError,
  createContentReviewDecision,
  listContentReviewDecisions,
  type ContentReviewAction,
  type ContentTargetKind,
} from '@/lib/content/review-decisions';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
  if (error instanceof ContentDecisionError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error('Content decisions API error:', error);
  return NextResponse.json({ error: 'Server error' }, { status: 500 });
}

export async function GET(req: Request) {
  const auth = contentOpsAuthError(req);
  if (auth) return auth;
  try {
    const limit = Number.parseInt(new URL(req.url).searchParams.get('limit') || '100', 10);
    return NextResponse.json({ decisions: await listContentReviewDecisions(prisma, limit) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  const auth = contentOpsAuthError(req);
  if (auth) return auth;
  const actor = getContentOpsActor(req);
  if (!actor) {
    return NextResponse.json({ error: 'x-content-ops-actor is required' }, { status: 400 });
  }
  try {
    let body: {
      operation?: 'create' | 'cancel';
      decisionId?: string;
      targetKind?: ContentTargetKind;
      targetId?: string;
      sourcePath?: string;
      expectedHash?: string;
      action?: ContentReviewAction;
      note?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
    }
    if (body.operation === 'cancel') {
      if (!body.decisionId) {
        return NextResponse.json({ error: 'decisionId is required' }, { status: 400 });
      }
      return NextResponse.json({
        decision: await cancelContentReviewDecision(prisma, {
          decisionId: body.decisionId,
          actor,
          note: body.note,
        }),
      });
    }
    if (
      !body.targetKind ||
      !['knowledge_card', 'experiment_template'].includes(body.targetKind) ||
      !body.targetId ||
      body.targetId.length > 120 ||
      (body.sourcePath?.length || 0) > 300 ||
      !body.expectedHash ||
      !/^[a-f0-9]{64}$/i.test(body.expectedHash) ||
      !body.action ||
      !['approve_review', 'request_changes', 'publish', 'deprecate'].includes(body.action)
    ) {
      return NextResponse.json({ error: 'invalid content decision payload' }, { status: 400 });
    }
    return NextResponse.json(
      await createContentReviewDecision(prisma, {
        targetKind: body.targetKind,
        targetId: body.targetId,
        sourcePath: body.sourcePath,
        expectedHash: body.expectedHash,
        action: body.action,
        actor,
        note: body.note,
      }),
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

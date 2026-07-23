import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { buildExperimentReviewQueue } from '@/lib/experiments/review';
import { buildKnowledgeReviewQueue } from '@/lib/knowledge/review';

export type ContentTargetKind = 'knowledge_card' | 'experiment_template';
export type ContentReviewAction =
  | 'approve_review'
  | 'request_changes'
  | 'publish'
  | 'deprecate';

type DecisionDb = Pick<PrismaClient, 'contentReviewDecision'>;

export type ContentDecisionIo = {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
};

const defaultIo: ContentDecisionIo = {
  readText: (path) => readFile(path, 'utf8'),
  writeText: (path, content) => writeFile(path, content, 'utf8'),
  move: (from, to) => rename(from, to),
  remove: (path) => unlink(path),
};

type ReviewState = {
  publicationStatus: 'published' | 'draft' | 'deprecated';
  reviewStatus: 'reviewed' | 'pending';
  reviewedBy?: string;
  reviewedAt?: string;
};

type ReviewTarget = {
  kind: ContentTargetKind;
  id: string;
  title: string;
  sourcePath: string;
  courseVersion: string;
  contentHash: string;
  raw: string;
  state: ReviewState;
  hasErrors: boolean;
  publishReady: boolean;
};

export class ContentDecisionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

function hash(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

function activeKey(kind: ContentTargetKind, sourcePath: string) {
  return `${kind}:${sourcePath}`;
}

function assertSourcePath(kind: ContentTargetKind, sourcePath: string) {
  const normalized = sourcePath.replace(/\\/g, '/');
  const valid =
    kind === 'knowledge_card'
      ? normalized.startsWith('data/knowledge/') && normalized.endsWith('.md')
      : normalized.startsWith('data/experiments/templates/') && normalized.endsWith('.json');
  if (!valid || normalized.includes('../')) {
    throw new ContentDecisionError('内容源路径不合法', 400, 'invalid_source_path');
  }
  const workspace = resolve(process.cwd());
  const absolute = resolve(workspace, normalized);
  const rel = relative(workspace, absolute).replace(/\\/g, '/');
  if (rel.startsWith('../') || rel !== normalized) {
    throw new ContentDecisionError('内容源路径越界', 400, 'source_path_escape');
  }
  return absolute;
}

async function loadTarget(
  kind: ContentTargetKind,
  targetId: string,
  requestedSourcePath?: string,
  io: ContentDecisionIo = defaultIo
): Promise<ReviewTarget> {
  if (kind === 'knowledge_card') {
    const queue = await buildKnowledgeReviewQueue();
    const matches = queue.items.filter((item) => item.id === targetId);
    const item = requestedSourcePath
      ? matches.find((candidate) => `data/knowledge/${candidate.source}` === requestedSourcePath)
      : matches.length === 1
        ? matches[0]
        : undefined;
    if (!item) {
      throw new ContentDecisionError(
        matches.length > 1 ? '知识卡 ID 重复，必须指定精确 sourcePath' : '知识卡不存在',
        matches.length > 1 ? 409 : 404,
        matches.length > 1 ? 'ambiguous_target' : 'target_not_found'
      );
    }
    const sourcePath = `data/knowledge/${item.source}`;
    const raw = await io.readText(assertSourcePath(kind, sourcePath));
    return {
      kind,
      id: item.id,
      title: item.title,
      sourcePath,
      courseVersion: item.courseVersion,
      contentHash: hash(raw),
      raw,
      state: {
        publicationStatus: item.publicationStatus,
        reviewStatus: item.reviewStatus,
        reviewedBy: item.reviewedBy,
        reviewedAt: item.reviewedAt,
      },
      hasErrors: item.issues.some((issue) => issue.severity === 'error'),
      publishReady: item.publishReady,
    };
  }

  const queue = await buildExperimentReviewQueue();
  const item = queue.items.find((candidate) => candidate.id === targetId);
  if (!item) throw new ContentDecisionError('实验模板不存在', 404, 'target_not_found');
  if (requestedSourcePath && requestedSourcePath !== item.source) {
    throw new ContentDecisionError('实验模板 sourcePath 不匹配', 409, 'source_path_mismatch');
  }
  const raw = await io.readText(assertSourcePath(kind, item.source));
  return {
    kind,
    id: item.id,
    title: item.title,
    sourcePath: item.source,
    courseVersion: item.courseVersion,
    contentHash: hash(raw),
    raw,
    state: {
      publicationStatus: item.publicationStatus,
      reviewStatus: item.reviewStatus,
      reviewedBy: item.reviewedBy,
      reviewedAt: item.reviewedAt,
    },
    hasErrors: item.issues.some((issue) => issue.severity === 'error'),
    publishReady: item.publishReady,
  };
}

function setMarkdownFrontmatter(raw: string, updates: Record<string, string>) {
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const normalized = raw.replace(/\r\n/g, '\n');
  const hasFrontmatter = normalized.startsWith('---\n');
  const end = hasFrontmatter ? normalized.indexOf('\n---', 4) : -1;
  const body = end >= 0 ? normalized.slice(end + 4).replace(/^\n+/, '') : normalized;
  const lines = end >= 0 ? normalized.slice(4, end).split('\n') : [];
  const remaining = new Map(Object.entries(updates));
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):/);
    if (!match || !remaining.has(match[1])) return line;
    const value = remaining.get(match[1])!;
    remaining.delete(match[1]);
    return `${match[1]}: ${value}`;
  });
  for (const [key, value] of remaining) nextLines.push(`${key}: ${value}`);
  return ['---', ...nextLines, '---', '', body]
    .join('\n')
    .replace(/\n/g, newline);
}

function renderTarget(raw: string, kind: ContentTargetKind, state: ReviewState) {
  if (kind === 'knowledge_card') {
    const updates: Record<string, string> = {
      publication_status: state.publicationStatus,
      review_status: state.reviewStatus,
    };
    if (state.reviewedBy) updates.reviewed_by = state.reviewedBy;
    if (state.reviewedAt) updates.reviewed_at = state.reviewedAt;
    return setMarkdownFrontmatter(raw, updates);
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.publicationStatus = state.publicationStatus;
  parsed.reviewStatus = state.reviewStatus;
  if (state.reviewedBy) parsed.reviewedBy = state.reviewedBy;
  else delete parsed.reviewedBy;
  if (state.reviewedAt) parsed.reviewedAt = state.reviewedAt;
  else delete parsed.reviewedAt;
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

function nextState(target: ReviewTarget, action: ContentReviewAction, actor: string, now: string) {
  const state = { ...target.state };
  if (action === 'approve_review') {
    if (target.state.reviewStatus === 'reviewed') {
      throw new ContentDecisionError('目标已经 reviewed', 409, 'already_reviewed');
    }
    if (target.hasErrors) {
      throw new ContentDecisionError('目标仍有 error，不能批准复核', 409, 'review_errors');
    }
    state.reviewStatus = 'reviewed';
    state.reviewedBy = actor;
    state.reviewedAt = now;
  } else if (action === 'publish') {
    if (target.state.publicationStatus === 'published') {
      throw new ContentDecisionError('目标已经 published', 409, 'already_published');
    }
    if (!target.publishReady || target.state.reviewStatus !== 'reviewed') {
      throw new ContentDecisionError('目标尚未 reviewed 或仍有发布错误', 409, 'not_publish_ready');
    }
    state.publicationStatus = 'published';
  } else if (action === 'deprecate') {
    if (target.state.publicationStatus === 'deprecated') {
      throw new ContentDecisionError('目标已经 deprecated', 409, 'already_deprecated');
    }
    state.publicationStatus = 'deprecated';
  }
  return state;
}

export async function createContentReviewDecision(
  db: DecisionDb,
  input: {
    targetKind: ContentTargetKind;
    targetId: string;
    sourcePath?: string;
    expectedHash: string;
    action: ContentReviewAction;
    actor: string;
    note?: string;
  },
  io: ContentDecisionIo = defaultIo
) {
  const note = input.note?.trim() || '';
  if (note.length > 2000) {
    throw new ContentDecisionError('批注不能超过 2000 个字符', 400, 'note_too_long');
  }
  if (input.action === 'request_changes' && note.length < 5) {
    throw new ContentDecisionError('request_changes 必须填写至少 5 个字符的批注', 400, 'note_required');
  }
  const target = await loadTarget(input.targetKind, input.targetId, input.sourcePath, io);
  if (input.expectedHash !== target.contentHash) {
    throw new ContentDecisionError('内容已经变化，请刷新审核队列后重试', 409, 'stale_content');
  }
  const now = new Date().toISOString();
  const after = nextState(target, input.action, input.actor, now);
  const proposedRaw =
    input.action === 'request_changes'
      ? target.raw
      : renderTarget(target.raw, target.kind, after);
  const isImmediate = input.action === 'request_changes';
  const key = activeKey(target.kind, target.sourcePath);
  try {
    const decision = await db.contentReviewDecision.create({
      data: {
        targetKind: target.kind,
        targetId: target.id,
        sourcePath: target.sourcePath,
        courseVersion: target.courseVersion,
        action: input.action,
        status: isImmediate ? 'applied' : 'pending',
        activeKey: isImmediate ? null : key,
        actor: input.actor,
        note,
        expectedHash: target.contentHash,
        proposedHash: hash(proposedRaw),
        beforeState: JSON.stringify(target.state),
        afterState: JSON.stringify(after),
        appliedAt: isImmediate ? new Date(now) : null,
      },
    });
    return { decision, target: { id: target.id, title: target.title, sourcePath: target.sourcePath } };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw new ContentDecisionError('该内容已有待应用决策', 409, 'pending_decision_exists');
    }
    throw error;
  }
}

export async function listContentReviewDecisions(db: DecisionDb, limit = 100) {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(Math.trunc(limit), 200))
    : 100;
  return db.contentReviewDecision.findMany({
    orderBy: { createdAt: 'desc' },
    take: normalizedLimit,
  });
}

export async function cancelContentReviewDecision(
  db: DecisionDb,
  input: { decisionId: string; actor: string; note?: string }
) {
  const decision = await db.contentReviewDecision.findUnique({ where: { id: input.decisionId } });
  if (!decision) throw new ContentDecisionError('审核决策不存在', 404, 'decision_not_found');
  if (decision.status !== 'pending') {
    throw new ContentDecisionError('只有 pending 决策可以取消', 409, 'decision_not_pending');
  }
  const note = [decision.note, `cancelled by ${input.actor}: ${input.note?.trim() || 'no note'}`]
    .filter(Boolean)
    .join('\n');
  return db.contentReviewDecision.update({
    where: { id: decision.id },
    data: { status: 'cancelled', activeKey: null, note, failureReason: 'cancelled' },
  });
}

function parseState(value: string): ReviewState {
  const parsed = JSON.parse(value) as ReviewState;
  if (
    !['published', 'draft', 'deprecated'].includes(parsed.publicationStatus) ||
    !['reviewed', 'pending'].includes(parsed.reviewStatus)
  ) {
    throw new Error('invalid stored review state');
  }
  return parsed;
}

export async function applyContentReviewDecisions(
  db: DecisionDb,
  opts: { apply?: boolean; decisionId?: string },
  io: ContentDecisionIo = defaultIo
) {
  const decisions = await db.contentReviewDecision.findMany({
    where: {
      status: 'pending',
      ...(opts.decisionId ? { id: opts.decisionId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
  const results: Array<Record<string, unknown>> = [];

  for (const decision of decisions) {
    const kind = decision.targetKind as ContentTargetKind;
    try {
      const absolute = assertSourcePath(kind, decision.sourcePath);
      const current = await io.readText(absolute);
      const currentHash = hash(current);
      if (currentHash !== decision.expectedHash && currentHash !== decision.proposedHash) {
        if (opts.apply) {
          await db.contentReviewDecision.update({
            where: { id: decision.id },
            data: {
              status: 'stale',
              activeKey: null,
              failureReason: `expected ${decision.expectedHash}, got ${currentHash}`,
            },
          });
        }
        results.push({ id: decision.id, outcome: 'stale', currentHash });
        continue;
      }
      const currentTarget = await loadTarget(kind, decision.targetId, decision.sourcePath, io);
      if (decision.action === 'approve_review' && currentTarget.hasErrors) {
        if (opts.apply) {
          await db.contentReviewDecision.update({
            where: { id: decision.id },
            data: {
              status: 'stale',
              activeKey: null,
              failureReason: 'current audit rules report blocking errors',
            },
          });
        }
        results.push({ id: decision.id, outcome: 'audit_blocked' });
        continue;
      }
      if (
        decision.action === 'publish' &&
        (!currentTarget.publishReady || currentTarget.state.reviewStatus !== 'reviewed')
      ) {
        if (opts.apply) {
          await db.contentReviewDecision.update({
            where: { id: decision.id },
            data: {
              status: 'stale',
              activeKey: null,
              failureReason: 'target is no longer publish-ready under current audit rules',
            },
          });
        }
        results.push({ id: decision.id, outcome: 'audit_blocked' });
        continue;
      }
      if (currentHash === decision.proposedHash) {
        if (opts.apply) {
          await db.contentReviewDecision.update({
            where: { id: decision.id },
            data: { status: 'applied', activeKey: null, appliedAt: new Date(), failureReason: '' },
          });
        }
        results.push({ id: decision.id, outcome: 'already_applied' });
        continue;
      }
      const proposed = renderTarget(current, kind, parseState(decision.afterState));
      const proposedHash = hash(proposed);
      if (proposedHash !== decision.proposedHash) {
        if (opts.apply) {
          await db.contentReviewDecision.update({
            where: { id: decision.id },
            data: {
              status: 'stale',
              activeKey: null,
              failureReason: 'proposed hash no longer matches renderer output',
            },
          });
        }
        results.push({ id: decision.id, outcome: 'renderer_mismatch' });
        continue;
      }
      if (opts.apply) {
        const tempPath = join(dirname(absolute), `.${decision.id}.${randomUUID()}.tmp`);
        try {
          await io.writeText(tempPath, proposed);
          await io.move(tempPath, absolute);
        } catch (error) {
          await io.remove(tempPath).catch(() => undefined);
          throw error;
        }
        await db.contentReviewDecision.update({
          where: { id: decision.id },
          data: { status: 'applied', activeKey: null, appliedAt: new Date(), failureReason: '' },
        });
      }
      results.push({ id: decision.id, outcome: opts.apply ? 'applied' : 'would_apply', proposedHash });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (opts.apply) {
        await db.contentReviewDecision
          .update({ where: { id: decision.id }, data: { failureReason: message } })
          .catch(() => undefined);
      }
      results.push({
        id: decision.id,
        outcome: 'error',
        error: message,
      });
    }
  }
  return { apply: Boolean(opts.apply), count: decisions.length, results };
}

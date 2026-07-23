/**
 * 关卡定义加载 + 进度（OJ：passed 仅 AC）
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import prisma from '@/lib/db/index';
import type {
  GateProgressStatus,
  GatesFile,
  JudgeVerdict,
  LabGateDef,
} from './types';
import { recordReviewEvidence } from '@/lib/progress/review-scheduler';
import { resolveProgressDate } from '@/lib/progress/daily';

const GATES_PATH = join(process.cwd(), 'data', 'labs', 'gates.json');

let cache: GatesFile | null = null;

export async function loadGatesFile(): Promise<GatesFile> {
  if (cache) return cache;
  const raw = await readFile(GATES_PATH, 'utf-8');
  cache = JSON.parse(raw) as GatesFile;
  return cache;
}

/** 测试或热更新时可清缓存 */
export function clearGatesCache() {
  cache = null;
}

export async function listGateDefs(): Promise<LabGateDef[]> {
  const f = await loadGatesFile();
  return [...f.gates].sort((a, b) => a.order - b.order);
}

export async function getGateDef(gateId: string): Promise<LabGateDef | null> {
  const gates = await listGateDefs();
  return gates.find((g) => g.id === gateId) || null;
}

export async function getGatesForStage(stage: string): Promise<LabGateDef[]> {
  const gates = await listGateDefs();
  return gates.filter((g) => g.stageIds.includes(stage));
}

/**
 * 计算某关对学员应有的状态（不写库）
 * - 无 unlockAfter 或前置全 passed → 至少 unlocked
 * - DB 已 passed → passed
 */
export function computeUnlockStatus(
  gate: LabGateDef,
  progressMap: Map<string, { status: string }>
): GateProgressStatus {
  const row = progressMap.get(gate.id);
  if (row?.status === 'passed') return 'passed';

  const preds = gate.unlockAfter || [];
  if (preds.length === 0) return 'unlocked';

  const allPredPassed = preds.every(
    (id) => progressMap.get(id)?.status === 'passed'
  );
  return allPredPassed ? 'unlocked' : 'locked';
}

/** 读取学员所有关卡进度行 */
export async function getProgressMap(studentId: string) {
  const rows = await prisma.labGateProgress.findMany({
    where: { studentId },
  });
  return new Map(rows.map((r) => [r.gateId, r]));
}

/**
 * 确保进度行存在，并按前置关刷新 locked/unlocked（不降级 passed）
 */
export async function syncStudentGateProgress(studentId: string) {
  const gates = await listGateDefs();
  await prisma.$transaction(
    gates.map((gate) =>
      prisma.labGateProgress.upsert({
        where: { studentId_gateId: { studentId, gateId: gate.id } },
        create: {
          studentId,
          gateId: gate.id,
          status: (gate.unlockAfter || []).length === 0 ? 'unlocked' : 'locked',
        },
        update: {},
      })
    )
  );

  const map = await getProgressMap(studentId);

  // 刷新非 passed 的 locked/unlocked
  for (const g of gates) {
    const row = map.get(g.id);
    if (!row || row.status === 'passed') continue;
    const next = computeUnlockStatus(g, map);
    if (next !== row.status && next !== 'passed') {
      await prisma.labGateProgress.updateMany({
        where: { id: row.id, status: { not: 'passed' } },
        data: { status: next },
      });
    }
  }

  return getProgressMap(studentId);
}

/**
 * 仅当 verdict=AC 时标记关卡通过（OJ 铁律）
 */
export async function markGatePassedOnAc(opts: {
  studentId: string;
  gateId: string;
  submitId: string;
  verdict: JudgeVerdict;
}): Promise<boolean> {
  if (opts.verdict !== 'AC') return false;
  if (!opts.gateId) return false;

  const gate = await getGateDef(opts.gateId);
  if (!gate) return false;
  if (gate.judgeKind === 'manual_teacher') return false;

  await prisma.labGateProgress.upsert({
    where: {
      studentId_gateId: {
        studentId: opts.studentId,
        gateId: opts.gateId,
      },
    },
    create: {
      studentId: opts.studentId,
      gateId: opts.gateId,
      status: 'passed',
      passedAt: new Date(),
      bestVerdict: 'AC',
      passSubmitId: opts.submitId,
    },
    update: {
      status: 'passed',
      passedAt: new Date(),
      bestVerdict: 'AC',
      passSubmitId: opts.submitId,
    },
  });

  // 解锁后续关
  await syncStudentGateProgress(opts.studentId);

  try {
    const student = await prisma.student.findUnique({
      where: { id: opts.studentId },
      select: { curriculumVersion: true },
    });
    await recordReviewEvidence({
      studentId: opts.studentId,
      curriculumVersion: student?.curriculumVersion || '2026-summer-os',
      targetType: 'gate',
      targetId: opts.gateId,
      evidenceType: 'judge_ac',
      evidenceId: opts.submitId,
      passed: true,
      evidenceAt: new Date(),
      today: resolveProgressDate(),
    });
  } catch (error) {
    console.warn('gate: review schedule update failed', error);
  }

  // 检查助教主路径：所有非 manual 关是否均 passed
  await maybeCompleteAssistantPath(opts.studentId);

  return true;
}

export async function maybeCompleteAssistantPath(studentId: string) {
  const gates = await listGateDefs();
  const autoGates = gates.filter((g) => g.judgeKind !== 'manual_teacher');
  const map = await getProgressMap(studentId);
  const allPassed = autoGates.every((g) => map.get(g.id)?.status === 'passed');
  if (!allPassed) return false;

  await prisma.student.update({
    where: { id: studentId },
    data: { assistantPathCompletedAt: new Date() },
  });
  return true;
}

export async function buildGatesDashboard(studentId: string) {
  const gates = await listGateDefs();
  const map = await syncStudentGateProgress(studentId);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { assistantPathCompletedAt: true, currentStage: true },
  });

  return {
    policy: (await loadGatesFile()).policy,
    assistantPathCompletedAt: student?.assistantPathCompletedAt || null,
    currentStage: student?.currentStage || null,
    gates: gates.map((g) => {
      const row = map.get(g.id);
      const status = (row?.status ||
        computeUnlockStatus(g, map)) as GateProgressStatus;
      return {
        ...g,
        progress: {
          status,
          passedAt: row?.passedAt || null,
          bestVerdict: row?.bestVerdict || null,
          passSubmitId: row?.passSubmitId || null,
        },
      };
    }),
  };
}

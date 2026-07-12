import prisma from './index';
import type { Student, Stage } from './schema';
import { countRecentCorrectStreakForKp } from './question';

export async function getOrCreateStudent(name: string, email?: string): Promise<{ student: Student; created: boolean }> {
  let student = await prisma.student.findFirst({
    where: {
      OR: [
        { name },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (student) {
    return { student, created: false };
  }

  student = await prisma.student.create({
    data: { name, email },
  });
  return { student, created: true };
}

export async function getStudentById(id: string): Promise<Student | null> {
  return prisma.student.findUnique({
    where: { id },
  });
}

export async function updateStudentStage(id: string, stage: Stage | string): Promise<Student> {
  return prisma.student.update({
    where: { id },
    data: { currentStage: stage },
  });
}

export async function updateStudentWeakPoints(id: string, weakPoints: string[]): Promise<Student> {
  return prisma.student.update({
    where: { id },
    data: { weakPoints: JSON.stringify(weakPoints) },
  });
}

export async function mergeWeakPoints(id: string, extra: string[]): Promise<string[]> {
  const student = await getStudentById(id);
  if (!student) return extra;
  let current: string[] = [];
  try {
    current = JSON.parse(student.weakPoints || '[]');
  } catch {
    current = [];
  }
  const merged = Array.from(new Set([...current, ...extra.filter(Boolean)])).slice(0, 20);
  await updateStudentWeakPoints(id, merged);
  return merged;
}

export async function decayWeakPointsOnCorrect(
  studentId: string,
  knowledgePoints: string[]
): Promise<string[]> {
  const student = await getStudentById(studentId);
  if (!student) return [];
  let weak: string[] = [];
  try {
    weak = JSON.parse(student.weakPoints || '[]');
  } catch {
    weak = [];
  }
  if (weak.length === 0 || knowledgePoints.length === 0) return weak;

  const remove: string[] = [];
  for (const kp of knowledgePoints) {
    if (!weak.includes(kp)) continue;
    const streak = await countRecentCorrectStreakForKp(studentId, kp);
    if (streak >= 2) remove.push(kp);
  }

  if (remove.length === 0) return weak;
  const next = weak.filter((w) => !remove.includes(w));
  await updateStudentWeakPoints(studentId, next);
  return next;
}

export async function getStudentProgress(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      assessments: {
        orderBy: { assessedAt: 'desc' },
        take: 1,
      },
      answerRecords: {
        orderBy: { answeredAt: 'desc' },
        take: 20,
      },
      learningPlan: true,
    },
  });
}

export async function getStudentStats(studentId: string) {
  const [total, correct, recent] = await Promise.all([
    prisma.answerRecord.count({ where: { studentId } }),
    prisma.answerRecord.count({ where: { studentId, isCorrect: true } }),
    prisma.answerRecord.findMany({
      where: { studentId },
      orderBy: { answeredAt: 'desc' },
      take: 20,
    }),
  ]);

  const recentTotal = recent.length;
  const recentCorrect = recent.filter((r) => r.isCorrect).length;
  const recentAccuracy = recentTotal > 0 ? recentCorrect / recentTotal : 0;

  let consecutiveCorrect = 0;
  let consecutiveWrong = 0;
  for (const record of recent) {
    if (record.isCorrect) {
      if (consecutiveWrong > 0) break;
      consecutiveCorrect++;
    } else {
      if (consecutiveCorrect > 0) break;
      consecutiveWrong++;
    }
  }

  const accuracyAll = total > 0 ? correct / total : 0.5;
  const currentDifficulty = Math.max(
    0,
    Math.min(100, Math.round(50 + (accuracyAll - 0.5) * 40 + consecutiveCorrect * 3 - consecutiveWrong * 5))
  );

  return {
    totalQuestions: total,
    correctAnswers: correct,
    recentAccuracy,
    consecutiveCorrect,
    consecutiveWrong,
    currentDifficulty,
  };
}

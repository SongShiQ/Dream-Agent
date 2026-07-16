import prisma from '@/lib/db/index';
import { localDateKey } from '@/lib/learning/today-progress';

export type DailyProgressState = {
  date: string;
  done: string[];
  fingerprint: string;
};

export function resolveProgressDate(date?: string | null): string {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return localDateKey();
}

export async function getDailyProgress(opts: {
  studentId: string;
  date?: string | null;
  fingerprint?: string | null;
}): Promise<DailyProgressState> {
  const date = resolveProgressDate(opts.date);
  const rows = await prisma.dailyTaskProgress.findMany({
    where: { studentId: opts.studentId, date },
    orderBy: { completedAt: 'asc' },
  });
  const fingerprint = opts.fingerprint ?? rows[0]?.fingerprint ?? '';
  return {
    date,
    done: rows
      .filter((r) => !fingerprint || !r.fingerprint || r.fingerprint === fingerprint)
      .map((r) => r.taskId),
    fingerprint,
  };
}

export async function setTaskPersonalDone(opts: {
  studentId: string;
  taskId: string;
  done: boolean;
  date?: string | null;
  fingerprint?: string | null;
}): Promise<DailyProgressState> {
  const date = resolveProgressDate(opts.date);
  const fingerprint = opts.fingerprint || '';
  const taskId = opts.taskId.trim();
  if (!taskId) {
    throw new Error('taskId is required');
  }

  if (opts.done) {
    await prisma.dailyTaskProgress.upsert({
      where: {
        studentId_date_taskId: {
          studentId: opts.studentId,
          date,
          taskId,
        },
      },
      create: {
        studentId: opts.studentId,
        date,
        taskId,
        fingerprint,
      },
      update: {
        fingerprint,
        completedAt: new Date(),
      },
    });
  } else {
    await prisma.dailyTaskProgress.deleteMany({
      where: { studentId: opts.studentId, date, taskId },
    });
  }

  return getDailyProgress({ studentId: opts.studentId, date, fingerprint });
}

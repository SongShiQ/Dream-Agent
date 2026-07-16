import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDailyProgress,
  resolveProgressDate,
  setTaskPersonalDone,
} from '@/lib/progress/daily';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('@/lib/db/index', () => ({
  default: {
    dailyTaskProgress: {
      findMany: mocks.findMany,
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
    },
  },
}));

describe('daily progress', () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.upsert.mockReset();
    mocks.deleteMany.mockReset();
  });

  it('accepts only YYYY-MM-DD dates or falls back to today', () => {
    expect(resolveProgressDate('2026-07-14')).toBe('2026-07-14');
    expect(resolveProgressDate('07/14/2026')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('writes personal_done with student/date/task uniqueness', async () => {
    mocks.findMany.mockResolvedValueOnce([
      {
        taskId: 's1',
        fingerprint: 'fp',
        completedAt: new Date('2026-07-14T00:00:00Z'),
      },
    ]);

    const state = await setTaskPersonalDone({
      studentId: 'stu_1',
      taskId: 's1',
      done: true,
      date: '2026-07-14',
      fingerprint: 'fp',
    });

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId_date_taskId: {
            studentId: 'stu_1',
            date: '2026-07-14',
            taskId: 's1',
          },
        },
      })
    );
    expect(state).toEqual({ date: '2026-07-14', done: ['s1'], fingerprint: 'fp' });
  });

  it('removes personal_done without creating mastery evidence', async () => {
    mocks.findMany.mockResolvedValueOnce([]);

    const state = await setTaskPersonalDone({
      studentId: 'stu_1',
      taskId: 's1',
      done: false,
      date: '2026-07-14',
      fingerprint: 'fp',
    });

    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { studentId: 'stu_1', date: '2026-07-14', taskId: 's1' },
    });
    expect(state.done).toEqual([]);
  });

  it('filters stale fingerprint rows', async () => {
    mocks.findMany.mockResolvedValueOnce([
      { taskId: 'current', fingerprint: 'new', completedAt: new Date() },
      { taskId: 'old', fingerprint: 'old', completedAt: new Date() },
    ]);

    const state = await getDailyProgress({
      studentId: 'stu_1',
      date: '2026-07-14',
      fingerprint: 'new',
    });

    expect(state.done).toEqual(['current']);
  });
});

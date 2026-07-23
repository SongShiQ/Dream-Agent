import { afterEach, describe, expect, it } from 'vitest';
import prisma from '@/lib/db/index';
import { listGateDefs, syncStudentGateProgress } from '@/lib/labs/gates';

const studentIds: string[] = [];

afterEach(async () => {
  if (studentIds.length > 0) {
    await prisma.student.deleteMany({ where: { id: { in: studentIds.splice(0) } } });
  }
});

describe('gate progress initialization concurrency', () => {
  it('creates exactly one progress row per gate under concurrent dashboard reads', async () => {
    const student = await prisma.student.create({
      data: {
        name: `gate-sync-${Date.now()}`,
        email: `gate-sync-${Date.now()}@example.test`,
      },
    });
    studentIds.push(student.id);

    const [first, second, third] = await Promise.all([
      syncStudentGateProgress(student.id),
      syncStudentGateProgress(student.id),
      syncStudentGateProgress(student.id),
    ]);
    const gates = await listGateDefs();
    const rows = await prisma.labGateProgress.findMany({ where: { studentId: student.id } });

    expect(first.size).toBe(gates.length);
    expect(second.size).toBe(gates.length);
    expect(third.size).toBe(gates.length);
    expect(rows).toHaveLength(gates.length);
    expect(new Set(rows.map((row) => row.gateId)).size).toBe(gates.length);
    expect(rows.find((row) => row.gateId === 'env-setup')?.status).toBe('unlocked');
  });
});

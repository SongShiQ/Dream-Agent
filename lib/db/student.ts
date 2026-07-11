import prisma from './index';
import type { Student, Stage, LevelAssessment } from './schema';

export async function getOrCreateStudent(name: string, email?: string): Promise<Student> {
  let student = await prisma.student.findFirst({
    where: {
      OR: [
        { name },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (!student) {
    student = await prisma.student.create({
      data: { name, email },
    });
  }

  return student;
}

export async function getStudentById(id: string): Promise<Student | null> {
  return prisma.student.findUnique({
    where: { id },
  });
}

export async function updateStudentStage(id: string, stage: Stage): Promise<Student> {
  return prisma.student.update({
    where: { id },
    data: { currentStage: stage },
  });
}

export async function updateStudentWeakPoints(id: string, weakPoints: string[]): Promise<Student> {
  return prisma.student.update({
    where: { id },
    data: { weakPoints },
  });
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
  const records = await prisma.answerRecord.findMany({
    where: { studentId },
    orderBy: { answeredAt: 'desc' },
    take: 20,
  });

  const total = records.length;
  const correct = records.filter(r => r.isCorrect).length;
  const recentAccuracy = total > 0 ? correct / total : 0;

  let consecutiveCorrect = 0;
  let consecutiveWrong = 0;
  for (const record of records) {
    if (record.isCorrect) {
      consecutiveCorrect++;
      consecutiveWrong = 0;
    } else {
      consecutiveWrong++;
      consecutiveCorrect = 0;
      break;
    }
  }

  return {
    total,
    correct,
    recentAccuracy,
    consecutiveCorrect,
    consecutiveWrong,
  };
}

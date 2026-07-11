import prisma from './index';
import type { Question, QuestionData } from './schema';

export async function createQuestion(data: QuestionData): Promise<Question> {
  return prisma.question.create({
    data: {
      type: data.type,
      difficulty: data.difficulty,
      knowledgePoints: data.knowledgePoints,
      content: data.content,
      options: data.options || [],
      answer: data.answer,
      explanation: data.explanation,
    },
  });
}

export async function getQuestionsByDifficulty(
  difficulty: number,
  knowledgePoints: string[],
  limit: number = 5
): Promise<Question[]> {
  return prisma.question.findMany({
    where: {
      difficulty: {
        gte: Math.max(0, difficulty - 15),
        lte: Math.min(100, difficulty + 15),
      },
      ...(knowledgePoints.length > 0 ? {
        knowledgePoints: {
          hasSome: knowledgePoints,
        },
      } : {}),
    },
    take: limit,
    orderBy: { difficulty: 'asc' },
  });
}

export async function getRandomQuestion(difficulty?: number): Promise<Question | null> {
  const where = difficulty !== undefined ? {
    difficulty: {
      gte: Math.max(0, difficulty - 10),
      lte: Math.min(100, difficulty + 10),
    },
  } : {};

  const count = await prisma.question.count({ where });
  if (count === 0) return null;

  const skip = Math.floor(Math.random() * count);
  return prisma.question.findFirst({
    where,
    skip,
  });
}

export async function saveAnswerRecord(
  studentId: string,
  questionId: string,
  answer: string,
  isCorrect: boolean,
  timeSpent: number
) {
  return prisma.answerRecord.create({
    data: {
      studentId,
      questionId,
      answer,
      isCorrect,
      timeSpent,
    },
  });
}

export async function getQuestionById(id: string): Promise<Question | null> {
  return prisma.question.findUnique({
    where: { id },
  });
}

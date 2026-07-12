import prisma from './index';
import type { Question, QuestionData } from './schema';
import { parseJsonArray } from '@/lib/exam/grade';

export async function createQuestion(data: QuestionData & { stage?: string }): Promise<Question> {
  return prisma.question.create({
    data: {
      type: data.type,
      difficulty: data.difficulty,
      knowledgePoints: JSON.stringify(data.knowledgePoints),
      content: data.content,
      options: JSON.stringify(data.options || []),
      answer: data.answer,
      explanation: data.explanation,
      stage: data.stage || 'basic',
    },
  });
}

export async function getQuestionById(id: string): Promise<Question | null> {
  return prisma.question.findUnique({
    where: { id },
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

/** 最近答过的题目 id（避免连抽同一题） */
export async function getRecentQuestionIds(
  studentId: string,
  limit = 15
): Promise<string[]> {
  const rows = await prisma.answerRecord.findMany({
    where: { studentId },
    orderBy: { answeredAt: 'desc' },
    take: limit,
    select: { questionId: true },
  });
  return Array.from(new Set(rows.map((r) => r.questionId)));
}

export interface PickQuestionOpts {
  difficulty?: number;
  weakPoints?: string[];
  excludeIds?: string[];
  /** 强制优先薄弱点 */
  focusWeak?: boolean;
  /** 专项：只练某一知识点 */
  knowledgePoint?: string;
  stage?: string;
}

/**
 * 智能抽题：
 * 1) 难度窗口内候选
 * 2) 排除近期做过
 * 3) weak / focus 加权
 * 4) 窗口过窄则放宽难度
 */
export async function pickQuestion(opts: PickQuestionOpts = {}): Promise<Question | null> {
  const difficulty = opts.difficulty ?? 50;
  const weak = (opts.weakPoints || []).map((w) => w.toLowerCase());
  const exclude = new Set(opts.excludeIds || []);
  const focusKp = opts.knowledgePoint?.toLowerCase();

  const windows = [
    { lo: 10, hi: 10 },
    { lo: 20, hi: 20 },
    { lo: 40, hi: 40 },
    { lo: 100, hi: 100 },
  ];

  for (const w of windows) {
    const candidates = await prisma.question.findMany({
      where: {
        difficulty: {
          gte: Math.max(0, difficulty - w.lo),
          lte: Math.min(100, difficulty + w.hi),
        },
        ...(opts.stage ? { stage: opts.stage } : {}),
      },
      take: 200,
    });

    let pool = candidates.filter((q) => !exclude.has(q.id));
    if (pool.length === 0) continue;

    if (focusKp) {
      const focused = pool.filter((q) =>
        parseJsonArray(q.knowledgePoints).some((k) => k.toLowerCase() === focusKp)
      );
      if (focused.length > 0) pool = focused;
    }

    // 打分：薄弱点命中 +1/点，focusWeak 时无命中降权
    const scored = pool.map((q) => {
      const kps = parseJsonArray(q.knowledgePoints).map((k) => k.toLowerCase());
      let score = Math.random(); // 轻微随机
      const hits = kps.filter((k) => weak.includes(k)).length;
      if (hits > 0) score += hits * 3;
      if (opts.focusWeak && weak.length > 0 && hits === 0) score -= 5;
      // 难度越接近越好
      score += 1 - Math.abs(q.difficulty - difficulty) / 100;
      return { q, score, hits };
    });

    scored.sort((a, b) => b.score - a.score);

    if (opts.focusWeak && weak.length > 0) {
      const withHit = scored.filter((s) => s.hits > 0);
      if (withHit.length > 0) {
        // 在命中薄弱点的前几名里随机
        const top = withHit.slice(0, Math.min(5, withHit.length));
        return top[Math.floor(Math.random() * top.length)].q;
      }
    }

    const top = scored.slice(0, Math.min(8, scored.length));
    return top[Math.floor(Math.random() * top.length)].q;
  }

  // 最后兜底：任意未排除题
  const any = await prisma.question.findMany({ take: 100 });
  const left = any.filter((q) => !exclude.has(q.id));
  if (left.length === 0) {
    return any.length > 0 ? any[Math.floor(Math.random() * any.length)] : null;
  }
  return left[Math.floor(Math.random() * left.length)];
}

/** @deprecated 使用 pickQuestion */
export async function getRandomQuestion(difficulty?: number): Promise<Question | null> {
  return pickQuestion({ difficulty });
}

export async function getWrongQuestions(studentId: string, limit = 30) {
  const wrongs = await prisma.answerRecord.findMany({
    where: { studentId, isCorrect: false },
    orderBy: { answeredAt: 'desc' },
    take: limit * 3,
    include: { question: true },
  });

  // 去重：同一题只保留最近一次错答
  const seen = new Set<string>();
  const list: {
    recordId: string;
    questionId: string;
    yourAnswer: string;
    answeredAt: Date;
    question: {
      id: string;
      type: string;
      content: string;
      options: string[];
      answer: string;
      explanation: string;
      knowledgePoints: string[];
      difficulty: number;
    };
  }[] = [];

  for (const r of wrongs) {
    if (seen.has(r.questionId)) continue;
    seen.add(r.questionId);
    list.push({
      recordId: r.id,
      questionId: r.questionId,
      yourAnswer: r.answer,
      answeredAt: r.answeredAt,
      question: {
        id: r.question.id,
        type: r.question.type,
        content: r.question.content,
        options: parseJsonArray(r.question.options),
        answer: r.question.answer,
        explanation: r.question.explanation,
        knowledgePoints: parseJsonArray(r.question.knowledgePoints),
        difficulty: r.question.difficulty,
      },
    });
    if (list.length >= limit) break;
  }
  return list;
}

/** 某知识点最近连续答对次数（从近到远） */
export async function countRecentCorrectStreakForKp(
  studentId: string,
  knowledgePoint: string,
  lookback = 10
): Promise<number> {
  const records = await prisma.answerRecord.findMany({
    where: { studentId },
    orderBy: { answeredAt: 'desc' },
    take: 40,
    include: { question: true },
  });

  const kp = knowledgePoint.toLowerCase();
  let streak = 0;
  let seen = 0;
  for (const r of records) {
    const kps = parseJsonArray(r.question.knowledgePoints).map((k) => k.toLowerCase());
    if (!kps.includes(kp)) continue;
    seen++;
    if (r.isCorrect) streak++;
    else break;
    if (seen >= lookback) break;
  }
  return streak;
}

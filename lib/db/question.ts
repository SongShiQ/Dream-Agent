import prisma from './index';
import type { Question, QuestionData } from './schema';
import { parseJsonArray } from '@/lib/exam/grade';
import { classifyQuestionDims, type DimScores } from '@/lib/assess/diagnostic';

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
  /**
   * 最低难度偏好（解决「经典题都太简单」）
   * 例如学员正确率高时传 50～60
   */
  minDifficulty?: number;
  /** 略偏向更难（0～1，默认 0.35） */
  hardBias?: number;
}

/**
 * 智能抽题：
 * 1) 难度窗口内候选（可抬高下限）
 * 2) 排除近期做过
 * 3) weak / focus 加权
 * 4) 偏向中高难度（hardBias）
 * 5) 窗口过窄则放宽
 */
export async function pickQuestion(opts: PickQuestionOpts = {}): Promise<Question | null> {
  const difficulty = opts.difficulty ?? 50;
  const minDiff = opts.minDifficulty ?? Math.max(30, difficulty - 15);
  const hardBias = opts.hardBias ?? 0.35;
  const weak = (opts.weakPoints || []).map((w) => w.toLowerCase());
  const exclude = new Set(opts.excludeIds || []);
  const focusKp = opts.knowledgePoint?.toLowerCase();

  const windows = [
    { lo: 10, hi: 15 },
    { lo: 20, hi: 25 },
    { lo: 35, hi: 40 },
    { lo: 100, hi: 100 },
  ];

  for (const w of windows) {
    const gte = Math.max(0, Math.min(minDiff, difficulty - w.lo));
    const lte = Math.min(100, Math.max(difficulty + w.hi, minDiff + 10));
    const candidates = await prisma.question.findMany({
      where: {
        difficulty: { gte, lte },
        ...(opts.stage ? { stage: opts.stage } : {}),
      },
      take: 220,
    });

    let pool = candidates.filter((q) => !exclude.has(q.id));
    // 优先丢掉过易题（除非池子太小）
    const notTooEasy = pool.filter((q) => q.difficulty >= minDiff - 5);
    if (notTooEasy.length >= 3) pool = notTooEasy;

    if (pool.length === 0) continue;

    if (focusKp) {
      const focused = pool.filter((q) =>
        parseJsonArray(q.knowledgePoints).some((k) => k.toLowerCase() === focusKp)
      );
      if (focused.length > 0) pool = focused;
    }

    const scored = pool.map((q) => {
      const kps = parseJsonArray(q.knowledgePoints).map((k) => k.toLowerCase());
      let score = Math.random() * 0.4;
      const hits = kps.filter((k) => weak.includes(k)).length;
      if (hits > 0) score += hits * 3;
      if (opts.focusWeak && weak.length > 0 && hits === 0) score -= 5;
      // 接近目标难度
      score += 1 - Math.abs(q.difficulty - difficulty) / 100;
      // 偏向更难：难度越高加分
      score += (q.difficulty / 100) * hardBias * 2;
      // 略降「超简单」
      if (q.difficulty < 35) score -= 0.8;
      return { q, score, hits };
    });

    scored.sort((a, b) => b.score - a.score);

    if (opts.focusWeak && weak.length > 0) {
      const withHit = scored.filter((s) => s.hits > 0);
      if (withHit.length > 0) {
        const top = withHit.slice(0, Math.min(5, withHit.length));
        return top[Math.floor(Math.random() * top.length)].q;
      }
    }

    const top = scored.slice(0, Math.min(8, scored.length));
    return top[Math.floor(Math.random() * top.length)].q;
  }

  const any = await prisma.question.findMany({ take: 120, orderBy: { difficulty: 'desc' } });
  const left = any.filter((q) => !exclude.has(q.id) && q.difficulty >= 40);
  if (left.length > 0) {
    return left[Math.floor(Math.random() * Math.min(15, left.length))];
  }
  const left2 = any.filter((q) => !exclude.has(q.id));
  if (left2.length === 0) {
    return any.length > 0 ? any[Math.floor(Math.random() * any.length)] : null;
  }
  return left2[Math.floor(Math.random() * left2.length)];
}

/**
 * 水平评估专用：分层抽题（易/中/难），排除近期做过，保证卷面有区分度且少重复
 */
export async function pickDiagnosticSet(
  studentId: string,
  size = 12
): Promise<Question[]> {
  const recent = await getRecentQuestionIds(studentId, 40);
  const exclude = new Set(recent);
  const all = await prisma.question.findMany({ take: 600 });
  const pool = all.filter((q) => !exclude.has(q.id));
  const source = pool.length >= size ? pool : all;

  const picked: Question[] = [];
  const used = new Set<string>();
  const dims: (keyof DimScores)[] = ['theory', 'rust', 'coding'];
  const perDim = Math.max(1, Math.floor(size / dims.length));
  const bands = [
    { lo: 0, hi: 45 },
    { lo: 45, hi: 70 },
    { lo: 70, hi: 101 },
  ];

  for (const dim of dims) {
    for (let i = 0; i < perDim; i++) {
      const band = bands[i % bands.length];
      const cand = source.filter(
        (q) =>
          !used.has(q.id) &&
          q.difficulty >= band.lo &&
          q.difficulty < band.hi &&
          classifyQuestionDims(q).includes(dim)
      );
      const fallback = source.filter(
        (q) => !used.has(q.id) && classifyQuestionDims(q).includes(dim)
      );
      const poolForPick = cand.length > 0 ? cand : fallback;
      if (poolForPick.length === 0) continue;
      const q = poolForPick[Math.floor(Math.random() * poolForPick.length)];
      picked.push(q);
      used.add(q.id);
    }
  }


  if (picked.length < size) {
    const rest = source
      .filter((q) => !used.has(q.id))
      .sort((a, b) => b.difficulty - a.difficulty);
    for (const q of rest) {
      if (picked.length >= size) break;
      picked.push(q);
      used.add(q.id);
    }
  }

  return picked.slice(0, size).sort(() => Math.random() - 0.5);
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

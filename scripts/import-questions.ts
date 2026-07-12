import prisma from '../lib/db/index';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

interface QuestionData {
  type: string;
  difficulty: number;
  knowledgePoints: string[];
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
  stage?: string;
}

async function loadAllQuestions(): Promise<QuestionData[]> {
  const dir = join(process.cwd(), 'data', 'questions');
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith('.json') && !f.startsWith('_')
  );
  const all: QuestionData[] = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      console.warn(`Skip non-array file: ${file}`);
      continue;
    }
    console.log(`File ${file}: ${data.length} questions`);
    all.push(...data);
  }
  return all;
}

async function importQuestions() {
  const questions = await loadAllQuestions();
  console.log(`Total ${questions.length} questions to process`);

  let imported = 0;
  let skipped = 0;

  for (const q of questions) {
    if (!q.content || !q.answer) {
      console.warn('Skip invalid question (missing content/answer)');
      skipped++;
      continue;
    }

    const existing = await prisma.question.findFirst({
      where: { content: q.content },
    });

    if (existing) {
      // 回填 stage / 知识点 / 解析 / 答案 / 选项（内容包修订时同步）
      const newKp = JSON.stringify(q.knowledgePoints || []);
      const newOpts = JSON.stringify(q.options || []);
      const needUpdate =
        (q.stage && existing.stage !== q.stage) ||
        existing.knowledgePoints === '[]' ||
        existing.knowledgePoints !== newKp ||
        existing.answer !== q.answer ||
        existing.explanation !== (q.explanation || '') ||
        existing.options !== newOpts ||
        (typeof q.difficulty === 'number' && existing.difficulty !== q.difficulty) ||
        (q.type && existing.type !== q.type);
      if (needUpdate) {
        await prisma.question.update({
          where: { id: existing.id },
          data: {
            stage: q.stage || existing.stage,
            knowledgePoints: newKp,
            difficulty: q.difficulty ?? existing.difficulty,
            options: newOpts,
            explanation: q.explanation || existing.explanation,
            answer: q.answer,
            type: q.type || existing.type,
          },
        });
        console.log(`Updated: ${q.content.slice(0, 40)}...`);
      } else {
        skipped++;
      }
      continue;
    }

    await prisma.question.create({
      data: {
        type: q.type || 'choice',
        difficulty: q.difficulty ?? 50,
        knowledgePoints: JSON.stringify(q.knowledgePoints || []),
        content: q.content,
        options: JSON.stringify(q.options || []),
        answer: q.answer,
        explanation: q.explanation || '',
        stage: q.stage || 'basic',
      },
    });
    imported++;
    console.log(`Imported: ${q.content.slice(0, 40)}...`);
  }

  const total = await prisma.question.count();
  console.log(`Done. imported=${imported} skipped=${skipped} db_total=${total}`);
}

importQuestions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

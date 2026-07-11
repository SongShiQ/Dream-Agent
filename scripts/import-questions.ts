import prisma from '../lib/db/index';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface QuestionData {
  type: string;
  difficulty: number;
  knowledgePoints: string[];
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
}

async function importQuestions() {
  const dataPath = join(process.cwd(), 'data', 'questions', 'os-basics.json');
  const data = await readFile(dataPath, 'utf-8');
  const questions: QuestionData[] = JSON.parse(data);

  console.log(`Found ${questions.length} questions to import`);

  for (const q of questions) {
    const existing = await prisma.question.findFirst({
      where: { content: q.content },
    });

    if (existing) {
      console.log(`Skipping duplicate: ${q.content.slice(0, 50)}...`);
      continue;
    }

    await prisma.question.create({
      data: {
        type: q.type,
        difficulty: q.difficulty,
        knowledgePoints: JSON.stringify(q.knowledgePoints),
        content: q.content,
        options: JSON.stringify(q.options || []),
        answer: q.answer,
        explanation: q.explanation,
      },
    });

    console.log(`Imported: ${q.content.slice(0, 50)}...`);
  }

  console.log('Import complete');
}

importQuestions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';

export async function GET() {
  const started = Date.now();
  try {
    const [questions, students, sessions] = await Promise.all([
      prisma.question.count(),
      prisma.student.count(),
      prisma.chatSession.count().catch(() => 0),
    ]);

    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - started,
      db: { questions, students, chatSessions: sessions },
      env: {
        hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
        hasAnthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        hasDeepSeek: Boolean(process.env.DEEPSEEK_API_KEY),
      },
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error('health check failed', error);
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'db error',
      },
      { status: 503 }
    );
  }
}

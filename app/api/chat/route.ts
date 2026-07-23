// 聊天 API — 会话落库 + 上下文/摘要注入

import { streamText } from 'ai';
import { getLLMProvider } from '@/lib/llm/runtime';
import { AGENT_SYSTEM_PROMPTS } from '@/lib/agents/config';
import { getStudentById, getStudentStats } from '@/lib/db/student';
import { searchCards, formatCardsForPrompt } from '@/lib/knowledge/cards';
import {
  getOrCreateSession,
  appendMessage,
  listMessages,
  listSessions,
  refreshSessionSummary,
  getSessionForStudent,
  deleteSession,
  parseStoredKnowledgeRefs,
} from '@/lib/db/chat';
import {
  encodeKnowledgeReferencesHeader,
  toKnowledgeReferences,
  type KnowledgeReference,
} from '@/lib/knowledge/references';
import { getCurrentStudent } from '@/lib/auth/session';

type LearnerContext = {
  name?: string;
  currentStage?: string;
  weakPoints?: string[];
  totalQuestions?: number;
  correctAnswers?: number;
};

function feedbackHint(mode?: string): string {
  if (mode === 'guided') {
    return '反馈风格：引导式。多提问题与提示，避免直接给完整答案。';
  }
  if (mode === 'direct') {
    return '反馈风格：直接式。给出明确答案与简要解释。';
  }
  return '反馈风格：混合式。先给提示引导思考，再给出要点总结。';
}

function buildSystemPrompt(
  mode: string,
  ctx?: LearnerContext,
  dbExtra?: string,
  feedbackMode?: string,
  sessionSummary?: string
): string {
  const base =
    mode === 'assess'
      ? AGENT_SYSTEM_PROMPTS.assessor
      : mode === 'plan'
        ? AGENT_SYSTEM_PROMPTS.planner
        : mode === 'practice'
          ? AGENT_SYSTEM_PROMPTS.examiner
          : AGENT_SYSTEM_PROMPTS.tutor;

  const parts = [base, '', '【当前学员上下文】'];
  if (ctx?.name) parts.push(`- 姓名：${ctx.name}`);
  if (ctx?.currentStage) parts.push(`- 阶段：${ctx.currentStage}`);
  if (ctx?.weakPoints?.length) {
    parts.push(`- 薄弱知识点：${ctx.weakPoints.slice(0, 8).join('、')}`);
  }
  if (typeof ctx?.totalQuestions === 'number') {
    parts.push(`- 已答题：${ctx.totalQuestions}，正确：${ctx.correctAnswers ?? 0}`);
  }
  if (dbExtra) parts.push(dbExtra);
  if (sessionSummary?.trim()) {
    parts.push('', '【本会话摘要 L2】', sessionSummary.trim());
  }
  parts.push('', feedbackHint(feedbackMode));
  parts.push(
    '',
    '请结合以上上下文个性化回答；若薄弱点存在，优先围绕薄弱点讲解。不要编造学员未提供的成绩。'
  );
  return parts.join('\n');
}

function friendlyLlmError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/api key|API key|not configured|Unauthorized|401/i.test(msg)) {
    return 'LLM 未配置或 Key 无效。请检查 .env.local 中的 DEEPSEEK_API_KEY / OPENAI_API_KEY。练习与摸底仍可无 Key 使用。';
  }
  if (/fetch failed|ECONNREFUSED|network|timeout/i.test(msg)) {
    return '无法连接模型服务，请检查网络后重试。';
  }
  return msg || '服务器错误';
}

/** GET：加载会话列表或消息 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { student } = await getCurrentStudent(req, searchParams.get('studentId'));
    const mode = searchParams.get('mode') || 'chat';
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action') || 'messages';

    if (!student) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    const studentId = student.id;

    if (action === 'sessions') {
      // 列表默认最多 10 条（与 enforceSessionLimit 一致）
      const sessions = await listSessions(studentId, mode, 10);
      return Response.json({
        sessions: sessions.map((s) => ({
          id: s.id,
          mode: s.mode,
          title: s.title,
          summary: s.summary,
          messageCount: s._count.messages,
          updatedAt: s.updatedAt,
        })),
        maxSessions: 10,
      });
    }

    // 默认：取指定会话或最新会话的消息
    let session = sessionId
      ? await getSessionForStudent(sessionId, studentId)
      : null;

    if (!session) {
      session = await getOrCreateSession({
        studentId,
        mode,
        forceNew: false,
      });
    }

    const messages = await listMessages(session.id);
    return Response.json({
      session: {
        id: session.id,
        mode: session.mode,
        title: session.title,
        summary: session.summary,
        updatedAt: session.updatedAt,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        knowledgeRefs: parseStoredKnowledgeRefs(m.knowledgeRefs),
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('Chat GET error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE：删除会话 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { student } = await getCurrentStudent(req, searchParams.get('studentId'));
    const sessionId = searchParams.get('sessionId');
    if (!student) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }
    const studentId = student.id;
    const ok = await deleteSession(sessionId, studentId);
    if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Chat DELETE error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    let body: {
      messages?: { role?: string; content?: string }[];
      studentId?: string;
      mode?: string;
      sessionId?: string;
      newSession?: boolean;
      learnerContext?: LearnerContext;
      llmConfig?: { provider?: string; apiKey?: string; model?: string; baseUrl?: string };
    };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: '请求体无效或为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages 不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mode = body.mode || 'chat';
    let learnerContext = body.learnerContext;
    let dbExtra = '';
    let feedbackMode = 'hybrid';
    let sessionSummary = '';
    let sessionId: string | undefined;
    let knowledgeReferences: KnowledgeReference[] = [];

    const { student } = await getCurrentStudent(req, body.studentId);

    // 会话落库（需要当前学员身份）
    if (student) {
      try {
        let weak: string[] = [];
        try {
          weak = JSON.parse(student.weakPoints || '[]');
        } catch {
          weak = [];
        }
        const stats = await getStudentStats(student.id);
        learnerContext = {
          name: student.name,
          currentStage: student.currentStage,
          weakPoints: weak,
          totalQuestions: stats.totalQuestions,
          correctAnswers: stats.correctAnswers,
        };
        dbExtra = `- 服务端难度估计：${stats.currentDifficulty}`;
        feedbackMode = student.feedbackMode || 'hybrid';

        const session = await getOrCreateSession({
          studentId: student.id,
          mode,
          sessionId: body.sessionId,
          forceNew: !!body.newSession,
        });
        sessionId = session.id;
        sessionSummary = session.summary || '';

        // 持久化最新用户消息
        const last = messages[messages.length - 1];
        if (last?.role === 'user' && last.content) {
          await appendMessage(session.id, 'user', String(last.content));
        }
      } catch (e) {
        console.warn('chat: session/context failed', e);
      }
    }

    // 知识卡片检索（最后一条用户消息 + 薄弱点标签）
    let knowledgeBlock = '';
    try {
      const lastUser = [...messages].reverse().find((m) => m?.role === 'user' && m?.content);
      const q = lastUser?.content ? String(lastUser.content) : '';
      const weakTags = learnerContext?.weakPoints?.slice(0, 3) || [];
      if (q || weakTags.length) {
        const cards = await searchCards({ query: q, tags: weakTags, limit: 3 });
        knowledgeBlock = formatCardsForPrompt(cards, 1000);
        knowledgeReferences = toKnowledgeReferences(cards);
      }
    } catch (e) {
      console.warn('chat: knowledge search failed', e);
    }

    const llm = getLLMProvider('tutor', body.llmConfig);
    const systemExtra = knowledgeBlock
      ? `${dbExtra}\n\n【知识库摘录】\n${knowledgeBlock}`
      : dbExtra;
    const system = buildSystemPrompt(
      mode,
      learnerContext,
      systemExtra,
      feedbackMode,
      sessionSummary
    );

    const result = await streamText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: llm as any,
      messages: messages as Parameters<typeof streamText>[0]['messages'],
      system,
      async onFinish({ text }) {
        if (sessionId && text) {
          try {
            await appendMessage(sessionId, 'assistant', text, knowledgeReferences);
            await refreshSessionSummary(sessionId);
          } catch (e) {
            console.warn('chat: persist assistant failed', e);
          }
        }
        console.info(
          JSON.stringify({
            api: 'chat',
            studentId: student?.id,
            sessionId,
            mode,
            latencyMs: Date.now() - t0,
            ok: true,
          })
        );
      },
    });

    // 把 sessionId 通过 header 回传，便于前端绑定
    const response = result.toDataStreamResponse();
    if (sessionId) {
      response.headers.set('X-Chat-Session-Id', sessionId);
    }
    if (knowledgeReferences.length > 0) {
      response.headers.set(
        'X-Knowledge-Refs',
        encodeKnowledgeReferencesHeader(knowledgeReferences)
      );
    }
    return response;
  } catch (error) {
    console.error('Chat API error:', error);
    console.info(
      JSON.stringify({
        api: 'chat',
        latencyMs: Date.now() - t0,
        ok: false,
        error: error instanceof Error ? error.message : 'unknown',
      })
    );
    return new Response(JSON.stringify({ error: friendlyLlmError(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

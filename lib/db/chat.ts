import prisma from './index';

export type ChatRole = 'user' | 'assistant' | 'system';

/** 获取或创建当前 mode 下最新会话；forceNew 则新建 */
export async function getOrCreateSession(opts: {
  studentId: string;
  mode: string;
  sessionId?: string | null;
  forceNew?: boolean;
}) {
  const { studentId, mode, sessionId, forceNew } = opts;

  if (sessionId && !forceNew) {
    const existing = await prisma.chatSession.findFirst({
      where: { id: sessionId, studentId },
    });
    if (existing) return existing;
  }

  if (!forceNew) {
    const latest = await prisma.chatSession.findFirst({
      where: { studentId, mode },
      orderBy: { updatedAt: 'desc' },
    });
    if (latest) return latest;
  }

  const created = await prisma.chatSession.create({
    data: {
      studentId,
      mode,
      title: '新会话',
    },
  });
  // 新建后裁剪，保证同时最多 10 条历史
  await enforceSessionLimit(studentId, mode, 10);
  return created;
}

export async function appendMessage(
  sessionId: string,
  role: ChatRole,
  content: string
) {
  const msg = await prisma.chatMessage.create({
    data: { sessionId, role, content },
  });
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });
  return msg;
}

export async function listMessages(sessionId: string, limit = 100) {
  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

export async function getSessionForStudent(sessionId: string, studentId: string) {
  return prisma.chatSession.findFirst({
    where: { id: sessionId, studentId },
  });
}

export async function listSessions(studentId: string, mode?: string, limit = 20) {
  return prisma.chatSession.findMany({
    where: {
      studentId,
      ...(mode ? { mode } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      _count: { select: { messages: true } },
    },
  });
}

/** 每学员每 mode 最多保留 max 条会话，超出删除最旧 */
export async function enforceSessionLimit(
  studentId: string,
  mode: string,
  max = 10
): Promise<number> {
  const all = await prisma.chatSession.findMany({
    where: { studentId, mode },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  if (all.length <= max) return 0;
  const overflow = all.slice(max);
  await prisma.chatSession.deleteMany({
    where: { id: { in: overflow.map((s) => s.id) } },
  });
  return overflow.length;
}

/** L2 规则摘要：不依赖 LLM */
export function buildRuleSummary(
  messages: { role: string; content: string }[]
): string {
  const recent = messages.filter((m) => m.role !== 'system').slice(-8);
  if (recent.length === 0) return '';

  const lines = recent.map((m) => {
    const tag = m.role === 'user' ? '学员' : '助教';
    const text = m.content.replace(/\s+/g, ' ').trim().slice(0, 100);
    return `${tag}：${text}`;
  });

  // 抽用户问过的主题词（极简）
  const userTexts = recent
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');
  const keywords = [
    '进程',
    '线程',
    '内存',
    '页表',
    '虚拟',
    '文件',
    'inode',
    '锁',
    '并发',
    '死锁',
    'Rust',
    '所有权',
    '系统调用',
    '中断',
    'fork',
  ].filter((k) => userTexts.includes(k));

  const head =
    keywords.length > 0
      ? `话题线索：${keywords.slice(0, 6).join('、')}。\n`
      : '';

  return (head + lines.join('\n')).slice(0, 800);
}

export async function refreshSessionSummary(sessionId: string) {
  const messages = await listMessages(sessionId, 40);
  const summary = buildRuleSummary(messages);

  // 标题：首条用户消息截断
  const firstUser = messages.find((m) => m.role === 'user');
  const title = firstUser
    ? firstUser.content.replace(/\s+/g, ' ').trim().slice(0, 40) || '新会话'
    : '新会话';

  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { summary, title },
  });
}

export async function deleteSession(sessionId: string, studentId: string) {
  const s = await getSessionForStudent(sessionId, studentId);
  if (!s) return false;
  await prisma.chatSession.delete({ where: { id: sessionId } });
  return true;
}

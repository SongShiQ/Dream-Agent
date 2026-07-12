'use client';

import { useChat, type Message } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '@/lib/context/app-context';
import { readClientLLMConfig } from '@/lib/llm/client-config';
import { MarkdownBody } from '@/components/MarkdownBody';

interface ChatPanelProps {
  mode?: string;
  placeholder?: string;
}

type SessionItem = {
  id: string;
  title: string;
  summary?: string | null;
  messageCount: number;
  updatedAt: string;
};

export function ChatPanel({ mode = 'chat', placeholder = '输入你的问题...' }: ChatPanelProps) {
  const { setMessageHandler, addRecord, user } = useApp();
  const [chatError, setChatError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('新会话');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [loadKey, setLoadKey] = useState(0); // remount useChat when session changes
  const newSessionRef = useRef(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);

  const studentId = user?.studentId;

  const refreshSessionList = useCallback(async () => {
    if (!studentId) {
      setSessions([]);
      return;
    }
    try {
      const q = new URLSearchParams({
        studentId,
        mode,
        action: 'sessions',
      });
      const res = await fetch(`/api/chat?${q.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
      }
    } catch {
      /* ignore list errors */
    }
  }, [studentId, mode]);

  const loadHistory = useCallback(
    async (opts?: { forceNew?: boolean; preferSessionId?: string | null }) => {
      if (!studentId) {
        setHistoryLoading(false);
        setInitialMessages([]);
        setSessionId(null);
        return;
      }
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        if (opts?.forceNew) {
          // 创建空会话：POST 一条占位不合适；用 GET 最新 + 前端清空，发送时带 newSession
          newSessionRef.current = true;
          setInitialMessages([]);
          setSessionId(null);
          setSessionTitle('新会话');
          setLoadKey((k) => k + 1);
          setHistoryLoading(false);
          return;
        }

        const q = new URLSearchParams({
          studentId,
          mode,
          action: 'messages',
        });
        if (opts?.preferSessionId) q.set('sessionId', opts.preferSessionId);

        const res = await fetch(`/api/chat?${q.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setHistoryError(data.error || '加载历史失败');
          setInitialMessages([]);
          return;
        }

        setSessionId(data.session?.id || null);
        setSessionTitle(data.session?.title || '会话');
        const msgs: Message[] = (data.messages || []).map(
          (m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as Message['role'],
            content: m.content,
          })
        );
        setInitialMessages(msgs);
        newSessionRef.current = false;
        setLoadKey((k) => k + 1);
      } catch {
        setHistoryError('网络错误，无法加载历史（仍可直接发送）');
        setInitialMessages([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [studentId, mode]
  );

  useEffect(() => {
    loadHistory();
    void refreshSessionList();
  }, [loadHistory, refreshSessionList]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append, error, reload, stop, setMessages } =
    useChat({
      id: `chat-${mode}-${loadKey}`,
      api: '/api/chat',
      initialMessages,
      body: {
        studentId,
        mode,
        sessionId: sessionId || undefined,
        newSession: newSessionRef.current || undefined,
        llmConfig: readClientLLMConfig(),
        learnerContext: user
          ? {
              name: user.name,
              currentStage: user.currentStage,
              weakPoints: user.weakPoints,
              totalQuestions: user.totalQuestions,
              correctAnswers: user.correctAnswers,
            }
          : undefined,
      },
      onResponse: (res) => {
        const sid = res.headers.get('X-Chat-Session-Id');
        if (sid) {
          setSessionId(sid);
          newSessionRef.current = false;
        }
      },
      onFinish: (message) => {
        setChatError(null);
        addRecord({
          mode: mode as 'chat' | 'quiz' | 'practice' | 'plan' | 'assess',
          content: message.content.slice(0, 200),
          knowledgePoints: [],
        });
        void refreshSessionList();
      },
      onError: (err) => {
        setChatError(err.message || '聊天请求失败');
      },
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (error) {
      setChatError(error.message || '聊天出错');
    }
  }, [error]);

  useEffect(() => {
    setMessageHandler((content: string) => {
      if (!content?.trim() || !append) return;
      setChatError(null);
      append({ role: 'user', content });
      addRecord({
        mode: mode as 'chat' | 'quiz' | 'practice' | 'plan' | 'assess',
        content,
        knowledgePoints: [],
      });
    });
    return () => {
      setMessageHandler(null);
    };
  }, [append, setMessageHandler, addRecord, mode]);

  useEffect(() => {
    const handleMessageEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const content = customEvent.detail?.content;
      if (content && append) {
        append({ role: 'user', content });
      }
    };

    window.addEventListener('send-message', handleMessageEvent);
    return () => {
      window.removeEventListener('send-message', handleMessageEvent);
    };
  }, [append]);

  const handleNewSession = () => {
    setChatError(null);
    setMessages([]);
    loadHistory({ forceNew: true });
    void refreshSessionList();
  };

  const openSession = (id: string) => {
    setChatError(null);
    setShowSessionList(false);
    newSessionRef.current = false;
    void loadHistory({ preferSessionId: id });
  };

  const removeSession = async (id: string) => {
    if (!studentId) return;
    if (!window.confirm('删除该历史会话？不可恢复。')) return;
    try {
      const q = new URLSearchParams({ studentId, sessionId: id });
      const res = await fetch(`/api/chat?${q.toString()}`, { method: 'DELETE' });
      if (!res.ok) return;
      if (sessionId === id) {
        handleNewSession();
      }
      await refreshSessionList();
    } catch {
      /* ignore */
    }
  };

  const getWelcomeMessage = () => {
    const weak =
      user?.weakPoints?.length ? `\n当前薄弱点：${user.weakPoints.slice(0, 5).join('、')}` : '';
    switch (mode) {
      case 'assess':
        return `我来帮你评估操作系统知识水平。建议先用「水平评估」面板做 5 题摸底；也可在此自由提问。${weak}`;
      case 'plan':
        return `我来帮你制定学习计划。也可使用「学习计划」面板生成可勾选任务。\n\n当前阶段：${user?.currentStage || '未知'}${weak}`;
      case 'practice':
        return `专项答疑模式。可先去「专项训练」选题练习，再回来问概念。${weak}`;
      default:
        return `欢迎使用 OpenCamp AI 助教！\n\n对话会自动保存，刷新后可恢复。\n阶段：${user?.currentStage || '—'} · 已答 ${user?.totalQuestions ?? 0} 题${weak}\n\n输入问题开始；需要空白对话请点「新会话」。`;
    }
  };

  if (historyLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground text-sm">
        加载对话历史...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-2 border-b flex items-center justify-between gap-2 text-sm">
        <div className="truncate text-muted-foreground min-w-0">
          <span className="text-foreground font-medium">{sessionTitle}</span>
          {sessionId && (
            <span className="ml-2 text-xs opacity-60">#{sessionId.slice(0, 6)}</span>
          )}
          <span className="ml-2 text-[11px] opacity-60">最多保留 10 条历史</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowSessionList((v) => !v);
              void refreshSessionList();
            }}
          >
            历史 ({sessions.length}/10)
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => loadHistory()}>
            刷新
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleNewSession}>
            新会话
          </Button>
        </div>
      </div>

      {showSessionList && (
        <div className="border-b px-3 py-2 max-h-48 overflow-y-auto bg-muted/30 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">暂无历史会话</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                  s.id === sessionId ? 'border-primary bg-primary/5' : 'bg-background'
                }`}
              >
                <button
                  type="button"
                  className="flex-1 text-left min-w-0"
                  onClick={() => openSession(s.id)}
                >
                  <p className="font-medium truncate">{s.title || '未命名'}</p>
                  <p className="text-muted-foreground truncate">
                    {s.messageCount} 条 · {new Date(s.updatedAt).toLocaleString()}
                  </p>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-red-600 shrink-0 px-1"
                  title="删除"
                  onClick={() => void removeSession(s.id)}
                >
                  删
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {historyError && (
        <div className="mx-4 mt-2 p-2 text-xs text-amber-800 bg-amber-50 rounded border border-amber-100">
          {historyError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <Card className="mr-12">
            <CardContent className="p-4">
              <p className="text-sm whitespace-pre-wrap">{getWelcomeMessage()}</p>
            </CardContent>
          </Card>
        )}

        {messages.map((message) => (
          <Card key={message.id} className={message.role === 'user' ? 'ml-12' : 'mr-12'}>
            <CardContent className="p-3">
              <p className="text-sm font-medium mb-1">
                {message.role === 'user' ? '你' : 'AI 助教'}
              </p>
              {message.role === 'assistant' ? (
                <MarkdownBody content={message.content} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </CardContent>
          </Card>
        ))}

        {isLoading && (
          <Card className="mr-12">
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">思考中...</p>
              <button type="button" onClick={() => stop()} className="text-xs underline">
                停止
              </button>
            </CardContent>
          </Card>
        )}

        {chatError && (
          <Card className="mr-12 border-red-200">
            <CardContent className="p-3 space-y-2">
              <p className="text-sm text-red-700 whitespace-pre-wrap">{chatError}</p>
              <p className="text-xs text-muted-foreground">
                提示：练习 / 摸底 / 计划模板不依赖 LLM，可先去那些模式。
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => reload()}>
                  重试
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setChatError(null)}
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          发送
        </Button>
      </form>
    </div>
  );
}

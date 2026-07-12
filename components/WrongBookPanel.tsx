'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WrongItem {
  recordId: string;
  questionId: string;
  yourAnswer: string;
  answeredAt: string;
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
}

interface WrongBookPanelProps {
  studentId: string;
  onRetry?: (questionId: string, knowledgePoint?: string) => void;
}

export function WrongBookPanel({ studentId, onRetry }: WrongBookPanelProps) {
  const [items, setItems] = useState<WrongItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exam?studentId=${encodeURIComponent(studentId)}&action=wrongbook`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '加载失败');
        return;
      }
      setItems(data.items || []);
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-muted-foreground">加载错题本...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">错题本</h2>
        <Button variant="outline" size="sm" onClick={load}>
          刷新
        </Button>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">{error}</div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            暂无错题。去做几道练习吧！
          </CardContent>
        </Card>
      ) : (
        items.map((item) => {
          const open = openId === item.questionId;
          return (
            <Card key={item.questionId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium leading-relaxed">
                  {item.question.content}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {item.question.knowledgePoints.map((k) => (
                    <span key={k} className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                      {k}
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  你的答案：<span className="text-red-700">{item.yourAnswer || '（空）'}</span>
                </p>
                {open && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p>
                      正确答案：<strong>{item.question.answer}</strong>
                    </p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {item.question.explanation}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenId(open ? null : item.questionId)}
                  >
                    {open ? '收起解析' : '查看解析'}
                  </Button>
                  {onRetry && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onRetry(
                          item.questionId,
                          item.question.knowledgePoints[0]
                        )
                      }
                    >
                      一键过关 · 3 题
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

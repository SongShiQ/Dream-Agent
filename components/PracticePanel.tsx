'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExamPanel } from '@/components/ExamPanel';
import { useApp } from '@/lib/context/app-context';

const KP_OPTIONS = [
  'process',
  'memory',
  'virtual_memory',
  'filesystem',
  'concurrency',
  'rust',
  'ownership',
  'borrow',
  'syscall',
  'deadlock',
  'fork',
  'page_fault',
];

interface PracticePanelProps {
  studentId: string;
  /** 单知识点 3 题快练（卡住一键过关） */
  onQuickDrill?: (knowledgePoint: string) => void;
  /** 薄弱点混合 3 题快练 */
  onQuickWeak?: () => void;
}

export function PracticePanel({ studentId, onQuickDrill, onQuickWeak }: PracticePanelProps) {
  const { user, setMode } = useApp();
  const [kp, setKp] = useState<string | null>(null);
  const [focusWeak, setFocusWeak] = useState(false);

  if (kp || focusWeak) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b flex gap-2">
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setKp(null);
              setFocusWeak(false);
            }}
          >
            ← 重选知识点
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ExamPanel
            studentId={studentId}
            knowledgePoint={kp || undefined}
            focusWeak={focusWeak}
            title="专项训练"
          />
        </div>
      </div>
    );
  }

  const weaks = user?.weakPoints || [];

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">专项训练</h2>
      <p className="text-sm text-muted-foreground">
        卡住时优先「一键过关」：1 张知识卡片 + 3 道相似题。也可进入无限专项刷题。
      </p>

      {weaks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">卡住一键过关</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {weaks.map((w) => (
                <button
                  key={w}
                  onClick={() => (onQuickDrill ? onQuickDrill(w) : setKp(w))}
                  className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                  title="3 题快练"
                >
                  {w} · 过关
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => (onQuickWeak ? onQuickWeak() : setFocusWeak(true))}
                className="w-full sm:w-auto"
              >
                薄弱点快练 3 题
              </Button>
              <Button variant="outline" onClick={() => setFocusWeak(true)} className="w-full sm:w-auto">
                薄弱点无限刷
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">知识点列表</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {KP_OPTIONS.map((k) => (
            <div key={k} className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setKp(k)}>
                {k}
              </Button>
              {onQuickDrill && (
                <Button size="sm" variant="secondary" onClick={() => onQuickDrill(k)}>
                  3题
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => setMode('quiz')}>
        回到综合练习
      </Button>
    </div>
  );
}

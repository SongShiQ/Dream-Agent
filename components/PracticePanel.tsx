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

/** 导学 + 基础大章：章节化入口，便于循序练习 */
const FOUNDATION_CHAPTERS: {
  id: string;
  title: string;
  detail: string;
  kp: string;
  stageHint: string;
}[] = [
  {
    id: 'ch-theory-overview',
    title: 'OS 总览与中断',
    detail: '操作系统角色 · 中断/异常 · 特权级',
    kp: 'interrupt',
    stageHint: '导学-理论',
  },
  {
    id: 'ch-process',
    title: '进程与调度',
    detail: 'PCB · 三态 · fork · 调度算法',
    kp: 'process',
    stageHint: '导学-理论',
  },
  {
    id: 'ch-memory',
    title: '内存与虚存',
    detail: '页表 · 缺页 · TLB · 地址翻译',
    kp: 'virtual_memory',
    stageHint: '导学-理论 / 基础',
  },
  {
    id: 'ch-fs',
    title: '文件与 inode',
    detail: '目录 · 打开文件 · 元数据',
    kp: 'filesystem',
    stageHint: '导学-理论',
  },
  {
    id: 'ch-rust-syntax',
    title: 'Rust 语法基础',
    detail: '变量 · 类型 · 控制流 · 函数',
    kp: 'rust',
    stageHint: '导学-Rust',
  },
  {
    id: 'ch-ownership',
    title: '所有权与借用',
    detail: 'move · &T / &mut T · 生命周期入门',
    kp: 'ownership',
    stageHint: '导学-Rust',
  },
  {
    id: 'ch-error',
    title: 'Option / Result',
    detail: '错误处理 · ? · 模式匹配',
    kp: 'rust',
    stageHint: '导学-Rust',
  },
  {
    id: 'ch-trap',
    title: 'Trap 与系统调用',
    detail: 'ecall · scause · 批处理最小内核',
    kp: 'trap',
    stageHint: '基础 / lab1',
  },
  {
    id: 'ch-syscall',
    title: '系统调用接口',
    detail: '用户态陷入 · ABI · write/exit',
    kp: 'syscall',
    stageHint: '基础 / lab1',
  },
  {
    id: 'ch-concurrency',
    title: '并发入门',
    detail: '锁 · 临界区 · 死锁条件',
    kp: 'concurrency',
    stageHint: '导学延伸',
  },
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
          <CardTitle className="text-sm">导学 / 基础 · 章节练习</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2">
          {FOUNDATION_CHAPTERS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => (onQuickDrill ? onQuickDrill(ch.kp) : setKp(ch.kp))}
              className="text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium">{ch.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ch.detail}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {ch.stageHint} · 标签 {ch.kp}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">知识点标签</CardTitle>
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

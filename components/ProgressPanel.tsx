'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProgressData {
  studentId: string;
  currentStage: string;
  totalQuestions: number;
  correctAnswers: number;
  weakPoints: string[];
}

interface ProgressPanelProps {
  studentId: string;
  onBack?: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  'A1': '导学-零基础',
  'A2': '导学-有编程经验',
  'A3': '导学-有其他语言基础',
  'B1': '基础-Rust 入门',
  'B2': '基础-Rust 进阶',
  'B3': '基础-工具使用',
  'C1': '专业-批处理',
  'C2': '专业-地址空间',
  'C3': '专业-进程',
  'C4': '专业-文件系统',
  'C5': '专业-并发',
  'D1': '项目-组件化 OS',
  'D2': '项目-项目实践',
};

const STAGES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2'];

export function ProgressPanel({ studentId, onBack }: ProgressPanelProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [studentId]);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/student?id=${studentId}`);
      const data = await res.json();
      
      if (data.student) {
        setProgress({
          studentId: data.student.id,
          currentStage: data.student.currentStage,
          totalQuestions: data.student._count?.answerRecords || 0,
          correctAnswers: 0,
          weakPoints: data.student.weakPoints ? JSON.parse(data.student.weakPoints) : [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStageIndex = (stage: string) => {
    return STAGES.indexOf(stage);
  };

  const getProgressPercent = () => {
    if (!progress) return 0;
    const currentIndex = getStageIndex(progress.currentStage);
    return Math.round((currentIndex / (STAGES.length - 1)) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">暂无进度数据</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">学习进度</h2>
        {onBack && (
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
            返回聊天
          </button>
        )}
      </div>

      {/* 总体进度 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">总体进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>当前阶段: {STAGE_LABELS[progress.currentStage] || progress.currentStage}</span>
              <span>{getProgressPercent()}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学习统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">学习统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{progress.totalQuestions}</p>
              <p className="text-xs text-muted-foreground">已答题数</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {progress.totalQuestions > 0 
                  ? Math.round(progress.correctAnswers / progress.totalQuestions * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">正确率</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 阶段进度 */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm">阶段进度</CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <div className="space-y-2">
            {STAGES.map((stage, index) => {
              const currentIndex = getStageIndex(progress.currentStage);
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isLocked = index > currentIndex;

              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 p-2 rounded ${
                    isCurrent ? 'bg-primary/10 border border-primary' : ''
                  } ${isLocked ? 'opacity-50' : ''}`}
                >
                  <span className="text-lg">
                    {isCompleted ? '✓' : isCurrent ? '►' : '○'}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : ''}`}>
                      {STAGE_LABELS[stage]}
                    </p>
                  </div>
                  {isLocked && (
                    <span className="text-xs text-muted-foreground">🔒</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 薄弱知识点 */}
      {progress.weakPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">薄弱知识点</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {progress.weakPoints.map((point, i) => (
                <span key={i} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  {point}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

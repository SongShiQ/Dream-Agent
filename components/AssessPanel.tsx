'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AssessmentReport } from '@/components/AssessmentReport';
import { useApp } from '@/lib/context/app-context';

interface Q {
  id: string;
  type: string;
  content: string;
  options: string[];
  knowledgePoints: string[];
  difficulty: number;
}

interface AssessmentResult {
  theory: number;
  coding: number;
  rust: number;
  weakPoints: string[];
  stage: string;
  summary: string;
  total?: number;
  correct?: number;
}

interface AssessPanelProps {
  studentId: string;
  /** 摸底结束后的循序渐进跳转 */
  onContinue?: (target: 'map' | 'practice' | 'quiz' | 'plan' | 'lab') => void;
}

export function AssessPanel({ studentId, onContinue }: AssessPanelProps) {
  const { updateProfile, refreshStats } = useApp();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'idle' | 'quiz' | 'done'>('idle');
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const start = async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assess?studentId=${encodeURIComponent(studentId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '无法加载摸底题');
        return;
      }
      setQuestions(data.questions || []);
      setAnswers({});
      setIndex(0);
      setResult(null);
      setStep('quiz');
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  const submit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          mode: 'diagnostic',
          answers: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败');
        return;
      }
      const a = data.assessment as AssessmentResult;
      setResult(a);
      setStep('done');
      updateProfile({
        currentStage: a.stage,
        weakPoints: a.weakPoints || [],
      });
      await refreshStats();
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'done' && result) {
    return (
      <AssessmentReport
        result={result}
        onClose={() => {
          setStep('idle');
          setResult(null);
          setQuestions([]);
        }}
        onContinue={(target) => {
          setStep('idle');
          setResult(null);
          setQuestions([]);
          onContinue?.(target);
        }}
      />
    );
  }

  if (step === 'quiz' && questions.length > 0) {
    const q = questions[index];
    const answeredCount = questions.filter((x) => answers[x.id]).length;

    return (
      <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">水平摸底</h2>
          <span className="text-sm text-muted-foreground">
            {index + 1} / {questions.length} · 已答 {answeredCount}
          </span>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{q.content}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {q.type === 'choice' && q.options?.length > 0 ? (
              <RadioGroup
                value={answers[q.id] || ''}
                onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              >
                {q.options.map((opt, i) => {
                  const letter = opt.charAt(0);
                  return (
                    <div key={i} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                      <RadioGroupItem value={letter} id={`a-${q.id}-${i}`} />
                      <Label htmlFor={`a-${q.id}-${i}`} className="flex-1 cursor-pointer">
                        {opt}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              <input
                className="w-full p-2 border rounded"
                value={answers[q.id] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                placeholder="输入答案..."
              />
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                上一题
              </Button>
              {index < questions.length - 1 ? (
                <Button
                  className="flex-1"
                  onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                >
                  下一题
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={submit}
                  disabled={isLoading || answeredCount < questions.length}
                >
                  {isLoading ? '评分中...' : '提交摸底'}
                </Button>
              )}
            </div>
            {answeredCount < questions.length && index === questions.length - 1 && (
              <p className="text-xs text-muted-foreground">请答完所有题目再提交</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 items-center justify-center space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>水平摸底（约 5 题）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>从本地题库抽题，规则判分，不依赖 API Key。</p>
          <p>完成后会更新你的阶段建议与薄弱知识点。</p>
          {error && <p className="text-red-600">{error}</p>}
          <Button onClick={start} disabled={isLoading || !studentId} className="w-full">
            {isLoading ? '加载中...' : '开始摸底'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

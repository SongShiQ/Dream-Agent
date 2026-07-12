'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/context/app-context';

interface Question {
  id: string;
  type: string;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
  knowledgePoints: string[];
  difficulty: number;
  source?: string;
}

interface ExamStats {
  total: number;
  correct: number;
  streak: number;
  maxStreak: number;
}

interface UpgradeInfo {
  eligible: boolean;
  suggestedStage: string | null;
  reason: string;
}

interface ExamPanelProps {
  studentId: string;
  /** 强制针对薄弱点 */
  focusWeak?: boolean;
  /** 专项知识点 */
  knowledgePoint?: string;
  title?: string;
  /** 快练目标题量（如卡住一键过关 = 3）；不传则无限刷 */
  targetCount?: number;
  /** 进入后自动出第一题 */
  autoStart?: boolean;
  /** 快练完成回调 */
  onSessionComplete?: (summary: { total: number; correct: number; knowledgePoint?: string }) => void;
}

export function ExamPanel({
  studentId,
  focusWeak = false,
  knowledgePoint,
  title = '练习模式',
  targetCount,
  autoStart = false,
  onSessionComplete,
}: ExamPanelProps) {
  const { user, updateProfile, refreshStats, addRecord } = useApp();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState(user?.currentDifficulty ?? 50);
  const [stats, setStats] = useState<ExamStats>({ total: 0, correct: 0, streak: 0, maxStreak: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [targeted, setTargeted] = useState(false);
  const [upgrade, setUpgrade] = useState<UpgradeInfo | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [preReadings, setPreReadings] = useState<
    { title: string; excerpt: string; source: string; labs: string[] }[]
  >([]);
  const [readings, setReadings] = useState<
    { title: string; excerpt: string; source: string; labs: string[] }[]
  >([]);

  // 从 URL / 父组件 focus 变化时重置
  useEffect(() => {
    setQuestion(null);
    setShowResult(false);
    setQuestionNumber(0);
    setSessionDone(false);
    setStats({ total: 0, correct: 0, streak: 0, maxStreak: 0 });
    setPreReadings([]);
  }, [focusWeak, knowledgePoint, targetCount]);

  // 快练：进入时拉一张知识卡片
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tag = knowledgePoint || (focusWeak ? user?.weakPoints?.[0] : undefined);
      if (!tag) return;
      try {
        const kr = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: [tag], limit: 1 }),
        });
        const kd = await kr.json();
        if (!cancelled && kr.ok && kd.cards?.length) {
          setPreReadings(
            kd.cards.map(
              (c: { title: string; excerpt: string; source: string; labs?: string[] }) => ({
                title: c.title,
                excerpt: c.excerpt,
                source: c.source,
                labs: c.labs || [],
              })
            )
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgePoint, focusWeak, studentId]);

  const generateNewQuestion = async () => {
    if (!studentId) {
      setError('未登录或学员 ID 无效');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'generate',
          currentDifficulty: difficulty,
          focusWeak: focusWeak || (user?.weakPoints?.length ?? 0) > 0,
          knowledgePoint: knowledgePoint || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '出题失败');
        return;
      }

      const q = data.question as Question;
      setQuestion({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
        knowledgePoints: Array.isArray(q.knowledgePoints) ? q.knowledgePoints : [],
      });
      if (typeof data.difficulty === 'number') setDifficulty(data.difficulty);
      setTargeted(!!data.targeted);
      setSelectedAnswer('');
      setShowResult(false);
      setExplanation('');
      setReadings([]);
      setQuestionNumber((prev) => prev + 1);
    } catch (e) {
      console.error(e);
      setError('网络错误，无法出题');
    } finally {
      setIsLoading(false);
    }
  };

  // 自动开练（仅一次，避免 ref 伪点击）
  useEffect(() => {
    if (!autoStart || !studentId || question || isLoading || sessionDone || questionNumber > 0) {
      return;
    }
    void generateNewQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, studentId, knowledgePoint, focusWeak]);

  const submitAnswer = async () => {
    if (!question || !studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'submit',
          questionId: question.id,
          answer: selectedAnswer,
          timeSpent: 0,
          currentDifficulty: difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败');
        return;
      }

      const correct = !!data.isCorrect;
      setIsCorrect(correct);
      setShowResult(true);
      setExplanation(data.explanation || question.explanation);

      const nextStats = {
        total: stats.total + 1,
        correct: stats.correct + (correct ? 1 : 0),
        streak: correct ? stats.streak + 1 : 0,
        maxStreak: Math.max(stats.maxStreak, correct ? stats.streak + 1 : 0),
      };
      setStats(nextStats);

      if (typeof data.difficulty === 'number') {
        setDifficulty(data.difficulty);
        updateProfile({ currentDifficulty: data.difficulty });
      }
      if (data.stats) {
        updateProfile({
          totalQuestions: data.stats.totalQuestions,
          correctAnswers: data.stats.correctAnswers,
          weakPoints: data.weakPoints || [],
        });
      }
      if (data.upgrade) setUpgrade(data.upgrade);

      // 快练达标：本会话做满 targetCount 题
      if (targetCount && nextStats.total >= targetCount) {
        setSessionDone(true);
        onSessionComplete?.({
          total: nextStats.total,
          correct: nextStats.correct,
          knowledgePoint,
        });
        await refreshStats();
      }

      addRecord({
        mode: 'quiz',
        content: question.content.slice(0, 80),
        result: correct ? 'correct' : 'incorrect',
        knowledgePoints: question.knowledgePoints,
      });

      // 扩展阅读：按题目知识点拉知识卡片
      try {
        const tags = question.knowledgePoints || [];
        if (tags.length > 0) {
          const kr = await fetch('/api/knowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags, limit: 2 }),
          });
          const kd = await kr.json();
          if (kr.ok && kd.cards?.length) {
            setReadings(
              kd.cards.map(
                (c: {
                  title: string;
                  excerpt: string;
                  source: string;
                  labs?: string[];
                }) => ({
                  title: c.title,
                  excerpt: c.excerpt,
                  source: c.source,
                  labs: c.labs || [],
                })
              )
            );
          } else {
            setReadings([]);
          }
        } else {
          setReadings([]);
        }
      } catch {
        setReadings([]);
      }
    } catch (e) {
      console.error(e);
      setError('网络错误，无法提交');
    } finally {
      setIsLoading(false);
    }
  };

  const promote = async () => {
    if (!studentId) return;
    setPromoting(true);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'promote' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '升级失败');
        setUpgrade(data.upgrade || null);
        return;
      }
      updateProfile({ currentStage: data.student.currentStage });
      setUpgrade({
        eligible: false,
        suggestedStage: null,
        reason: `已升级到 ${data.student.currentStage}`,
      });
      await refreshStats();
    } catch {
      setError('升级请求失败');
    } finally {
      setPromoting(false);
    }
  };

  const getDifficultyLabel = (d: number) => {
    if (d < 30) return '简单';
    if (d < 60) return '中等';
    if (d < 80) return '困难';
    return '专家';
  };

  const getDifficultyColor = (d: number) => {
    if (d < 30) return 'text-green-600';
    if (d < 60) return 'text-yellow-600';
    if (d < 80) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold">
          {title}
          {knowledgePoint ? ` · ${knowledgePoint}` : ''}
          {focusWeak && !knowledgePoint ? ' · 薄弱点优先' : ''}
        </h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            题目: {targetCount ? `${Math.min(stats.total, targetCount)}/${targetCount}` : questionNumber}
          </span>
          <span>
            正确率: {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
          </span>
          <span>连续: {stats.streak}</span>
        </div>
      </div>

      {preReadings.length > 0 && !sessionDone && (
        <div className="p-3 border rounded-lg bg-muted/40 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">先看 1 张卡片再练</p>
          {preReadings.map((r, i) => (
            <div key={i} className="text-xs space-y-0.5">
              <p className="font-medium text-sm">{r.title}</p>
              <p className="text-muted-foreground line-clamp-3 whitespace-pre-wrap">{r.excerpt}</p>
            </div>
          ))}
        </div>
      )}

      {sessionDone && (
        <Card>
          <CardContent className="p-6 space-y-3 text-center">
            <p className="text-lg font-semibold">本轮快练完成</p>
            <p className="text-sm">
              {knowledgePoint || (focusWeak ? '薄弱点' : '综合')}：{stats.correct}/{stats.total} 正确
              （
              {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%）
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.correct >= Math.ceil((targetCount || 3) * 0.67)
                ? '不错，薄弱点有望从列表中衰减（连续做对会自动降权）。'
                : '建议再开一轮，或回错题本看解析。'}
            </p>
            <p className="text-xs text-muted-foreground">
              建议：回学习地图勾选/查看今日三步的下一步。
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Button
                onClick={() => {
                  setSessionDone(false);
                  setStats({ total: 0, correct: 0, streak: 0, maxStreak: 0 });
                  setQuestion(null);
                  setShowResult(false);
                  setQuestionNumber(0);
                }}
              >
                再来一轮
              </Button>
              {onSessionComplete && (
                <Button
                  variant="outline"
                  onClick={() =>
                    onSessionComplete({
                      total: stats.total,
                      correct: stats.correct,
                      knowledgePoint,
                    })
                  }
                >
                  回学习地图
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {upgrade?.eligible && (
        <div className="p-3 border border-primary/40 bg-primary/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm">{upgrade.reason}</p>
          <Button size="sm" onClick={promote} disabled={promoting}>
            {promoting ? '升级中...' : `升级到 ${upgrade.suggestedStage}`}
          </Button>
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {!sessionDone && question ? (
        <Card className="flex-1">
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-base">第 {questionNumber} 题</CardTitle>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className={`text-sm font-medium ${getDifficultyColor(difficulty)}`}>
                  {getDifficultyLabel(difficulty)} ({difficulty})
                </span>
                {targeted && (
                  <span className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded">
                    薄弱点相关
                  </span>
                )}
                {question.source && (
                  <span className="text-xs bg-secondary px-2 py-1 rounded">
                    {question.source === 'bank' ? '题库' : 'AI'}
                  </span>
                )}
                {question.knowledgePoints?.map((point, i) => (
                  <span key={i} className="text-xs bg-secondary px-2 py-1 rounded">
                    {point}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{question.content}</p>

            {question.type === 'choice' && question.options.length > 0 && (
              <RadioGroup
                value={selectedAnswer}
                onValueChange={setSelectedAnswer}
                disabled={showResult}
              >
                {question.options.map((opt, i) => {
                  const letter = opt.charAt(0);
                  return (
                    <div key={i} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                      <RadioGroupItem value={letter} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">
                        {opt}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}

            {question.type !== 'choice' && (
              <div>
                <Label htmlFor="fill-answer">你的答案</Label>
                <input
                  id="fill-answer"
                  type="text"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={showResult}
                  className="w-full p-2 border rounded mt-1"
                  placeholder="输入答案..."
                />
              </div>
            )}

            {showResult && (
              <div
                className={`p-4 rounded-lg ${
                  isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                <p className="font-medium mb-2">{isCorrect ? '✓ 正确！' : '✗ 错误'}</p>
                <p className="text-sm whitespace-pre-wrap">{explanation}</p>
              </div>
            )}

            {showResult && readings.length > 0 && (
              <div className="p-3 border rounded-lg space-y-2 bg-muted/40">
                <p className="text-sm font-medium">扩展阅读（知识卡片）</p>
                {readings.map((r, i) => (
                  <div key={i} className="text-xs space-y-1">
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {r.excerpt}
                    </p>
                    <p className="text-muted-foreground opacity-70">
                      {r.source}
                      {r.labs?.length ? ` · labs: ${r.labs.join(', ')}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {!showResult ? (
                <Button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer || isLoading}
                  className="flex-1"
                >
                  {isLoading ? '提交中...' : '提交答案'}
                </Button>
              ) : (
                <Button
                  onClick={generateNewQuestion}
                  disabled={
                    isLoading ||
                    !!(targetCount && stats.total >= targetCount)
                  }
                  className="flex-1"
                >
                  {isLoading
                    ? '生成中...'
                    : targetCount && stats.total + 1 >= targetCount
                      ? '最后一题 · 下一题'
                      : targetCount
                        ? `下一题（${stats.total + 1}/${targetCount}）`
                        : '下一题'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : !sessionDone ? (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
            <p className="text-muted-foreground text-sm text-center">
              {knowledgePoint
                ? `专项练习：${knowledgePoint}${targetCount ? ` · 快练 ${targetCount} 题` : ''}`
                : focusWeak
                  ? `将优先抽取与你薄弱点相关的题目${targetCount ? ` · 快练 ${targetCount} 题` : ''}`
                  : '题库智能抽题（优先薄弱点，避开近期重复）'}
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              若提示题库为空：在项目目录运行{' '}
              <code className="bg-muted px-1 rounded">npx tsx scripts/import-questions.ts</code>
            </p>
            <Button onClick={generateNewQuestion} disabled={isLoading || !studentId} size="lg">
              {isLoading
                ? '生成中...'
                : targetCount
                  ? `开始快练 ${targetCount} 题`
                  : '开始练习'}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

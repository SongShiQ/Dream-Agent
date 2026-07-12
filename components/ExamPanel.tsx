'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Question {
  id: string;
  type: string;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
  knowledgePoints: string[];
  difficulty: number;
}

interface ExamStats {
  total: number;
  correct: number;
  streak: number;
  maxStreak: number;
}

export function ExamPanel({ studentId }: { studentId: string }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [difficulty, setDifficulty] = useState(50);
  const [stats, setStats] = useState<ExamStats>({ total: 0, correct: 0, streak: 0, maxStreak: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);

  const generateNewQuestion = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'generate' }),
      });
      const data = await res.json();
      
      // 解析知识点
      const questionData = {
        ...data.question,
        knowledgePoints: data.question.knowledgePoints 
          ? JSON.parse(data.question.knowledgePoints) 
          : [],
      };
      
      setQuestion(questionData);
      setDifficulty(data.difficulty);
      setSelectedAnswer('');
      setShowResult(false);
      setQuestionNumber(prev => prev + 1);
    } catch (error) {
      console.error('Failed to generate question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!question) return;
    
    const correct = selectedAnswer === question.answer;
    setIsCorrect(correct);
    setShowResult(true);
    
    setStats(prev => {
      const newStreak = correct ? prev.streak + 1 : 0;
      return {
        total: prev.total + 1,
        correct: prev.correct + (correct ? 1 : 0),
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
      };
    });

    try {
      await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'submit',
          questionId: question.id,
          answer: selectedAnswer,
          timeSpent: 0,
        }),
      });
    } catch (error) {
      console.error('Failed to submit answer:', error);
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
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* 统计栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">练习模式</h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>题目: {questionNumber}</span>
          <span>正确率: {stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0}%</span>
          <span>连续正确: {stats.streak}</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0}%` }}
        />
      </div>

      {/* 题目区域 */}
      {question ? (
        <Card className="flex-1">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-base">第 {questionNumber} 题</CardTitle>
              <div className="flex gap-2">
                <span className={`text-sm font-medium ${getDifficultyColor(difficulty)}`}>
                  {getDifficultyLabel(difficulty)}
                </span>
                {question.knowledgePoints.length > 0 && (
                  <div className="flex gap-1">
                    {question.knowledgePoints.map((point, i) => (
                      <span key={i} className="text-xs bg-secondary px-2 py-1 rounded">
                        {point}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{question.content}</p>

            {question.type === 'choice' && question.options.length > 0 && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {question.options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                    <RadioGroupItem value={opt.charAt(0)} id={`opt-${i}`} />
                    <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {question.type === 'fill' && (
              <div>
                <Label htmlFor="fill-answer">你的答案</Label>
                <input
                  id="fill-answer"
                  type="text"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                  placeholder="输入答案..."
                />
              </div>
            )}

            {showResult && (
              <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p className="font-medium mb-2">{isCorrect ? '✓ 正确！' : '✗ 错误'}</p>
                <p className="text-sm">{question.explanation}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {!showResult ? (
                <Button onClick={submitAnswer} disabled={!selectedAnswer} className="flex-1">
                  提交答案
                </Button>
              ) : (
                <Button onClick={generateNewQuestion} disabled={isLoading} className="flex-1">
                  {isLoading ? '生成中...' : '下一题'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground mb-4">点击开始练习</p>
            <Button onClick={generateNewQuestion} disabled={isLoading} size="lg">
              {isLoading ? '生成中...' : '开始练习'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

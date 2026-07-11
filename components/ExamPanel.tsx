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
}

export function ExamPanel({ studentId }: { studentId: string }) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [difficulty, setDifficulty] = useState(50);
  const [stats, setStats] = useState({ total: 0, correct: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const generateNewQuestion = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'generate' }),
      });
      const data = await res.json();
      setQuestion(data.question);
      setDifficulty(data.difficulty);
      setSelectedAnswer('');
      setShowResult(false);
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
    setStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }));

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">练习模式</h2>
        <div className="text-sm text-muted-foreground">
          难度: {difficulty} | 正确率: {stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0}%
        </div>
      </div>

      {question ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{question.content}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {question.type === 'choice' && question.options.length > 0 && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {question.options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.charAt(0)} id={`opt-${i}`} />
                    <Label htmlFor={`opt-${i}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {showResult && (
              <div className={`p-3 rounded-lg ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p className="font-medium">{isCorrect ? '✓ 正确' : '✗ 错误'}</p>
                <p className="text-sm mt-1">{question.explanation}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!showResult ? (
                <Button onClick={submitAnswer} disabled={!selectedAnswer}>
                  提交答案
                </Button>
              ) : (
                <Button onClick={generateNewQuestion} disabled={isLoading}>
                  下一题
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">点击开始练习</p>
            <Button onClick={generateNewQuestion} disabled={isLoading}>
              {isLoading ? '生成中...' : '开始练习'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

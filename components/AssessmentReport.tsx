'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { STAGE_LABELS, STAGE_LABS, STAGE_ORDER, type StageId } from '@/lib/adaptive/stage';
import { STAGE_CAMP } from '@/lib/plan/template';

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

interface AssessmentReportProps {
  result: AssessmentResult;
  onClose: () => void;
  /** 进入下一学习动作 */
  onContinue?: (target: 'map' | 'practice' | 'quiz' | 'plan' | 'lab') => void;
}

export function AssessmentReport({ result, onClose, onContinue }: AssessmentReportProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '需要加强';
  };

  const stage = result.stage;
  const stageLabel = STAGE_LABELS[stage] || stage;
  const camp = STAGE_CAMP[stage];
  const labs = STAGE_LABS[stage] || camp?.labs || [];
  const tags = camp?.practiceTags || [];
  const idx = STAGE_ORDER.indexOf(stage as StageId);
  const next = idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
  const hasWeak = (result.weakPoints?.length || 0) > 0;
  const primaryLab = labs[0];

  const go = (target: 'map' | 'practice' | 'quiz' | 'plan' | 'lab') => {
    if (onContinue) onContinue(target);
    else onClose();
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">摸底完成 · 下一步</h2>
      <p className="text-sm text-muted-foreground">
        摸底用于<strong>校准起点</strong>，不是通关考试。请按下面顺序循序渐进，不必一次跳到最高阶段。
      </p>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-sm">建议起始阶段（已写入档案）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-3">
            <p className="text-2xl font-bold text-primary">{stageLabel}</p>
            <p className="text-xs text-muted-foreground mt-2">
              阶段代码：{stage}
              {typeof result.correct === 'number' && typeof result.total === 'number'
                ? ` · 本次 ${result.correct}/${result.total}`
                : ''}
            </p>
            {camp?.focus && (
              <p className="text-sm mt-3 text-left bg-muted/50 rounded-lg p-3">{camp.focus}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 循序渐进路径 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">循序渐进路径</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>现在</strong>：巩固「{stageLabel}」
              {tags.length > 0 ? `（优先练：${tags.slice(0, 3).join('、')}）` : ''}
            </li>
            <li>
              {hasWeak ? (
                <>
                  <strong>先过关薄弱点</strong>：{result.weakPoints.slice(0, 4).join('、')}
                  ，用「卡住一键过关 · 3 题」
                </>
              ) : (
                <>
                  <strong>常规练习 5 题</strong>，建立正确率基线
                </>
              )}
            </li>
            <li>
              {primaryLab ? (
                <>
                  <strong>再推进实验</strong>：
                  <code className="text-xs bg-muted px-1 rounded">{primaryLab}</code>
                  （VS Code 写代码，网页看反馈）
                </>
              ) : (
                <>
                  <strong>生成今日计划</strong>，按勾选任务推进
                </>
              )}
            </li>
            {next && (
              <li className="text-muted-foreground">
                <strong>之后</strong>：练习达标、薄弱点下降后，再进入「
                {STAGE_LABELS[next] || next}」（勿跳级）
              </li>
            )}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">能力评估</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(
              [
                ['理论水平', result.theory],
                ['编码能力', result.coding],
                ['Rust 水平', result.rust],
              ] as const
            ).map(([label, score]) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{label}</span>
                  <span className={getScoreColor(score)}>
                    {score}分 ({getScoreLabel(score)})
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {result.weakPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">薄弱知识点</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.weakPoints.map((point, i) => (
                <span key={i} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  {point}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">评估总结</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{result.summary}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          className="flex-1"
          onClick={() => go(hasWeak ? 'practice' : 'quiz')}
        >
          {hasWeak ? '下一步：薄弱点一键过关' : '下一步：开始练习'}
        </Button>
        {primaryLab ? (
          <Button variant="outline" className="flex-1" onClick={() => go('lab')}>
            查看实验 {primaryLab}
          </Button>
        ) : (
          <Button variant="outline" className="flex-1" onClick={() => go('plan')}>
            生成今日计划
          </Button>
        )}
        <Button variant="outline" onClick={() => go('map')}>
          回学习地图
        </Button>
      </div>
    </div>
  );
}

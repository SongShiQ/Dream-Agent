'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AssessmentResult {
  theory: number;
  coding: number;
  rust: number;
  weakPoints: string[];
  stage: string;
  summary: string;
}

interface AssessmentReportProps {
  result: AssessmentResult;
  onClose: () => void;
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

export function AssessmentReport({ result, onClose }: AssessmentReportProps) {
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

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <h2 className="text-lg font-semibold">评估报告</h2>

      {/* 总体评分 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">建议起始阶段</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4">
            <p className="text-3xl font-bold text-primary">
              {STAGE_LABELS[result.stage] || result.stage}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              根据你的评估结果，建议从这个阶段开始学习
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 各项评分 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">能力评估</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 理论水平 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>理论水平</span>
                <span className={getScoreColor(result.theory)}>
                  {result.theory}分 ({getScoreLabel(result.theory)})
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${result.theory}%` }}
                />
              </div>
            </div>

            {/* 编码能力 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>编码能力</span>
                <span className={getScoreColor(result.coding)}>
                  {result.coding}分 ({getScoreLabel(result.coding)})
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${result.coding}%` }}
                />
              </div>
            </div>

            {/* Rust 水平 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Rust 水平</span>
                <span className={getScoreColor(result.rust)}>
                  {result.rust}分 ({getScoreLabel(result.rust)})
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${result.rust}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 薄弱知识点 */}
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
            <p className="text-xs text-muted-foreground mt-2">
              建议针对这些知识点进行专项练习
            </p>
          </CardContent>
        </Card>
      )}

      {/* 评估总结 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">评估总结</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{result.summary}</p>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-4">
        <Button onClick={onClose} className="flex-1">
          开始学习
        </Button>
      </div>
    </div>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProgressData {
  stage: string;
  stageLabel: string;
  completedTasks: number;
  totalTasks: number;
  accuracy: number;
}

const stages = [
  { key: 'pre_study_theory', label: '导学-理论' },
  { key: 'pre_study_rust', label: '导学-Rust' },
  { key: 'pre_study_tools', label: '导学-工具' },
  { key: 'basic', label: '基础阶段' },
  { key: 'professional', label: '专业阶段' },
  { key: 'project_intro', label: '项目先导' },
  { key: 'project', label: '项目阶段' },
];

export function ProgressPanel({ data }: { data: ProgressData }) {
  const progressPercent = data.totalTasks > 0 
    ? Math.round(data.completedTasks / data.totalTasks * 100) 
    : 0;

  const currentStageIndex = stages.findIndex(s => s.key === data.stage);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">学习进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>当前阶段: {data.stageLabel}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              完成任务: {data.completedTasks}/{data.totalTasks}
            </div>
            <div className="text-sm text-muted-foreground">
              答题正确率: {data.accuracy}%
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">阶段总览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div
                key={stage.key}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  index === currentStageIndex
                    ? 'bg-primary/10 font-medium'
                    : index < currentStageIndex
                    ? 'text-muted-foreground'
                    : ''
                }`}
              >
                <span>
                  {index < currentStageIndex ? '✓' : index === currentStageIndex ? '►' : '○'}
                </span>
                <span>{stage.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

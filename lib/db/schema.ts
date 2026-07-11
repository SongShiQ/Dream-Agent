export type { Student, Assessment, Question, AnswerRecord, LearningPlan } from '@prisma/client';

export type Stage = 
  | 'pre_study_theory'
  | 'pre_study_rust'
  | 'pre_study_tools'
  | 'basic'
  | 'professional'
  | 'project_intro'
  | 'project';

export const STAGE_LABELS: Record<Stage, string> = {
  pre_study_theory: '导学-理论',
  pre_study_rust: '导学-Rust',
  pre_study_tools: '导学-工具',
  basic: '基础阶段',
  professional: '专业阶段',
  project_intro: '项目先导',
  project: '项目阶段',
};

export type QuestionType = 'choice' | 'fill' | 'code' | 'design';

export interface QuestionData {
  type: QuestionType;
  difficulty: number;
  knowledgePoints: string[];
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface LevelAssessment {
  theory: number;
  coding: number;
  rust: number;
  weakPoints: string[];
}

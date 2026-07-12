// 代码分析模块 - 类型定义

// 分析维度
export type AnalysisDimension = 
  | 'correctness'   // 正确性
  | 'style'         // 代码风格
  | 'efficiency'    // 效率
  | 'security'      // 安全性
  | 'readability';  // 可读性

// 分析结果
export interface AnalysisResult {
  dimension: AnalysisDimension;
  score: number;  // 0-100
  issues: Issue[];
  suggestions: string[];
  summary: string;
}

// 问题
export interface Issue {
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  rule?: string;
}

// 完整分析报告
export interface FullAnalysisReport {
  code: string;
  language: string;
  results: AnalysisResult[];
  overallScore: number;
  summary: string;
  timestamp: Date;
}

// 分析配置
export interface AnalysisConfig {
  dimensions: AnalysisDimension[];
  language: 'rust' | 'c' | 'python';
  strictMode: boolean;
}

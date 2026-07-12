// 代码分析主模块

import type { AnalysisConfig, AnalysisResult, FullAnalysisReport } from './types';
import { analyzeCorrectness } from './correctness';
import { analyzeStyle } from './style';
import { analyzeEfficiency } from './efficiency';
import { analyzeSecurity } from './security';
import { analyzeReadability } from './readability';

// 分析器映射
const analyzers: Record<string, (code: string, language: string, ...args: unknown[]) => Promise<AnalysisResult>> = {
  correctness: (code, language) => analyzeCorrectness(code, language),
  style: (code, language) => analyzeStyle(code, language),
  efficiency: (code, language) => analyzeEfficiency(code, language),
  security: (code, language) => analyzeSecurity(code, language),
  readability: (code, language) => analyzeReadability(code, language),
};

// 完整分析
export async function analyzeCode(
  code: string,
  config: AnalysisConfig
): Promise<FullAnalysisReport> {
  const results: AnalysisResult[] = [];

  // 执行所有配置的分析维度
  for (const dimension of config.dimensions) {
    const analyzer = analyzers[dimension];
    if (analyzer) {
      const result = await analyzer(code, config.language);
      results.push(result);
    }
  }

  // 计算总体分数
  const overallScore = calculateOverallScore(results);

  // 生成摘要
  const summary = generateSummary(results, overallScore);

  return {
    code,
    language: config.language,
    results,
    overallScore,
    summary,
    timestamp: new Date(),
  };
}

// 快速分析（默认维度）
export async function quickAnalyze(
  code: string,
  language: string = 'rust'
): Promise<FullAnalysisReport> {
  return analyzeCode(code, {
    dimensions: ['correctness', 'style', 'readability'],
    language: language as 'rust' | 'c' | 'python',
    strictMode: false,
  });
}

// 完整分析（所有维度）
export async function fullAnalyze(
  code: string,
  language: string = 'rust'
): Promise<FullAnalysisReport> {
  return analyzeCode(code, {
    dimensions: ['correctness', 'style', 'efficiency', 'security', 'readability'],
    language: language as 'rust' | 'c' | 'python',
    strictMode: true,
  });
}

// 计算总体分数
function calculateOverallScore(results: AnalysisResult[]): number {
  if (results.length === 0) return 0;

  // 加权平均
  const weights: Record<string, number> = {
    correctness: 0.35,
    style: 0.15,
    efficiency: 0.20,
    security: 0.15,
    readability: 0.15,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const result of results) {
    const weight = weights[result.dimension] || 0.2;
    weightedSum += result.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// 生成摘要
function generateSummary(results: AnalysisResult[], overallScore: number): string {
  const issues = results.flatMap(r => r.issues);
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  let summary = `总体评分: ${overallScore}/100\n\n`;

  if (overallScore >= 90) {
    summary += '代码质量优秀！';
  } else if (overallScore >= 70) {
    summary += '代码质量良好，有一些改进空间。';
  } else if (overallScore >= 50) {
    summary += '代码质量一般，需要改进。';
  } else {
    summary += '代码质量较差，需要仔细检查。';
  }

  if (errors > 0) {
    summary += `\n\n⚠️ 发现 ${errors} 个错误需要修复`;
  }
  if (warnings > 0) {
    summary += `\n⚡ 发现 ${warnings} 个警告`;
  }

  // 添加各维度摘要
  summary += '\n\n各维度评分:';
  for (const result of results) {
    summary += `\n- ${result.dimension}: ${result.score}/100`;
  }

  return summary;
}

// 导出分析函数
export { analyzeCorrectness, analyzeStyle, analyzeEfficiency, analyzeSecurity, analyzeReadability };

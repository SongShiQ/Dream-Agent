// 代码分析主模块

import type { AnalysisConfig, AnalysisResult, FullAnalysisReport, Issue } from './types';
import { analyzeCorrectness } from './correctness';
import { analyzeStyle } from './style';
import { analyzeEfficiency } from './efficiency';
import { analyzeSecurity } from './security';
import { analyzeReadability } from './readability';
import { applyScoreCap, assessSubstance } from './baseline';

export type { SubstanceLevel, SubstanceReport } from './baseline';
export { assessSubstance, stripComments } from './baseline';

// 分析器映射
const analyzers: Record<
  string,
  (
    code: string,
    language: string,
    extras?: { testResult?: string }
  ) => Promise<AnalysisResult>
> = {
  correctness: (code, language, extras) =>
    analyzeCorrectness(code, language, extras?.testResult),
  style: (code, language) => analyzeStyle(code, language),
  efficiency: (code, language) => analyzeEfficiency(code, language),
  security: (code, language) => analyzeSecurity(code, language),
  readability: (code, language) => analyzeReadability(code, language),
};

export type AnalyzeOptions = {
  testResult?: string;
  /** 学员自报本地测试是否通过 — 用于摘要诚实提示，不直接当 OJ */
  claimedPassed?: boolean;
};

// 完整分析
export async function analyzeCode(
  code: string,
  config: AnalysisConfig,
  options: AnalyzeOptions = {}
): Promise<FullAnalysisReport> {
  const substance = assessSubstance(code, config.language);
  const results: AnalysisResult[] = [];

  // 空/仅注释：直接返回 capped 报告，不再假装各维度 100
  if (substance.level === 'empty' || substance.level === 'comments_only') {
    const dimScore = substance.scoreCap;
    for (const dimension of config.dimensions) {
      results.push({
        dimension: dimension as AnalysisResult['dimension'],
        score: dimScore,
        issues: substance.issues,
        suggestions: substance.suggestions,
        summary: substance.summary,
      });
    }
    return finalizeReport(code, config.language, results, substance.scoreCap, options, substance.issues);
  }

  for (const dimension of config.dimensions) {
    const analyzer = analyzers[dimension];
    if (!analyzer) continue;
    const result = await analyzer(code, config.language, {
      testResult: options.testResult,
    });
    // 注入实质问题（stub/thin）到每个维度，避免「各维 100、总 100」
    const mergedIssues = [...substance.issues, ...result.issues];
    const mergedSuggestions = Array.from(
      new Set([...substance.suggestions, ...result.suggestions])
    );
    let score = applyScoreCap(result.score, substance.scoreCap);
    // stub/thin 时从「满分起点」再体现实质问题：若无其它 issue 也必须低于 cap
    if (substance.level === 'stub' && score > substance.scoreCap) {
      score = substance.scoreCap;
    }
    results.push({
      ...result,
      score,
      issues: mergedIssues,
      suggestions: mergedSuggestions,
      summary:
        substance.level !== 'ok'
          ? `${substance.summary}；维度原评 ${result.score}，已封顶 ${score}`
          : result.summary,
    });
  }

  let overallScore = calculateOverallScore(results);
  overallScore = applyScoreCap(overallScore, substance.scoreCap);

  // 自报未通过时，摘要不得写「优秀」且总分再压一档（静态≠测试通过）
  if (options.claimedPassed === false && overallScore > 70) {
    overallScore = Math.min(overallScore, 70);
  }

  return finalizeReport(
    code,
    config.language,
    results,
    overallScore,
    options,
    substance.issues
  );
}

function finalizeReport(
  code: string,
  language: string,
  results: AnalysisResult[],
  overallScore: number,
  options: AnalyzeOptions,
  substanceIssues: Issue[]
): FullAnalysisReport {
  return {
    code,
    language,
    results,
    overallScore,
    summary: generateSummary(results, overallScore, options, substanceIssues),
    timestamp: new Date(),
  };
}

// 快速分析（默认维度）
export async function quickAnalyze(
  code: string,
  language: string = 'rust',
  options: AnalyzeOptions = {}
): Promise<FullAnalysisReport> {
  return analyzeCode(
    code,
    {
      dimensions: ['correctness', 'style', 'readability'],
      language: language as 'rust' | 'c' | 'python',
      strictMode: false,
    },
    options
  );
}

// 完整分析（所有维度）
export async function fullAnalyze(
  code: string,
  language: string = 'rust',
  options: AnalyzeOptions = {}
): Promise<FullAnalysisReport> {
  return analyzeCode(
    code,
    {
      dimensions: ['correctness', 'style', 'efficiency', 'security', 'readability'],
      language: language as 'rust' | 'c' | 'python',
      strictMode: true,
    },
    options
  );
}

function calculateOverallScore(results: AnalysisResult[]): number {
  if (results.length === 0) return 0;

  const weights: Record<string, number> = {
    correctness: 0.35,
    style: 0.15,
    efficiency: 0.2,
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

function generateSummary(
  results: AnalysisResult[],
  overallScore: number,
  options: AnalyzeOptions,
  substanceIssues: Issue[]
): string {
  const issues = [...substanceIssues, ...results.flatMap((r) => r.issues)];
  // 去重 message
  const seen = new Set<string>();
  const uniqueIssues = issues.filter((i) => {
    const k = `${i.severity}:${i.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const errors = uniqueIssues.filter((i) => i.severity === 'error').length;
  const warnings = uniqueIssues.filter((i) => i.severity === 'warning').length;

  let summary = `总体评分: ${overallScore}/100\n\n`;

  // 诚实文案：低分/空代码不能写「优秀」
  if (errors > 0 && overallScore < 40) {
    summary += '提交内容不足或存在严重问题，请先补全实验代码再评。';
  } else if (overallScore >= 90) {
    summary += '静态规则下代码质量较好（≠ 实验已通过）。';
  } else if (overallScore >= 70) {
    summary += '静态规则下尚可，仍有改进空间。';
  } else if (overallScore >= 50) {
    summary += '静态分数一般，建议补充实现并对照 lab 要求。';
  } else if (overallScore >= 25) {
    summary += '更像占位/过短代码，不能当作完成实验。';
  } else {
    summary += '几乎无可分析逻辑，请提交真实代码。';
  }

  if (options.claimedPassed === false) {
    summary += '\n\n你未勾选「本地测试已通过」：静态分不能代替跑测。';
  } else if (options.claimedPassed === true) {
    summary += '\n\n你勾选了本地测试已通过（自报，系统未实际执行 QEMU/测试）。';
  }

  if (errors > 0) {
    summary += `\n\n发现 ${errors} 个严重问题`;
  }
  if (warnings > 0) {
    summary += `\n发现 ${warnings} 个警告`;
  }

  summary += '\n\n各维度评分:';
  for (const result of results) {
    summary += `\n- ${result.dimension}: ${result.score}/100`;
  }

  return summary;
}

export {
  analyzeCorrectness,
  analyzeStyle,
  analyzeEfficiency,
  analyzeSecurity,
  analyzeReadability,
};

// 正确性分析器

import type { AnalysisResult, Issue } from './types';

// 分析代码正确性
export async function analyzeCorrectness(
  code: string,
  language: string,
  testResult?: string
): Promise<AnalysisResult> {
  const issues: Issue[] = [];
  const suggestions: string[] = [];

  // 基本语法检查
  if (language === 'rust') {
    checkRustSyntax(code, issues, suggestions);
  }

  // 检查测试结果
  if (testResult) {
    checkTestResult(testResult, issues, suggestions);
  }

  // 计算分数
  const score = calculateScore(issues);

  return {
    dimension: 'correctness',
    score,
    issues,
    suggestions,
    summary: generateSummary(score, issues),
  };
}

// Rust 语法检查
function checkRustSyntax(code: string, issues: Issue[], suggestions: string[]) {
  // 检查是否使用了 unsafe
  if (code.includes('unsafe')) {
    issues.push({
      severity: 'warning',
      message: '使用了 unsafe 代码块，需要确保安全性',
    });
    suggestions.push('检查 unsafe 块中的操作是否真的必要');
  }

  // 检查 unwrap 使用
  const unwrapCount = (code.match(/\.unwrap\(\)/g) || []).length;
  if (unwrapCount > 0) {
    issues.push({
      severity: unwrapCount > 3 ? 'warning' : 'info',
      message: `使用了 ${unwrapCount} 次 unwrap()，可能导致 panic`,
    });
    suggestions.push('考虑使用 ? 操作符或 expect() 替代 unwrap()');
  }

  // 检查未处理的 Result
  if (code.includes('Result<') && !code.includes('?') && !code.includes('unwrap')) {
    issues.push({
      severity: 'info',
      message: '返回 Result 的函数可能需要错误处理',
    });
  }

  // 检查生命周期标注
  if (code.includes('&') && !code.includes("'")) {
    issues.push({
      severity: 'info',
      message: '使用了引用但没有显式生命周期标注',
    });
  }
}

// 检查测试结果
function checkTestResult(testResult: string, issues: Issue[], suggestions: string[]) {
  if (testResult.includes('FAILED') || testResult.includes('failed')) {
    issues.push({
      severity: 'error',
      message: '测试失败',
    });
    suggestions.push('检查测试失败的原因并修复');
  }

  if (testResult.includes('error[E')) {
    const errorMatch = testResult.match(/error\[(\w+)\]/);
    if (errorMatch) {
      issues.push({
        severity: 'error',
        message: `编译错误: ${errorMatch[1]}`,
      });
    }
  }
}

// 计算分数
function calculateScore(issues: Issue[]): number {
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 20;
        break;
      case 'warning':
        score -= 10;
        break;
      case 'info':
        score -= 5;
        break;
    }
  }
  return Math.max(0, score);
}

// 生成摘要
function generateSummary(score: number, issues: Issue[]): string {
  if (score >= 90) {
    return '代码正确性良好，没有发现明显问题';
  } else if (score >= 70) {
    return `代码基本正确，但有 ${issues.length} 个需要注意的问题`;
  } else if (score >= 50) {
    return `代码存在一些问题，需要修复 ${issues.filter(i => i.severity === 'error').length} 个错误`;
  } else {
    return '代码存在严重问题，需要仔细检查';
  }
}

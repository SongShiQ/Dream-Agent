// 可读性分析器

import type { AnalysisResult, Issue } from './types';

// 分析代码可读性
export async function analyzeReadability(
  code: string,
  language: string
): Promise<AnalysisResult> {
  const issues: Issue[] = [];
  const suggestions: string[] = [];

  if (language === 'rust') {
    checkRustReadability(code, issues, suggestions);
  }

  const score = calculateScore(issues);

  return {
    dimension: 'readability',
    score,
    issues,
    suggestions,
    summary: generateSummary(score, issues),
  };
}

// Rust 可读性检查
function checkRustReadability(code: string, issues: Issue[], suggestions: string[]) {
  // 检查函数长度
  checkFunctionLength(code, issues, suggestions);

  // 检查嵌套深度
  checkNestingDepth(code, issues, suggestions);

  // 检查注释质量
  checkCommentQuality(code, issues, suggestions);

  // 检查代码组织
  checkOrganization(code, issues, suggestions);
}

// 检查函数长度
function checkFunctionLength(code: string, issues: Issue[], suggestions: string[]) {
  const fnRegex = /fn\s+\w+[^{]*\{([^}]+)\}/g;
  let match;
  while ((match = fnRegex.exec(code)) !== null) {
    const fnBody = match[1];
    const lineCount = fnBody.split('\n').length;
    if (lineCount > 50) {
      issues.push({
        severity: 'warning',
        message: `函数体超过 50 行（${lineCount} 行），建议拆分`,
      });
      suggestions.push('将长函数拆分为更小的函数');
    }
  }
}

// 检查嵌套深度
function checkNestingDepth(code: string, issues: Issue[], suggestions: string[]) {
  const lines = code.split('\n');
  let maxDepth = 0;
  let currentDepth = 0;

  for (const line of lines) {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    currentDepth += openBraces - closeBraces;
    maxDepth = Math.max(maxDepth, currentDepth);
  }

  if (maxDepth > 4) {
    issues.push({
      severity: 'warning',
      message: `最大嵌套深度 ${maxDepth} 层，建议减少嵌套`,
    });
    suggestions.push('使用 early return、guard clauses 减少嵌套');
  }
}

// 检查注释质量
function checkCommentQuality(code: string, issues: Issue[], suggestions: string[]) {
  const lines = code.split('\n');
  let commentedLines = 0;
  let codeLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      if (trimmed.startsWith('//')) {
        commentedLines++;
      } else {
        codeLines++;
      }
    }
  }

  const commentRatio = codeLines > 0 ? commentedLines / codeLines : 0;
  if (commentRatio < 0.1) {
    issues.push({
      severity: 'info',
      message: '注释比例较低，建议添加更多注释',
    });
    suggestions.push('为复杂的逻辑添加注释说明');
  }
}

// 检查代码组织
function checkOrganization(code: string, issues: Issue[], suggestions: string[]) {
  // 检查是否有 use 语句
  if (code.includes('use ') && code.includes('fn main')) {
    const useEnd = code.indexOf('\n', code.indexOf('use '));
    const mainStart = code.indexOf('fn main');
    if (useEnd > mainStart) {
      issues.push({
        severity: 'info',
        message: 'use 语句应该放在文件顶部',
      });
    }
  }

  // 检查函数顺序
  if (code.includes('fn main') && !code.startsWith('fn main')) {
    // main 函数不在开头，可能是好的组织
  }
}

// 计算分数
function calculateScore(issues: Issue[]): number {
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 15;
        break;
      case 'warning':
        score -= 8;
        break;
      case 'info':
        score -= 3;
        break;
    }
  }
  return Math.max(0, score);
}

// 生成摘要
function generateSummary(score: number, issues: Issue[]): string {
  if (score >= 90) {
    return '代码可读性良好，结构清晰';
  } else if (score >= 70) {
    return `代码可读性尚可，有 ${issues.length} 个改进建议`;
  } else {
    return '代码可读性需要改进，建议重构';
  }
}

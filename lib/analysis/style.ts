// 代码风格分析器

import type { AnalysisResult, Issue } from './types';

// 分析代码风格
export async function analyzeStyle(
  code: string,
  language: string
): Promise<AnalysisResult> {
  const issues: Issue[] = [];
  const suggestions: string[] = [];

  if (language === 'rust') {
    checkRustStyle(code, issues, suggestions);
  }

  const score = calculateScore(issues);

  return {
    dimension: 'style',
    score,
    issues,
    suggestions,
    summary: generateSummary(score, issues),
  };
}

// Rust 风格检查
function checkRustStyle(code: string, issues: Issue[], suggestions: string[]) {
  // 检查命名规范
  checkNaming(code, issues, suggestions);

  // 检查代码格式
  checkFormatting(code, issues, suggestions);

  // 检查注释
  checkComments(code, issues, suggestions);
}

// 检查命名规范
function checkNaming(code: string, issues: Issue[], suggestions: string[]) {
  // 检查函数命名 (snake_case)
  const fnRegex = /fn\s+([A-Z]\w*)/g;
  let match;
  while ((match = fnRegex.exec(code)) !== null) {
    issues.push({
      severity: 'warning',
      message: `函数名 "${match[1]}" 应该使用 snake_case`,
    });
    suggestions.push('Rust 函数名应该使用 snake_case');
  }

  // 检查常量命名 (SCREAMING_SNAKE_CASE)
  const constRegex = /const\s+([a-z]\w*)\s*:/g;
  while ((match = constRegex.exec(code)) !== null) {
    issues.push({
      severity: 'info',
      message: `常量名 "${match[1]}" 应该使用 SCREAMING_SNAKE_CASE`,
    });
  }

  // 检查类型命名 (PascalCase)
  const typeRegex = /struct\s+([a-z]\w*)/g;
  while ((match = typeRegex.exec(code)) !== null) {
    issues.push({
      severity: 'warning',
      message: `结构体名 "${match[1]}" 应该使用 PascalCase`,
    });
  }
}

// 检查格式
function checkFormatting(code: string, issues: Issue[], suggestions: string[]) {
  const lines = code.split('\n');

  // 检查行长度
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 100) {
      issues.push({
        severity: 'info',
        line: i + 1,
        message: `第 ${i + 1} 行超过 100 字符`,
      });
    }
  }

  // 检查缩进一致性
  const indentations = lines
    .filter(l => l.trim().length > 0)
    .map(l => l.match(/^(\s*)/)?.[1]?.length || 0);
  
  const hasTabIndent = indentations.some(i => i > 0 && !Number.isInteger(i / 4));
  if (hasTabIndent) {
    issues.push({
      severity: 'info',
      message: '建议使用 4 空格缩进',
    });
    suggestions.push('运行 rustfmt 格式化代码');
  }
}

// 检查注释
function checkComments(code: string, issues: Issue[], suggestions: string[]) {
  // 检查是否有文档注释
  const pubFns = code.match(/pub\s+fn\s+\w+/g) || [];
  const docComments = code.match(/\/\/\/.*/g) || [];

  if (pubFns.length > 0 && docComments.length === 0) {
    issues.push({
      severity: 'info',
      message: '公开函数缺少文档注释',
    });
    suggestions.push('为公开函数添加 /// 文档注释');
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
    return '代码风格良好，符合 Rust 规范';
  } else if (score >= 70) {
    return `代码风格基本合格，有 ${issues.length} 个建议改进`;
  } else {
    return '代码风格需要改进，建议运行 rustfmt';
  }
}

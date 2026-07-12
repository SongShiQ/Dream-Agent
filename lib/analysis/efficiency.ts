// 效率分析器

import type { AnalysisResult, Issue } from './types';

// 分析代码效率
export async function analyzeEfficiency(
  code: string,
  language: string
): Promise<AnalysisResult> {
  const issues: Issue[] = [];
  const suggestions: string[] = [];

  if (language === 'rust') {
    checkRustEfficiency(code, issues, suggestions);
  }

  const score = calculateScore(issues);

  return {
    dimension: 'efficiency',
    score,
    issues,
    suggestions,
    summary: generateSummary(score, issues),
  };
}

// Rust 效率检查
function checkRustEfficiency(code: string, issues: Issue[], suggestions: string[]) {
  // 检查不必要的克隆
  checkCloning(code, issues, suggestions);

  // 检查循环效率
  checkLoops(code, issues, suggestions);

  // 检查内存分配
  checkAllocations(code, issues, suggestions);
}

// 检查克隆
function checkCloning(code: string, issues: Issue[], suggestions: string[]) {
  const cloneCount = (code.match(/\.clone\(\)/g) || []).length;
  if (cloneCount > 5) {
    issues.push({
      severity: 'warning',
      message: `使用了 ${cloneCount} 次 clone()，可能有性能开销`,
    });
    suggestions.push('检查是否真的需要克隆，考虑使用引用');
  }

  // 检查不必要的 to_string
  if (code.includes('.to_string()') && code.includes('&str')) {
    issues.push({
      severity: 'info',
      message: '可能存在不必要的 String 转换',
    });
  }
}

// 检查循环
function checkLoops(code: string, issues: Issue[], suggestions: string[]) {
  // 检查嵌套循环
  const nestedLoopRegex = /for\s+.*\{[\s\S]*?for\s+/g;
  if (nestedLoopRegex.test(code)) {
    issues.push({
      severity: 'warning',
      message: '存在嵌套循环，可能导致 O(n²) 复杂度',
    });
    suggestions.push('考虑是否可以优化为单层循环或使用更高效的数据结构');
  }

  // 检查 collect 后立即 iter
  if (code.includes('.collect::<Vec') && code.includes('.iter()')) {
    issues.push({
      severity: 'info',
      message: 'collect 后立即 iter 可能有性能开销',
    });
    suggestions.push('考虑使用迭代器链，避免中间集合');
  }
}

// 检查内存分配
function checkAllocations(code: string, issues: Issue[], suggestions: string[]) {
  // 检查频繁的 String 创建
  const stringCreates = (code.match(/String::from|\.to_string\(\)/g) || []).length;
  if (stringCreates > 10) {
    issues.push({
      severity: 'info',
      message: `创建了 ${stringCreates} 个 String，考虑使用 &str`,
    });
  }

  // 检查 Vec 预分配
  if (code.includes('Vec::new()') && code.includes('.push(')) {
    issues.push({
      severity: 'info',
      message: '使用 Vec::new() 后频繁 push，考虑使用 Vec::with_capacity()',
    });
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
        score -= 3;
        break;
    }
  }
  return Math.max(0, score);
}

// 生成摘要
function generateSummary(score: number, issues: Issue[]): string {
  if (score >= 90) {
    return '代码效率良好，没有发现明显的性能问题';
  } else if (score >= 70) {
    return `代码效率尚可，有 ${issues.length} 个优化建议`;
  } else {
    return '代码存在效率问题，建议优化后再使用';
  }
}

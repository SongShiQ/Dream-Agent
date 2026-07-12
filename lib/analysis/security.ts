// 安全性分析器

import type { AnalysisResult, Issue } from './types';

// 分析代码安全性
export async function analyzeSecurity(
  code: string,
  language: string
): Promise<AnalysisResult> {
  const issues: Issue[] = [];
  const suggestions: string[] = [];

  if (language === 'rust') {
    checkRustSecurity(code, issues, suggestions);
  }

  const score = calculateScore(issues);

  return {
    dimension: 'security',
    score,
    issues,
    suggestions,
    summary: generateSummary(score, issues),
  };
}

// Rust 安全检查
function checkRustSecurity(code: string, issues: Issue[], suggestions: string[]) {
  // 检查 unsafe 使用
  checkUnsafe(code, issues, suggestions);

  // 检查并发安全
  checkConcurrency(code, issues, suggestions);

  // 检查输入验证
  checkInputValidation(code, issues, suggestions);
}

// 检查 unsafe
function checkUnsafe(code: string, issues: Issue[], suggestions: string[]) {
  const unsafeBlocks = (code.match(/unsafe\s*\{/g) || []).length;
  if (unsafeBlocks > 0) {
    issues.push({
      severity: 'warning',
      message: `使用了 ${unsafeBlocks} 个 unsafe 块`,
    });
    suggestions.push('确保 unsafe 块中的操作是安全的');
  }

  // 检查裸指针
  if (code.includes('*const') || code.includes('*mut')) {
    issues.push({
      severity: 'warning',
      message: '使用了裸指针，需要确保指针有效性',
    });
  }

  // 检查 transmute
  if (code.includes('transmute')) {
    issues.push({
      severity: 'error',
      message: '使用了 transmute，这是非常危险的操作',
    });
    suggestions.push('避免使用 transmute，寻找更安全的替代方案');
  }
}

// 检查并发安全
function checkConcurrency(code: string, issues: Issue[], suggestions: string[]) {
  // 检查 Arc/Mutex 使用
  if (code.includes('Arc<') && !code.includes('Mutex<')) {
    issues.push({
      severity: 'info',
      message: '使用了 Arc 但没有 Mutex，确保数据竞争安全',
    });
  }

  // 检查 unwrap 在并发上下文中
  if ((code.includes('tokio') || code.includes('thread')) && code.includes('.unwrap()')) {
    issues.push({
      severity: 'warning',
      message: '在并发上下文中使用 unwrap() 可能导致 panic',
    });
    suggestions.push('在并发代码中使用 ? 操作符处理错误');
  }
}

// 检查输入验证
function checkInputValidation(code: string, issues: Issue[], suggestions: string[]) {
  // 检查是否有外部输入处理
  if (code.includes('std::env::args') || code.includes('stdin')) {
    if (!code.includes('validate') && !code.includes('sanitize')) {
      issues.push({
        severity: 'warning',
        message: '处理外部输入但没有验证',
      });
      suggestions.push('对外部输入进行验证和清理');
    }
  }

  // 检查 SQL 注入风险
  if (code.includes('format!') && code.includes('SELECT')) {
    issues.push({
      severity: 'error',
      message: '可能存在 SQL 注入风险',
    });
    suggestions.push('使用参数化查询');
  }
}

// 计算分数
function calculateScore(issues: Issue[]): number {
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 25;
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
    return '代码安全性良好，没有发现安全问题';
  } else if (score >= 70) {
    return `代码基本安全，有 ${issues.length} 个需要注意的安全问题`;
  } else {
    return '代码存在安全隐患，需要仔细检查';
  }
}

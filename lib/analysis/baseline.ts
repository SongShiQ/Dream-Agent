/**
 * 代码「实质内容」基线检测 — 防止空代码/占位代码静默得 100 分
 */

import type { Issue } from './types';

export type SubstanceLevel = 'empty' | 'comments_only' | 'stub' | 'thin' | 'ok';

export type SubstanceReport = {
  level: SubstanceLevel;
  /** 去掉注释与空行后的有效行数 */
  effectiveLines: number;
  /** 原始非空行数 */
  rawNonEmptyLines: number;
  /** 该提交允许的最高总分 */
  scoreCap: number;
  issues: Issue[];
  suggestions: string[];
  summary: string;
};

/** 去掉行注释与块注释（启发式，够静态分析用） */
export function stripComments(code: string, language: string): string {
  let s = code;
  // block comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (language === 'python') {
    s = s.replace(/#.*$/gm, ' ');
    s = s.replace(/'''[\s\S]*?'''/g, ' ');
    s = s.replace(/"""[\s\S]*?"""/g, ' ');
  } else {
    s = s.replace(/\/\/.*$/gm, ' ');
  }
  return s;
}

function isBraceOnly(line: string): boolean {
  return /^[{}();,]+$/.test(line);
}

/** 典型占位 / 模板代码特征 */
function looksLikeStub(effective: string): boolean {
  const compact = effective.replace(/\s+/g, ' ').trim().toLowerCase();
  if (compact.length < 40) return true;

  // 默认 LabPanel 模板
  if (
    compact.includes('println!("hello rcore")') ||
    compact.includes("println!('hello rcore')") ||
    compact.includes('println!("hello world")')
  ) {
    // 若几乎只有 main + println，视为 stub
    const withoutHello = compact
      .replace(/fn main\s*\(\s*\)\s*\{/g, '')
      .replace(/println!\s*\([^)]*\)\s*;?/g, '')
      .replace(/[{};]/g, '')
      .trim();
    if (withoutHello.length < 20) return true;
  }

  // 空 main
  if (/^fn main\s*\(\s*\)\s*\{\s*\}$/.test(compact)) return true;

  return false;
}

/**
 * 评估提交代码是否「有东西可评」
 */
export function assessSubstance(code: string, language: string = 'rust'): SubstanceReport {
  const raw = String(code || '');
  const rawNonEmptyLines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;

  if (raw.trim().length === 0) {
    return {
      level: 'empty',
      effectiveLines: 0,
      rawNonEmptyLines: 0,
      scoreCap: 0,
      issues: [
        {
          severity: 'error',
          message: '提交代码为空，无法进行有意义的静态分析',
          rule: 'substance/empty',
        },
      ],
      suggestions: ['粘贴实验相关源码后再提交', '至少包含函数/模块与核心逻辑'],
      summary: '空代码：不评分',
    };
  }

  const stripped = stripComments(raw, language);
  const effectiveLinesList = stripped
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isBraceOnly(l));
  const effectiveLines = effectiveLinesList.length;
  const effectiveText = effectiveLinesList.join('\n');

  if (effectiveLines === 0) {
    return {
      level: 'comments_only',
      effectiveLines: 0,
      rawNonEmptyLines,
      scoreCap: 5,
      issues: [
        {
          severity: 'error',
          message: '提交内容几乎只有注释/空白，没有可执行逻辑',
          rule: 'substance/comments_only',
        },
      ],
      suggestions: ['提交真实实现代码，而不仅是注释说明'],
      summary: '仅注释：实质内容不足',
    };
  }

  if (looksLikeStub(effectiveText) || effectiveLines <= 3) {
    return {
      level: 'stub',
      effectiveLines,
      rawNonEmptyLines,
      scoreCap: 25,
      issues: [
        {
          severity: 'error',
          message: `代码过短或仅为占位模板（有效逻辑约 ${effectiveLines} 行），不能给高分`,
          rule: 'substance/stub',
        },
      ],
      suggestions: [
        '替换默认 hello 模板为实验相关实现',
        '至少提交 trap/syscall/页表/进程等核心片段',
      ],
      summary: '占位/过短：上限 25 分',
    };
  }

  // 很薄：有效行少且无常见 OS/Rust 结构关键词
  const hasStructure =
    /\b(fn|struct|impl|mod|pub|match|if|for|while|loop|unsafe|asm!|#\[)\b/.test(
      effectiveText
    );
  if (effectiveLines < 12 || !hasStructure) {
    return {
      level: 'thin',
      effectiveLines,
      rawNonEmptyLines,
      scoreCap: 55,
      issues: [
        {
          severity: 'warning',
          message: `代码实质内容偏少（有效约 ${effectiveLines} 行），静态分已设上限`,
          rule: 'substance/thin',
        },
      ],
      suggestions: ['补充完整函数与错误处理，便于分析正确性与风格'],
      summary: '内容偏少：上限 55 分',
    };
  }

  return {
    level: 'ok',
    effectiveLines,
    rawNonEmptyLines,
    scoreCap: 100,
    issues: [],
    suggestions: [],
    summary: '实质内容足够，按维度规则评分',
  };
}

/** 将维度分限制在 scoreCap 内，并保证 empty/stub 不会「看起来优秀」 */
export function applyScoreCap(score: number, cap: number): number {
  return Math.max(0, Math.min(Math.round(score), Math.round(cap)));
}

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { JudgeVerdict } from '@/lib/labs';

export type UnitJudgeRule = {
  id: string;
  description: string;
  requiredIncludes?: string[];
  requiredAnyIncludes?: string[];
};

export type UnitJudgeSpec = {
  gateId: string;
  title: string;
  publicDescription: string;
  rules: UnitJudgeRule[];
  forbiddenIncludes?: string[];
  harness?: {
    mode: 'rust_single_file';
    template: string;
    tests: string;
  };
};

export type UnitJudgeResult = {
  verdict: JudgeVerdict;
  publicLog: string;
};

const UNIT_SPEC_DIR = join(process.cwd(), 'data', 'judges', 'unit');

function normalize(code: string) {
  return code.replace(/\r\n/g, '\n');
}

function hasUnbalancedBraces(code: string) {
  let depth = 0;
  for (const ch of code) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) return true;
  }
  return depth !== 0;
}

export async function loadUnitJudgeSpec(gateId: string): Promise<UnitJudgeSpec | null> {
  try {
    const raw = await readFile(join(UNIT_SPEC_DIR, `${gateId}.json`), 'utf8');
    return JSON.parse(raw) as UnitJudgeSpec;
  } catch {
    return null;
  }
}

export function evaluateUnitSubmission(spec: UnitJudgeSpec, code: string): UnitJudgeResult {
  const src = normalize(code);
  const lower = src.toLowerCase();
  const lines: string[] = [`[unit_oj] ${spec.title}`, spec.publicDescription, ''];

  if (hasUnbalancedBraces(src)) {
    return {
      verdict: 'CE',
      publicLog: [...lines, 'CE: 花括号不匹配，请先保证代码片段语法完整。'].join('\n'),
    };
  }

  const forbidden = (spec.forbiddenIncludes || []).filter((item) =>
    lower.includes(item.toLowerCase())
  );
  if (forbidden.length > 0) {
    return {
      verdict: 'WA',
      publicLog: [...lines, `WA: 出现禁止/占位片段：${forbidden.join('、')}`].join('\n'),
    };
  }

  const failed: string[] = [];
  for (const rule of spec.rules) {
    const missingAll = (rule.requiredIncludes || []).filter(
      (item) => !lower.includes(item.toLowerCase())
    );
    const any = rule.requiredAnyIncludes || [];
    const anyOk = any.length === 0 || any.some((item) => lower.includes(item.toLowerCase()));
    if (missingAll.length > 0 || !anyOk) {
      failed.push(rule.description);
    }
  }

  if (failed.length > 0) {
    return {
      verdict: 'WA',
      publicLog: [...lines, 'WA: 还缺少以下公开规则：', ...failed.map((item) => `- ${item}`)].join(
        '\n'
      ),
    };
  }

  return {
    verdict: 'AC',
    publicLog: [...lines, 'AC: 通过当前 unit gate 的公开规则。'].join('\n'),
  };
}

export async function runUnitJudge(gateId: string, code: string): Promise<UnitJudgeResult> {
  const spec = await loadUnitJudgeSpec(gateId);
  if (!spec) {
    return {
      verdict: 'SE',
      publicLog: `SE: 未找到 unit judge 题包：${gateId}`,
    };
  }
  return evaluateUnitSubmission(spec, code);
}

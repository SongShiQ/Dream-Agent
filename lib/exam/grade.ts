/** 答案判分（规则，不依赖 LLM） */

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，,、]/g, '')
    .replace(/[。.]/g, '');
}

/**
 * 选择题：支持 "A" / "a" / "A. xxx" 与选项全文
 * 填空：忽略空白与中英文标点差异，支持多答案用 / 分隔
 */
export function gradeAnswer(
  questionType: string,
  correctAnswer: string,
  userAnswer: string,
  options: string[] = []
): boolean {
  if (!userAnswer?.trim()) return false;

  const ua = userAnswer.trim();
  const ca = correctAnswer.trim();

  if (questionType === 'choice') {
    const userLetter = ua.charAt(0).toUpperCase();
    const correctLetter = ca.charAt(0).toUpperCase();
    if (/^[A-D]$/i.test(userLetter) && /^[A-D]$/i.test(correctLetter)) {
      if (userLetter === correctLetter) return true;
    }
    // 全文匹配选项
    if (normalize(ua) === normalize(ca)) return true;
    const matchedOpt = options.find((o) => normalize(o) === normalize(ua));
    if (matchedOpt && matchedOpt.charAt(0).toUpperCase() === correctLetter) return true;
    return false;
  }

  // fill / code / design：多答案
  const variants = ca.split(/[/|；;]/).map(normalize).filter(Boolean);
  const nu = normalize(ua);
  if (variants.some((v) => v === nu || nu.includes(v) || v.includes(nu))) return true;
  return normalize(ua) === normalize(ca);
}

export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

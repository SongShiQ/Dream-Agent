/**
 * 审计 data/questions/*.json：选择题 answer 是否落在 A-D 且对应 options
 */
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

type Q = {
  type?: string;
  content?: string;
  options?: string[];
  answer?: string;
  explanation?: string;
};

async function main() {
  const dir = join(process.cwd(), 'data', 'questions');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const issues: { file: string; content: string; why: string }[] = [];
  let total = 0;
  let choice = 0;

  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf-8');
    const data = JSON.parse(raw) as Q[];
    if (!Array.isArray(data)) continue;
    for (const q of data) {
      total++;
      if (q.type !== 'choice') continue;
      choice++;
      const opts = q.options || [];
      const letters = opts.map((o) => String(o).charAt(0).toUpperCase());
      const ans = String(q.answer || '')
        .trim()
        .charAt(0)
        .toUpperCase();
      const head = String(q.content || '').slice(0, 48);
      if (!/^[A-D]$/.test(ans)) {
        issues.push({ file, content: head, why: `answer 非 A-D: ${q.answer}` });
      } else if (!letters.includes(ans)) {
        issues.push({
          file,
          content: head,
          why: `answer ${ans} 不在 options 首字母 ${letters.join(',')}`,
        });
      }
      if (opts.length < 2) {
        issues.push({ file, content: head, why: '选项少于 2' });
      }
      if (!q.explanation || String(q.explanation).length < 4) {
        issues.push({ file, content: head, why: '解析过短' });
      }
    }
  }

  console.log(`total=${total} choice=${choice} issues=${issues.length}`);
  for (const i of issues.slice(0, 50)) {
    console.log(`[${i.file}] ${i.why} | ${i.content}`);
  }
  if (issues.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

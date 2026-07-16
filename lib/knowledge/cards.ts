/**
 * 结构化知识卡片检索（文件 + 标签，无向量）
 */

import { readFile, readdir } from 'fs/promises';
import { join, relative } from 'path';

const KNOWLEDGE_DIR = join(process.cwd(), 'data', 'knowledge');

export type KnowledgeCard = {
  id: string;
  title: string;
  tags: string[];
  stage?: string;
  labs: string[];
  source: string;
  content: string;
  excerpt: string;
  relevance: number;
};

type IndexFile = {
  tagMap?: Record<string, string[]>;
  stageLabs?: Record<
    string,
    { label: string; focus: string; labs: string[]; reads: string[] }
  >;
  opencamp?: { docsHint?: string; repo?: string };
};

let indexCache: IndexFile | null = null;

async function loadIndex(): Promise<IndexFile> {
  if (indexCache) return indexCache;
  try {
    const raw = await readFile(join(KNOWLEDGE_DIR, 'index.json'), 'utf-8');
    indexCache = JSON.parse(raw);
    return indexCache!;
  } catch {
    indexCache = {};
    return indexCache;
  }
}

function parseFrontmatter(raw: string): {
  meta: Record<string, unknown>;
  body: string;
} {
  if (!raw.startsWith('---')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { meta: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, '');
  const meta: Record<string, unknown> = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const rawVal = m[2].trim();
    let val: string | string[] = rawVal;
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        val = JSON.parse(val.replace(/(\w+)/g, '"$1"').replace(/""/g, '"'));
      } catch {
        val = rawVal
          .slice(1, -1)
          .split(',')
          .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    }
    meta[key] = val;
  }
  return { meta, body };
}

function titleFromBody(body: string, fallback: string): string {
  const h = body.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : fallback;
}

function excerptFromBody(body: string, max = 400): string {
  const cleaned = body
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return cleaned.slice(0, max) + (cleaned.length > max ? '…' : '');
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith('.')) continue;
        await walk(p);
      } else if (e.name.endsWith('.md') && !e.name.startsWith('_')) {
        out.push(p);
      }
    }
  }
  await walk(dir);
  return out;
}

async function loadCard(absPath: string): Promise<KnowledgeCard | null> {
  try {
    const raw = await readFile(absPath, 'utf-8');
    const rel = relative(KNOWLEDGE_DIR, absPath).replace(/\\/g, '/');
    const { meta, body } = parseFrontmatter(raw);
    const tags = Array.isArray(meta.tags)
      ? (meta.tags as string[]).map(String)
      : [];
    // 从路径推断标签
    if (tags.length === 0) {
      if (rel.includes('process')) tags.push('process');
      if (rel.includes('memory')) tags.push('memory', 'virtual_memory');
      if (rel.includes('filesystem') || rel.includes('inode'))
        tags.push('filesystem', 'inode');
      if (rel.includes('concurrency')) tags.push('concurrency', 'lock');
      if (rel.includes('ownership')) tags.push('rust', 'ownership', 'borrow');
      if (rel.includes('rust')) tags.push('rust');
      if (rel.includes('overview')) tags.push('overview');
    }
    const labs = Array.isArray(meta.labs) ? (meta.labs as string[]).map(String) : [];
    const title =
      (meta.title as string) || titleFromBody(body, rel.split('/').pop() || rel);
    const id = (meta.id as string) || rel.replace(/\.md$/, '').replace(/\//g, '-');

    return {
      id,
      title,
      tags,
      stage: meta.stage as string | undefined,
      labs,
      source: rel,
      content: body,
      excerpt: excerptFromBody(body),
      relevance: 0,
    };
  } catch {
    return null;
  }
}

export async function getStageMeta(stage: string) {
  const idx = await loadIndex();
  return idx.stageLabs?.[stage] || null;
}

export async function getAllStageMeta() {
  const idx = await loadIndex();
  return idx.stageLabs || {};
}

export async function getOpencampMeta() {
  const idx = await loadIndex();
  return idx.opencamp || {};
}

/** 按标签精确取卡片 */
export async function getCardsByTag(tag: string, limit = 5): Promise<KnowledgeCard[]> {
  const t = tag.toLowerCase();
  const idx = await loadIndex();
  const paths = new Set<string>();

  if (idx.tagMap?.[t]) {
    for (const p of idx.tagMap[t]) paths.add(p);
  }

  // 全库扫描补充
  const files = await listMarkdownFiles(KNOWLEDGE_DIR);
  const cards: KnowledgeCard[] = [];

  for (const p of paths) {
    const card = await loadCard(join(KNOWLEDGE_DIR, p));
    if (card) {
      card.relevance = 1;
      cards.push(card);
    }
  }

  if (cards.length < limit) {
    for (const f of files) {
      const card = await loadCard(f);
      if (!card) continue;
      if (cards.some((c) => c.source === card.source)) continue;
      const hit =
        card.tags.some((x) => x.toLowerCase() === t) ||
        card.content.toLowerCase().includes(t) ||
        card.title.toLowerCase().includes(t);
      if (hit) {
        card.relevance = 0.7;
        cards.push(card);
      }
      if (cards.length >= limit) break;
    }
  }

  return cards.slice(0, limit);
}

/** 关键词 / 多标签搜索 */
export async function searchCards(opts: {
  query?: string;
  tags?: string[];
  limit?: number;
}): Promise<KnowledgeCard[]> {
  const limit = opts.limit ?? 5;
  const tags = (opts.tags || []).map((t) => t.toLowerCase());
  const q = (opts.query || '').toLowerCase().trim();
  const words = q ? q.split(/[\s,，、]+/).filter(Boolean) : [];

  // 标签优先
  if (tags.length > 0 && !q) {
    const merged: KnowledgeCard[] = [];
    for (const t of tags) {
      const part = await getCardsByTag(t, limit);
      for (const c of part) {
        if (!merged.some((m) => m.source === c.source)) merged.push(c);
      }
    }
    return merged.slice(0, limit);
  }

  const files = await listMarkdownFiles(KNOWLEDGE_DIR);
  const scored: KnowledgeCard[] = [];

  for (const f of files) {
    const card = await loadCard(f);
    if (!card) continue;
    let score = 0;
    const blob = `${card.title} ${card.tags.join(' ')} ${card.content}`.toLowerCase();

    for (const t of tags) {
      if (card.tags.some((x) => x.toLowerCase() === t)) score += 3;
      else if (blob.includes(t)) score += 1;
    }
    for (const w of words) {
      if (w.length < 2) continue;
      if (card.tags.some((x) => x.toLowerCase().includes(w))) score += 2;
      if (card.title.toLowerCase().includes(w)) score += 2;
      if (blob.includes(w)) score += 1;
    }

    if (score > 0) {
      card.relevance = score;
      // 缩短 excerpt 对准查询
      if (words.length) {
        const paras = card.content.split(/\n\n+/);
        const hit = paras.filter((p) =>
          words.some((w) => p.toLowerCase().includes(w))
        );
        if (hit.length) {
          card.excerpt = hit.slice(0, 2).join('\n\n').slice(0, 500);
        }
      }
      scored.push(card);
    }
  }

  scored.sort((a, b) => b.relevance - a.relevance);
  return scored.slice(0, limit);
}

/** 供 LLM system 注入的短文本 */
export function formatCardsForPrompt(cards: KnowledgeCard[], maxChars = 1200): string {
  if (!cards.length) return '';
  const parts = cards.map((c, i) => {
    const labs = c.labs.length ? ` labs=${c.labs.join(',')}` : '';
    return `[${i + 1}] ${c.title} (tags: ${c.tags.join(', ')}${labs})\n${c.excerpt}`;
  });
  let out = parts.join('\n\n');
  if (out.length > maxChars) out = out.slice(0, maxChars) + '…';
  return out;
}

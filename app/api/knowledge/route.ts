// 知识卡片 API — 标签 / 关键词检索（无向量）

import { NextResponse } from 'next/server';
import {
  searchCards,
  getCardsByTag,
  getKnowledgeCardById,
  getStageMeta,
  getAllStageMeta,
  getOpencampMeta,
} from '@/lib/knowledge/cards';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag');
    const id = searchParams.get('id');
    const q = searchParams.get('q') || searchParams.get('query');
    const stage = searchParams.get('stage');
    const action = searchParams.get('action');

    if (action === 'stages') {
      const stages = await getAllStageMeta();
      const opencamp = await getOpencampMeta();
      return NextResponse.json({ stages, opencamp });
    }

    if (id) {
      const card = await getKnowledgeCardById(id);
      if (!card) {
        return NextResponse.json({ error: 'Knowledge card not found' }, { status: 404 });
      }
      return NextResponse.json({ card: publicCard(card) });
    }

    if (stage) {
      const meta = await getStageMeta(stage);
      if (!meta) {
        return NextResponse.json({ error: 'Unknown stage' }, { status: 404 });
      }
      // 附带推荐阅读卡片
      const reads = meta.reads || [];
      const cards = await searchCards({
        tags: [],
        query: meta.focus,
        limit: 3,
      });
      return NextResponse.json({ stage, meta, cards, reads });
    }

    if (tag) {
      const cards = await getCardsByTag(tag, 5);
      return NextResponse.json({
        cards: cards.map(publicCard),
        total: cards.length,
      });
    }

    if (q) {
      const cards = await searchCards({ query: q, limit: 5 });
      return NextResponse.json({
        cards: cards.map(publicCard),
        total: cards.length,
      });
    }

    return NextResponse.json(
      { error: 'Provide id, tag, q, stage, or action=stages' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Knowledge GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body: { query?: string; tags?: string[]; topic?: string; limit?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 });
    }

    const tags = [
      ...(body.tags || []),
      ...(body.topic ? [body.topic] : []),
    ];
    const query = body.query || '';

    if (!query && tags.length === 0) {
      return NextResponse.json({ error: 'query or tags required' }, { status: 400 });
    }

    const cards = await searchCards({
      query,
      tags,
      limit: body.limit ?? 5,
    });

    // 兼容旧 results 字段
    const results = cards.map((c) => ({
      content: c.excerpt,
      source: c.source,
      relevance: c.relevance,
      title: c.title,
      tags: c.tags,
      labs: c.labs,
    }));

    return NextResponse.json({
      cards: cards.map(publicCard),
      results,
      total: cards.length,
    });
  } catch (error) {
    console.error('Knowledge POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function publicCard(c: {
  id: string;
  title: string;
  tags: string[];
  stage?: string;
  labs: string[];
  courseVersion: string;
  publicationStatus: 'published' | 'draft' | 'deprecated';
  reviewStatus: 'reviewed' | 'pending';
  sourceRefs: string[];
  sources: { id: string; title: string; url?: string; kind?: string; version?: string }[];
  prerequisiteIds: string[];
  misconceptionIds: string[];
  questionTags: string[];
  labGateIds: string[];
  relatedIds: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  source: string;
  excerpt: string;
  content?: string;
  relevance: number;
}) {
  return {
    id: c.id,
    title: c.title,
    tags: c.tags,
    stage: c.stage,
    labs: c.labs,
    courseVersion: c.courseVersion,
    publicationStatus: c.publicationStatus,
    reviewStatus: c.reviewStatus,
    sourceRefs: c.sourceRefs,
    sources: c.sources,
    prerequisiteIds: c.prerequisiteIds,
    misconceptionIds: c.misconceptionIds,
    questionTags: c.questionTags,
    labGateIds: c.labGateIds,
    relatedIds: c.relatedIds,
    reviewedBy: c.reviewedBy,
    reviewedAt: c.reviewedAt,
    source: c.source,
    excerpt: c.excerpt,
    // 全文供前端 Markdown 展开；excerpt 仅作预览
    content: c.content || c.excerpt,
    relevance: c.relevance,
  };
}

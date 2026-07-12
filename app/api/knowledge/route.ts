// 知识检索 API

import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

// 知识库路径
const KNOWLEDGE_DIR = join(process.cwd(), 'data', 'knowledge');

// 简单的关键词搜索（后续可以替换为向量搜索）
async function searchKnowledge(query: string, topic?: string) {
  const results: Array<{ content: string; source: string; relevance: number }> = [];
  
  try {
    // 确定搜索目录
    const searchDir = topic ? join(KNOWLEDGE_DIR, topic) : KNOWLEDGE_DIR;
    
    // 读取所有 markdown 文件
    const files = await readdir(searchDir, { recursive: true });
    
    for (const file of files) {
      if (typeof file === 'string' && file.endsWith('.md')) {
        const filePath = join(searchDir, file);
        const content = await readFile(filePath, 'utf-8');
        
        // 简单的相关性计算
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();
        
        // 计算关键词匹配数
        const queryWords = queryLower.split(/\s+/);
        let matchCount = 0;
        for (const word of queryWords) {
          if (contentLower.includes(word)) {
            matchCount++;
          }
        }
        
        const relevance = queryWords.length > 0 ? matchCount / queryWords.length : 0;
        
        if (relevance > 0.3) {
          // 提取相关段落
          const paragraphs = content.split('\n\n');
          const relevantParagraphs = paragraphs.filter(p => 
            queryWords.some(word => p.toLowerCase().includes(word))
          ).slice(0, 3);
          
          results.push({
            content: relevantParagraphs.join('\n\n'),
            source: file,
            relevance,
          });
        }
      }
    }
    
    // 按相关性排序
    results.sort((a, b) => b.relevance - a.relevance);
    
    return results.slice(0, 5);
  } catch (error) {
    console.error('Knowledge search error:', error);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { query, topic } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const results = await searchKnowledge(query, topic);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Knowledge API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
